import { Injectable } from '@nestjs/common';
import { AggregatedReport, DiscoveredEntity } from '@tracemesh/shared';
import * as crypto from 'crypto';

export interface StixObject {
  id: string;
  type: string;
  spec_version: '2.1';
  created: string;
  modified: string;
  [key: string]: any;
}

export interface StixBundle {
  type: 'bundle';
  id: string;
  spec_version: '2.1';
  objects: StixObject[];
}

@Injectable()
export class StixOpenCtiService {
  /**
   * Translates TraceMesh AggregatedReport into an OASIS STIX 2.1 & OpenCTI Threat Bundle
   */
  public generateStixBundle(report: AggregatedReport): StixBundle {
    const now = new Date().toISOString();
    const bundleId = `bundle--${crypto.randomUUID()}`;
    const objects: StixObject[] = [];

    // 1. Root Identity Object
    const rootIdentityId = `identity--${crypto.randomUUID()}`;
    objects.push({
      id: rootIdentityId,
      type: 'identity',
      spec_version: '2.1',
      created: now,
      modified: now,
      name: report.root.value,
      identity_class: report.root.type === 'email' || report.root.type === 'username' ? 'individual' : 'system',
      sectors: ['technology', 'cybersecurity'],
      description: `Target subject indicator "${report.root.value}" investigated via TraceMesh`,
    });

    // 2. Report Object (OpenCTI compatible)
    const reportId = `report--${crypto.randomUUID()}`;
    const objectRefs: string[] = [rootIdentityId];

    // 3. Convert Discovered Entities into STIX Indicators and Observables
    for (const entity of report.entities) {
      const indicatorId = `indicator--${crypto.randomUUID()}`;
      let pattern = `[file:hashes.'SHA-256' = '${crypto.createHash('sha256').update(entity.value).digest('hex')}']`;

      if (entity.type === 'ip') {
        pattern = `[ipv4-addr:value = '${entity.value}']`;
      } else if (entity.type === 'domain') {
        pattern = `[domain-name:value = '${entity.value}']`;
      } else if (entity.type === 'email') {
        pattern = `[email-addr:value = '${entity.value}']`;
      } else if (entity.type === 'username') {
        pattern = `[user-account:account_login = '${entity.value}']`;
      }

      objects.push({
        id: indicatorId,
        type: 'indicator',
        spec_version: '2.1',
        created: now,
        modified: now,
        name: `${entity.type.toUpperCase()}: ${entity.value}`,
        description: entity.label || `Correlated ${entity.type} footprint from ${entity.sourceTool}`,
        pattern,
        pattern_type: 'stix',
        valid_from: now,
        confidence: Math.round((entity.confidence || 0.8) * 100),
        labels: ['osint', entity.type, entity.sourceTool],
        indicator_types: [entity.type === 'breach' ? 'compromised' : 'anomalous-activity'],
      });

      objectRefs.push(indicatorId);

      // Relationship linking to root subject
      const relId = `relationship--${crypto.randomUUID()}`;
      objects.push({
        id: relId,
        type: 'relationship',
        spec_version: '2.1',
        created: now,
        modified: now,
        relationship_type: 'relates-to',
        source_ref: rootIdentityId,
        target_ref: indicatorId,
        description: `Correlated via OSINT runner ${entity.sourceTool} with confidence ${entity.confidence || 0.8}`,
      });
      objectRefs.push(relId);
    }

    // Add Report Object
    objects.push({
      id: reportId,
      type: 'report',
      spec_version: '2.1',
      created: now,
      modified: now,
      name: `TraceMesh Threat Reconnaissance: ${report.root.value}`,
      description: `Automated OSINT investigation on target ${report.root.value} (${report.root.type}). Discovered ${report.entities.length} correlated indicators across ${report.stats.totalTools} tools.`,
      published: now,
      report_types: ['threat-actor', 'vulnerability'],
      object_refs: objectRefs,
      confidence: 90,
      labels: ['tracemesh', 'osint', 'threat-intel', `opsec-${report.threatLevel || 'medium'}`],
    });

    return {
      type: 'bundle',
      id: bundleId,
      spec_version: '2.1',
      objects,
    };
  }
}
