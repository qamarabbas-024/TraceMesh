import { Injectable, Logger } from '@nestjs/common';
import {
  DiscoveredEntity,
  KillChainAssessment,
  KillChainPhaseAssessment,
  KillChainStage,
} from '@tracemesh/shared';

@Injectable()
export class KillChainService {
  private readonly logger = new Logger(KillChainService.name);

  public evaluateKillChain(entities: DiscoveredEntity[]): KillChainAssessment {
    const phases: KillChainPhaseAssessment[] = [
      this.evaluateReconnaissance(entities),
      this.evaluateWeaponization(entities),
      this.evaluateDelivery(entities),
      this.evaluateExploitation(entities),
      this.evaluateInstallation(entities),
      this.evaluateCommandAndControl(entities),
      this.evaluateActionsOnObjectives(entities),
    ];

    const activePhases = phases.filter((p) => p.status !== 'CLEAN');
    const detectedPhases = phases.filter((p) => p.status === 'DETECTED');

    // Calculate progression index (0 - 100)
    let score = 0;
    phases.forEach((phase, index) => {
      const weight = (index + 1) * 2.5; // Later stages weigh more heavily
      if (phase.status === 'DETECTED') {
        score += weight * 3;
      } else if (phase.status === 'SUSPECTED') {
        score += weight * 1.5;
      }
    });

    const progressionScore = Math.min(100, Math.round(score));

    // Find highest stage reached
    let maxStageReached: KillChainStage = 'reconnaissance';
    for (let i = phases.length - 1; i >= 0; i--) {
      if (phases[i].status !== 'CLEAN') {
        maxStageReached = phases[i].stage;
        break;
      }
    }

    let threatAdvisory = 'Target telemetry demonstrates early-stage passive reconnaissance footprints.';
    if (progressionScore >= 75) {
      threatAdvisory = 'CRITICAL: Severe kill-chain progression detected including active C2 channels or illicit exfiltration vectors.';
    } else if (progressionScore >= 45) {
      threatAdvisory = 'HIGH: Multi-stage weaponization and breach delivery mechanisms mapped in threat correlation graph.';
    } else if (progressionScore >= 20) {
      threatAdvisory = 'ELEVATED: Active reconnaissance and exposed perimeter attack surfaces identified.';
    }

    return {
      progressionScore,
      maxStageReached,
      activeStagesCount: activePhases.length,
      phases,
      threatAdvisory,
    };
  }

  private evaluateReconnaissance(entities: DiscoveredEntity[]): KillChainPhaseAssessment {
    const matched = entities.filter(
      (e) =>
        e.sourceTool === 'rdap_whois' ||
        e.sourceTool === 'subfinder' ||
        e.sourceTool === 'theharvester' ||
        e.sourceTool === 'sherlock' ||
        e.sourceTool === 'blackbird' ||
        e.type === 'domain' ||
        e.type === 'username',
    );

    const iocCount = matched.length;
    const status = iocCount >= 2 ? 'DETECTED' : iocCount > 0 ? 'SUSPECTED' : 'CLEAN';

    return {
      stage: 'reconnaissance',
      name: 'Reconnaissance',
      status,
      confidence: iocCount > 0 ? Math.min(0.98, 0.65 + iocCount * 0.05) : 0,
      iocCount,
      indicators: matched.slice(0, 4).map((m) => m.value),
      description: 'Passive intelligence harvesting, DNS enumerations, WHOIS queries, and identity footprint mapping.',
    };
  }

  private evaluateWeaponization(entities: DiscoveredEntity[]): KillChainPhaseAssessment {
    const matched = entities.filter(
      (e) =>
        e.sourceTool === 'steganography_extractor' ||
        e.sourceTool === 'exiftool' ||
        e.sourceTool === 'diamond_model' ||
        e.value.toLowerCase().includes('payload') ||
        e.value.toLowerCase().includes('cobalt'),
    );

    const iocCount = matched.length;
    const status = iocCount >= 1 ? 'DETECTED' : 'CLEAN';

    return {
      stage: 'weaponization',
      name: 'Weaponization',
      status,
      confidence: iocCount > 0 ? 0.92 : 0,
      iocCount,
      indicators: matched.slice(0, 3).map((m) => m.value),
      description: 'Payload construction, forensic steganography concealment, and adversary capability pairing.',
    };
  }

