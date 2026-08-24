import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToolDTO, CreateToolDTO, InputType, ToolTier } from '@tracemesh/shared';
import { INITIAL_TOOLS } from '../../prisma/seed';

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  // Fallback in-memory catalog
  private fallbackTools: ToolDTO[] = INITIAL_TOOLS.map((tool, idx) => ({
    id: `seed-${idx + 1}-${tool.name}`,
    name: tool.name,
    displayName: tool.displayName,
    description: tool.description,
    category: tool.category,
    inputTypes: tool.inputTypes as InputType[],
    tier: (tool.tier || 'tier1') as ToolTier,
    executionType: (tool.executionType || 'edge') as any,
    sourceUrl: tool.sourceUrl || null,
    trackedVersion: tool.trackedVersion || '1.0.0',
    lastCheckedCommit: null,
    updateAvailable: false,
    license: tool.license || 'MIT',
    maintenanceStatus: (tool.maintenanceStatus || 'active') as any,
    inputSchema: null,
    outputSchema: null,
    isEnabled: tool.isEnabled ?? true,
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

  async create(dto: CreateToolDTO): Promise<ToolDTO> {
    if (!dto.name || !dto.displayName || !dto.description || !dto.category || !dto.inputTypes?.length) {
      throw new BadRequestException('Required fields missing: name, displayName, description, category, inputTypes');
    }

    const normalizedName = dto.name.toLowerCase().trim();

    try {
      const created = await this.prisma.tool.upsert({
        where: { name: normalizedName },
        update: {
          displayName: dto.displayName,
          description: dto.description,
          category: dto.category,
          inputTypes: dto.inputTypes,
          tier: dto.tier || 'tier1',
          executionType: dto.executionType || 'edge',
          sourceUrl: dto.sourceUrl || null,
          trackedVersion: dto.trackedVersion || '1.0.0',
          license: dto.license || 'MIT',
          maintenanceStatus: dto.maintenanceStatus || 'active',
          inputSchema: dto.inputSchema || undefined,
          outputSchema: dto.outputSchema || undefined,
          isEnabled: dto.isEnabled ?? true,
        },
        create: {
          name: normalizedName,
          displayName: dto.displayName,
          description: dto.description,
          category: dto.category,
          inputTypes: dto.inputTypes,
          tier: dto.tier || 'tier1',
          executionType: dto.executionType || 'edge',
          sourceUrl: dto.sourceUrl || null,
          trackedVersion: dto.trackedVersion || '1.0.0',
          license: dto.license || 'MIT',
          maintenanceStatus: dto.maintenanceStatus || 'active',
          inputSchema: dto.inputSchema || undefined,
          outputSchema: dto.outputSchema || undefined,
          isEnabled: dto.isEnabled ?? true,
        },
      });

      return {
        ...created,
        inputTypes: created.inputTypes as InputType[],
        tier: created.tier as ToolTier,
        executionType: created.executionType as any,
        maintenanceStatus: created.maintenanceStatus as any,
        inputSchema: created.inputSchema as any,
        outputSchema: created.outputSchema as any,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (e) {
      this.logger.warn(`Could not write tool to DB, adding to in-memory fallback catalog: ${e}`);
    }

    // Fallback in-memory registration
    const newTool: ToolDTO = {
      id: `custom-${Date.now()}-${normalizedName}`,
      name: normalizedName,
      displayName: dto.displayName,
      description: dto.description,
      category: dto.category,
      inputTypes: dto.inputTypes,
      tier: dto.tier || 'tier1',
      executionType: dto.executionType || 'edge',
      sourceUrl: dto.sourceUrl || null,
      trackedVersion: dto.trackedVersion || '1.0.0',
      lastCheckedCommit: null,
      updateAvailable: false,
      license: dto.license || 'MIT',
      maintenanceStatus: dto.maintenanceStatus || 'active',
      inputSchema: dto.inputSchema || null,
      outputSchema: dto.outputSchema || null,
      isEnabled: dto.isEnabled ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.fallbackTools = [newTool, ...this.fallbackTools.filter((t) => t.name !== normalizedName)];
    return newTool;
  }
}
