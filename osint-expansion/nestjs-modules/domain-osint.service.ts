import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DomainOsintExpansionService {
  private readonly logger = new Logger(DomainOsintExpansionService.name);
  private readonly baseUrl = process.env.OSINT_EXPANSION_URL || 'http://localhost:3001';

  async queryDomainRecon(domain: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v2/domain/recon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      return await res.json();
    } catch (err: any) {
      this.logger.error(`Domain OSINT expansion failed: ${err.message}`);
      return { error: err.message };
    }
  }
}
