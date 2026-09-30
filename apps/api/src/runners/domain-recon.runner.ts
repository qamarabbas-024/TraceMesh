import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import * as dns from 'dns/promises';
import { isInternalOrBlockedTarget } from '../common/utils/ssrf-protection';

@Injectable()
export class DomainReconRunner implements ToolRunner {
  readonly toolName = 'domainrecon';
  readonly supportedInputTypes: InputType[] = ['domain', 'ip'];
  private readonly logger = new Logger(DomainReconRunner.name);

  private async queryDoh(name: string, type: 'A' | 'AAAA' | 'MX' | 'NS' | 'TXT'): Promise<string[]> {
    try {
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
        headers: { accept: 'application/dns-json', 'User-Agent': 'TraceMesh-OSINT/1.0' },
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.Answer)) {
          return data.Answer.map((a: any) => String(a.data || '').trim().replace(/^"|"$/g, ''));
        }
      }
    } catch {}

    // Fallback to Google DoH
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
        headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.Answer)) {
          return data.Answer.map((a: any) => String(a.data || '').trim().replace(/^"|"$/g, ''));
        }
      }
    } catch {}

    return [];
  }

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!cleanTarget || isInternalOrBlockedTarget(cleanTarget)) {
      return {
        status: 'error',
        summary: `Target "${cleanTarget || targetInput}" is private, internal, or invalid (SSRF protection active).`,
        entities: [],
        error: 'Invalid or restricted internal target format',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];

    if (inputType === 'domain') {
      const tasks = [
        // 1. Resolve IPv4 (A Records)
        (async () => {
          try {
            let aRecords = await dns.resolve4(cleanTarget);
            if (!aRecords || aRecords.length === 0) {
              aRecords = await this.queryDoh(cleanTarget, 'A');
            }
            for (const ip of aRecords) {
              if (ip && !isInternalOrBlockedTarget(ip)) {
                entities.push({
                  type: 'ip',
                  value: ip,
                  label: `DNS A Record: ${ip}`,
                  sourceTool: 'domainrecon',
                  confidence: 1.0,
                  metadata: { recordType: 'A', ip },
                });
              }
            }
          } catch {
            const dohA = await this.queryDoh(cleanTarget, 'A');
            for (const ip of dohA) {
              if (ip && !isInternalOrBlockedTarget(ip)) {
                entities.push({
                  type: 'ip',
                  value: ip,
                  label: `DNS A Record (DoH): ${ip}`,
                  sourceTool: 'domainrecon',
                  confidence: 0.98,
                  metadata: { recordType: 'A', ip },
                });
              }
            }
          }
        })(),

        // 2. Resolve IPv6 (AAAA Records)
        (async () => {
          try {
            const aaaaRecords = await dns.resolve6(cleanTarget);
            for (const ip6 of aaaaRecords.slice(0, 2)) {
              entities.push({
                type: 'ip',
                value: ip6,
                label: `DNS AAAA Record: ${ip6}`,
                sourceTool: 'domainrecon',
                confidence: 1.0,
                metadata: { recordType: 'AAAA', ip6 },
              });
            }
          } catch {
            const dohAAAA = await this.queryDoh(cleanTarget, 'AAAA');
            for (const ip6 of dohAAAA.slice(0, 2)) {
              entities.push({
                type: 'ip',
                value: ip6,
                label: `DNS AAAA Record (DoH): ${ip6}`,
                sourceTool: 'domainrecon',
                confidence: 0.95,
                metadata: { recordType: 'AAAA', ip6 },
              });
            }
          }
        })(),

        // 3. Resolve Mail Exchangers (MX Records)
        (async () => {
          try {
            const mxRecords = await dns.resolveMx(cleanTarget);
            if (Array.isArray(mxRecords) && mxRecords.length > 0) {
              mxRecords.sort((a, b) => a.priority - b.priority);
              for (const mx of mxRecords.slice(0, 4)) {
                const host = mx.exchange.toLowerCase().replace(/\.$/, '');
                entities.push({
                  type: 'domain',
                  value: host,
                  label: `MX Host: ${host} (Priority ${mx.priority})`,
                  sourceTool: 'domainrecon',
                  confidence: 1.0,
                  metadata: { recordType: 'MX', priority: mx.priority },
                });
              }
            }
          } catch {
            const dohMX = await this.queryDoh(cleanTarget, 'MX');
            for (const raw of dohMX.slice(0, 4)) {
              const parts = raw.split(/\s+/);
              const host = (parts.length > 1 ? parts[1] : parts[0]).toLowerCase().replace(/\.$/, '');
              if (host) {
                entities.push({
                  type: 'domain',
                  value: host,
                  label: `MX Host (DoH): ${host}`,
                  sourceTool: 'domainrecon',
                  confidence: 0.95,
                  metadata: { recordType: 'MX' },
                });
              }
            }
          }
        })(),

        // 4. Resolve Authoritative Name Servers (NS Records)
        (async () => {
          try {
            const nsRecords = await dns.resolveNs(cleanTarget);
            if (Array.isArray(nsRecords)) {
              for (const ns of nsRecords.slice(0, 4)) {
                const nsClean = ns.toLowerCase().replace(/\.$/, '');
                entities.push({
                  type: 'domain',
                  value: nsClean,
                  label: `Name Server: ${nsClean}`,
                  sourceTool: 'domainrecon',
                  confidence: 1.0,
                  metadata: { recordType: 'NS' },
                });
              }
            }
          } catch {
            const dohNS = await this.queryDoh(cleanTarget, 'NS');
            for (const ns of dohNS.slice(0, 4)) {
              const nsClean = ns.toLowerCase().replace(/\.$/, '');
              if (nsClean) {
                entities.push({
                  type: 'domain',
                  value: nsClean,
                  label: `Name Server (DoH): ${nsClean}`,
                  sourceTool: 'domainrecon',
                  confidence: 0.95,
                  metadata: { recordType: 'NS' },
                });
              }
            }
          }
        })(),

        // 5. Resolve TXT & SPF Records
        (async () => {
          try {
            const txtRecords = await dns.resolveTxt(cleanTarget);
            if (Array.isArray(txtRecords)) {
              for (const chunk of txtRecords) {
                const txt = chunk.join('');
                if (txt.startsWith('v=spf1') || txt.includes('verification') || txt.includes('docusign') || txt.includes('stripe')) {
                  entities.push({
                    type: 'metadata',
                    value: txt.length > 100 ? `${txt.substring(0, 100)}...` : txt,
                    label: `DNS TXT Security Policy / SPF`,
                    sourceTool: 'domainrecon',
                    confidence: 1.0,
                    metadata: { recordType: 'TXT', fullText: txt },
                  });
                }
              }
            }
          } catch {}
        })(),

        // 6. Check DMARC Policy Enforcement
        (async () => {
          try {
            const dmarcRecords = await dns.resolveTxt(`_dmarc.${cleanTarget}`);
            if (Array.isArray(dmarcRecords) && dmarcRecords.length > 0) {
              const dmarcStr = dmarcRecords.flat().join('');
              entities.push({
                type: 'record',
                value: dmarcStr.length > 80 ? `${dmarcStr.substring(0, 80)}...` : dmarcStr,
                label: `DMARC Email Security Policy Active`,
                sourceTool: 'domainrecon',
                confidence: 1.0,
                metadata: {
                  category: 'Email Authentication',
                  dmarc: dmarcStr,
                },
              });
            }
          } catch {}
        })(),
      ];

      await Promise.allSettled(tasks);
    } else {
      // IP Reverse DNS (PTR)
      try {
        const hostnames = await dns.reverse(cleanTarget);
        for (const host of hostnames) {
          entities.push({
            type: 'domain',
            value: host,
            label: `Reverse DNS (PTR): ${host}`,
            sourceTool: 'domainrecon',
            confidence: 1.0,
            metadata: { recordType: 'PTR', hostname: host },
          });
        }
      } catch (e: any) {
        this.logger.debug(`PTR reverse lookup failed for ${cleanTarget}: ${e.message}`);
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `DomainRecon performed live DNS resolution across A, AAAA, MX, NS, TXT, SPF, and DMARC records for ${cleanTarget} (${entities.length} records discovered)`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        entitiesCount: entities.length,
      },
    };
  }
}
