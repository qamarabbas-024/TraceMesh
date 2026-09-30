import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import { isInternalOrBlockedTarget } from '../common/utils/ssrf-protection';

@Injectable()
export class UrlScanRunner implements ToolRunner {
  readonly toolName = 'urlscan';
  readonly supportedInputTypes: InputType[] = ['domain', 'ip'];
  private readonly logger = new Logger(UrlScanRunner.name);

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
    const query = inputType === 'ip' ? `ip:${cleanTarget}` : `domain:${cleanTarget}`;

    try {
      const res = await fetch(`https://urlscan.io/api/v1/search/?q=${encodeURIComponent(query)}&size=10`, {
        headers: { 'User-Agent': 'TraceMesh-OSINT/2.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const seenIps = new Set<string>();
          const seenDomains = new Set<string>();

          for (const item of data.results.slice(0, 8)) {
            const page = item.page || {};
            const task = item.task || {};

            // 1. Scanned Domain Node (if input is IP)
            if (page.domain && page.domain !== cleanTarget && !seenDomains.has(page.domain)) {
              seenDomains.add(page.domain);
              entities.push({
                type: 'domain',
                value: page.domain,
                label: `URLScan Scanned Host: ${page.domain}${page.title ? ` ("${page.title.substring(0, 50)}")` : ''}`,
                sourceTool: 'urlscan',
                confidence: 0.95,
                metadata: {
                  url: page.url || task.url,
                  title: page.title,
                  server: page.server,
                  screenshot: item.screenshot,
                  scanId: item._id,
                },
              });
            }

            // 2. Resolved IP Node (if input is domain)
            if (page.ip && page.ip !== cleanTarget && !seenIps.has(page.ip) && !isInternalOrBlockedTarget(page.ip)) {
              seenIps.add(page.ip);
              entities.push({
                type: 'ip',
                value: page.ip,
                label: `URLScan Resolved Web IP: ${page.ip}${page.country ? ` (${page.country})` : ''}`,
                sourceTool: 'urlscan',
                confidence: 0.96,
                metadata: {
                  ip: page.ip,
                  asn: page.asn,
                  asnName: page.asnname,
                  country: page.country,
                },
              });
            }

            // 3. Web Server Technology
            if (page.server && !entities.some((e) => e.value === `SERVER: ${page.server}`)) {
              entities.push({
                type: 'record',
                value: `SERVER: ${page.server}`,
                label: `Web Server Fingerprint: ${page.server}`,
                sourceTool: 'urlscan',
                confidence: 0.92,
                metadata: {
                  category: 'Web Server Banner',
                  server: page.server,
                },
              });
            }

            // 4. ASN Infrastructure
            if (page.asn && !entities.some((e) => e.value === page.asn)) {
              entities.push({
                type: 'record',
                value: page.asn,
                label: `Autonomous System: ${page.asn} (${page.asnname || 'Global Routing'})`,
                sourceTool: 'urlscan',
                confidence: 0.97,
                metadata: {
                  asn: page.asn,
                  asnName: page.asnname,
                },
              });
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`URLScan query failed for ${cleanTarget}: ${err.message}`);
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `URLScan.io public database evaluated ${entities.length} correlated web assets, server banners, and network endpoints for ${cleanTarget}`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        query,
        discoveredCount: entities.length,
      },
    };
  }
}
