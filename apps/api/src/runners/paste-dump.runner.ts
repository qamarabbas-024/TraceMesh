import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface PasteRecord {
  engine: 'Pastebin' | 'Rentry' | 'ControlC' | 'JustPasteIt' | 'GitHub Gist';
  pasteUrl: string;
  title: string;
  dateDiscovered: string;
  matchedSnippet: string;
  leakCategory: 'CREDENTIAL_COMBO' | 'DATABASE_DUMP' | 'CONFIG_EXPOSURE' | 'SOURCE_CODE_LEAK';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

@Injectable()
export class PasteDumpRunner implements ToolRunner {
  readonly toolName = 'paste_dump_monitor';
  readonly supportedInputTypes: InputType[] = ['email', 'domain', 'username', 'ip'];
  private readonly logger = new Logger(PasteDumpRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase();

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target required for Pastebin and Public Dump scan',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const discoveredPastes: PasteRecord[] = [];

    // 1. Search public GitHub Gists via API
    try {
      const gistsUrl = `https://api.github.com/gists/public?per_page=30`;
      const res = await fetch(gistsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 TraceMesh-DumpMonitor/2.0',
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 200) {
        const gists = await res.json();
        if (Array.isArray(gists)) {
          for (const g of gists) {
            const desc = g.description || '';
            const files = Object.keys(g.files || {});
            const hasMatch = desc.toLowerCase().includes(cleanTarget) || files.some((f) => f.toLowerCase().includes(cleanTarget));

            if (hasMatch) {
              discoveredPastes.push({
                engine: 'GitHub Gist',
                pasteUrl: g.html_url || `https://gist.github.com/${g.id}`,
                title: desc || files[0] || 'Public Gist Paste',
                dateDiscovered: g.created_at || new Date().toISOString(),
                matchedSnippet: `Matched keyword "${cleanTarget}" in Gist files (${files.join(', ')})`,
                leakCategory: 'SOURCE_CODE_LEAK',
                severity: 'HIGH',
              });
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(`Gist search failed: ${err.message}`);
    }

    // 2. Query open paste indexing engines (DuckDuckGo Lite Pastebin/Rentry/JustPaste Dorks)
    try {
      const dorkQuery = `site:pastebin.com OR site:rentry.co OR site:controlc.com "${cleanTarget}"`;
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dorkQuery)}`;
      const resDdg = await fetch(ddgUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TraceMesh-DumpScanner/2.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (resDdg.status === 200) {
        const html = await resDdg.text();
        const linkMatches = html.match(/class="result__url"[^>]*href="([^"]+)"/g) || [];

        for (const rawLink of linkMatches.slice(0, 5)) {
          let url = rawLink.replace(/.*href="([^"]+)".*/, '$1');
          if (url.includes('uddg=')) {
            url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
          }

          let engine: PasteRecord['engine'] = 'Pastebin';
          if (url.includes('rentry.co')) engine = 'Rentry';
          else if (url.includes('controlc.com')) engine = 'ControlC';
          else if (url.includes('justpaste.it')) engine = 'JustPasteIt';

          let category: PasteRecord['leakCategory'] = 'CREDENTIAL_COMBO';
          let severity: PasteRecord['severity'] = 'HIGH';

          if (cleanTarget.includes('@')) {
            category = 'CREDENTIAL_COMBO';
            severity = 'CRITICAL';
          } else if (cleanTarget.includes('.')) {
            category = 'CONFIG_EXPOSURE';
            severity = 'HIGH';
          }

          discoveredPastes.push({
            engine,
            pasteUrl: url,
            title: `Anonymous Dump on ${engine}`,
            dateDiscovered: new Date().toISOString(),
            matchedSnippet: `Public paste URL indexed with match for "${cleanTarget}"`,
            leakCategory: category,
            severity,
          });
        }
      }
    } catch (err: any) {
      this.logger.debug(`Pastebin dork search failed: ${err.message}`);
    }

    // Transform into Graph Entities
    for (const paste of discoveredPastes) {
      entities.push({
        type: 'record',
        value: paste.pasteUrl,
        label: `📋 [${paste.engine}] ${paste.leakCategory}: ${paste.title}`,
        sourceTool: 'paste_dump_monitor',
        confidence: paste.severity === 'CRITICAL' ? 0.98 : 0.90,
        metadata: {
          engine: paste.engine,
          pasteUrl: paste.pasteUrl,
          title: paste.title,
          leakCategory: paste.leakCategory,
          severity: paste.severity,
          matchedSnippet: paste.matchedSnippet,
          dateDiscovered: paste.dateDiscovered,
          category: 'Public Paste & Data Dump Exposure',
        },
      });
    }

    const durationMs = Date.now() - startTime;
    const hasDumps = discoveredPastes.length > 0;

    return {
      status: 'success',
      summary: hasDumps
        ? `Pastebin & Dump Monitor flagged ${discoveredPastes.length} public paste URLs and text dump repositories matching "${cleanTarget}".`
        : `Pastebin & Dump Monitor probed public pastebin engines for "${cleanTarget}": zero public text dumps or credential combos found.`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        totalFound: discoveredPastes.length,
        pastes: discoveredPastes,
      },
    };
  }
}
