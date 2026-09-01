import { Module } from '@nestjs/common';
import { WatchdogService } from './watchdog.service';
import { WatchdogController } from './watchdog.controller';

@Module({
  controllers: [WatchdogController],
  providers: [WatchdogService],
  exports: [WatchdogService],
})
export class WatchdogModule {}