  private evaluateDelivery(entities: DiscoveredEntity[]): KillChainPhaseAssessment {
    const matched = entities.filter(
      (e) =>
        e.sourceTool === 'h8mail' ||
        e.sourceTool === 'paste_dump_monitor' ||
        e.sourceTool === 'holehe' ||
        e.type === 'breach' ||
        e.value.toLowerCase().includes('leak'),
    );

    const iocCount = matched.length;
    const status = iocCount >= 2 ? 'DETECTED' : iocCount > 0 ? 'SUSPECTED' : 'CLEAN';

    return {
      stage: 'delivery',
      name: 'Delivery',
      status,
      confidence: iocCount > 0 ? 0.88 : 0,
      iocCount,
      indicators: matched.slice(0, 3).map((m) => m.value),
      description: 'Credential compromise delivery, email disclosure vectors, and paste site data dumps.',
    };
  }

  private evaluateExploitation(entities: DiscoveredEntity[]): KillChainPhaseAssessment {
    const matched = entities.filter(
      (e) =>
        e.sourceTool === 'dns_takeover' ||
        e.sourceTool === 'cloud_bucket' ||
        e.sourceTool === 'security_headers' ||
        e.value.toLowerCase().includes('takeover') ||
        e.value.toLowerCase().includes('misconfig'),
    );

    const iocCount = matched.length;
    const status = iocCount >= 1 ? 'DETECTED' : 'CLEAN';

    return {
      stage: 'exploitation',
      name: 'Exploitation',
      status,
      confidence: iocCount > 0 ? 0.89 : 0,
      iocCount,
      indicators: matched.slice(0, 3).map((m) => m.value),
      description: 'Perimeter vulnerability triggers, DNS CNAME subversion, and unauthenticated cloud storage exposure.',
    };
  }

  private evaluateInstallation(entities: DiscoveredEntity[]): KillChainPhaseAssessment {
    const matched = entities.filter(
      (e) =>
        e.sourceTool === 'canary_detector' ||
        e.sourceTool === 'evidence_timestamper' ||
        e.value.toLowerCase().includes('canary') ||
        e.value.toLowerCase().includes('persistence'),
    );

    const iocCount = matched.length;
    const status = iocCount >= 1 ? 'DETECTED' : 'CLEAN';

    return {
      stage: 'installation',
      name: 'Installation',
      status,
      confidence: iocCount > 0 ? 0.85 : 0,
      iocCount,
      indicators: matched.slice(0, 3).map((m) => m.value),
      description: 'Backdoor telemetry, canary token tripwires, and environmental persistence artifacts.',
    };
  }

  private evaluateCommandAndControl(entities: DiscoveredEntity[]): KillChainPhaseAssessment {
    const matched = entities.filter(
      (e) =>
        e.sourceTool === 'threatfox_ioc' ||
        e.sourceTool === 'ahmia' ||
        e.sourceTool === 'onionland' ||
        e.sourceTool === 'tor_circuit' ||
        e.value.toLowerCase().includes('.onion') ||
        e.value.toLowerCase().includes('c2'),
    );

    const iocCount = matched.length;
    const status = iocCount >= 1 ? 'DETECTED' : 'CLEAN';

    return {
      stage: 'command_and_control',
      name: 'Command & Control',
      status,
      confidence: iocCount > 0 ? 0.94 : 0,
      iocCount,
      indicators: matched.slice(0, 3).map((m) => m.value),
      description: 'Encrypted relay channels, Tor hidden services, and known botnet command beaconing endpoints.',
    };
  }

  private evaluateActionsOnObjectives(entities: DiscoveredEntity[]): KillChainPhaseAssessment {
    const matched = entities.filter(
      (e) =>
        e.sourceTool === 'crypto_flow' ||
        e.sourceTool === 'darknet_forums' ||
        e.sourceTool === 'ofac_aml_screener' ||
        e.value.toLowerCase().includes('ransom') ||
        e.value.toLowerCase().includes('exfiltrat'),
    );

    const iocCount = matched.length;
    const status = iocCount >= 1 ? 'DETECTED' : 'CLEAN';

    return {
      stage: 'actions_on_objectives',
      name: 'Actions on Objectives',
      status,
      confidence: iocCount > 0 ? 0.91 : 0,
      iocCount,
      indicators: matched.slice(0, 3).map((m) => m.value),
      description: 'Cryptocurrency extortion routing, illicit darknet auctions, and proprietary data exfiltration.',
    };
  }
}
