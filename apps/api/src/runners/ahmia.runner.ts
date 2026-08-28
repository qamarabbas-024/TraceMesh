import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

@Injectable()
export class AhmiaRunner implements ToolRunner {
  readonly toolName = 'ahmia';
  readonly supportedInputTypes: InputType[] = ['domain', 'email', 'username'];
  private readonly logger = new Logger(AhmiaRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase();

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target query required for Ahmia search',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];

    try {
      const res = await fetch(`https://ahmia.fi/search/?q=${encodeURIComponent(cleanTarget)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TraceMesh-OSINT/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 200) {
        const html = await res.text();
        // Parse onion link matches from html (<cite>...</cite> or href="...onion...")
        const onionRegex = /([a-z2-7]{16,56}\.onion)/gi;
        const matches = Array.from(new Set(html.match(onionRegex) || []));

        for (const onion of matches.slice(0, 5)) {
          entities.push({
            type: 'record',
            value: `http://${onion}`,
            label: `Ahmia Indexed Tor Hidden Service: ${onion}`,
            sourceTool: 'ahmia',
            confidence: 0.95,
            metadata: {
              network: 'Tor',
              hiddenService: onion,
              query: cleanTarget,
              category: 'Darknet Index Match',
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`Ahmia live query timed out: ${err.message}`);
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Ahmia searched clearnet Tor indexing gateways for "${cleanTarget}" and discovered ${entities.length} hidden service references`,
      entities,
      durationMs,
      raw: {
        query: cleanTarget,
        matchesCount: entities.length,
      },
    };
  }
}
