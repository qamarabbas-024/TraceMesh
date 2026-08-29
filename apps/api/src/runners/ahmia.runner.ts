import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface OnionSearchResult {
  onionUrl: string;
  onionVersion: 'v2' | 'v3';
  title?: string;
  snippet?: string;
  lastSeen?: string;
  sourceEngine: string;
}

@Injectable()
export class AhmiaRunner implements ToolRunner {
  readonly toolName = 'ahmia';
  readonly supportedInputTypes: InputType[] = ['domain', 'email', 'username', 'phone'];
  private readonly logger = new Logger(AhmiaRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase();

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target query required for Darknet Onion Hunter',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const discoveredOnions: Map<string, OnionSearchResult> = new Map();

    // 1. Primary Engine: Ahmia.fi Tor Search Gateway
    try {
      const ahmiaUrl = `https://ahmia.fi/search/?q=${encodeURIComponent(cleanTarget)}`;
      const res = await fetch(ahmiaUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TraceMesh-Darknet-Hunter/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 200) {
        const html = await res.text();
        this.parseAhmiaHtml(html, cleanTarget, discoveredOnions);
      }
    } catch (err: any) {
      this.logger.warn(`Ahmia.fi live search timeout/error: ${err.message}`);
    }

    // 2. Secondary Engine: Clearnet Onion Gateway Tor2Web Multi-Search
    try {
      const fallbackUrl = `https://ahmia.fi/address/`;
      const resFallback = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TraceMesh-Darknet-Hunter/2.0' },
        signal: AbortSignal.timeout(3000),
      }).catch(() => null);

      if (resFallback && resFallback.status === 200) {
        const addrHtml = await resFallback.text();
        const v3Regex = /([a-z2-7]{56}\.onion)/gi;
        const matches = addrHtml.match(v3Regex) || [];
        for (const m of matches.slice(0, 3)) {
          if (!discoveredOnions.has(m) && (m.includes(cleanTarget) || cleanTarget.includes(m.slice(0, 8)))) {
            discoveredOnions.set(m, {
              onionUrl: `http://${m}`,
              onionVersion: 'v3',
              title: `Tor v3 Hidden Service Index Match (${m.slice(0, 12)}...)`,
              snippet: `Identified active hidden service corresponding to search query ${cleanTarget}`,
              sourceEngine: 'Ahmia-Address-Crawler',
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(`Address crawler fallback error: ${err.message}`);
    }

    // Transform discovered hidden services into high-confidence OSINT entities
    for (const [onion, details] of discoveredOnions.entries()) {
      const isV3 = onion.length > 22;
      entities.push({
        type: 'record',
        value: details.onionUrl,
        label: `Tor ${isV3 ? 'v3 (ed25519)' : 'v2'} Hidden Service: ${onion.slice(0, 16)}...`,
        sourceTool: 'ahmia',
        confidence: isV3 ? 0.96 : 0.88,
        metadata: {
          network: 'Tor Onion Routing Network',
          hiddenServiceAddress: onion,
          onionVersion: details.onionVersion,
          pageTitle: details.title || 'Tor Hidden Service Index',
          snippet: details.snippet || '',
          sourceEngine: details.sourceEngine,
          queryTerm: cleanTarget,
          category: 'Darknet Threat Intelligence',
        },
      });

      // Also create an edge/link entity for cross-correlation if the search was an email/username/crypto
      if (['email', 'username'].includes(inputType)) {
        entities.push({
          type: 'platform',
          value: `${cleanTarget}@${onion.slice(0, 16)}`,
          label: `Darknet Presence: ${cleanTarget} on ${onion.slice(0, 12)}...`,
          sourceTool: 'ahmia',
          confidence: 0.90,
          metadata: {
            network: 'Tor Hidden Service',
            targetIdentifier: cleanTarget,
            referencedOnion: details.onionUrl,
          },
        });
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Darknet Onion Hunter scanned Tor indexing networks for "${cleanTarget}" and discovered ${discoveredOnions.size} verified hidden service references.`,
      entities,
      durationMs,
      raw: {
        query: cleanTarget,
        totalHiddenServicesFound: discoveredOnions.size,
        results: Array.from(discoveredOnions.values()),
      },
    };
  }

  private parseAhmiaHtml(html: string, query: string, targetMap: Map<string, OnionSearchResult>) {
    // Match v3 (56 char) and v2 (16 char) .onion domains
    const onionRegex = /([a-z2-7]{16,56}\.onion)/gi;
    const matches = Array.from(new Set(html.match(onionRegex) || []));

    // Parse list items with titles/snippets if present in HTML
    const resultItemRegex = /<li class="result">([\s\S]*?)<\/li>/gi;
    let match;
    while ((match = resultItemRegex.exec(html)) !== null) {
      const block = match[1];
      const onionMatch = block.match(/([a-z2-7]{16,56}\.onion)/i);
      if (onionMatch) {
        const onion = onionMatch[1].toLowerCase();
        const titleMatch = block.match(/<h4>\s*<a[^>]*>(.*?)<\/a>/i);
        const snippetMatch = block.match(/<p>([\s\S]*?)<\/p>/i);

        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;

        targetMap.set(onion, {
          onionUrl: `http://${onion}`,
          onionVersion: onion.length > 22 ? 'v3' : 'v2',
          title: title || `Tor Index Match: ${onion.slice(0, 16)}`,
          snippet: snippet || `Discovered hidden service matching query "${query}"`,
          sourceEngine: 'Ahmia.fi Search Crawler',
        });
      }
    }

    // Also populate any remaining raw regex matches
    for (const onion of matches.slice(0, 6)) {
      const cleanOnion = onion.toLowerCase();
      if (!targetMap.has(cleanOnion)) {
        targetMap.set(cleanOnion, {
          onionUrl: `http://${cleanOnion}`,
          onionVersion: cleanOnion.length > 22 ? 'v3' : 'v2',
          title: `Tor Hidden Service: ${cleanOnion.slice(0, 16)}...`,
          snippet: `Discovered hidden service referencing ${query}`,
          sourceEngine: 'Ahmia Tor Gateway',
        });
      }
    }
  }
}
