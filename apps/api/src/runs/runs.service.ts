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
import { GitHubReconRunner } from '../runners/github-recon.runner';
import { CrtShRunner } from '../runners/crtsh.runner';
import { IPInfoRunner } from '../runners/ipinfo.runner';
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
    private readonly gitHubReconRunner: GitHubReconRunner,
    private readonly crtShRunner: CrtShRunner,
    private readonly ipInfoRunner: IPInfoRunner,
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
    this.runnerMap.set('github_recon', this.gitHubReconRunner);
    this.runnerMap.set('crtsh', this.crtShRunner);
    this.runnerMap.set('ipinfo', this.ipInfoRunner);
  }

  async runBatch(req: BatchRunRequest, userId?: string): Promise<AggregatedReport> {
    const { inputValue, inputType, toolIds, bypassCache } = req;
    const cacheKey = `${inputType}:${inputValue.toLowerCase().trim()}:${toolIds.sort().join(',')}`;

    // Check cache
    if (!bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.log(`Serving cached aggregated result for ${cacheKey}`);
        return {
          ...cached.report,
          stats: {
            ...cached.report.stats,
            cached: true,
          },
        };
      }
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const registeredTools = await this.toolsService.findAll();
    const activeToolMap = new Map(registeredTools.map((t) => [t.id, t]));
    const nameToToolMap = new Map(registeredTools.map((t) => [t.name, t]));

    // Execute selected tools in parallel with timeout protection
    const executionPromises = toolIds.map(async (toolIdOrName) => {
      const tool = activeToolMap.get(toolIdOrName) || nameToToolMap.get(toolIdOrName);
      const toolName = tool?.name || toolIdOrName;
      const displayName = tool?.displayName || toolName;
      const runner = this.runnerMap.get(toolName);

      if (!runner) {
        return {
          toolId: tool?.id || toolIdOrName,
          toolName,
          displayName,
          status: 'error' as const,
          durationMs: 0,
          summary: `Runner not found for tool: ${displayName}`,
          entities: [],
          error: 'Runner not implemented',
        };
      }

      try {
        const timeoutPromise = new Promise<NormalizedResult>((_, reject) =>
          setTimeout(() => reject(new Error(`Tool ${displayName} timed out after 8s`)), this.TOOL_TIMEOUT_MS),
        );

        const execPromise = runner.execute(inputValue, inputType);
        const result = await Promise.race([execPromise, timeoutPromise]);
        const finalStatus: 'success' | 'error' | 'timeout' =
          result.status === 'success' ? 'success' : 'error';

        return {
          toolId: tool?.id || toolIdOrName,
          toolName,
          displayName,
          status: finalStatus,
          durationMs: result.durationMs || 0,
          summary: result.summary,
          entities: result.entities,
          error: result.error,
        };
      } catch (err: any) {
        const isTimeout = err.message?.includes('timed out');
        return {
          toolId: tool?.id || toolIdOrName,
          toolName,
          displayName,
          status: (isTimeout ? 'timeout' : 'error') as 'timeout' | 'error',
          durationMs: this.TOOL_TIMEOUT_MS,
          summary: isTimeout ? `Execution timed out (${displayName})` : `Execution error: ${err.message}`,
          entities: [],
          error: err.message,
        };
      }
    });

    const settled = await Promise.allSettled(executionPromises);
    const results = settled.map((s, idx) => {
      if (s.status === 'fulfilled') return s.value;
      return {
        toolId: toolIds[idx],
        toolName: toolIds[idx],
        displayName: toolIds[idx],
        status: 'error' as const,
        durationMs: 0,
        summary: 'Unhandled runner failure',
        entities: [],
        error: s.reason?.message || 'Unknown error',
      };
    });

    // Aggregate into unified entity graph & compute OPSEC score
    const report = this.aggregationService.aggregate(runId, inputValue, inputType, results, false);

    // Save to Cache
    this.cache.set(cacheKey, {
      report,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    // Persist to DB if database is connected
    try {
      if (this.prisma.run) {
        await this.prisma.run.create({
          data: {
            id: runId,
            userId: userId || null,
            inputValue,
            inputType,
            status: 'COMPLETED',
          },
        });
      }
    } catch {
      // Graceful fallback if Postgres is in local memory mode
    }

    return report;
  }

  async getHistory(userId?: string): Promise<any[]> {
    try {
      const runs = await this.prisma.run.findMany({
        where: userId ? { userId } : {},
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      return runs;
    } catch {
      return Array.from(this.cache.values()).map((c) => ({
        id: c.report.runId,
        inputValue: c.report.root.value,
        inputType: c.report.root.type,
        totalEntities: c.report.entities.length,
        createdAt: c.report.createdAt,
        status: 'COMPLETED',
      }));
    }
  }

  async getRunById(id: string): Promise<AggregatedReport | null> {
    for (const c of this.cache.values()) {
      if (c.report.runId === id) return c.report;
    }

    try {
      const run = await this.prisma.run.findUnique({ where: { id } });
      if (!run) return null;

      return {
        runId: run.id,
        root: { value: run.inputValue, type: run.inputType as InputType },
        entities: [],
        toolResults: [],
        stats: {
          totalTools: 0,
          successCount: 0,
          errorCount: 0,
          totalEntities: 0,
          durationMs: 0,
          cached: true,
        },
        createdAt: run.createdAt.toISOString(),
      };
    } catch {
      return null;
    }
  }
}
