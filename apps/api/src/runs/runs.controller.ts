import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Header,
} from '@nestjs/common';
import { RunsService } from './runs.service';
import { TimelineFilterService } from './timeline-filter.service';
import { HtmlDossierExporterService } from './html-dossier-exporter.service';
import { StixOpenCtiService } from './stix-opencti.service';
import { GraphPathfinderService } from './graph-pathfinder.service';
import { BatchRunRequest, AggregatedReport, DiscoveredEntity } from '@tracemesh/shared';

export interface TimelineFilterDto {
  entities: DiscoveredEntity[];
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

export interface PathfinderDto {
  entities: DiscoveredEntity[];
  sourceValue: string;
  targetValue: string;
}

@Controller('runs')
export class RunsController {
  constructor(
    private readonly runsService: RunsService,
    private readonly timelineFilterService: TimelineFilterService,
    private readonly htmlDossierExporterService: HtmlDossierExporterService,
    private readonly stixOpenCtiService: StixOpenCtiService,
    private readonly graphPathfinderService: GraphPathfinderService,
  ) {}

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async runBatch(@Body() body: BatchRunRequest): Promise<AggregatedReport> {
    return this.runsService.runBatch(body);
  }

  @Post('pathfinder')
  @HttpCode(HttpStatus.OK)
  findPath(@Body() body: PathfinderDto) {
    return this.graphPathfinderService.findShortestPath(
      body.entities || [],
      body.sourceValue,
      body.targetValue,
    );
  }

  @Post('timeline-filter')
  @HttpCode(HttpStatus.OK)
  async filterTimeline(@Body() body: TimelineFilterDto) {
    return this.timelineFilterService.generateTimeline(
      body.entities || [],
      body.startDate,
      body.endDate,
      body.tags || [],
    );
  }

  @Get('history')
  async getHistory(@Headers('x-user-id') userId?: string) {
    return this.runsService.getHistory(userId);
  }

  @Get(':id/export/html')
  @Header('Content-Type', 'text/html')
  async exportHtml(@Param('id') id: string): Promise<string> {
    const report = await this.runsService.getRunById(id);
    if (!report) {
      throw new NotFoundException(`Run with ID '${id}' not found`);
    }
    return this.htmlDossierExporterService.generateHtmlDossier(report);
  }

  @Get(':id/export/stix')
  @Header('Content-Type', 'application/json')
  async exportStix(@Param('id') id: string) {
    const report = await this.runsService.getRunById(id);
    if (!report) {
      throw new NotFoundException(`Run with ID '${id}' not found`);
    }
    return this.stixOpenCtiService.generateStixBundle(report);
  }

  @Get(':id')
  async getRunById(@Param('id') id: string): Promise<AggregatedReport> {
    const report = await this.runsService.getRunById(id);
    if (!report) {
      throw new NotFoundException(`Run with ID '${id}' not found`);
    }
    return report;
  }
}

