import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ThreatOsintExpansionService {
  private readonly logger = new Logger(ThreatOsintExpansionService.name);
  private readonly baseUrl = process.env.OSINT_EXPANSION_URL || 'http://localhost:3001';

  async queryThreatDomain(domain: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v2/threat/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      return await res.json();
    } catch (err: any) {
      this.logger.error(`Threat OSINT expansion failed: ${err.message}`);
      return { error: err.message };
    }
  }
}
