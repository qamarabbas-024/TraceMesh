import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RunsService } from './runs.service';
import { BatchRunRequest, AggregatedReport } from '@tracemesh/shared';

@Controller('run-batch')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async runBatch(@Body() body: BatchRunRequest): Promise<AggregatedReport> {
    return this.runsService.runBatch(body);
  }
}
