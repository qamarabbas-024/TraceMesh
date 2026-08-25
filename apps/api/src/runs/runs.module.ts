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
import { MaigretRunner } from '../runners/maigret.runner';
import { GHuntRunner } from '../runners/ghunt.runner';
import { H8mailRunner } from '../runners/h8mail.runner';
import { SubfinderRunner } from '../runners/subfinder.runner';
import { SpiderFootRunner } from '../runners/spiderfoot.runner';
import { TheHarvesterRunner } from '../runners/theharvester.runner';
import { CensysRunner } from '../runners/censys.runner';
import { AhmiaRunner } from '../runners/ahmia.runner';

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
    MaigretRunner,
    GHuntRunner,
    H8mailRunner,
    SubfinderRunner,
    SpiderFootRunner,
    TheHarvesterRunner,
    CensysRunner,
    AhmiaRunner,
  ],
  exports: [RunsService, AggregationService],
})
export class RunsModule {}
