import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';
import { UpdateCheckerService } from './update-checker.service';

@Module({
  controllers: [ToolsController],
  providers: [ToolsService, UpdateCheckerService],
  exports: [ToolsService, UpdateCheckerService],
})
export class ToolsModule {}
