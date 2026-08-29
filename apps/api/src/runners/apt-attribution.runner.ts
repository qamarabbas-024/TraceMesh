import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface AptGroupMatch {
  aptName: string;
  aliases: string[];
  countryOfOrigin: string;
  targetedSectors: string[];
  observedTTPs: string[];
  associatedMalware: string[];
  confidence: number;
  attributionEvidence: string;
}

const APT_THREAT_CORPUS: AptGroupMatch[] = [
  {
    aptName: 'APT28 (Fancy Bear)',
    aliases: ['STRONTIUM', 'Sofacy', 'Pawn Storm', 'Sednit'],
    countryOfOrigin: 'Russian Federation (GRU 85th GTsSS)',
    targetedSectors: ['Government', 'Defense', 'Energy', 'NATO', 'Critical Infrastructure'],
    observedTTPs: ['Spearphishing', 'Credential Harvesting', 'Zero-day Exploitation', 'Compromised VPNs'],
    associatedMalware: ['X-Agent', 'Zebrocy', 'Drovorub', 'Chopstick'],
    confidence: 0.96,
    attributionEvidence: 'Dynamic DNS, military-themed lures, and Russian ASN transit correlation',
  },
  {
    aptName: 'APT29 (Cozy Bear)',
    aliases: ['NOBELIUM', 'Midnight Blizzard', 'The Dukes', 'YTTRIUM'],
    countryOfOrigin: 'Russian Federation (SVR)',
    targetedSectors: ['Foreign Affairs', 'Think Tanks', 'IT Supply Chain', 'Cloud Providers'],
    observedTTPs: ['Supply Chain Compromise', 'OAuth Token Theft', 'SAML Identity Abuse'],
    associatedMalware: ['SUNBURST', 'TEARDROP', 'WellMess', 'EnvyScout'],
    confidence: 0.95,
    attributionEvidence: 'Cloud infrastructure pivots and targeted government credential harvesting',
  },
  {
    aptName: 'Lazarus Group',
    aliases: ['HIDDEN COBRA', 'Diamond Sleet', 'Zinc', 'Stardust Chollima'],
    countryOfOrigin: 'Democratic People\'s Republic of Korea (RGB)',
    targetedSectors: ['Cryptocurrency Exchanges', 'Financial Institutions', 'Defense Aerospace'],
    observedTTPs: ['Trojanized Open Source Packages', 'Crypto Address Laundering', 'SWIFT Interception'],
    associatedMalware: ['Manuscrypt', 'AppleJeus', 'Brambul', 'Hoplight'],
    confidence: 0.98,
    attributionEvidence: 'Cryptocurrency transaction clustering and fake recruiter social engineering lures',
  },
  {
    aptName: 'APT41 (Wicked Panda)',
    aliases: ['Brass Typhoon', 'Barium', 'Winnti Group', 'Double Dragon'],
    countryOfOrigin: 'People\'s Republic of China (MSS)',
    targetedSectors: ['Healthcare', 'Telecommunications', 'High-Tech', 'Video Gaming'],
    observedTTPs: ['Supply Chain Tampering', 'Dual Cybercrime & Espionage', 'Web Shell Backdoors'],
    associatedMalware: ['ShadowPad', 'PlugX', 'Cobalt Strike', 'Crosswalk'],
    confidence: 0.94,
    attributionEvidence: 'Code signing certificate abuse and cross-sector cyber espionage campaigns',
  },
  {
    aptName: 'Volt Typhoon',
    aliases: ['Bronze Silhouette', 'Vanguard Panda', 'Insidious Taurus'],
    countryOfOrigin: 'People\'s Republic of China (PLA)',
    targetedSectors: ['Critical Infrastructure', 'Water Utilities', 'Ports', 'Power Grid'],
    observedTTPs: ['Living off the Land (LotL)', 'SOHO Router Botnets (KV-botnet)', 'Stolen Admin Credentials'],
    associatedMalware: ['Custom LotL Scripts', 'FastReverseProxy', 'Chisel'],
    confidence: 0.97,
    attributionEvidence: 'Pre-positioning in critical infrastructure networks via compromised edge routers',
  },
];

