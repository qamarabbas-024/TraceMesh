import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IpOsintExpansionService {
  private readonly logger = new Logger(IpOsintExpansionService.name);
  private readonly baseUrl = process.env.OSINT_EXPANSION_URL || 'http://localhost:3001';

  async queryIpRecon(ip: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v2/ip/recon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      return await res.json();
    } catch (err: any) {
      this.logger.error(`IP OSINT expansion failed: ${err.message}`);
      return { error: err.message };
    }
  }
}
