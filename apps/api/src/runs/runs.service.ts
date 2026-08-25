import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToolsService } from '../tools/tools.service';
import { AggregationService } from './aggregation.service';
import { HoleheRunner } from '../runners/holehe.runner';
import { SherlockRunner } from '../runners/sherlock.runner';
import { ExifToolRunner } from '../runners/exiftool.runner';
import { PhoneInfogaRunner } from '../runners/phoneinfoga.runner';
import { DomainReconRunner } from '../runners/domain-recon.runner';
import { MaigretRunner } from '../runners/maigret.runner';
import { GHuntRunner } from '../runners/ghunt.runner';
import { H8mailRunner } from '../runners/h8mail.runner';
import { SubfinderRunner } from '../runners/subfinder.runner';
import { SpiderFootRunner } from '../runners/spiderfoot.runner';
import { TheHarvesterRunner } from '../runners/theharvester.runner';
import { CensysRunner } from '../runners/censys.runner';
import { AhmiaRunner } from '../runners/ahmia.runner';
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
    private readonly phoneInfogaRunner: PhoneInfogaRunner,
    private readonly domainReconRunner: DomainReconRunner,
    private readonly maigretRunner: MaigretRunner,
    private readonly ghuntRunner: GHuntRunner,
    private readonly h8mailRunner: H8mailRunner,
    private readonly subfinderRunner: SubfinderRunner,
    private readonly spiderFootRunner: SpiderFootRunner,
    private readonly theHarvesterRunner: TheHarvesterRunner,
    private readonly censysRunner: CensysRunner,
    private readonly ahmiaRunner: AhmiaRunner,
  ) {
    this.runnerMap.set('holehe', this.holeheRunner);
    this.runnerMap.set('sherlock', this.sherlockRunner);
    this.runnerMap.set('exiftool', this.exifToolRunner);
    this.runnerMap.set('phoneinfoga', this.phoneInfogaRunner);
    this.runnerMap.set('domainrecon', this.domainReconRunner);
    this.runnerMap.set('maigret', this.maigretRunner);
    this.runnerMap.set('whatsmyname', this.sherlockRunner);
    this.runnerMap.set('ghunt', this.ghuntRunner);
    this.runnerMap.set('h8mail', this.h8mailRunner);
    this.runnerMap.set('subfinder', this.subfinderRunner);
    this.runnerMap.set('spiderfoot', this.spiderFootRunner);
    this.runnerMap.set('theharvester', this.theHarvesterRunner);
    this.runnerMap.set('censys', this.censysRunner);
    this.runnerMap.set('ahmia', this.ahmiaRunner);
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

  async getHistory(userId?: string) {
    try {
      const runs = await this.prisma.run.findMany({
        where: userId ? { userId } : {},
        include: {
          items: {
            include: {
              tool: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      if (runs && runs.length > 0) {
        return runs.map((r) => ({
          id: r.id,
          inputValue: r.inputValue,
          inputType: r.inputType,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          toolsCount: r.items.length,
          entitiesCount: r.items.reduce((acc, item) => {
            const ents = item.normalized as any[];
            return acc + (Array.isArray(ents) ? ents.length : 0);
          }, 0),
        }));
      }
    } catch (e) {
      this.logger.warn(`Could not query run history from Prisma: ${e}`);
    }

    // In-memory cached history
    const cachedRuns: any[] = [];
    for (const [key, val] of this.cache.entries()) {
      cachedRuns.push({
        id: val.report.runId,
        inputValue: val.report.root.value,
        inputType: val.report.root.type,
        status: 'completed',
        createdAt: val.report.createdAt,
        toolsCount: val.report.stats.totalTools,
        entitiesCount: val.report.entities.length,
      });
    }

    return cachedRuns;
  }

  async getRunById(runId: string): Promise<AggregatedReport | null> {
    // Check in-memory reports
    for (const [_, val] of this.cache.entries()) {
      if (val.report.runId === runId) {
        return val.report;
      }
    }

    try {
      const run = await this.prisma.run.findUnique({
        where: { id: runId },
        include: {
          items: {
            include: {
              tool: true,
            },
          },
        },
      });

      if (run) {
        const toolExecutions = run.items.map((item) => ({
          toolId: item.toolId,
          toolName: item.tool?.name || 'unknown',
          displayName: item.tool?.displayName || 'Module',
          status: item.status as any,
          durationMs: item.durationMs || 0,
          summary: `Historical execution (${item.status})`,
          entities: (item.normalized as any[]) || [],
          error: item.error || undefined,
        }));

        return this.aggregationService.aggregate(
          run.id,
          run.inputValue,
          run.inputType as InputType,
          toolExecutions,
          true,
        );
      }
    } catch (e) {
      this.logger.warn(`Could not find run by ID in Prisma: ${e}`);
    }

    return null;
  }
}
