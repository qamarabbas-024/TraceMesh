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
    }[],
    cached: boolean = false,
  ): AggregatedReport {
    const entityMap = new Map<string, DiscoveredEntity>();

    // Merge and deduplicate entities
    for (const execution of toolExecutions) {
      for (const entity of execution.entities) {
        const key = `${entity.type}:${entity.value.toLowerCase().trim()}`;
        const existing = entityMap.get(key);

        if (existing) {
          existing.metadata = {
            ...existing.metadata,
            ...entity.metadata,
            additionalSource: entity.sourceTool,
          };
          existing.confidence = Math.min(1.0, (existing.confidence || 0.8) + 0.1);
        } else {
          entityMap.set(key, { ...entity });
        }
      }
    }

    const uniqueEntities = Array.from(entityMap.values());
    const totalDuration = toolExecutions.reduce((max, t) => Math.max(max, t.durationMs), 0);

    // Calculate OPSEC Exposure Score (0-100%) and Threat Matrix
    let rawScore = 0;
    for (const entity of uniqueEntities) {
      if (entity.type === 'breach') {
        rawScore += 25;
      } else if (entity.type === 'platform') {
        rawScore += 8;
      } else if (entity.type === 'ip' || entity.type === 'domain') {
        rawScore += 12;
      } else if (entity.type === 'record') {
        rawScore += 15;
      } else {
        rawScore += 5;
      }
    }

    const opsecScore = Math.min(100, Math.max(10, Math.round(rawScore)));
    let threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (opsecScore >= 80) threatLevel = 'CRITICAL';
    else if (opsecScore >= 55) threatLevel = 'HIGH';
    else if (opsecScore >= 30) threatLevel = 'MEDIUM';

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
      createdAt: new Date().toISOString(),
    };
  }
}
