import { Injectable, Logger } from '@nestjs/common';
import { DiscoveredEntity } from '@tracemesh/shared';

export interface TimelineEvent {
  id: string;
  timestamp: string; // ISO 8601
  dateLabel: string;
  entityValue: string;
  entityType: string;
  eventType: 'REGISTRATION' | 'EXPIRATION' | 'BREACH' | 'CERTIFICATE_ISSUED' | 'DISCOVERY' | 'MALWARE_IOC';
  sourceTool: string;
  confidence: number;
  description: string;
  tags: string[];
}

export interface TimelineFilterResult {
  totalEvents: number;
  earliestEvent?: string;
  latestEvent?: string;
  events: TimelineEvent[];
  groupedByYear: Record<string, TimelineEvent[]>;
  activeTags: string[];
}

@Injectable()
export class TimelineFilterService {
  private readonly logger = new Logger(TimelineFilterService.name);

  /**
   * Extracts chronological events from entity metadata and generates an ordered tactical timeline.
   */
  public generateTimeline(
    entities: DiscoveredEntity[],
    startDate?: string,
    endDate?: string,
    filterTags: string[] = [],
  ): TimelineFilterResult {
    const rawEvents: TimelineEvent[] = [];
    const allTags = new Set<string>();

    for (const entity of entities) {
      const meta = entity.metadata || {};

      // 1. Check for Breach Date
      if (entity.type === 'breach' || meta.date || meta.breachDate) {
        const iso = this.normalizeIso(meta.date || meta.breachDate || meta.firstSeen);
        if (iso) {
          rawEvents.push({
            id: `evt_breach_${entity.value}_${iso}`,
            timestamp: iso,
            dateLabel: iso.split('T')[0],
            entityValue: entity.value,
            entityType: entity.type,
            eventType: 'BREACH',
            sourceTool: entity.sourceTool,
            confidence: entity.confidence,
            description: `Data breach record "${entity.label || entity.value}" logged in public indexes`,
            tags: ['breach', 'credential_leak', entity.sourceTool],
          });
          allTags.add('breach');
          allTags.add('credential_leak');
        }
      }

      // 2. Check for SSL/TLS Certificate Valid From / To
      if (meta.validFrom || meta.validTo) {
        if (meta.validFrom) {
          const iso = this.normalizeIso(meta.validFrom);
          if (iso) {
            rawEvents.push({
              id: `evt_cert_start_${entity.value}_${iso}`,
              timestamp: iso,
              dateLabel: iso.split('T')[0],
              entityValue: entity.value,
              entityType: entity.type,
              eventType: 'CERTIFICATE_ISSUED',
              sourceTool: entity.sourceTool,
              confidence: entity.confidence,
              description: `SSL/TLS Digital Certificate issued for "${entity.value}"`,
              tags: ['ssl', 'certificate', 'infrastructure'],
            });
            allTags.add('ssl');
            allTags.add('infrastructure');
          }
        }
      }

      // 3. Check for DNS First Seen / Registration Date
      if (meta.first_seen || meta.firstSeen || meta.createdDate || meta.registrationDate) {
        const iso = this.normalizeIso(meta.first_seen || meta.firstSeen || meta.createdDate || meta.registrationDate);
        if (iso) {
          rawEvents.push({
            id: `evt_reg_${entity.value}_${iso}`,
            timestamp: iso,
            dateLabel: iso.split('T')[0],
            entityValue: entity.value,
            entityType: entity.type,
            eventType: 'REGISTRATION',
            sourceTool: entity.sourceTool,
            confidence: entity.confidence,
            description: `Domain/Host infrastructure registration or first network observation for "${entity.value}"`,
            tags: ['dns', 'whois', 'registration'],
          });
          allTags.add('dns');
          allTags.add('registration');
        }
      }

      // 4. Default Discovery Event if no historic date in metadata
      if (meta.discoveryDate || entity.metadata?.queryTerm) {
        const iso = this.normalizeIso(meta.discoveryDate || new Date().toISOString());
        if (iso) {
          rawEvents.push({
            id: `evt_disc_${entity.value}_${iso}`,
            timestamp: iso,
            dateLabel: iso.split('T')[0],
            entityValue: entity.value,
            entityType: entity.type,
            eventType: 'DISCOVERY',
            sourceTool: entity.sourceTool,
            confidence: entity.confidence,
            description: `Discovered entity "${entity.label || entity.value}" during OSINT reconnaissance`,
            tags: ['discovery', entity.type, entity.sourceTool],
          });
          allTags.add('discovery');
          allTags.add(entity.type);
        }
      }
    }

    // Filter by Date Range
    let filtered = rawEvents;
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= endMs);
    }

    // Filter by Tags
    if (filterTags.length > 0) {
      const tagSet = new Set(filterTags.map((t) => t.toLowerCase()));
      filtered = filtered.filter((e) => e.tags.some((t) => tagSet.has(t.toLowerCase())));
    }

    // Sort Chronologically (oldest to newest)
    filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Group by Year
    const groupedByYear: Record<string, TimelineEvent[]> = {};
    for (const ev of filtered) {
      const yr = ev.timestamp.slice(0, 4);
      if (!groupedByYear[yr]) groupedByYear[yr] = [];
      groupedByYear[yr].push(ev);
    }

    return {
      totalEvents: filtered.length,
      earliestEvent: filtered.length > 0 ? filtered[0].timestamp : undefined,
      latestEvent: filtered.length > 0 ? filtered[filtered.length - 1].timestamp : undefined,
      events: filtered,
      groupedByYear,
      activeTags: Array.from(allTags),
    };
  }

  private normalizeIso(dateStr?: any): string | null {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch {
      return null;
    }
  }
}
