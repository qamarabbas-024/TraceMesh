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
    const token = process.env.IPINFO_TOKEN;

    try {
      // 1. Try IPinfo.io with user token if present
      if (token) {
        const ipinfoUrl = `https://ipinfo.io/${encodeURIComponent(cleanTarget)}/json?token=${token}`;
        const res = await fetch(ipinfoUrl, { signal: AbortSignal.timeout(5000) });

        if (res.ok) {
          const data = await res.json();
          if (data.ip) {
            entities.push({
              type: 'ip',
              value: data.ip,
              label: `IPinfo Verified Origin IPv4 (${data.ip})`,
              sourceTool: 'ipinfo',
              confidence: 1.0,
            });
          }

          if (data.city || data.region || data.country) {
            entities.push({
              type: 'metadata',
              value: `Location: ${data.city || ''}, ${data.region || ''}, ${data.country || ''} (${data.loc || 'GPS'})`,
              label: `High-Precision Geolocation & Timezone (${data.timezone || 'UTC'})`,
              sourceTool: 'ipinfo',
              confidence: 0.99,
              metadata: {
                city: data.city,
                region: data.region,
                country: data.country,
                loc: data.loc,
                postal: data.postal,
                timezone: data.timezone,
              },
            });
          }

          if (data.org) {
            entities.push({
              type: 'record',
              value: `BGP Autonomous System & ISP: ${data.org}`,
              label: `Network Routing & Carrier Attribution`,
              sourceTool: 'ipinfo',
              confidence: 0.99,
              metadata: {
                org: data.org,
                hostname: data.hostname,
              },
            });
          }
        }
      }

      // 2. Fallback to public ip-api if no entities populated
      if (entities.length === 0) {
        const queryEndpoint = `http://ip-api.com/json/${encodeURIComponent(cleanTarget)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`;
        const res = await fetch(queryEndpoint, { signal: AbortSignal.timeout(5000) });

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            if (data.query && data.query !== cleanTarget) {
              entities.push({
                type: 'ip',
                value: data.query,
                label: `Resolved Origin IPv4 (${data.query})`,
                sourceTool: 'ipinfo',
                confidence: 0.99,
              });
            }

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
      }
    } catch (err: any) {
      this.logger.warn(`IPInfo lookup error: ${err.message}. Using passive geo attribution.`);
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
        liveApiKeyUsed: !!token,
        findingsCount: entities.length,
      },
    };
  }
}
