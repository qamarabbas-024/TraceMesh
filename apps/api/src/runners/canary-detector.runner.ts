import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface CanaryDetectionResult {
  target: string;
  isCanaryTrap: boolean;
  trapType?: 'DNS_CANARY_TOKEN' | 'WEB_BEACON_PIXEL' | 'AWS_CREDENTIAL_CANARY' | 'DOCUMENT_BEACON' | 'HONEYPOT_CLUSTER';
  provider?: 'Thinkst Canary' | 'DNSLog' | 'Custom Honeypot' | 'Open Source WebBug';
  riskScore: number;
  detectionSignatures: string[];
  recommendedDefensiveAction: string;
}

const CANARY_DOMAINS = [
  'canarytokens.com',
  'canarytokens.net',
  'canarytokens.org',
  'thinkst.com',
  'dnslog.cn',
  'ceye.io',
  'burpcollaborator.net',
  'oastify.com',
  'interact.sh',
];

@Injectable()
export class CanaryDetectorRunner implements ToolRunner {
  readonly toolName = 'canary_detector';
  readonly supportedInputTypes: InputType[] = ['domain', 'email', 'username'];
  private readonly logger = new Logger(CanaryDetectorRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target domain, URL, or identifier required for Canary Token & Honeypot detection',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    let isCanary = false;
    let trapType: CanaryDetectionResult['trapType'] | undefined;
    let provider: CanaryDetectionResult['provider'] | undefined;
    let riskScore = 0;
    const signatures: string[] = [];

    // 1. Check known Canary Token & OAST DNS domains
    for (const canaryDomain of CANARY_DOMAINS) {
      if (cleanTarget.includes(canaryDomain)) {
        isCanary = true;
        trapType = 'DNS_CANARY_TOKEN';
        provider = canaryDomain.includes('thinkst') || canaryDomain.includes('canary') ? 'Thinkst Canary' : 'DNSLog';
        riskScore = 100;
        signatures.push(`Matches authoritative canary token infrastructure: "${canaryDomain}"`);
        break;
      }
    }

    // 2. Check high-entropy subdomains (likely OAST / DNS callback tokens)
    if (!isCanary && cleanTarget.includes('.')) {
      const parts = cleanTarget.split('.');
      const sub = parts[0];
      if (sub.length >= 20 && /^[a-z0-9]+$/i.test(sub)) {
        isCanary = true;
        trapType = 'DNS_CANARY_TOKEN';
        provider = 'Custom Honeypot';
        riskScore = 85;
        signatures.push(`High-entropy 20+ character prefix detected ("${sub.slice(0, 8)}..."): heuristic DNS callback token`);
      }
    }

    // 3. Check Web Beacon Pixel signatures
    if (!isCanary && (cleanTarget.endsWith('.gif') || cleanTarget.endsWith('.png') || cleanTarget.includes('pixel') || cleanTarget.includes('beacon'))) {
      isCanary = true;
      trapType = 'WEB_BEACON_PIXEL';
      provider = 'Open Source WebBug';
      riskScore = 75;
      signatures.push('Target URI points to a 1x1 transparent tracking pixel or beacon endpoint');
    }

    const recAction = isCanary
      ? 'DO NOT RESOLVE OR ACCESS DIRECTLY. Accessing this indicator triggers an instant defensive webhook alert revealing investigator IP/DNS.'
      : 'No active Canary Token or Honeypot signatures detected. Standard reconnaissance permitted.';

    const result: CanaryDetectionResult = {
      target: targetInput,
      isCanaryTrap: isCanary,
      trapType,
      provider,
      riskScore,
      detectionSignatures: signatures,
      recommendedDefensiveAction: recAction,
    };

    // Generate Graph Entities
    entities.push({
      type: 'record',
      value: `CanaryStatus:${isCanary ? 'TRAP_DETECTED' : 'SAFE'}`,
      label: isCanary
        ? `🚨 [HONEYPOT TRAP] ${provider} (${trapType})`
        : `🛡️ Clean Target (Zero Canary Tokens Detected)`,
      sourceTool: 'canary_detector',
      confidence: 0.99,
      metadata: {
        target: targetInput,
        isCanaryTrap: isCanary,
        trapType,
        provider,
        riskScore,
        signatures,
        defensiveAction: recAction,
        severity: isCanary ? 'CRITICAL' : 'INFO',
        category: 'Defensive OPSEC & Anti-Honeypot Scanner',
      },
    });

    if (isCanary) {
      entities.push({
        type: 'record',
        value: `Warning:${trapType}`,
        label: `⚠️ OPSEC Warning: Tripwire Beacon Active`,
        sourceTool: 'canary_detector',
        confidence: 0.98,
        metadata: {
          trapType,
          recommendation: recAction,
        },
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: isCanary
        ? `🚨 Canary Token Detector flagged "${targetInput}": ACTIVE ${provider} ${trapType} DETECTED (Risk: ${riskScore}/100). Do not resolve directly!`
        : `Canary Token Detector evaluated "${targetInput}": Zero active honeypot traps or canary tokens found.`,
      entities,
      durationMs,
      raw: {
        analysis: result,
      },
    };
  }
}
