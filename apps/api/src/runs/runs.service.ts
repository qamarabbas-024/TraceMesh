import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToolsService } from '../tools/tools.service';
import { AggregationService } from './aggregation.service';
import { HoleheRunner } from '../runners/holehe.runner';
import { SherlockRunner } from '../runners/sherlock.runner';
import { ExifToolRunner } from '../runners/exiftool.runner';
import { ToolRunner } from '../runners/runner.interface';
import {
  BatchRunRequest,
  AggregatedReport,
  InputType,
  NormalizedResult,
} from '@tracemesh/shared';

@Injectable()
export class RunsService {
  private readonly logger = new Logger(RunsService.name);
  private readonly runnerMap = new Map<string, ToolRunner>();
  private readonly cache = new Map<string, { report: AggregatedReport; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
  private readonly TOOL_TIMEOUT_MS = 8000; // 8 seconds per tool timeout

  constructor(
    private readonly prisma: PrismaService,
    private readonly toolsService: ToolsService,
    private readonly aggregationService: AggregationService,
    private readonly holeheRunner: HoleheRunner,
    private readonly sherlockRunner: SherlockRunner,
    private readonly exifToolRunner: ExifToolRunner,
  ) {
    this.runnerMap.set('holehe', this.holeheRunner);
    this.runnerMap.set('sherlock', this.sherlockRunner);
    this.runnerMap.set('exiftool', this.exifToolRunner);
  }

  async runBatch(req: BatchRunRequest): Promise<AggregatedReport> {
    const { inputValue, inputType, toolIds, bypassCache } = req;
    const cleanInput = inputValue.trim();
    const sortedToolIds = [...toolIds].sort().join(',');
    const cacheKey = `${inputType}:${cleanInput.toLowerCase()}:${sortedToolIds}`;

    // Check result cache
    if (!bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.log(`Serving cached aggregated result for key: ${cacheKey}`);
        return {
          ...cached.report,
          stats: {
            ...cached.report.stats,
            cached: true,
          },
        };
      }
    }

    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const allTools = await this.toolsService.findAll();
    const selectedTools = allTools.filter(
      (t) => toolIds.includes(t.id) || toolIds.includes(t.name),
    );

    // Launch all selected tools in parallel with timeout protection
    const executionPromises = selectedTools.map(async (tool) => {
      const runner = this.runnerMap.get(tool.name.toLowerCase());
      const toolStartTime = Date.now();

      if (!runner) {
        return {
          toolId: tool.id,
          toolName: tool.name,
          displayName: tool.displayName,
          status: 'error' as const,
          durationMs: 0,
          summary: `No execution runner registered for tool '${tool.name}'`,
          entities: [],
          error: 'Runner not implemented',
        };
      }

      try {
        // Enforce per-tool timeout
        const result = await Promise.race<NormalizedResult>([
          runner.execute(cleanInput, inputType),
          new Promise<NormalizedResult>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Execution timed out after ${this.TOOL_TIMEOUT_MS}ms`)),
              this.TOOL_TIMEOUT_MS,
            ),
          ),
        ]);

        return {
          toolId: tool.id,
          toolName: tool.name,
          displayName: tool.displayName,
          status: result.status === 'success' ? ('success' as const) : ('error' as const),
          durationMs: result.durationMs || Date.now() - toolStartTime,
          summary: result.summary,
          entities: result.entities || [],
          error: result.error,
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown execution error';
        const isTimeout = errorMsg.includes('timed out');
        return {
          toolId: tool.id,
          toolName: tool.name,
          displayName: tool.displayName,
          status: isTimeout ? ('timeout' as const) : ('error' as const),
          durationMs: Date.now() - toolStartTime,
          summary: `Execution failed: ${errorMsg}`,
          entities: [],
          error: errorMsg,
        };
      }
    });

    const settledResults = await Promise.allSettled(executionPromises);
    const toolExecutions = settledResults.map((r, idx) => {
      if (r.status === 'fulfilled') {
        return r.value;
      }
      const tool = selectedTools[idx];
      return {
        toolId: tool?.id || `tool-${idx}`,
        toolName: tool?.name || 'unknown',
        displayName: tool?.displayName || 'Unknown Tool',
        status: 'error' as const,
        durationMs: 0,
        summary: 'Unhandled execution rejection',
        entities: [],
        error: String(r.reason),
      };
    });

    // Aggregate normalized results
    const report = this.aggregationService.aggregate(
      runId,
      cleanInput,
      inputType,
      toolExecutions,
      false,
    );

    // Save to result cache
    this.cache.set(cacheKey, {
      report,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    // Persist to database if available
    try {
      await this.prisma.run.create({
        data: {
          id: runId,
          inputType,
          inputValue: cleanInput,
          status: 'completed',
          items: {
            create: toolExecutions.map((t) => ({
              toolId: t.toolId.startsWith('seed-') || t.toolId.startsWith('custom-') ? undefined : t.toolId,
              status: t.status,
              normalized: t.entities as any,
              error: t.error || null,
              durationMs: t.durationMs,
            })).filter((item) => item.toolId !== undefined),
          },
        },
      });
    } catch (e) {
      this.logger.warn(`Could not persist run to database: ${e}`);
    }

    return report;
  }
}