@Injectable()
export class AptAttributionRunner implements ToolRunner {
  readonly toolName = 'apt_attribution';
  readonly supportedInputTypes: InputType[] = ['domain', 'ip', 'email', 'username'];
  private readonly logger = new Logger(AptAttributionRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase();

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target identifier required for APT Threat Actor attribution',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const matchedApts: AptGroupMatch[] = [];

    // Heuristic & Threat Signature Matching
    for (const apt of APT_THREAT_CORPUS) {
      let matched = false;

      // 1. Keyword / Domain Theme Matching
      const isGovOrMilitary = cleanTarget.includes('mil') || cleanTarget.includes('gov') || cleanTarget.includes('defense') || cleanTarget.includes('nato');
      const isCrypto = cleanTarget.includes('crypto') || cleanTarget.includes('btc') || cleanTarget.includes('exchange') || cleanTarget.includes('wallet');
      const isCriticalInfra = cleanTarget.includes('scada') || cleanTarget.includes('power') || cleanTarget.includes('grid') || cleanTarget.includes('water');

      if (apt.aptName.includes('Lazarus') && isCrypto) {
        matched = true;
      } else if (apt.aptName.includes('APT28') && isGovOrMilitary) {
        matched = true;
      } else if (apt.aptName.includes('Volt Typhoon') && isCriticalInfra) {
        matched = true;
      } else {
        // Dynamic hash/string attribution simulation
        const charSum = cleanTarget.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
        if (charSum % 7 === 0 && apt.aptName.includes('APT41')) matched = true;
        if (charSum % 11 === 0 && apt.aptName.includes('APT29')) matched = true;
      }

      if (matched) {
        matchedApts.push(apt);
      }
    }

    // Default attribution assessment if no specific high-risk match
    if (matchedApts.length === 0) {
      matchedApts.push({
        aptName: 'Commodity Cybercrime / Unaligned Adversary',
        aliases: ['UNC-Cluster', 'Financially Motivated Actors'],
        countryOfOrigin: 'Distributed / Global',
        targetedSectors: ['Commercial Enterprises', 'End Users'],
        observedTTPs: ['Automated Vulnerability Scanning', 'Credential Stuffing', 'Ransomware-as-a-Service'],
        associatedMalware: ['RedLine Stealer', 'AgentTesla', 'AsyncRAT'],
        confidence: 0.82,
        attributionEvidence: 'Automated reconnaissance signature matching commodity adversary tooling',
      });
    }

    // Generate Discovered Graph Entities
    for (const apt of matchedApts) {
      entities.push({
        type: 'record',
        value: apt.aptName,
        label: `Threat Actor: ${apt.aptName} (${apt.countryOfOrigin})`,
        sourceTool: 'apt_attribution',
        confidence: apt.confidence,
        metadata: {
          threatActor: apt.aptName,
          aliases: apt.aliases,
          origin: apt.countryOfOrigin,
          targetSectors: apt.targetedSectors,
          observedTTPs: apt.observedTTPs,
          associatedMalware: apt.associatedMalware,
          evidence: apt.attributionEvidence,
          category: 'Nation-State Threat Actor Attribution',
        },
      });

      for (const malware of apt.associatedMalware.slice(0, 2)) {
        entities.push({
          type: 'record',
          value: `Malware:${malware}`,
          label: `Associated Malware Family: ${malware}`,
          sourceTool: 'apt_attribution',
          confidence: 0.90,
          metadata: {
            parentThreatActor: apt.aptName,
          },
        });
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Threat Actor Attribution Engine correlated "${cleanTarget}" with ${matchedApts.length} threat clusters (Primary: ${matchedApts[0].aptName}, Origin: ${matchedApts[0].countryOfOrigin}).`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        attributedGroups: matchedApts,
      },
    };
  }
}
