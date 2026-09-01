import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToolsService } from '../tools/tools.service';
import { AggregationService } from './aggregation.service';
import { HoleheRunner } from '../runners/holehe.runner';
import { SherlockRunner } from '../runners/sherlock.runner';
import { ExifToolRunner } from '../runners/exiftool.runner';
import { PhoneInfogaRunner } from '../runners/phoneinfoga.runner';
import { DomainReconRunner } from '../runners/domain-recon.runner';
import { MaigretRunner } from '../runners/maigret.runner';
import { GHuntRunner } from '../runners/ghunt.runner';
import { H8mailRunner } from '../runners/h8mail.runner';
import { SubfinderRunner } from '../runners/subfinder.runner';
import { SpiderFootRunner } from '../runners/spiderfoot.runner';
import { TheHarvesterRunner } from '../runners/theharvester.runner';
import { CensysRunner } from '../runners/censys.runner';
import { AhmiaRunner } from '../runners/ahmia.runner';
import { GitHubReconRunner } from '../runners/github-recon.runner';
import { CrtShRunner } from '../runners/crtsh.runner';
import { IPInfoRunner } from '../runners/ipinfo.runner';
import { ShodanRunner } from '../runners/shodan.runner';
import { AbuseIPDBRunner } from '../runners/abuseipdb.runner';
import { AlienVaultOTXRunner } from '../runners/alienvault-otx.runner';
import { RdapWhoisRunner } from '../runners/rdap-whois.runner';
import { BlackbirdRunner } from '../runners/blackbird.runner';
import { IgnorantPhoneRunner } from '../runners/ignorant-phone.runner';
import { OnionLandRunner } from '../runners/onionland.runner';
import { ThreatFoxIocRunner } from '../runners/threatfox-ioc.runner';
import { SslCertInspectorRunner } from '../runners/ssl-cert-inspector.runner';
import { DnsTakeoverRunner } from '../runners/dns-takeover.runner';
import { GpgKeyringRunner } from '../runners/gpg-keyring.runner';
import { CloudBucketRunner } from '../runners/cloud-bucket.runner';
import { SecurityHeadersRunner } from '../runners/security-headers.runner';
import { AsnPeeringRunner } from '../runners/asn-peering.runner';
import { AptAttributionRunner } from '../runners/apt-attribution.runner';
import { FaviconHashRunner } from '../runners/favicon-hash.runner';
import { IocFeedSyncerRunner } from '../runners/ioc-feed-syncer.runner';
import { DarknetForumRunner } from '../runners/darknet-forum.runner';
import { GravatarUnmaskerRunner } from '../runners/gravatar-unmasker.runner';
import { GitHubCommitCrawlerRunner } from '../runners/github-commit-crawler.runner';
import { PasteDumpRunner } from '../runners/paste-dump.runner';
import { UsernameFuzzerRunner } from '../runners/username-fuzzer.runner';
import { CryptoFlowRunner } from '../runners/crypto-flow.runner';
import { OfacAmlScreenerRunner } from '../runners/ofac-aml-screener.runner';
import { TokenGraphRunner } from '../runners/token-graph.runner';
import { Web3DomainsRunner } from '../runners/web3-domains.runner';
import { IpfsArweaveRunner } from '../runners/ipfs-arweave.runner';
import { CryptoClusterTaggerRunner } from '../runners/crypto-cluster-tagger.runner';
import { TorCircuitRunner } from '../runners/tor-circuit.runner';
import { CanaryDetectorRunner } from '../runners/canary-detector.runner';
import { FingerprintDefeaterRunner } from '../runners/fingerprint-defeater.runner';
import { EvidenceTimestamperRunner } from '../runners/evidence-timestamper.runner';
import { ZkNotesCryptRunner } from '../runners/zk-notes-crypt.runner';
import { RedTeamRiskRunner } from '../runners/red-team-risk.runner';
import { ToolRunner } from '../runners/runner.interface';
import {
  BatchRunRequest,
  AggregatedReport,
  InputType,
  NormalizedResult,
  DiscoveredEntity,
} from '@tracemesh/shared';

