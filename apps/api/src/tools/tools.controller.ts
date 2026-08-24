import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ToolsService } from './tools.service';
import { UpdateCheckerService } from './update-checker.service';
import { CatalogIngestService } from './catalog-ingest.service';
import { ToolDTO, CreateToolDTO } from '@tracemesh/shared';

@Controller('tools')
export class ToolsController {
  constructor(
    private readonly toolsService: ToolsService,
    private readonly updateCheckerService: UpdateCheckerService,
    private readonly catalogIngestService: CatalogIngestService,
  ) {}

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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTool(@Body() createToolDto: CreateToolDTO): Promise<ToolDTO> {
    return this.toolsService.create(createToolDto);
  }

  @Post('ingest-catalog')
  @HttpCode(HttpStatus.OK)
  async ingestCatalog() {
    return this.catalogIngestService.ingestCatalog();
  }

  @Post(':id/check-update')
  @HttpCode(HttpStatus.OK)
  async checkToolUpdate(@Param('id') id: string) {
    return this.updateCheckerService.checkTool(id);
  }

  @Post('check-all-updates')
  @HttpCode(HttpStatus.OK)
  async checkAllUpdates() {
    return this.updateCheckerService.checkAll();
  }

  @Post(':id/update')
  @HttpCode(HttpStatus.OK)
  async performUpdate(@Param('id') id: string) {
    return this.updateCheckerService.updateTool(id);
  }
}
