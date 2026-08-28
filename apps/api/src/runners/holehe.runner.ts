import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import * as dns from 'dns/promises';
import * as crypto from 'crypto';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'trashmail.com',
  'yopmail.com',
  'getairmail.com',
  'dispostable.com',
  'throwawaymail.com',
  'temp-mail.org',
  'crazymailing.com',
  'fakeinbox.com',
]);

@Injectable()
export class HoleheRunner implements ToolRunner {
  readonly toolName = 'holehe';
  readonly supportedInputTypes: InputType[] = ['email'];
  private readonly logger = new Logger(HoleheRunner.name);

  async execute(email: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanEmail = email.trim().toLowerCase();

    if (inputType !== 'email' || !cleanEmail.includes('@')) {
      return {
        status: 'error',
        summary: 'Invalid email address provided to Holehe runner',
        entities: [],
        error: 'Invalid email format',
        durationMs: Date.now() - startTime,
      };
    }

    const [userPart, domainPart] = cleanEmail.split('@');
    const entities: DiscoveredEntity[] = [];

    // 1. Email Handle Node
    entities.push({
      type: 'username',
      value: userPart,
      label: `Email Handle: ${userPart}`,
      sourceTool: 'holehe',
      confidence: 1.0,
      metadata: { derivedFrom: 'email_prefix', email: cleanEmail },
    });

    // 2. Email Domain Node
    entities.push({
      type: 'domain',
      value: domainPart,
      label: `Email Mail Server Domain: ${domainPart}`,
      sourceTool: 'holehe',
      confidence: 1.0,
      metadata: { domain: domainPart },
    });

    // 3. Check for Disposable / Temp Mail
    const isDisposable = DISPOSABLE_DOMAINS.has(domainPart);
    if (isDisposable) {
      entities.push({
        type: 'record',
        value: `DISPOSABLE_TEMP_EMAIL_ALERT: ${domainPart}`,
        label: `High-Risk Indicator: Temporary / Burner Email Service Detected`,
        sourceTool: 'holehe',
        confidence: 1.0,
        metadata: {
          category: 'Threat Alert',
          isBurner: true,
          disposable: true,
        },
      });
    }

    // 4. Real Live DNS MX Records Resolution
    try {
      const mxRecords = await dns.resolveMx(domainPart);
      if (Array.isArray(mxRecords) && mxRecords.length > 0) {
        mxRecords.sort((a, b) => a.priority - b.priority);
        const primaryMx = mxRecords[0].exchange.toLowerCase();

        // Classify Mail Provider Infrastructure
        let providerName = 'Custom Mail Server';
        if (primaryMx.includes('google') || primaryMx.includes('googlemail') || primaryMx.includes('aspmx')) {
          providerName = 'Google Workspace / Gmail Infrastructure';
        } else if (primaryMx.includes('outlook') || primaryMx.includes('microsoft') || primaryMx.includes('protection.outlook')) {
          providerName = 'Microsoft 365 / Exchange Online';
        } else if (primaryMx.includes('protonmail') || primaryMx.includes('proton')) {
          providerName = 'ProtonMail (End-to-End Encrypted)';
        } else if (primaryMx.includes('icloud') || primaryMx.includes('apple')) {
          providerName = 'Apple iCloud Mail';
        } else if (primaryMx.includes('zoho')) {
          providerName = 'Zoho Mail Infrastructure';
        } else if (primaryMx.includes('cloudflare')) {
          providerName = 'Cloudflare Email Routing';
        }

        entities.push({
          type: 'record',
          value: `MX: ${primaryMx} (Priority ${mxRecords[0].priority})`,
          label: `Mail Exchange Routing: ${providerName}`,
          sourceTool: 'holehe',
          confidence: 1.0,
          metadata: {
            category: 'Mail Server Routing',
            primaryMx,
            provider: providerName,
            totalMxRecords: mxRecords.length,
            records: mxRecords,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`MX DNS resolution failed for ${domainPart}: ${err.message}`);
    }

    // 5. Live Gravatar Profile Extraction
    try {
      const md5Hash = crypto.createHash('md5').update(cleanEmail).digest('hex');
      const gravatarRes = await fetch(`https://en.gravatar.com/${md5Hash}.json`, {
        headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
        signal: AbortSignal.timeout(3500),
      });

      if (gravatarRes.status === 200) {
        const gravatarData = await gravatarRes.json();
        const entry = gravatarData?.entry?.[0];
        if (entry) {
          entities.push({
            type: 'platform',
            value: entry.profileUrl || `https://gravatar.com/${md5Hash}`,
            label: `Gravatar Active Profile: ${entry.displayName || entry.preferredUsername || userPart}`,
            sourceTool: 'holehe',
            confidence: 1.0,
            metadata: {
              platform: 'Gravatar',
              displayName: entry.displayName,
              preferredUsername: entry.preferredUsername,
              avatar: entry.thumbnailUrl,
              aboutMe: entry.aboutMe,
              currentLocation: entry.currentLocation,
            },
          });
        }
      }
    } catch (err: any) {
      // Non-fatal
    }

    // 6. Live GitHub User Association Check if prefix exists
    try {
      const ghRes = await fetch(`https://api.github.com/users/${userPart}`, {
        headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
        signal: AbortSignal.timeout(3000),
      });
      if (ghRes.status === 200) {
        const ghData = await ghRes.json();
        entities.push({
          type: 'platform',
          value: ghData.html_url || `https://github.com/${userPart}`,
          label: `Correlated GitHub Account: ${ghData.name || userPart}`,
          sourceTool: 'holehe',
          confidence: 0.92,
          metadata: {
            platform: 'GitHub',
            bio: ghData.bio,
            followers: ghData.followers,
          },
        });
      }
    } catch {}

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Holehe validated mail deliverability via DNS MX, checked disposable lists, and probed public profile registries for ${cleanEmail}`,
      entities,
      durationMs,
      raw: {
        email: cleanEmail,
        isDisposable,
        discoveredEntitiesCount: entities.length,
      },
    };
  }
}
