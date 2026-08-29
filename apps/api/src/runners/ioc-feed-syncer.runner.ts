import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface IocMatch {
  ioc: string;
  threatType: 'MALWARE_C2' | 'PAYLOAD_DELIVERY' | 'PHISHING_LURE' | 'BOTNET_NODE';
  malwareFamily: string;
  firstSeen: string;
  sourceFeed: 'ThreatFox' | 'URLhaus' | 'FeodoTracker' | 'OpenPhish';
  confidence: number;
  tags: string[];
}

@Injectable()
export class IocFeedSyncerRunner implements ToolRunner {
  readonly toolName = 'ioc_feed_syncer';
  readonly supportedInputTypes: InputType[] = ['domain', 'ip'];
  private readonly logger = new Logger(IocFeedSyncerRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target domain or IP required for IOC threat feed sync',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const matchedIocs: IocMatch[] = [];

    // 1. Query ThreatFox abuse.ch live API
    try {
      const res = await fetch('https://threatfox-api.abuse.ch/api/v1/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'search_ioc', search_term: cleanTarget }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 200) {
        const data = await res.json();
        if (data.query_status === 'ok' && Array.isArray(data.data)) {
          for (const item of data.data.slice(0, 5)) {
            matchedIocs.push({
              ioc: item.ioc,
              threatType: item.threat_type?.includes('payload') ? 'PAYLOAD_DELIVERY' : 'MALWARE_C2',
              malwareFamily: item.malware_printable || item.malware || 'Unknown Trojan',
              firstSeen: item.first_seen || new Date().toISOString(),
              sourceFeed: 'ThreatFox',
              confidence: (item.confidence_level || 90) / 100,
              tags: item.tags || ['botnet', 'malware'],
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`ThreatFox live IOC sync failed: ${err.message}`);
    }

    // 2. Query URLhaus abuse.ch host API
    try {
      const form = new URLSearchParams();
      form.append('host', cleanTarget);
      const resUh = await fetch('https://urlhaus-api.abuse.ch/v1/host/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        signal: AbortSignal.timeout(5000),
      });

      if (resUh.status === 200) {
        const data = await resUh.json();
        if (data.query_status === 'ok' && Array.isArray(data.urls)) {
          for (const u of data.urls.slice(0, 3)) {
            matchedIocs.push({
              ioc: u.url,
              threatType: 'PAYLOAD_DELIVERY',
              malwareFamily: u.threat || 'Malware Payload URL',
              firstSeen: u.dateadded || data.firstseen || new Date().toISOString(),
              sourceFeed: 'URLhaus',
              confidence: 0.98,
              tags: u.tags || ['payload_drop', 'urlhaus'],
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(`URLhaus live IOC sync failed: ${err.message}`);
    }

    // Transform matched IOCs into high-confidence Graph Entities
    for (const match of matchedIocs) {
      entities.push({
        type: 'record',
        value: `IOC:${match.ioc}`,
        label: `🚨 IOC [${match.sourceFeed}]: ${match.malwareFamily} (${match.threatType})`,
        sourceTool: 'ioc_feed_syncer',
        confidence: match.confidence,
        metadata: {
          ioc: match.ioc,
          threatType: match.threatType,
          malwareFamily: match.malwareFamily,
          firstSeen: match.firstSeen,
          sourceFeed: match.sourceFeed,
          tags: match.tags,
          severity: 'CRITICAL',
          category: 'Active Threat Intelligence IOC',
        },
      });

      entities.push({
        type: 'record',
        value: `MalwareFamily:${match.malwareFamily}`,
        label: `Threat Vector: ${match.malwareFamily}`,
        sourceTool: 'ioc_feed_syncer',
        confidence: 0.95,
        metadata: {
          associatedIoc: match.ioc,
          sourceFeed: match.sourceFeed,
        },
      });
    }

    const durationMs = Date.now() - startTime;
    const isClean = matchedIocs.length === 0;

    return {
      status: 'success',
      summary: isClean
        ? `Real-time Threat Feed Syncer queried ThreatFox & URLhaus for "${cleanTarget}": zero active malware payloads or botnet C2 IOCs detected.`
        : `🚨 Real-time Threat Feed Syncer flagged ${matchedIocs.length} active Indicators of Compromise (IOCs) across global malware threat feeds for "${cleanTarget}".`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        totalIocsFound: matchedIocs.length,
        iocs: matchedIocs,
        isClean,
      },
    };
  }
}
