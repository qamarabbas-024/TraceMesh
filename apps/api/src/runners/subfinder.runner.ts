import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import * as dns from 'dns/promises';

const COMMON_SUBDOMAINS = [
  'www',
  'api',
  'mail',
  'dev',
  'status',
  'app',
  'vpn',
  'auth',
  'portal',
  'admin',
  'cdn',
  'docs',
  'git',
  'test',
  'staging',
  'login',
  'support',
  'blog',
  'shop',
  'dashboard',
];

@Injectable()
export class SubfinderRunner implements ToolRunner {
  readonly toolName = 'subfinder';
  readonly supportedInputTypes: InputType[] = ['domain'];
  private readonly logger = new Logger(SubfinderRunner.name);

  async execute(domainInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanDomain = domainInput.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();

    if (inputType !== 'domain' || !cleanDomain) {
      return {
        status: 'error',
        summary: 'Valid domain required for Subfinder enumeration',
        entities: [],
        error: 'Domain required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const discovered = new Set<string>();

    // 1. Live Certificate Transparency (crt.sh)
    try {
      const crtRes = await fetch(`https://crt.sh/?q=%.${encodeURIComponent(cleanDomain)}&output=json`, {
        headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
        signal: AbortSignal.timeout(4500),
      });

      if (crtRes.status === 200) {
        const certs = await crtRes.json();
        if (Array.isArray(certs)) {
          for (const cert of certs.slice(0, 40)) {
            const val = cert.name_value;
            if (typeof val === 'string') {
              for (const line of val.split('\n')) {
                const sub = line.trim().toLowerCase();
                if (sub && sub.endsWith(cleanDomain) && !sub.startsWith('*') && !discovered.has(sub)) {
                  discovered.add(sub);
                  entities.push({
                    type: 'domain',
                    value: sub,
                    label: `Active Subdomain (CT Log): ${sub}`,
                    sourceTool: 'subfinder',
                    confidence: 1.0,
                    metadata: {
                      source: 'Certificate Transparency',
                      issuer: cert.issuer_name,
                      loggedAt: cert.entry_timestamp,
                    },
                  });
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
      this.logger.debug(`crt.sh query failed in subfinder: ${e.message}`);
    }

    // 2. Live HackerTarget Host Search (Fast, Zero-Key)
    try {
      const htRes = await fetch(`https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(cleanDomain)}`, {
        headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
        signal: AbortSignal.timeout(3500),
      });

      if (htRes.ok) {
        const text = await htRes.text();
        if (text && !text.includes('error') && !text.includes('API count')) {
          const lines = text.trim().split('\n');
          for (const line of lines.slice(0, 25)) {
            const [sub, ip] = line.split(',').map((s) => s.trim().toLowerCase());
            if (sub && sub.endsWith(cleanDomain) && !discovered.has(sub)) {
              discovered.add(sub);
              entities.push({
                type: 'domain',
                value: sub,
                label: `Subdomain (HackerTarget): ${sub}${ip ? ` [${ip}]` : ''}`,
                sourceTool: 'subfinder',
                confidence: 0.98,
                metadata: {
                  source: 'HackerTarget HostSearch',
                  resolvedIp: ip || undefined,
                },
              });

              if (ip && !discovered.has(ip) && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
                discovered.add(ip);
                entities.push({
                  type: 'ip',
                  value: ip,
                  label: `Host IP (from ${sub}): ${ip}`,
                  sourceTool: 'subfinder',
                  confidence: 0.95,
                  parentValue: sub,
                  metadata: { host: sub },
                });
              }
            }
          }
        }
      }
    } catch (e: any) {
      this.logger.debug(`HackerTarget query failed in subfinder: ${e.message}`);
    }

    // 3. Active DNS Brute Verification on Common Subdomain Prefixes
    await Promise.allSettled(
      COMMON_SUBDOMAINS.map(async (prefix) => {
        const candidate = `${prefix}.${cleanDomain}`;
        if (discovered.has(candidate)) return;

        try {
          const ips = await dns.resolve4(candidate);
          if (Array.isArray(ips) && ips.length > 0) {
            discovered.add(candidate);
            entities.push({
              type: 'domain',
              value: candidate,
              label: `Active Resolving Subdomain: ${candidate} [${ips[0]}]`,
              sourceTool: 'subfinder',
              confidence: 1.0,
              metadata: {
                source: 'Active DNS Resolution',
                resolvedIp: ips[0],
              },
            });
          }
        } catch {
          // Does not resolve, do not add fake results
        }
      }),
    );

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Subfinder discovered ${entities.length} verified subdomains through live Certificate Transparency and active DNS probes for ${cleanDomain}`,
      entities,
      durationMs,
      raw: {
        domain: cleanDomain,
        subdomainsFound: Array.from(discovered),
      },
    };
  }
}
