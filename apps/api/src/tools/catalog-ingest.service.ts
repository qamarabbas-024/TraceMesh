import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToolsService } from './tools.service';
import { ToolDTO, CreateToolDTO, InputType, ToolTier, ToolCategory } from '@tracemesh/shared';

@Injectable()
export class CatalogIngestService {
  private readonly logger = new Logger(CatalogIngestService.name);

  // Curated catalog entries for automated ingestion across Tier 1 and Tier 2 per TOOLS.md
  private readonly CATALOG_ENTRIES: CreateToolDTO[] = [
    // --- Username Domain ---
    {
      name: 'maigret',
      displayName: 'Maigret',
      description: 'Collect a dossier on a person by username from 2000+ sites, extracting names, photos, and linked profiles.',
      category: 'username',
      inputTypes: ['username'],
      tier: 'tier1',
      executionType: 'edge',
      sourceUrl: 'https://github.com/soxoj/maigret',
      trackedVersion: '0.4.4',
      license: 'GPL-3.0',
      maintenanceStatus: 'active',
      isEnabled: true,
    },
    {
      name: 'whatsmyname',
      displayName: 'WhatsMyName',
      description: 'Fast username enumeration across hundreds of social networks, forums, and developer communities.',
      category: 'username',
      inputTypes: ['username'],
      tier: 'tier1',
      executionType: 'edge',
      sourceUrl: 'https://github.com/WebBreacher/WhatsMyName',
      trackedVersion: '1.2.1',
      license: 'GPL-3.0',
      maintenanceStatus: 'active',
      isEnabled: true,
    },
    {
      name: 'blackbird',
      displayName: 'Blackbird OSINT',
      description: 'Simultaneously search for accounts across 500+ websites with fast asynchronous web scraping.',
      category: 'username',
      inputTypes: ['username'],
      tier: 'tier1',
      executionType: 'edge',
      sourceUrl: 'https://github.com/p1ngul1n0/blackbird',
      trackedVersion: '1.5.0',
      license: 'GPL-3.0',
      maintenanceStatus: 'active',
      isEnabled: true,
    },

    // --- Email & Breach Domain ---
    {
      name: 'ghunt',
      displayName: 'GHunt (Google OSINT)',
      description: 'Offensive Google account OSINT engine for emails, Gaia IDs, YouTube channels, and Google Maps footprints.',
      category: 'email',
      inputTypes: ['email'],
      tier: 'tier1',
      executionType: 'edge',
      sourceUrl: 'https://github.com/mxrch/GHunt',
      trackedVersion: '2.1.2',
      license: 'AGPL-3.0',
      maintenanceStatus: 'active',
      isEnabled: true,
    },
    {
      name: 'h8mail',
      displayName: 'h8mail (Breach Intel)',
      description: 'Password and breach information gathering tool supporting multi-breach databases and leak parsing.',
      category: 'email',
      inputTypes: ['email'],
      tier: 'tier1',
      executionType: 'edge',
      sourceUrl: 'https://github.com/khast3x/h8mail',
      trackedVersion: '2.5.6',
      license: 'BSD-3-Clause',
      maintenanceStatus: 'active',
      isEnabled: true,
    },

    // --- Domain & Subdomain Domain ---
    {
      name: 'subfinder',
      displayName: 'Subfinder',
      description: 'Fast passive subdomain discovery tool that discovers valid subdomains using passive online sources.',
      category: 'domain',
      inputTypes: ['domain'],
      tier: 'tier1',
      executionType: 'edge',
      sourceUrl: 'https://github.com/projectdiscovery/subfinder',
      trackedVersion: '2.6.5',
      license: 'MIT',
      maintenanceStatus: 'active',
      isEnabled: true,
    },
    {
      name: 'theharvester',
      displayName: 'theHarvester',
      description: 'Gather emails, subdomains, hosts, employee names, open ports and banners from public search engines.',
      category: 'domain',
      inputTypes: ['domain', 'email'],
      tier: 'tier1',
      executionType: 'edge',
      sourceUrl: 'https://github.com/laramies/theHarvester',
      trackedVersion: '4.4.4',
      license: 'GPL-2.0',
      maintenanceStatus: 'active',
      isEnabled: true,
    },

    // --- Tier 2 APIs & Outbound Links ---
    {
      name: 'shodan_api',
      displayName: 'Shodan Exposure Search',
      description: 'Search engine for Internet-connected devices, industrial control systems, and open service ports.',
      category: 'ip',
      inputTypes: ['ip', 'domain'],
      tier: 'tier2',
      executionType: 'link',
      sourceUrl: 'https://www.shodan.io',
      trackedVersion: '1.0.0',
      license: 'Proprietary',
      maintenanceStatus: 'active',
      isEnabled: true,
    },
    {
      name: 'abuseipdb',
      displayName: 'AbuseIPDB IP Reputation',
      description: 'Verify IP addresses associated with malicious activity, spam, hacking attempts, and botnets.',
      category: 'ip',
      inputTypes: ['ip'],
      tier: 'tier2',
      executionType: 'link',
      sourceUrl: 'https://www.abuseipdb.com',
      trackedVersion: '1.0.0',
      license: 'Proprietary',
      maintenanceStatus: 'active',
      isEnabled: true,
    },
    {
      name: 'tineye',
      displayName: 'TinEye Reverse Image',
      description: 'Reverse image search engine using image identification technology rather than keywords or metadata.',
      category: 'image',
      inputTypes: ['image'],
      tier: 'tier2',
      executionType: 'link',
      sourceUrl: 'https://tineye.com',
      trackedVersion: '1.0.0',
      license: 'Proprietary',
      maintenanceStatus: 'active',
      isEnabled: true,
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly toolsService: ToolsService,
  ) {}

  /**
   * Ingest all tools from catalog into database registry
   */
  async ingestCatalog(): Promise<{ totalIngested: number; tools: ToolDTO[] }> {
    this.logger.log(`Starting automated catalog ingestion from OSINT lists...`);
    const ingested: ToolDTO[] = [];

    for (const entry of this.CATALOG_ENTRIES) {
      try {
        const tool = await this.toolsService.create(entry);
        ingested.push(tool);
      } catch (err) {
        this.logger.warn(`Could not ingest tool ${entry.name}: ${err}`);
      }
    }

    this.logger.log(`Catalog ingestion complete. Ingested ${ingested.length} tools.`);
    const allTools = await this.toolsService.findAll();
    return {
      totalIngested: allTools.length,
      tools: allTools,
    };
  }
}
