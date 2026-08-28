import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CryptoOsintExpansionService {
  private readonly logger = new Logger(CryptoOsintExpansionService.name);
  private readonly baseUrl = process.env.OSINT_EXPANSION_URL || 'http://localhost:3001';

  async queryBtc(address: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v2/crypto/btc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      return await res.json();
    } catch (err: any) {
      this.logger.error(`Crypto OSINT expansion failed: ${err.message}`);
      return { error: err.message };
    }
  }
}
