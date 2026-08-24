import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ToolsModule } from './tools/tools.module';
import { RunsModule } from './runs/runs.module';

@Module({
  imports: [PrismaModule, HealthModule, ToolsModule, RunsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
