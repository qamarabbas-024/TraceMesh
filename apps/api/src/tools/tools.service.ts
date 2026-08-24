import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToolDTO, InputType, ToolTier } from '@tracemesh/shared';
import { INITIAL_TOOLS } from '../../prisma/seed';

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  // Fallback in-memory catalog
  private readonly fallbackTools: ToolDTO[] = INITIAL_TOOLS.map((tool, idx) => ({
    id: `seed-${idx + 1}-${tool.name}`,
    name: tool.name,
    displayName: tool.displayName,
    description: tool.description,
    category: tool.category,
    inputTypes: tool.inputTypes as InputType[],
    tier: tool.tier as ToolTier,
    executionType: tool.executionType as any,
    sourceUrl: tool.sourceUrl,
    trackedVersion: tool.trackedVersion,
    lastCheckedCommit: null,
    updateAvailable: false,
    license: tool.license,
    maintenanceStatus: tool.maintenanceStatus as any,
    inputSchema: null,
    outputSchema: null,
    isEnabled: tool.isEnabled,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: {
    inputType?: string;
    category?: string;
    tier?: string;
  }): Promise<ToolDTO[]> {
    try {
      const where: any = { isEnabled: true };

      if (query?.category) {
        where.category = query.category;
      }
      if (query?.tier) {
        where.tier = query.tier;
      }
      if (query?.inputType) {
        where.inputTypes = {
          has: query.inputType,
        };
      }

      const tools = await this.prisma.tool.findMany({
        where,
        orderBy: { displayName: 'asc' },
      });

      if (tools && tools.length > 0) {
        return tools.map((t) => ({
          ...t,
          inputTypes: t.inputTypes as InputType[],
          tier: t.tier as ToolTier,
          executionType: t.executionType as any,
          maintenanceStatus: t.maintenanceStatus as any,
          inputSchema: t.inputSchema as any,
          outputSchema: t.outputSchema as any,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        }));
      }
    } catch (e) {
      this.logger.warn(`Could not query tools from Prisma DB, using resilient fallback catalog: ${e}`);
    }

    // Resilient fallback filtering
    return this.fallbackTools.filter((tool) => {
      if (!tool.isEnabled) return false;
      if (query?.category && tool.category !== query.category) return false;
      if (query?.tier && tool.tier !== query.tier) return false;
      if (query?.inputType && !tool.inputTypes.includes(query.inputType as InputType)) return false;
      return true;
    });
  }

  async findOne(idOrName: string): Promise<ToolDTO | null> {
    try {
      const tool = await this.prisma.tool.findFirst({
        where: {
          OR: [{ id: idOrName }, { name: idOrName }],
        },
      });

      if (tool) {
        return {
          ...tool,
          inputTypes: tool.inputTypes as InputType[],
          tier: tool.tier as ToolTier,
          executionType: tool.executionType as any,
          maintenanceStatus: tool.maintenanceStatus as any,
          inputSchema: tool.inputSchema as any,
          outputSchema: tool.outputSchema as any,
          createdAt: tool.createdAt.toISOString(),
          updatedAt: tool.updatedAt.toISOString(),
        };
      }
    } catch (e) {
      this.logger.warn(`Could not find tool in DB, searching fallback catalog: ${e}`);
    }

    const fallback = this.fallbackTools.find((t) => t.id === idOrName || t.name === idOrName);
    return fallback || null;
  }
}
