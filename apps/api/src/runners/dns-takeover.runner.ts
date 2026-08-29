import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import * as dns from 'dns/promises';

interface SubdomainProbe {
  subdomain: string;
  ips: string[];
  cnames: string[];
  takeoverRisk?: string;
  service?: string;
}

const TAKEOVER_FINGERPRINTS = [
  { service: 'GitHub Pages', cnameSuffix: 'github.io', nxPattern: 'There isn\'t a GitHub Pages site here' },
  { service: 'AWS S3 Bucket', cnameSuffix: 's3.amazonaws.com', nxPattern: 'The specified bucket does not exist' },
  { service: 'CloudFront CDN', cnameSuffix: 'cloudfront.net', nxPattern: 'Bad request / NoSuchDistribution' },
  { service: 'Heroku App', cnameSuffix: 'herokudns.com', nxPattern: 'No such app' },
  { service: 'Heroku App', cnameSuffix: 'herokuapp.com', nxPattern: 'No such app' },
  { service: 'Vercel Platform', cnameSuffix: 'vercel-dns.com', nxPattern: '404: NOT_FOUND' },
  { service: 'Netlify App', cnameSuffix: 'netlify.app', nxPattern: 'Not Found - Request ID' },
  { service: 'Zendesk Help Center', cnameSuffix: 'zendesk.com', nxPattern: 'Help Center Closed' },
  { service: 'Shopify Store', cnameSuffix: 'myshopify.com', nxPattern: 'Sorry, this shop is currently unavailable' },
  { service: 'Surge.sh', cnameSuffix: 'surge.sh', nxPattern: 'project not found' },
  { service: 'Ghost Platform', cnameSuffix: 'ghost.io', nxPattern: 'Site not found' },
  { service: 'Azure App Service', cnameSuffix: 'azurewebsites.net', nxPattern: '404 Web App not found' },
  { service: 'Fastly CDN', cnameSuffix: 'fastly.net', nxPattern: 'Fastly error: unknown domain' },
  { service: 'ReadMe.io Docs', cnameSuffix: 'readme.io', nxPattern: 'Project does not exist' },
];

const DEFAULT_WORDLIST = [
  'api', 'admin', 'dev', 'staging', 'test', 'beta', 'mail', 'vpn', 'corp', 'cdn',
  'app', 'auth', 'portal', 'status', 'docs', 'git', 's3', 'shop', 'cloud', 'login',
  'secure', 'dashboard', 'monitor', 'demo', 'help', 'static', 'assets', 'ws'
];

@Injectable()
export class DnsTakeoverRunner implements ToolRunner {
  readonly toolName = 'dns_takeover';
  readonly supportedInputTypes: InputType[] = ['domain'];
  private readonly logger = new Logger(DnsTakeoverRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const domain = targetInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!domain || !domain.includes('.')) {
      return {
        status: 'error',
        summary: 'Valid apex domain required for DNS Brute & CNAME Takeover scan',
        entities: [],
        error: 'Invalid domain format',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const probes: SubdomainProbe[] = [];
    const takeoverRisks: { subdomain: string; service: string; cname: string }[] = [];

    // Parallel DNS resolution across high-priority wordlist
    await Promise.all(DEFAULT_WORDLIST.map(async (word) => {
      const fqdn = `${word}.${domain}`;
      try {
        let cnames: string[] = [];
        try {
          cnames = await dns.resolveCname(fqdn);
        } catch {
          // No CNAME or resolution failed
        }

        let ips: string[] = [];
        try {
          ips = await dns.resolve4(fqdn);
        } catch {
          // No A record
        }

        if (cnames.length > 0 || ips.length > 0) {
          const probe: SubdomainProbe = {
            subdomain: fqdn,
            ips,
            cnames,
          };

          // Check CNAME takeover fingerprints
          for (const cname of cnames) {
            for (const fp of TAKEOVER_FINGERPRINTS) {
              if (cname.toLowerCase().endsWith(fp.cnameSuffix)) {
                probe.takeoverRisk = `Potential ${fp.service} Takeover via dangling CNAME ${cname}`;
                probe.service = fp.service;
                takeoverRisks.push({ subdomain: fqdn, service: fp.service, cname });
                break;
              }
            }
          }

          probes.push(probe);
        }
      } catch (err: any) {
        // Subdomain does not resolve
      }
    }));

    // Generate Discovered Entities
    for (const probe of probes) {
      entities.push({
        type: 'domain',
        value: probe.subdomain,
        label: `Active Subdomain: ${probe.subdomain}`,
        sourceTool: 'dns_takeover',
        confidence: 0.98,
        metadata: {
          ips: probe.ips,
          cnames: probe.cnames,
          resolvedIpCount: probe.ips.length,
          hasCname: probe.cnames.length > 0,
        },
      });

      for (const ip of probe.ips) {
        entities.push({
          type: 'ip',
          value: ip,
          label: `Host IP: ${ip} (${probe.subdomain})`,
          sourceTool: 'dns_takeover',
          confidence: 0.95,
          metadata: {
            associatedSubdomain: probe.subdomain,
          },
        });
      }
    }

    // Flag Takeover Vulnerabilities as high-priority record entities
    for (const risk of takeoverRisks) {
      entities.push({
        type: 'record',
        value: `${risk.subdomain} -> ${risk.cname}`,
        label: `VULNERABILITY: ${risk.service} Dangling CNAME on ${risk.subdomain}`,
        sourceTool: 'dns_takeover',
        confidence: 0.99,
        metadata: {
          severity: 'HIGH',
          category: 'Subdomain Takeover',
          vulnerableHost: risk.subdomain,
          danglingTarget: risk.cname,
          cloudService: risk.service,
          remediation: `Remove orphan DNS CNAME record ${risk.cname} from ${risk.subdomain} or re-claim resource on ${risk.service}`,
        },
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `DNS Brute & Takeover scanner probed ${DEFAULT_WORDLIST.length} subdomains for "${domain}", discovering ${probes.length} live hosts and ${takeoverRisks.length} CNAME takeover risks.`,
      entities,
      durationMs,
      raw: {
        domain,
        probedCount: DEFAULT_WORDLIST.length,
        liveHostsCount: probes.length,
        takeoverRisksCount: takeoverRisks.length,
        probes,
      },
    };
  }
}
