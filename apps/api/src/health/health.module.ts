import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { SystemCertificationService } from './system-certification.service';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [ToolsModule],
  controllers: [HealthController],
  providers: [HealthService, SystemCertificationService],
  exports: [HealthService, SystemCertificationService],
})
export class HealthModule {}
