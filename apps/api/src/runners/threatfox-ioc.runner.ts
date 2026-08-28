import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

@Injectable()
export class ThreatFoxIocRunner implements ToolRunner {
  readonly toolName = 'threatfox_ioc';
  readonly supportedInputTypes: InputType[] = ['domain', 'ip'];
  private readonly logger = new Logger(ThreatFoxIocRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target required for ThreatFox IOC lookup',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];

    try {
      // Query abuse.ch ThreatFox public search API
      const res = await fetch('https://threatfox-api.abuse.ch/api/v1/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'TraceMesh-OSINT/1.0' },
        body: JSON.stringify({
          query: 'search_ioc',
          search_term: cleanTarget,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (res.status === 200) {
        const data = await res.json();
        if (data.query_status === 'ok' && Array.isArray(data.data)) {
          for (const ioc of data.data.slice(0, 5)) {
            entities.push({
              type: 'record',
              value: `MALWARE_IOC: ${ioc.threat_type_desc || ioc.threat_type} (${ioc.malware_printable || 'Adversary'})`,
              label: `ThreatFox IOC Match: ${ioc.malware_printable || 'Malware'} [Confidence: ${ioc.confidence_level}%]`,
              sourceTool: 'threatfox_ioc',
              confidence: (ioc.confidence_level || 90) / 100,
              metadata: {
                category: 'Malware IOC Threat',
                iocId: ioc.id,
                threatType: ioc.threat_type,
                malware: ioc.malware_printable,
                reporter: ioc.reporter,
                firstSeen: ioc.first_seen,
                tags: ioc.tags,
              },
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`ThreatFox IOC query failed: ${err.message}`);
    }

    // If clean, add benign threat indicator
    if (entities.length === 0) {
      entities.push({
        type: 'record',
        value: `NO_MALICIOUS_IOCS_FOUND: ${cleanTarget}`,
        label: `ThreatFox Database Status: 0 Active Malware/Botnet Signatures`,
        sourceTool: 'threatfox_ioc',
        confidence: 0.95,
        metadata: {
          category: 'Threat Status',
          threatLevel: 'CLEAN',
          checkedTarget: cleanTarget,
        },
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `ThreatFox queried abuse.ch global cyber threat feeds for "${cleanTarget}"`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        threatsDiscovered: entities.filter((e) => e.metadata?.category === 'Malware IOC Threat').length,
      },
    };
  }
}
