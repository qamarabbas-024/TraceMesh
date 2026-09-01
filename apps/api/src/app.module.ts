import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ToolsModule } from './tools/tools.module';
import { RunsModule } from './runs/runs.module';
import { ImporterModule } from './importer/importer.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { RateLimiterMiddleware } from './common/middleware/rate-limiter.middleware';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    ToolsModule,
    RunsModule,
    ImporterModule,
    CollaborationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware, RateLimiterMiddleware).forRoutes('*');
  }
}