@Injectable()
export class RunsService {
  private readonly logger = new Logger(RunsService.name);
  private readonly runnerMap = new Map<string, ToolRunner>();
  private readonly cache = new Map<string, { report: AggregatedReport; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
  private readonly TOOL_TIMEOUT_MS = 8000; // 8 seconds per tool timeout

  constructor(
    private readonly prisma: PrismaService,
    private readonly toolsService: ToolsService,
    private readonly aggregationService: AggregationService,
    private readonly holeheRunner: HoleheRunner,
    private readonly sherlockRunner: SherlockRunner,
    private readonly exifToolRunner: ExifToolRunner,
    private readonly phoneInfogaRunner: PhoneInfogaRunner,
    private readonly domainReconRunner: DomainReconRunner,
    private readonly maigretRunner: MaigretRunner,
    private readonly ghuntRunner: GHuntRunner,
    private readonly h8mailRunner: H8mailRunner,
    private readonly subfinderRunner: SubfinderRunner,
    private readonly spiderFootRunner: SpiderFootRunner,
    private readonly theHarvesterRunner: TheHarvesterRunner,
    private readonly censysRunner: CensysRunner,
    private readonly ahmiaRunner: AhmiaRunner,
    private readonly gitHubReconRunner: GitHubReconRunner,
    private readonly crtShRunner: CrtShRunner,
    private readonly ipInfoRunner: IPInfoRunner,
    private readonly shodanRunner: ShodanRunner,
    private readonly abuseIPDBRunner: AbuseIPDBRunner,
    private readonly alienVaultOTXRunner: AlienVaultOTXRunner,
    private readonly rdapWhoisRunner: RdapWhoisRunner,
    private readonly blackbirdRunner: BlackbirdRunner,
    private readonly ignorantPhoneRunner: IgnorantPhoneRunner,
    private readonly onionLandRunner: OnionLandRunner,
    private readonly threatFoxIocRunner: ThreatFoxIocRunner,
    private readonly sslCertInspectorRunner: SslCertInspectorRunner,
    private readonly dnsTakeoverRunner: DnsTakeoverRunner,
    private readonly gpgKeyringRunner: GpgKeyringRunner,
    private readonly cloudBucketRunner: CloudBucketRunner,
    private readonly securityHeadersRunner: SecurityHeadersRunner,
    private readonly asnPeeringRunner: AsnPeeringRunner,
    private readonly aptAttributionRunner: AptAttributionRunner,
    private readonly faviconHashRunner: FaviconHashRunner,
    private readonly iocFeedSyncerRunner: IocFeedSyncerRunner,
    private readonly darknetForumRunner: DarknetForumRunner,
    private readonly gravatarUnmaskerRunner: GravatarUnmaskerRunner,
    private readonly gitHubCommitCrawlerRunner: GitHubCommitCrawlerRunner,
    private readonly pasteDumpRunner: PasteDumpRunner,
    private readonly usernameFuzzerRunner: UsernameFuzzerRunner,
    private readonly cryptoFlowRunner: CryptoFlowRunner,
    private readonly ofacAmlScreenerRunner: OfacAmlScreenerRunner,
    private readonly tokenGraphRunner: TokenGraphRunner,
    private readonly web3DomainsRunner: Web3DomainsRunner,
    private readonly ipfsArweaveRunner: IpfsArweaveRunner,
    private readonly cryptoClusterTaggerRunner: CryptoClusterTaggerRunner,
    private readonly torCircuitRunner: TorCircuitRunner,
    private readonly canaryDetectorRunner: CanaryDetectorRunner,
    private readonly fingerprintDefeaterRunner: FingerprintDefeaterRunner,
    private readonly evidenceTimestamperRunner: EvidenceTimestamperRunner,
    private readonly zkNotesCryptRunner: ZkNotesCryptRunner,
    private readonly redTeamRiskRunner: RedTeamRiskRunner,
  ) {
    this.runnerMap.set('holehe', this.holeheRunner);
    this.runnerMap.set('sherlock', this.sherlockRunner);
    this.runnerMap.set('exiftool', this.exifToolRunner);
    this.runnerMap.set('phoneinfoga', this.phoneInfogaRunner);
    this.runnerMap.set('domainrecon', this.domainReconRunner);
    this.runnerMap.set('maigret', this.maigretRunner);
    this.runnerMap.set('whatsmyname', this.sherlockRunner);
    this.runnerMap.set('ghunt', this.ghuntRunner);
    this.runnerMap.set('h8mail', this.h8mailRunner);
    this.runnerMap.set('subfinder', this.subfinderRunner);
    this.runnerMap.set('spiderfoot', this.spiderFootRunner);
    this.runnerMap.set('theharvester', this.theHarvesterRunner);
    this.runnerMap.set('censys', this.censysRunner);
    this.runnerMap.set('ahmia', this.ahmiaRunner);
    this.runnerMap.set('github_recon', this.gitHubReconRunner);
    this.runnerMap.set('crtsh', this.crtShRunner);
    this.runnerMap.set('ipinfo', this.ipInfoRunner);
    this.runnerMap.set('shodan_api', this.shodanRunner);
    this.runnerMap.set('abuseipdb', this.abuseIPDBRunner);
    this.runnerMap.set('alienvault_otx', this.alienVaultOTXRunner);
    this.runnerMap.set('rdap_whois', this.rdapWhoisRunner);
    this.runnerMap.set('blackbird', this.blackbirdRunner);
    this.runnerMap.set('ignorant_phone', this.ignorantPhoneRunner);
    this.runnerMap.set('onionland', this.onionLandRunner);
    this.threatFoxIocRunner && this.runnerMap.set('threatfox_ioc', this.threatFoxIocRunner);
    this.runnerMap.set('ssl_inspector', this.sslCertInspectorRunner);
    this.runnerMap.set('dns_takeover', this.dnsTakeoverRunner);
    this.runnerMap.set('gpg_keyring', this.gpgKeyringRunner);
    this.runnerMap.set('cloud_bucket', this.cloudBucketRunner);
    this.runnerMap.set('security_headers', this.securityHeadersRunner);
    this.runnerMap.set('asn_peering', this.asnPeeringRunner);
    this.runnerMap.set('apt_attribution', this.aptAttributionRunner);
    this.runnerMap.set('favicon_hash', this.faviconHashRunner);
    this.runnerMap.set('ioc_feed_syncer', this.iocFeedSyncerRunner);
    this.runnerMap.set('darknet_forums', this.darknetForumRunner);
    this.runnerMap.set('gravatar_unmasker', this.gravatarUnmaskerRunner);
    this.runnerMap.set('github_commit_crawler', this.gitHubCommitCrawlerRunner);
    this.runnerMap.set('paste_dump_monitor', this.pasteDumpRunner);
    this.runnerMap.set('username_fuzzer', this.usernameFuzzerRunner);
    this.runnerMap.set('crypto_flow', this.cryptoFlowRunner);
    this.runnerMap.set('ofac_aml_screener', this.ofacAmlScreenerRunner);
    this.runnerMap.set('token_graph', this.tokenGraphRunner);
    this.runnerMap.set('web3_domains', this.web3DomainsRunner);
    this.runnerMap.set('ipfs_arweave', this.ipfsArweaveRunner);
    this.runnerMap.set('crypto_cluster_tagger', this.cryptoClusterTaggerRunner);
    this.runnerMap.set('tor_circuit', this.torCircuitRunner);
    this.runnerMap.set('canary_detector', this.canaryDetectorRunner);
    this.runnerMap.set('fingerprint_defeater', this.fingerprintDefeaterRunner);
    this.runnerMap.set('evidence_timestamper', this.evidenceTimestamperRunner);
    this.runnerMap.set('zk_notes_crypt', this.zkNotesCryptRunner);
    this.runnerMap.set('red_team_risk', this.redTeamRiskRunner);
  }

  private detectType(val: string): InputType {
    const trimmed = val.trim();
    if (trimmed.includes('@')) return 'email';
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) return 'ip';
    if (/^https?:\/\//.test(trimmed)) return 'domain';
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(trimmed)) return 'domain';
    if (/^\+?\d{7,15}$/.test(trimmed)) return 'phone';
    return 'username';
  }

