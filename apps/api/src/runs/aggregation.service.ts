import { Injectable } from '@nestjs/common';
import { DiscoveredEntity, AggregatedReport, InputType } from '@tracemesh/shared';

@Injectable()
export class AggregationService {
  aggregate(
    runId: string,
    inputValue: string,
    inputType: InputType,
    toolExecutions: {
      toolId: string;
      toolName: string;
      displayName: string;
      status: 'success' | 'error' | 'timeout';
      durationMs: number;
      summary: string;
      entities: DiscoveredEntity[];
      error?: string;
      hop?: number;
    }[],
    cached: boolean = false,
  ): AggregatedReport {
    const entityMap = new Map<string, DiscoveredEntity>();
    const hopStats = new Map<number, { count: number; tools: number }>();

    // Merge and deduplicate entities with hop tracking
    for (const execution of toolExecutions) {
      const hop = execution.hop || 1;
      const currentHopStat = hopStats.get(hop) || { count: 0, tools: 0 };
      currentHopStat.tools += 1;
      currentHopStat.count += execution.entities.length;
      hopStats.set(hop, currentHopStat);

      for (const entity of execution.entities) {
        const key = `${entity.type}:${entity.value.toLowerCase().trim()}`;
        const existing = entityMap.get(key);

        if (existing) {
          existing.metadata = {
            ...existing.metadata,
            ...entity.metadata,
            additionalSource: entity.sourceTool,
          };
          existing.confidence = Math.min(1.0, (existing.confidence || 0.8) + 0.08);
          // Keep lowest hop level (closest connection to root)
          if (entity.hopLevel && (!existing.hopLevel || entity.hopLevel < existing.hopLevel)) {
            existing.hopLevel = entity.hopLevel;
            existing.parentValue = entity.parentValue;
          }
        } else {
          entityMap.set(key, {
            ...entity,
            hopLevel: entity.hopLevel || hop,
            parentValue: entity.parentValue || inputValue,
          });
        }
      }
    }

    const uniqueEntities = Array.from(entityMap.values());
    const totalDuration = toolExecutions.reduce((max, t) => Math.max(max, t.durationMs), 0);

    // Calculate OPSEC Exposure Score (0-100%) and Threat Matrix
    let rawScore = 0;
    for (const entity of uniqueEntities) {
      const hopWeight = entity.hopLevel === 1 ? 1.0 : entity.hopLevel === 2 ? 0.75 : 0.5;
      if (entity.type === 'breach') {
        rawScore += 25 * hopWeight;
      } else if (entity.type === 'platform') {
        rawScore += 8 * hopWeight;
      } else if (entity.type === 'ip' || entity.type === 'domain') {
        rawScore += 12 * hopWeight;
      } else if (entity.type === 'record') {
        rawScore += 15 * hopWeight;
      } else {
        rawScore += 5 * hopWeight;
      }
    }

    const opsecScore = Math.min(100, Math.max(10, Math.round(rawScore)));
    let threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (opsecScore >= 80) threatLevel = 'CRITICAL';
    else if (opsecScore >= 55) threatLevel = 'HIGH';
    else if (opsecScore >= 30) threatLevel = 'MEDIUM';

    const hopSummary = Array.from(hopStats.entries())
      .sort(([a], [b]) => a - b)
      .map(([hop, stats]) => ({
        hop,
        entityCount: stats.count,
        toolsExecuted: stats.tools,
      }));

    return {
      runId,
      root: {
        value: inputValue,
        type: inputType,
      },
      entities: uniqueEntities,
      toolResults: toolExecutions.map((t) => ({
        toolId: t.toolId,
        toolName: t.toolName,
        displayName: t.displayName,
        status: t.status,
        durationMs: t.durationMs,
        summary: t.summary,
        entitiesCount: t.entities.length,
        error: t.error,
      })),
      stats: {
        totalTools: toolExecutions.length,
        successCount: toolExecutions.filter((t) => t.status === 'success').length,
        errorCount: toolExecutions.filter((t) => t.status !== 'success').length,
        totalEntities: uniqueEntities.length,
        durationMs: totalDuration,
        cached,
      },
      opsecScore,
      threatLevel,
      hopSummary: hopSummary.length > 0 ? hopSummary : [{ hop: 1, entityCount: uniqueEntities.length, toolsExecuted: toolExecutions.length }],
      createdAt: new Date().toISOString(),
    };
  }
}
