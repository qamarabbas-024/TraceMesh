import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SocialOsintExpansionService {
  private readonly logger = new Logger(SocialOsintExpansionService.name);
  private readonly baseUrl = process.env.OSINT_EXPANSION_URL || 'http://localhost:3001';

  async queryRedditUser(username: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v2/social/reddit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      return await res.json();
    } catch (err: any) {
      this.logger.error(`Social OSINT expansion failed: ${err.message}`);
      return { error: err.message };
    }
  }
}
