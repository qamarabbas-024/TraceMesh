import { Injectable, Logger } from '@nestjs/common';
import { DiscoveredEntity } from '@tracemesh/shared';

export interface CrossInvestigationLink {
  entityValue: string;
  entityType: string;
  sharedRunIds: string[];
  occurrencesCount: number;
  confidenceAverage: number;
  primarySources: string[];
}

export interface PivotMatrixResult {
  queryTerm: string;
  totalMatches: number;
  correlatedRunsCount: number;
  crossLinks: CrossInvestigationLink[];
  clusteredSubjects: string[];
}

@Injectable()
export class PivotMatrixService {
  private readonly logger = new Logger(PivotMatrixService.name);
  private readonly globalEntityIndex = new Map<string, {
    entity: DiscoveredEntity;
    runs: Set<string>;
    sources: Set<string>;
    confidences: number[];
  }>();

  /**
   * Index entities from completed runs
   */
  public indexRunEntities(runId: string, entities: DiscoveredEntity[]) {
    for (const e of entities) {
      const key = `${e.type}:${e.value.toLowerCase().trim()}`;
      if (!this.globalEntityIndex.has(key)) {
        this.globalEntityIndex.set(key, {
          entity: e,
          runs: new Set([runId]),
          sources: new Set([e.sourceTool]),
          confidences: [e.confidence || 0.8],
        });
      } else {
        const item = this.globalEntityIndex.get(key)!;
        item.runs.add(runId);
        item.sources.add(e.sourceTool);
        item.confidences.push(e.confidence || 0.8);
      }
    }
  }

  /**
   * Search matrix for cross-investigation pivots
   */
  public searchMatrix(query: string): PivotMatrixResult {
    const q = query.toLowerCase().trim();
    const matches: CrossInvestigationLink[] = [];
    const runSet = new Set<string>();

    for (const [key, item] of this.globalEntityIndex.entries()) {
      if (key.includes(q) || item.entity.value.toLowerCase().includes(q)) {
        for (const r of item.runs) runSet.add(r);
        const avgConf = item.confidences.reduce((a, b) => a + b, 0) / item.confidences.length;

        matches.push({
          entityValue: item.entity.value,
          entityType: item.entity.type,
          sharedRunIds: Array.from(item.runs),
          occurrencesCount: item.runs.size,
          confidenceAverage: Math.round(avgConf * 100) / 100,
          primarySources: Array.from(item.sources),
        });
      }
    }

    // Sort by most connected / multi-run occurrences
    matches.sort((a, b) => b.occurrencesCount - a.occurrencesCount);

    return {
      queryTerm: query,
      totalMatches: matches.length,
      correlatedRunsCount: runSet.size,
      crossLinks: matches,
      clusteredSubjects: Array.from(runSet),
    };
  }
}
