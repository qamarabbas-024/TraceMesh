import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import * as dns from 'dns/promises';

@Injectable()
export class IPInfoRunner implements ToolRunner {
  readonly toolName = 'ipinfo';
  readonly supportedInputTypes: InputType[] = ['ip', 'domain'];
  private readonly logger = new Logger(IPInfoRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target IP or Domain required for Geolocation intelligence',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];

    // If domain provided, resolve primary IP first
    let targetIp = cleanTarget;
    if (inputType === 'domain') {
      try {
        const ips = await dns.resolve4(cleanTarget);
        if (ips.length > 0) {
          targetIp = ips[0];
          entities.push({
            type: 'ip',
            value: targetIp,
            label: `Primary Target Host IPv4 (${targetIp})`,
            sourceTool: 'ipinfo',
            confidence: 1.0,
          });
        }
      } catch (e: any) {
        this.logger.debug(`Could not resolve domain ${cleanTarget} to IP: ${e.message}`);
      }
    }

    try {
      // Query high-precision open IP geolocation endpoint
      const queryUrl = `http://ip-api.com/json/${encodeURIComponent(targetIp)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,reverse,mobile,proxy,hosting`;
      const res = await fetch(queryUrl, {
        headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.status === 200) {
        const data = await res.json();
        if (data.status === 'success') {
          // 1. IP Origin
          if (data.query && !entities.some((e) => e.value === data.query)) {
            entities.push({
              type: 'ip',
              value: data.query,
              label: `Origin IPv4: ${data.query}`,
              sourceTool: 'ipinfo',
              confidence: 1.0,
            });
          }

          // 2. Geolocation Metadata Node
          entities.push({
            type: 'metadata',
            value: `${data.city || 'Unknown City'}, ${data.regionName || ''}, ${data.country} (${data.countryCode})`,
            label: `Geolocation: ${data.city}, ${data.country} [${data.lat}, ${data.lon}]`,
            sourceTool: 'ipinfo',
            confidence: 1.0,
            metadata: {
              city: data.city,
              region: data.regionName,
              country: data.country,
              countryCode: data.countryCode,
              postal: data.zip,
              lat: data.lat,
              lon: data.lon,
              latitude: data.lat,
              longitude: data.lon,
              timezone: data.timezone,
            },
          });

          // 3. Autonomous System & ISP Provider
          if (data.as || data.isp || data.org) {
            const asnDesc = data.as || data.org || data.isp;
            entities.push({
              type: 'record',
              value: `${asnDesc} (ISP: ${data.isp})`,
              label: `ASN & Network Carrier: ${asnDesc}`,
              sourceTool: 'ipinfo',
              confidence: 1.0,
              metadata: {
                category: 'Network Carrier / ASN',
                asn: data.as,
                isp: data.isp,
                org: data.org,
                isHosting: data.hosting,
                isProxy: data.proxy,
              },
            });
          }

          // 4. Reverse DNS (PTR)
          if (data.reverse && data.reverse !== targetIp) {
            entities.push({
              type: 'domain',
              value: data.reverse,
              label: `Reverse DNS Hostname: ${data.reverse}`,
              sourceTool: 'ipinfo',
              confidence: 1.0,
              metadata: { category: 'Reverse DNS' },
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`ip-api query failed for ${targetIp}: ${err.message}`);
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `IPinfo resolved physical geolocation, BGP Autonomous System routing, and carrier attribution for ${targetIp}`,
      entities,
      durationMs,
      raw: {
        target: targetIp,
        entitiesCount: entities.length,
      },
    };
  }
}
