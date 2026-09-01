import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { WatchdogService } from './watchdog.service';
import { InputType, DiscoveredEntity } from '@tracemesh/shared';

export interface CreateWatchdogDto {
  targetValue: string;
  targetType: InputType;
  intervalMinutes?: number;
  webhookUrl?: string;
}

@Controller('watchdog')
export class WatchdogController {
  constructor(private readonly watchdogService: WatchdogService) {}

  @Get('targets')
  listTargets() {
    return this.watchdogService.listWatchdogs();
  }

  @Post('targets')
  @HttpCode(HttpStatus.CREATED)
  createTarget(@Body() body: CreateWatchdogDto) {
    return this.watchdogService.createWatchdog(
      body.targetValue,
      body.targetType,
      body.intervalMinutes || 60,
      body.webhookUrl,
    );
  }

  @Get('alerts')
  listAlerts() {
    return this.watchdogService.listAlerts();
  }

  @Post('targets/:id/check')
  @HttpCode(HttpStatus.OK)
  checkDeltas(@Param('id') id: string, @Body() body: { entities: DiscoveredEntity[] }) {
    const alert = this.watchdogService.checkDeltas(id, body.entities || []);
    return {
      checkedAt: new Date().toISOString(),
      deltaDetected: Boolean(alert),
      alert,
    };
  }
}
