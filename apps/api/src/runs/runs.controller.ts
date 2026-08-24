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
} from '@nestjs/common';
import { RunsService } from './runs.service';
import { BatchRunRequest, AggregatedReport } from '@tracemesh/shared';

@Controller('runs')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async runBatch(@Body() body: BatchRunRequest): Promise<AggregatedReport> {
    return this.runsService.runBatch(body);
  }

  @Get('history')
  async getHistory(@Headers('x-user-id') userId?: string) {
    return this.runsService.getHistory(userId);
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
