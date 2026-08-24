import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { ToolDTO } from '@tracemesh/shared';

@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  async getTools(
    @Query('inputType') inputType?: string,
    @Query('category') category?: string,
    @Query('tier') tier?: string,
  ): Promise<ToolDTO[]> {
    return this.toolsService.findAll({ inputType, category, tier });
  }

  @Get(':id')
  async getToolById(@Param('id') id: string): Promise<ToolDTO> {
    const tool = await this.toolsService.findOne(id);
    if (!tool) {
      throw new NotFoundException(`Tool with ID or name '${id}' not found`);
    }
    return tool;
  }
}
