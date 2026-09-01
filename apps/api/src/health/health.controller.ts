import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { SystemCertificationService } from './system-certification.service';
import { HealthStatus } from '@tracemesh/shared';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly systemCertificationService: SystemCertificationService,
  ) {}

  @Get()
  async getHealth(): Promise<HealthStatus> {
    return this.healthService.check();
  }

  @Get('certification')
  async getCertification() {
    return this.systemCertificationService.generateCertification();
  }
}
