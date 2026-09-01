import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { DiscoveredEntity } from '@tracemesh/shared';

export interface CollabEvent {
  runId: string;
  type: 'analyst_joined' | 'analyst_left' | 'cursor_updated' | 'node_pin_synced' | 'annotation_added';
  analystId: string;
  analystName: string;
  timestamp: string;
  payload: any;
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  private readonly eventStream$ = new Subject<CollabEvent>();
  private readonly activeRooms = new Map<string, Set<string>>();

  public broadcastEvent(event: Omit<CollabEvent, 'timestamp'>): CollabEvent {
    const fullEvent: CollabEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    this.eventStream$.next(fullEvent);
    this.logger.log(`[Collab] ${event.type} in room "${event.runId}" by ${event.analystName}`);
    return fullEvent;
  }

  public getEventStreamForRoom(runId: string): Observable<{ data: CollabEvent }> {
    return this.eventStream$.asObservable().pipe(
      filter((ev) => ev.runId === runId),
      map((ev) => ({ data: ev })),
    );
  }

  public registerPresence(runId: string, analystId: string, analystName: string) {
    if (!this.activeRooms.has(runId)) {
      this.activeRooms.set(runId, new Set());
    }
    this.activeRooms.get(runId)!.add(analystId);

    return this.broadcastEvent({
      runId,
      type: 'analyst_joined',
      analystId,
      analystName,
      payload: { totalConnected: this.activeRooms.get(runId)!.size },
    });
  }

  public removePresence(runId: string, analystId: string, analystName: string) {
    if (this.activeRooms.has(runId)) {
      this.activeRooms.get(runId)!.delete(analystId);
    }
    return this.broadcastEvent({
      runId,
      type: 'analyst_left',
      analystId,
      analystName,
      payload: { totalConnected: this.activeRooms.get(runId)?.size || 0 },
    });
  }
}
