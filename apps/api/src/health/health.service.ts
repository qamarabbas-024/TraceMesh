import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthStatus } from '@tracemesh/shared';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    let dbLatencyMs: number | undefined;

    try {
      const start = performance.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Math.round((performance.now() - start) * 100) / 100;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    const isHealthy = dbStatus === 'connected';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      service: 'tracemesh-api',
      version: '1.0.0',
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    };
  }
}