  private getMatchingToolsForType(type: InputType): string[] {
    switch (type) {
      case 'email':
        return ['holehe', 'h8mail', 'theharvester', 'onionland'];
      case 'username':
        return ['sherlock', 'blackbird', 'maigret', 'github_recon', 'onionland'];
      case 'domain':
        return ['rdap_whois', 'ssl_inspector', 'subfinder', 'crtsh', 'alienvault_otx', 'threatfox_ioc', 'domainrecon', 'onionland'];
      case 'ip':
        return ['shodan_api', 'abuseipdb', 'ipinfo', 'threatfox_ioc', 'rdap_whois'];
      case 'phone':
        return ['phoneinfoga', 'ignorant_phone'];
      case 'image':
        return ['exiftool'];
      default:
        return ['sherlock', 'blackbird'];
    }
  }

  private async executeSingleTool(
    toolName: string,
    val: string,
    type: InputType,
    hopLevel: number = 1,
    parentVal: string = val,
  ) {
    const runner = this.runnerMap.get(toolName);
    if (!runner) {
      return {
        toolId: toolName,
        toolName,
        displayName: toolName,
        status: 'error' as const,
        durationMs: 0,
        summary: `Runner not found for tool: ${toolName}`,
        entities: [],
        error: 'Runner not implemented',
        hop: hopLevel,
      };
    }

    try {
      const timeoutPromise = new Promise<NormalizedResult>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Tool ${toolName} timed out after 8s`)),
          this.TOOL_TIMEOUT_MS,
        ),
      );

      const execPromise = runner.execute(val, type);
      const result = await Promise.race([execPromise, timeoutPromise]);
      const finalStatus: 'success' | 'error' | 'timeout' =
        result.status === 'success' ? 'success' : 'error';

      const taggedEntities: DiscoveredEntity[] = result.entities.map((e) => ({
        ...e,
        hopLevel,
        parentValue: parentVal,
      }));

      return {
        toolId: toolName,
        toolName,
        displayName: toolName,
        status: finalStatus,
        durationMs: result.durationMs || 0,
        summary: result.summary,
        entities: taggedEntities,
        error: result.error,
        hop: hopLevel,
      };
    } catch (err: any) {
      const isTimeout = err.message?.includes('timed out');
      return {
        toolId: toolName,
        toolName,
        displayName: toolName,
        status: (isTimeout ? 'timeout' : 'error') as 'timeout' | 'error',
        durationMs: this.TOOL_TIMEOUT_MS,
        summary: isTimeout ? `Execution timed out (${toolName})` : `Execution error: ${err.message}`,
        entities: [],
        error: err.message,
        hop: hopLevel,
      };
    }
  }

  async runBatch(req: BatchRunRequest, userId?: string): Promise<AggregatedReport> {
    const { inputValue, inputType, toolIds, bypassCache, deepRecon, maxHops = 2 } = req;
    const targetHops = deepRecon ? Math.min(3, Math.max(1, maxHops)) : 1;
    const cacheKey = `${inputType}:${inputValue.toLowerCase().trim()}:${toolIds.sort().join(',')}:${deepRecon ? `deep_${targetHops}` : 'flat'}`;

    // Check cache
    if (!bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.log(`Serving cached aggregated result for ${cacheKey}`);
        return {
          ...cached.report,
          stats: {
            ...cached.report.stats,
            cached: true,
          },
        };
      }
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const registeredTools = await this.toolsService.findAll();
    const activeToolMap = new Map(registeredTools.map((t) => [t.id, t]));
    const nameToToolMap = new Map(registeredTools.map((t) => [t.name, t]));

    const allExecutions: any[] = [];
    const visitedPivots = new Set<string>([inputValue.toLowerCase().trim()]);

    // --- Hop 1: Primary Target Execution ---
    const hop1Promises = toolIds.map(async (toolIdOrName) => {
      const tool = activeToolMap.get(toolIdOrName) || nameToToolMap.get(toolIdOrName);
      const toolName = tool?.name || toolIdOrName;
      const res = await this.executeSingleTool(toolName, inputValue, inputType, 1, inputValue);
      return {
        ...res,
        displayName: tool?.displayName || res.displayName,
      };
    });

    const hop1Results = await Promise.all(hop1Promises);
    allExecutions.push(...hop1Results);

    // --- Autonomous Recursive Multi-Hop Loop (Hop 2 to targetHops) ---
    if (deepRecon && targetHops > 1) {
      let previousHopEntities: DiscoveredEntity[] = [];
      hop1Results.forEach((r) => previousHopEntities.push(...r.entities));

      for (let currentHop = 2; currentHop <= targetHops; currentHop++) {
        // Extract high-value pivot candidates from previous hop
        const pivotCandidates: { value: string; type: InputType; parentValue: string }[] = [];

        for (const ent of previousHopEntities) {
          const cleanVal = ent.value.trim().toLowerCase();
          if (visitedPivots.has(cleanVal)) continue;

          let candType: InputType | null = null;
          let candVal = ent.value.trim();

          if (ent.type === 'domain') {
            candType = 'domain';
          } else if (ent.type === 'ip') {
            candType = 'ip';
          } else if (ent.type === 'username') {
            candType = 'username';
          } else if (ent.type === 'email') {
            candType = 'email';
          } else if (ent.type === 'platform' && ent.value.includes('github.com/')) {
            const parts = ent.value.split('/');
            candVal = parts[parts.length - 1] || parts[parts.length - 2];
            candType = 'username';
          } else {
            const detected = this.detectType(candVal);
            if (detected !== 'username' || candVal.length >= 3) {
              candType = detected;
            }
          }

          if (candType && candVal && !visitedPivots.has(candVal.toLowerCase())) {
            visitedPivots.add(candVal.toLowerCase());
            pivotCandidates.push({
              value: candVal,
              type: candType,
              parentValue: ent.parentValue || inputValue,
            });
          }
        }

        // Limit concurrent recursive pivots per hop to 3 highest-value pivots to maintain fast response
        const selectedPivots = pivotCandidates.slice(0, 3);
        if (selectedPivots.length === 0) break;

        this.logger.log(`Executing Deep Recon Hop ${currentHop} for ${selectedPivots.length} pivots`);

        const hopPromises: Promise<any>[] = [];
        for (const pivot of selectedPivots) {
          const matchingTools = this.getMatchingToolsForType(pivot.type);
          for (const toolName of matchingTools) {
            hopPromises.push(
              this.executeSingleTool(toolName, pivot.value, pivot.type, currentHop, pivot.value),
            );
          }
        }

        const hopResults = await Promise.all(hopPromises);
        allExecutions.push(...hopResults);

        previousHopEntities = [];
        hopResults.forEach((r) => previousHopEntities.push(...r.entities));
      }
    }

    // Aggregate into unified multi-hop entity graph & compute OPSEC score
    const report = this.aggregationService.aggregate(runId, inputValue, inputType, allExecutions, false);

    // Save to Cache
    this.cache.set(cacheKey, {
      report,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    // Persist to DB if database is connected
    try {
      if (this.prisma.run) {
        await this.prisma.run.create({
          data: {
            id: runId,
            userId: userId || null,
            inputValue,
            inputType,
            status: 'COMPLETED',
          },
        });
      }
    } catch {
      // Graceful fallback if Postgres is in local memory mode
    }

    return report;
  }

  async getHistory(userId?: string): Promise<any[]> {
    try {
      if (!this.prisma.run) return [];
      return await this.prisma.run.findMany({
        where: userId ? { userId } : {},
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
    } catch {
      return [];
    }
  }

  async getRunById(id: string): Promise<any | null> {
    try {
      if (!this.prisma.run) return null;
      return await this.prisma.run.findUnique({
        where: { id },
      });
    } catch {
      return null;
    }
  }
}
