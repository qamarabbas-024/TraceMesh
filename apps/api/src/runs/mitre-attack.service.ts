import { Injectable, Logger } from '@nestjs/common';
import { DiscoveredEntity } from '@tracemesh/shared';

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  tacticId: string;
  description: string;
  confidence: number;
  evidence: string[];
  remediation: string;
}

export interface MitreAttackAssessment {
  coveredTactics: string[];
  tacticsCount: number;
  techniques: MitreTechnique[];
  threatVectorSummary: string;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

@Injectable()
export class MitreAttackService {
  private readonly logger = new Logger(MitreAttackService.name);

  /**
   * Automatically maps discovered entities, IOCs, and infrastructure to MITRE ATT&CK Enterprise Techniques.
   */
  public mapToMitre(entities: DiscoveredEntity[], inputValue: string, inputType: string): MitreAttackAssessment {
    const techniques: MitreTechnique[] = [];
    const tacticsSet = new Set<string>();

    const hasBreaches = entities.some((e) => e.type === 'breach');
    const hasDnsTakeover = entities.some((e) => e.metadata?.category === 'Subdomain Takeover');
    const hasTorDarknet = entities.some((e) => e.metadata?.network?.includes('Tor') || e.value.includes('.onion'));
    const hasIocs = entities.some((e) => e.sourceTool === 'threatfox_ioc' || e.metadata?.category?.includes('IOC'));
    const hasPgpKeys = entities.some((e) => e.sourceTool === 'gpg_keyring');
    const hasSslCert = entities.some((e) => e.sourceTool === 'ssl_inspector');
    const hasOpenPorts = entities.some((e) => e.sourceTool === 'shodan_api' || e.sourceTool === 'censys');
    const hasSubdomains = entities.some((e) => e.type === 'domain' && e.value.split('.').length > 2);

    // T1589.002: Gather Victim Identity Information - Email Addresses
    if (inputType === 'email' || entities.some((e) => e.type === 'email')) {
      tacticsSet.add('Reconnaissance (TA0043)');
      techniques.push({
        id: 'T1589.002',
        name: 'Gather Victim Identity: Email Addresses',
        tactic: 'Reconnaissance',
        tacticId: 'TA0043',
        description: 'Adversaries may gather target email addresses from public breach indexes, WHOIS, and key servers.',
        confidence: 0.95,
        evidence: entities.filter((e) => e.type === 'email').map((e) => e.value).slice(0, 5),
        remediation: 'Implement DMARC/SPF/DKIM email authentication and monitor corporate email exposure.',
      });
    }

    // T1590.002: Gather Victim Network Information - DNS & Subdomains
    if (hasSubdomains || entities.some((e) => e.sourceTool === 'subfinder' || e.sourceTool === 'dns_takeover')) {
      tacticsSet.add('Reconnaissance (TA0043)');
      techniques.push({
        id: 'T1590.002',
        name: 'Gather Victim Network Info: DNS Records & Subdomains',
        tactic: 'Reconnaissance',
        tacticId: 'TA0043',
        description: 'Adversaries enumerate DNS records and subdomains to map external attack surfaces.',
        confidence: 0.92,
        evidence: entities.filter((e) => e.type === 'domain').map((e) => e.value).slice(0, 6),
        remediation: 'Audit public zone files and remove legacy or unused external subdomains.',
      });
    }

    // T1584.001: Compromise Infrastructure - DNS / Subdomain Takeover
    if (hasDnsTakeover) {
      tacticsSet.add('Resource Development (TA0042)');
      const takeoverEntities = entities.filter((e) => e.metadata?.category === 'Subdomain Takeover');
      techniques.push({
        id: 'T1584.001',
        name: 'Compromise Infrastructure: Domains & Subdomain Takeover',
        tactic: 'Resource Development',
        tacticId: 'TA0042',
        description: 'Adversaries can claim dangling CNAME records pointing to decommissioned third-party cloud services to serve malicious payloads.',
        confidence: 0.99,
        evidence: takeoverEntities.map((e) => e.value),
        remediation: 'Immediately remove orphan DNS CNAME records or re-claim matching cloud buckets/applications.',
      });
    }

    // T1078.001: Valid Accounts - Leaked Credentials
    if (hasBreaches) {
      tacticsSet.add('Initial Access (TA0001)');
      tacticsSet.add('Credential Access (TA0006)');
      const breachEntities = entities.filter((e) => e.type === 'breach');
      techniques.push({
        id: 'T1078.001',
        name: 'Valid Accounts: Public/Compromised Credentials',
        tactic: 'Initial Access',
        tacticId: 'TA0001',
        description: 'Adversaries leverage leaked database credentials for password spraying and unauthorized initial access.',
        confidence: 0.96,
        evidence: breachEntities.map((e) => `${e.value} (${e.label})`),
        remediation: 'Enforce multi-factor authentication (MFA/FIDO2) and mandate emergency password resets for breached accounts.',
      });
    }

    // T1071.001: Application Layer Protocol - Tor & Darknet C2
    if (hasTorDarknet) {
      tacticsSet.add('Command and Control (TA0011)');
      const torEntities = entities.filter((e) => e.metadata?.network?.includes('Tor') || e.value.includes('.onion'));
      techniques.push({
        id: 'T1071.001',
        name: 'Application Layer Protocol: Tor Hidden Services',
        tactic: 'Command and Control',
        tacticId: 'TA0011',
        description: 'Adversaries utilize Tor onion routing for covert threat comms, data leak sites, and underground marketplace transactions.',
        confidence: 0.94,
        evidence: torEntities.map((e) => e.value).slice(0, 4),
        remediation: 'Block unauthorized Tor exit and relay nodes at perimeter firewalls.',
      });
    }

    // T1596.003: Search Open Technical Databases - Digital Certificates (SSL/TLS)
    if (hasSslCert || entities.some((e) => e.sourceTool === 'crtsh')) {
      tacticsSet.add('Reconnaissance (TA0043)');
      techniques.push({
        id: 'T1596.003',
        name: 'Search Technical Databases: Certificate Transparency Logs',
        tactic: 'Reconnaissance',
        tacticId: 'TA0043',
        description: 'Adversaries search Certificate Transparency (CT) logs and TLS handshake metadata to uncover hidden origin servers.',
        confidence: 0.90,
        evidence: [inputValue],
        remediation: 'Monitor public Certificate Transparency logs for unauthorized certificate issuances.',
      });
    }

    // T1589.003: Gather Victim Identity Info - OpenPGP / Cryptographic Keyrings
    if (hasPgpKeys) {
      tacticsSet.add('Reconnaissance (TA0043)');
      const pgpEntities = entities.filter((e) => e.sourceTool === 'gpg_keyring');
      techniques.push({
        id: 'T1589.003',
        name: 'Gather Victim Identity Info: PGP Public Key Servers',
        tactic: 'Reconnaissance',
        tacticId: 'TA0043',
        description: 'Adversaries harvest public key servers to correlate real names, secondary personal email accounts, and signing keys.',
        confidence: 0.93,
        evidence: pgpEntities.map((e) => e.value).slice(0, 4),
        remediation: 'Audit PGP UIDs to ensure personal emails are decoupled from corporate signing keys.',
      });
    }

    // Calculate Overall Risk Rating
    let riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (hasDnsTakeover || hasIocs) {
      riskRating = 'CRITICAL';
    } else if (hasBreaches || hasTorDarknet) {
      riskRating = 'HIGH';
    } else if (techniques.length >= 3) {
      riskRating = 'MEDIUM';
    }

    const coveredTactics = Array.from(tacticsSet);

    return {
      coveredTactics,
      tacticsCount: coveredTactics.length,
      techniques,
      threatVectorSummary: `Autonomous MITRE ATT&CK engine identified ${techniques.length} adversary techniques across ${coveredTactics.length} tactical stages. Overall posture risk rated ${riskRating}.`,
      riskRating,
    };
  }
}
