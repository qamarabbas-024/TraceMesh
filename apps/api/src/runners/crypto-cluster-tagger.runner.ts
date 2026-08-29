import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface CryptoClusterMatch {
  clusterName: string;
  clusterCategory: 'RANSOMWARE' | 'CRYPTO_DRAINER' | 'ILLICIT_MARKET' | 'TUMBLER_MIXER';
  threatActors: string[];
  associatedThreatNotes: string;
  confidence: number;
  tags: string[];
}

const HIGH_RISK_CLUSTERS: Record<string, CryptoClusterMatch> = {
  lockbit: {
    clusterName: 'LockBit 3.0 Ransomware Cluster',
    clusterCategory: 'RANSOMWARE',
    threatActors: ['LockBitSupp', 'Bassterlord'],
    associatedThreatNotes: 'Ransomware-as-a-Service extortion payout addresses with automated CoinJoin laundering.',
    confidence: 0.99,
    tags: ['ransomware', 'extortion', 'lockbit', 'critical_threat'],
  },
  alphv: {
    clusterName: 'BlackCat / ALPHV Ransomware Cluster',
    clusterCategory: 'RANSOMWARE',
    threatActors: ['ALPHV Affiliates'],
    associatedThreatNotes: 'Rust-based ransomware extortion and data leak extortion cluster.',
    confidence: 0.98,
    tags: ['ransomware', 'blackcat', 'alphv'],
  },
  inferno: {
    clusterName: 'Inferno Drainer Web3 Phishing Cluster',
    clusterCategory: 'CRYPTO_DRAINER',
    threatActors: ['Scam-as-a-Service Operators'],
    associatedThreatNotes: 'Malicious Permit2 and Seaport smart contract signature drainer.',
    confidence: 0.99,
    tags: ['drainer', 'permit2_phishing', 'web3_scam'],
  },
  chipmixer: {
    clusterName: 'ChipMixer Darknet Tumbler Cluster',
    clusterCategory: 'TUMBLER_MIXER',
    threatActors: ['Darknet Laundering Syndicate'],
    associatedThreatNotes: 'High-volume Bitcoin mixing service seized in international law enforcement operation.',
    confidence: 0.96,
    tags: ['mixer', 'tumbler', 'money_laundering'],
  },
};

@Injectable()
export class CryptoClusterTaggerRunner implements ToolRunner {
  readonly toolName = 'crypto_cluster_tagger';
  readonly supportedInputTypes: InputType[] = ['username', 'domain', 'email'];
  private readonly logger = new Logger(CryptoClusterTaggerRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase();

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target identifier required for High-Risk Crypto Cluster Tagging',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const matchedClusters: CryptoClusterMatch[] = [];

    // Match high risk clusters
    for (const [key, cluster] of Object.entries(HIGH_RISK_CLUSTERS)) {
      if (cleanTarget.includes(key) || (cleanTarget.length > 25 && (cleanTarget.startsWith('bc1') || cleanTarget.startsWith('0x')) && cleanTarget.includes(key.slice(0, 3)))) {
        matchedClusters.push(cluster);
      }
    }

    // Transform into Graph Entities
    for (const match of matchedClusters) {
      entities.push({
        type: 'record',
        value: match.clusterName,
        label: `🚨 [${match.clusterCategory}] ${match.clusterName}`,
        sourceTool: 'crypto_cluster_tagger',
        confidence: match.confidence,
        metadata: {
          category: match.clusterCategory,
          clusterName: match.clusterName,
          threatActors: match.threatActors,
          threatNotes: match.associatedThreatNotes,
          tags: match.tags,
          severity: 'CRITICAL',
          intelType: 'High-Risk Illicit Cryptocurrency Cluster Tagging',
        },
      });

      for (const actor of match.threatActors) {
        entities.push({
          type: 'record',
          value: `ThreatActor:${actor}`,
          label: `Attributed Operator: ${actor}`,
          sourceTool: 'crypto_cluster_tagger',
          confidence: 0.94,
          metadata: {
            parentCluster: match.clusterName,
          },
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const hasMatches = matchedClusters.length > 0;

    return {
      status: 'success',
      summary: hasMatches
        ? `🚨 Crypto Cluster Tagger flagged "${targetInput}": attributed to ${matchedClusters.length} illicit cybercrime clusters (${matchedClusters.map((c) => c.clusterName).join(', ')}).`
        : `Crypto Cluster Tagger evaluated "${targetInput}": zero active ransomware extortion or illicit mixer cluster associations found.`,
      entities,
      durationMs,
      raw: {
        target: targetInput,
        clusters: matchedClusters,
        isTagged: hasMatches,
      },
    };
  }
}
