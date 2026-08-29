import { Injectable, Logger } from '@nestjs/common';
import { DiscoveredEntity, InputType } from '@tracemesh/shared';

export interface IdentityDossier {
  subject: string;
  inputType: InputType;
  generatedAt: string;
  opsecRiskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  executiveSummary: string;
  identityFootprint: {
    primaryAliases: string[];
    confirmedEmails: string[];
    associatedPlatforms: { platform: string; url: string }[];
    cryptographicKeysCount: number;
  };
  infrastructureFootprint: {
    associatedDomains: string[];
    originIps: string[];
    bgpAsns: string[];
    cloudBucketsFound: number;
    openBucketsCount: number;
  };
  threatExposure: {
    breachesCount: number;
    activeIocsCount: number;
    darknetMentionsCount: number;
    leakedSecretsCount: number;
  };
  keyActionablePivots: {
    pivotValue: string;
    type: string;
    rationale: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  }[];
}

@Injectable()
export class DossierSummaryService {
  private readonly logger = new Logger(DossierSummaryService.name);

  /**
   * Generates a comprehensive analytical intelligence dossier from aggregated entity graph.
   */
  public generateDossier(
    entities: DiscoveredEntity[],
    inputValue: string,
    inputType: InputType,
    opsecScore: number,
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  ): IdentityDossier {
    const emails = new Set<string>();
    const usernames = new Set<string>();
    const domains = new Set<string>();
    const ips = new Set<string>();
    const asns = new Set<string>();
    const platforms: { platform: string; url: string }[] = [];

    let breachesCount = 0;
    let activeIocsCount = 0;
    let darknetMentionsCount = 0;
    let leakedSecretsCount = 0;
    let cloudBucketsFound = 0;
    let openBucketsCount = 0;
    let pgpKeysCount = 0;

    for (const entity of entities) {
      if (entity.type === 'email') emails.add(entity.value);
      if (entity.type === 'username') usernames.add(entity.value);
      if (entity.type === 'domain') domains.add(entity.value);
      if (entity.type === 'ip') ips.add(entity.value);
      if (entity.type === 'breach') breachesCount++;

      if (entity.type === 'platform') {
        platforms.push({
          platform: entity.sourceTool || 'Platform',
          url: entity.value,
        });
      }

      if (entity.sourceTool === 'asn_peering' && entity.value.startsWith('AS')) {
        asns.add(entity.value);
      }

      if (entity.sourceTool === 'gpg_keyring') pgpKeysCount++;
      if (entity.sourceTool === 'threatfox_ioc' || entity.sourceTool === 'ioc_feed_syncer') activeIocsCount++;
      if (entity.sourceTool === 'darknet_forums' || entity.sourceTool === 'ahmia' || entity.value.includes('.onion')) darknetMentionsCount++;
      if (entity.sourceTool === 'github_commit_crawler' && entity.value.startsWith('Secret:')) leakedSecretsCount++;
      if (entity.sourceTool === 'cloud_bucket') {
        cloudBucketsFound++;
        if (entity.metadata?.accessStatus === 'PUBLIC_OPEN') openBucketsCount++;
      }
    }

    // Generate Key Actionable Pivots
    const keyActionablePivots: IdentityDossier['keyActionablePivots'] = [];

    if (openBucketsCount > 0) {
      keyActionablePivots.push({
        pivotValue: 'Open Cloud Storage Bucket',
        type: 'cloud_bucket',
        rationale: 'Publicly readable cloud storage detected containing exposed files and metadata.',
        priority: 'CRITICAL',
      });
    }

    if (leakedSecretsCount > 0) {
      keyActionablePivots.push({
        pivotValue: 'Git Leaked API Credential',
        type: 'record',
        rationale: 'High-entropy API token committed to public repository commit history.',
        priority: 'CRITICAL',
      });
    }

    if (emails.size > 0 && inputType !== 'email') {
      const topEmail = Array.from(emails)[0];
      keyActionablePivots.push({
        pivotValue: topEmail,
        type: 'email',
        rationale: 'Unmasked author or registrant email address discovered in metadata.',
        priority: 'HIGH',
      });
    }

    if (ips.size > 0 && inputType !== 'ip') {
      const topIp = Array.from(ips)[0];
      keyActionablePivots.push({
        pivotValue: topIp,
        type: 'ip',
        rationale: 'Origin host IP discovered in DNS/BGP routing logs.',
        priority: 'HIGH',
      });
    }

    // Executive Summary Synthesis
    const summaryParts: string[] = [
      `Automated Reconnaissance Dossier for subject "${inputValue}" (${inputType.toUpperCase()}).`,
      `Overall OPSEC exposure rated ${threatLevel} (Risk Index: ${opsecScore}/100) with ${entities.length} correlated graph nodes across ${platforms.length} connected platforms.`,
    ];

    if (breachesCount > 0 || leakedSecretsCount > 0) {
      summaryParts.push(`Identified ${breachesCount} breach records and ${leakedSecretsCount} leaked repository credentials requiring immediate incident response.`);
    }

    if (darknetMentionsCount > 0) {
      summaryParts.push(`Discovered ${darknetMentionsCount} hidden service / darknet marketplace mentions.`);
    }

    return {
      subject: inputValue,
      inputType,
      generatedAt: new Date().toISOString(),
      opsecRiskRating: threatLevel,
      executiveSummary: summaryParts.join(' '),
      identityFootprint: {
        primaryAliases: Array.from(usernames).slice(0, 8),
        confirmedEmails: Array.from(emails).slice(0, 8),
        associatedPlatforms: platforms.slice(0, 10),
        cryptographicKeysCount: pgpKeysCount,
      },
      infrastructureFootprint: {
        associatedDomains: Array.from(domains).slice(0, 8),
        originIps: Array.from(ips).slice(0, 8),
        bgpAsns: Array.from(asns),
        cloudBucketsFound,
        openBucketsCount,
      },
      threatExposure: {
        breachesCount,
        activeIocsCount,
        darknetMentionsCount,
        leakedSecretsCount,
      },
      keyActionablePivots,
    };
  }
}
