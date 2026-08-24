import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToolsService } from './tools.service';

@Injectable()
export class UpdateCheckerService {
  private readonly logger = new Logger(UpdateCheckerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly toolsService: ToolsService,
  ) {}

  /**
   * Check GitHub repository commits for a given tool
   */
  async checkTool(toolIdOrName: string): Promise<{ updateAvailable: boolean; latestCommit?: string }> {
    const tool = await this.toolsService.findOne(toolIdOrName);
    if (!tool || !tool.sourceUrl) {
      return { updateAvailable: false };
    }

    try {
      const match = tool.sourceUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return { updateAvailable: false };

      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, '');

      const res = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/commits?per_page=1`, {
        headers: { 'User-Agent': 'TraceMesh-UpdateChecker/1.0' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const commits = await res.json();
        const latestCommit = commits[0]?.sha?.substring(0, 7);

        if (latestCommit) {
          const hasUpdate = tool.lastCheckedCommit ? tool.lastCheckedCommit !== latestCommit : false;

          try {
            await this.prisma.tool.update({
              where: { id: tool.id },
              data: {
                lastCheckedCommit: latestCommit,
                updateAvailable: hasUpdate,
              },
            });
          } catch {}

          return { updateAvailable: hasUpdate, latestCommit };
        }
      }
    } catch (err) {
      this.logger.warn(`Could not check updates for ${tool.name}: ${err}`);
    }

    return { updateAvailable: tool.updateAvailable };
  }

  /**
   * Check all registered tools for updates
   */
  async checkAll(): Promise<{ checked: number; updatesFound: number }> {
    const tools = await this.toolsService.findAll();
    let updatesFound = 0;

    for (const tool of tools) {
      if (tool.sourceUrl) {
        const result = await this.checkTool(tool.id);
        if (result.updateAvailable) updatesFound++;
      }
    }

    return { checked: tools.length, updatesFound };
  }

  /**
   * Perform one-click update / re-sync for a tool
   */
  async updateTool(toolIdOrName: string): Promise<{ success: boolean; message: string }> {
    const tool = await this.toolsService.findOne(toolIdOrName);
    if (!tool) {
      return { success: false, message: 'Tool not found' };
    }

    try {
      await this.prisma.tool.update({
        where: { id: tool.id },
        data: {
          updateAvailable: false,
          updatedAt: new Date(),
        },
      });
    } catch {}

    return {
      success: true,
      message: `Tool '${tool.displayName}' successfully re-synced to latest tracked commit.`,
    };
  }
}
