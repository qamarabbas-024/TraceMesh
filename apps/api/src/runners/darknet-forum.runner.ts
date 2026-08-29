import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface DarknetForumMatch {
  forumName: string;
  onionUrl: string;
  postTitle: string;
  snippet: string;
  dateObserved: string;
  category: 'LEAK' | 'MARKETPLACE' | 'DISCUSSION' | 'EXPLOIT_THREAD';
  threatLevel: 'HIGH' | 'CRITICAL' | 'MEDIUM';
}

@Injectable()
export class DarknetForumRunner implements ToolRunner {
  readonly toolName = 'darknet_forums';
  readonly supportedInputTypes: InputType[] = ['email', 'username', 'domain', 'ip'];
  private readonly logger = new Logger(DarknetForumRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim();

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target required for Darknet Forum and Underground Market search',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const forumMatches: DarknetForumMatch[] = [];

    // Query open Tor indexer gateway (Ahmia Onion Search engine)
    try {
      const searchUrl = `https://ahmia.fi/search/?q=${encodeURIComponent(cleanTarget)}`;
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TraceMesh-ThreatIntel/3.0' },
        signal: AbortSignal.timeout(6500),
      });

      if (res.status === 200) {
        const html = await res.text();
        // Parse search result list items: <li class="result">
        const resultItems = html.split('<li class="result">').slice(1);

        for (const item of resultItems.slice(0, 6)) {
          const urlMatch = item.match(/href="([^"]+)"/);
          const titleMatch = item.match(/<a[^>]*>([\s\S]*?)<\/a>/);
          const snippetMatch = item.match(/<p>([\s\S]*?)<\/p>/);

          if (urlMatch && titleMatch) {
            let onionLink = urlMatch[1];
            if (onionLink.includes('redirect_url=')) {
              onionLink = decodeURIComponent(onionLink.split('redirect_url=')[1]);
            }

            const cleanTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
            const cleanSnippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

            // Classify category based on content
            let category: DarknetForumMatch['category'] = 'DISCUSSION';
            let threatLevel: DarknetForumMatch['threatLevel'] = 'MEDIUM';

            const lowerContent = `${cleanTitle} ${cleanSnippet}`.toLowerCase();
            if (lowerContent.includes('leak') || lowerContent.includes('database') || lowerContent.includes('dump') || lowerContent.includes('breach')) {
              category = 'LEAK';
              threatLevel = 'CRITICAL';
            } else if (lowerContent.includes('market') || lowerContent.includes('escrow') || lowerContent.includes('vendor') || lowerContent.includes('buy') || lowerContent.includes('sell')) {
              category = 'MARKETPLACE';
              threatLevel = 'HIGH';
            } else if (lowerContent.includes('0day') || lowerContent.includes('cve') || lowerContent.includes('exploit') || lowerContent.includes('botnet')) {
              category = 'EXPLOIT_THREAD';
              threatLevel = 'CRITICAL';
            }

            // Determine forum title/identity
            const hostMatch = onionLink.match(/([a-z0-9]{16,56}\.onion)/i);
            const onionHost = hostMatch ? hostMatch[1] : 'Hidden Service';

            forumMatches.push({
              forumName: cleanTitle.slice(0, 50) || `Darknet Node (${onionHost.slice(0, 10)}...)`,
              onionUrl: onionLink,
              postTitle: cleanTitle,
              snippet: cleanSnippet.slice(0, 160),
              dateObserved: new Date().toISOString(),
              category,
              threatLevel,
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Darknet forum gateway query encountered timeout or connection error: ${err.message}`);
    }

    // Transform into Graph Entities
    for (const match of forumMatches) {
      entities.push({
        type: 'record',
        value: match.onionUrl,
        label: `🕵️ [${match.category}] ${match.postTitle || match.forumName}`,
        sourceTool: 'darknet_forums',
        confidence: match.threatLevel === 'CRITICAL' ? 0.96 : 0.88,
        metadata: {
          category: match.category,
          threatLevel: match.threatLevel,
          onionUrl: match.onionUrl,
          postTitle: match.postTitle,
          snippet: match.snippet,
          dateObserved: match.dateObserved,
          intelType: 'Darknet Forum & Underground Market Intelligence',
        },
      });

      // Extract onion domain node
      const onionHost = match.onionUrl.match(/([a-z0-9]{16,56}\.onion)/i)?.[1];
      if (onionHost) {
        entities.push({
          type: 'domain',
          value: onionHost,
          label: `Darknet Hidden Service: ${onionHost.slice(0, 12)}...onion`,
          sourceTool: 'darknet_forums',
          confidence: 0.95,
          metadata: {
            network: 'Tor Hidden Service (Onion v3/v2)',
            referencedTitle: match.postTitle,
          },
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const hasMatches = forumMatches.length > 0;

    return {
      status: 'success',
      summary: hasMatches
        ? `Darknet Forum Hunter discovered ${forumMatches.length} underground discussions and hidden market listings referencing "${cleanTarget}".`
        : `Darknet Forum Hunter scanned indexed hidden service forums for "${cleanTarget}": zero public listings or database dump mentions detected.`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        matchCount: forumMatches.length,
        matches: forumMatches,
      },
    };
  }
}
