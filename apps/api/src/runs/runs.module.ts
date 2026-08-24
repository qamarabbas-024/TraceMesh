import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { AggregationService } from './aggregation.service';
import { ToolsModule } from '../tools/tools.module';
import { HoleheRunner } from '../runners/holehe.runner';
import { SherlockRunner } from '../runners/sherlock.runner';
import { ExifToolRunner } from '../runners/exiftool.runner';
import { PhoneInfogaRunner } from '../runners/phoneinfoga.runner';
import { DomainReconRunner } from '../runners/domain-recon.runner';

@Module({
  imports: [ToolsModule],
  controllers: [RunsController],
  providers: [
    RunsService,
    AggregationService,
    HoleheRunner,
    SherlockRunner,
    ExifToolRunner,
    PhoneInfogaRunner,
    DomainReconRunner,
  ],
  exports: [RunsService, AggregationService],
})
export class RunsModule {}
