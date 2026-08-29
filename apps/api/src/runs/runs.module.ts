import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { AggregationService } from './aggregation.service';
import { GraphAnalyticsService } from './graph-analytics.service';
import { MitreAttackService } from './mitre-attack.service';
import { TimelineFilterService } from './timeline-filter.service';
import { ToolsModule } from '../tools/tools.module';
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

@Module({
  imports: [ToolsModule],
  controllers: [RunsController],
  providers: [
    RunsService,
    AggregationService,
    GraphAnalyticsService,
    MitreAttackService,
    TimelineFilterService,
    HoleheRunner,
    SherlockRunner,
    ExifToolRunner,
    PhoneInfogaRunner,
    DomainReconRunner,
    MaigretRunner,
    GHuntRunner,
    H8mailRunner,
    SubfinderRunner,
    SpiderFootRunner,
    TheHarvesterRunner,
    CensysRunner,
    AhmiaRunner,
    GitHubReconRunner,
    CrtShRunner,
    IPInfoRunner,
    ShodanRunner,
    AbuseIPDBRunner,
    AlienVaultOTXRunner,
    RdapWhoisRunner,
    BlackbirdRunner,
    IgnorantPhoneRunner,
    OnionLandRunner,
    ThreatFoxIocRunner,
    SslCertInspectorRunner,
    DnsTakeoverRunner,
    GpgKeyringRunner,
    CloudBucketRunner,
  ],
  exports: [RunsService, AggregationService],
})
export class RunsModule {}
