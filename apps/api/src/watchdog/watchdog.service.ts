import { Injectable, Logger } from '@nestjs/common';
import { InputType, DiscoveredEntity } from '@tracemesh/shared';
import * as crypto from 'crypto';

export interface WatchdogTarget {
  id: string;
  targetValue: string;
  targetType: InputType;
  intervalMinutes: number;
  lastCheckedAt?: string;
  lastEntitiesCount: number;
  activeStatus: 'ACTIVE' | 'PAUSED' | 'ALERT_TRIGGERED';
  webhookUrl?: string;
  knownEntityHashes: string[];
}

export interface WatchdogDeltaAlert {
  alertId: string;
  targetId: string;
  targetValue: string;
  timestamp: string;
  newEntities: DiscoveredEntity[];
  summary: string;
}

@Injectable()
export class WatchdogService {
  private readonly logger = new Logger(WatchdogService.name);
  private readonly targets = new Map<string, WatchdogTarget>();
  private readonly alerts: WatchdogDeltaAlert[] = [];

  public createWatchdog(
    targetValue: string,
    targetType: InputType,
    intervalMinutes: number = 60,
    webhookUrl?: string,
  ): WatchdogTarget {
    const id = `wd-${crypto.randomBytes(5).toString('hex')}`;
    const target: WatchdogTarget = {
      id,
      targetValue: targetValue.trim().toLowerCase(),
      targetType,
      intervalMinutes,
      lastCheckedAt: new Date().toISOString(),
      lastEntitiesCount: 0,
      activeStatus: 'ACTIVE',
      webhookUrl,
      knownEntityHashes: [],
    };
    this.targets.set(id, target);
    this.logger.log(`Watchdog monitor registered for "${targetValue}" (ID: ${id})`);
    return target;
  }

  public listWatchdogs(): WatchdogTarget[] {
    return Array.from(this.targets.values());
  }

  public checkDeltas(targetId: string, currentEntities: DiscoveredEntity[]): WatchdogDeltaAlert | null {
    const target = this.targets.get(targetId);
    if (!target) return null;

    const knownSet = new Set(target.knownEntityHashes);
    const newDiscovered: DiscoveredEntity[] = [];

    for (const entity of currentEntities) {
      const hash = crypto.createHash('sha256').update(`${entity.type}:${entity.value}`).digest('hex');
      if (!knownSet.has(hash)) {
        newDiscovered.push(entity);
        target.knownEntityHashes.push(hash);
      }
    }

    target.lastCheckedAt = new Date().toISOString();
    target.lastEntitiesCount = currentEntities.length;

    if (newDiscovered.length > 0) {
      target.activeStatus = 'ALERT_TRIGGERED';
      const alert: WatchdogDeltaAlert = {
        alertId: `alert-${Date.now()}`,
        targetId,
        targetValue: target.targetValue,
        timestamp: new Date().toISOString(),
        newEntities: newDiscovered,
        summary: `🚨 [WATCHDOG ALERT] Detected ${newDiscovered.length} new footprint indicators for target "${target.targetValue}"`,
      };
      this.alerts.unshift(alert);
      this.logger.warn(alert.summary);
      return alert;
    }

    target.activeStatus = 'ACTIVE';
    return null;
  }

  public listAlerts(): WatchdogDeltaAlert[] {
    return this.alerts;
  }
}
