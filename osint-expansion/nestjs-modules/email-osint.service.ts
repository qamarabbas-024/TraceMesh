import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailOsintExpansionService {
  private readonly logger = new Logger(EmailOsintExpansionService.name);
  private readonly baseUrl = process.env.OSINT_EXPANSION_URL || 'http://localhost:3001';

  async queryEmailRecon(email: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v2/email/recon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return await res.json();
    } catch (err: any) {
      this.logger.error(`Email OSINT expansion failed: ${err.message}`);
      return { error: err.message };
    }
  }
}
