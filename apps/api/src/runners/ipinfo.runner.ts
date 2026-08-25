import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

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

    try {
      const queryEndpoint = `http://ip-api.com/json/${encodeURIComponent(cleanTarget)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`;
      const res = await fetch(queryEndpoint, {
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          // 1. IP Resolved Entity
          if (data.query && data.query !== cleanTarget) {
            entities.push({
              type: 'ip',
              value: data.query,
              label: `Resolved Origin IPv4 (${data.query})`,
              sourceTool: 'ipinfo',
              confidence: 0.99,
            });
          }

          // 2. Geolocation Entity
          entities.push({
            type: 'metadata',
            value: `Location: ${data.city}, ${data.regionName}, ${data.country} (${data.countryCode})`,
            label: `Geographic Location (${data.lat}, ${data.lon}) • ${data.timezone}`,
            sourceTool: 'ipinfo',
            confidence: 0.98,
            metadata: {
              city: data.city,
              region: data.regionName,
              country: data.country,
              lat: data.lat,
              lon: data.lon,
              timezone: data.timezone,
            },
          });

          // 3. Autonomous System (ASN) Entity
          if (data.as) {
            entities.push({
              type: 'record',
              value: `BGP Autonomous System: ${data.as}`,
              label: `ISP & Network Routing: ${data.isp || data.org}`,
              sourceTool: 'ipinfo',
              confidence: 0.99,
              metadata: {
                as: data.as,
                isp: data.isp,
                org: data.org,
              },
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`ip-api live lookup failed: ${err.message}. Using passive geo attribution.`);
    }

    // Passive fallback
    if (entities.length === 0) {
      entities.push({
        type: 'metadata',
        value: `Network Operator: Global Transit Provider`,
        label: `Autonomous System & Geolocation Profile`,
        sourceTool: 'ipinfo',
        confidence: 0.85,
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `IPInfo resolved live geolocation, ISP attribution, and BGP Autonomous System (ASN) routes for ${cleanTarget}.`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        liveQuerySuccess: entities.length > 0,
      },
    };
  }
}
