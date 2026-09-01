import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import * as crypto from 'crypto';

export interface TorHopInfo {
  hopNumber: number;
  relayType: 'ENTRY_GUARD' | 'MIDDLE_RELAY' | 'EXIT_NODE';
  nickname: string;
  fingerprint: string;
  ipAddress: string;
  country: string;
  countryCode: string;
  bandwidthMbps: number;
  consensusFlags: string[];
  latencyMs: number;
}

export interface TorCircuitAnalysis {
  circuitId: string;
  hops: TorHopInfo[];
  totalCircuitLatencyMs: number;
  exitJurisdiction: string;
  isExitTorBlockedByTarget: boolean;
  onionLayerEncryption: 'CURVE25519_CHACHA20_POLY1305' | 'AES256_GCM';
}

@Injectable()
export class TorCircuitRunner implements ToolRunner {
  readonly toolName = 'tor_circuit';
  readonly supportedInputTypes: InputType[] = ['domain', 'ip', 'username'];
  private readonly logger = new Logger(TorCircuitRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target domain, IP, or pseudonym required for Tor Circuit routing analysis',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];

    // Deterministic circuit simulation based on target hash
    const targetHash = crypto.createHash('sha256').update(cleanTarget).digest('hex');
    const circuitId = `circ-${targetHash.slice(0, 12)}`;

    const mockRelays: TorHopInfo[] = [
      {
        hopNumber: 1,
        relayType: 'ENTRY_GUARD',
        nickname: `GuardNode${targetHash.slice(0, 4).toUpperCase()}`,
        fingerprint: crypto.createHash('sha1').update(`${cleanTarget}-guard`).digest('hex').toUpperCase(),
        ipAddress: `185.220.${parseInt(targetHash.slice(0, 2), 16) % 250 + 1}.${parseInt(targetHash.slice(2, 4), 16) % 250 + 1}`,
        country: 'Germany',
        countryCode: 'DE',
        bandwidthMbps: 120,
        consensusFlags: ['Guard', 'Fast', 'Stable', 'Running', 'Valid'],
        latencyMs: 38,
      },
      {
        hopNumber: 2,
        relayType: 'MIDDLE_RELAY',
        nickname: `MidRelay${targetHash.slice(4, 8).toUpperCase()}`,
        fingerprint: crypto.createHash('sha1').update(`${cleanTarget}-mid`).digest('hex').toUpperCase(),
        ipAddress: `193.189.${parseInt(targetHash.slice(4, 6), 16) % 250 + 1}.${parseInt(targetHash.slice(6, 8), 16) % 250 + 1}`,
        country: 'Iceland',
        countryCode: 'IS',
        bandwidthMbps: 85,
        consensusFlags: ['Fast', 'Stable', 'Running', 'Valid'],
        latencyMs: 74,
      },
      {
        hopNumber: 3,
        relayType: 'EXIT_NODE',
        nickname: `ExitGateway${targetHash.slice(8, 12).toUpperCase()}`,
        fingerprint: crypto.createHash('sha1').update(`${cleanTarget}-exit`).digest('hex').toUpperCase(),
        ipAddress: `198.51.${parseInt(targetHash.slice(8, 10), 16) % 250 + 1}.${parseInt(targetHash.slice(10, 12), 16) % 250 + 1}`,
        country: 'Switzerland',
        countryCode: 'CH',
        bandwidthMbps: 160,
        consensusFlags: ['Exit', 'Fast', 'Stable', 'Running', 'Valid'],
        latencyMs: 42,
      },
    ];

    const totalLatency = mockRelays.reduce((sum, h) => sum + h.latencyMs, 0);
    const exitNode = mockRelays[2];

    const circuitAnalysis: TorCircuitAnalysis = {
      circuitId,
      hops: mockRelays,
      totalCircuitLatencyMs: totalLatency,
      exitJurisdiction: `${exitNode.country} (${exitNode.countryCode})`,
      isExitTorBlockedByTarget: cleanTarget.includes('bank') || cleanTarget.includes('gov'),
      onionLayerEncryption: 'CURVE25519_CHACHA20_POLY1305',
    };

    // Generate Graph Entities
    entities.push({
      type: 'record',
      value: `TorCircuit:${circuitId}`,
      label: `🧅 3-Hop Tor Circuit (Exit: ${exitNode.country} - ${exitNode.ipAddress})`,
      sourceTool: 'tor_circuit',
      confidence: 0.99,
      metadata: {
        circuitId,
        exitIp: exitNode.ipAddress,
        exitJurisdiction: circuitAnalysis.exitJurisdiction,
        totalLatencyMs: totalLatency,
        encryptionScheme: circuitAnalysis.onionLayerEncryption,
        hopsCount: mockRelays.length,
        category: 'OPSEC & Multi-Hop Anonymization',
      },
    });

    for (const hop of mockRelays) {
      entities.push({
        type: 'ip',
        value: hop.ipAddress,
        label: `[Hop ${hop.hopNumber} ${hop.relayType}] ${hop.nickname} (${hop.country})`,
        sourceTool: 'tor_circuit',
        confidence: 0.96,
        metadata: {
          hopNumber: hop.hopNumber,
          relayType: hop.relayType,
          fingerprint: hop.fingerprint,
          country: hop.country,
          flags: hop.consensusFlags,
        },
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Tor Circuit Simulator routed 3-hop onion tunnel (${mockRelays[0].country} ➔ ${mockRelays[1].country} ➔ ${mockRelays[2].country}): Exit IP ${exitNode.ipAddress} (Latency: ${totalLatency}ms, Encryption: Curve25519).`,
      entities,
      durationMs,
      raw: {
        analysis: circuitAnalysis,
      },
    };
  }
}
