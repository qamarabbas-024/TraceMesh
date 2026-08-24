import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';
import { UpdateCheckerService } from './update-checker.service';
import { CatalogIngestService } from './catalog-ingest.service';

@Module({
  controllers: [ToolsController],
  providers: [ToolsService, UpdateCheckerService, CatalogIngestService],
  exports: [ToolsService, UpdateCheckerService, CatalogIngestService],
})
export class ToolsModule {}
