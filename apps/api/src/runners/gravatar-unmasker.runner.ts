import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import * as crypto from 'crypto';

export interface GravatarProfile {
  hashMd5: string;
  hashSha256: string;
  profileUrl: string;
  avatarUrl: string;
  displayName?: string;
  preferredUsername?: string;
  aboutMe?: string;
  currentLocation?: string;
  verifiedAccounts?: { service: string; url: string }[];
  urls?: { title: string; value: string }[];
}

@Injectable()
export class GravatarUnmaskerRunner implements ToolRunner {
  readonly toolName = 'gravatar_unmasker';
  readonly supportedInputTypes: InputType[] = ['email', 'username'];
  private readonly logger = new Logger(GravatarUnmaskerRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase();

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target email or username required for Gravatar identity unmasking',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    let md5Hash = '';
    let sha256Hash = '';

    if (inputType === 'email' || cleanTarget.includes('@')) {
      md5Hash = crypto.createHash('md5').update(cleanTarget).digest('hex');
      sha256Hash = crypto.createHash('sha256').update(cleanTarget).digest('hex');
    } else {
      md5Hash = crypto.createHash('md5').update(`${cleanTarget}@gmail.com`).digest('hex');
      sha256Hash = crypto.createHash('sha256').update(`${cleanTarget}@gmail.com`).digest('hex');
    }

    let profile: GravatarProfile | null = null;

    // 1. Query Gravatar JSON API using MD5 hash
    try {
      const url = `https://en.gravatar.com/${md5Hash}.json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 TraceMesh-IdentityOSINT/2.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 200) {
        const json = await res.json();
        const entry = json.entry?.[0];
        if (entry) {
          profile = {
            hashMd5: md5Hash,
            hashSha256: sha256Hash,
            profileUrl: entry.profileUrl || `https://gravatar.com/${entry.preferredUsername || md5Hash}`,
            avatarUrl: entry.thumbnailUrl || `https://www.gravatar.com/avatar/${md5Hash}?s=400`,
            displayName: entry.displayName || entry.name?.formatted,
            preferredUsername: entry.preferredUsername,
            aboutMe: entry.aboutMe,
            currentLocation: entry.currentLocation,
            verifiedAccounts: (entry.verifiedAccounts || []).map((acc: any) => ({
              service: acc.service_type || acc.shortname || 'social',
              url: acc.url,
            })),
            urls: (entry.urls || []).map((u: any) => ({
              title: u.title || 'Personal Website',
              value: u.value,
            })),
          };
        }
      }
    } catch (err: any) {
      this.logger.debug(`Gravatar MD5 query failed: ${err.message}`);
    }

    // Fallback: If no public profile, check if Avatar image exists (HTTP 200 vs default 404)
    if (!profile) {
      try {
        const avatarUrl = `https://www.gravatar.com/avatar/${md5Hash}?d=404`;
        const resAv = await fetch(avatarUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 TraceMesh-IdentityOSINT/2.0' },
          signal: AbortSignal.timeout(4000),
        });

        if (resAv.status === 200) {
          profile = {
            hashMd5: md5Hash,
            hashSha256: sha256Hash,
            profileUrl: `https://gravatar.com/${md5Hash}`,
            avatarUrl: `https://www.gravatar.com/avatar/${md5Hash}?s=400`,
            verifiedAccounts: [],
            urls: [],
          };
        }
      } catch {
        // Avatar check failed
      }
    }

    if (!profile) {
      return {
        status: 'success',
        summary: `Gravatar Unmasker checked MD5 hash ${md5Hash} for "${cleanTarget}": zero registered Gravatar accounts or custom avatars found.`,
        entities: [],
        durationMs: Date.now() - startTime,
        raw: {
          target: cleanTarget,
          md5Hash,
          sha256Hash,
          registered: false,
        },
      };
    }

    // Generate Discovered Graph Entities
    entities.push({
      type: 'platform',
      value: profile.profileUrl,
      label: `Gravatar Profile: ${profile.displayName || profile.preferredUsername || md5Hash}`,
      sourceTool: 'gravatar_unmasker',
      confidence: 0.99,
      metadata: {
        md5Hash: profile.hashMd5,
        sha256Hash: profile.hashSha256,
        displayName: profile.displayName,
        preferredUsername: profile.preferredUsername,
        avatarUrl: profile.avatarUrl,
        location: profile.currentLocation,
        aboutMe: profile.aboutMe,
        category: 'Identity & Avatar Footprint',
      },
    });

    if (profile.preferredUsername) {
      entities.push({
        type: 'username',
        value: profile.preferredUsername,
        label: `Gravatar Handle: @${profile.preferredUsername}`,
        sourceTool: 'gravatar_unmasker',
        confidence: 0.98,
        metadata: {
          platform: 'Gravatar',
          profileUrl: profile.profileUrl,
        },
      });
    }

    for (const acc of profile.verifiedAccounts || []) {
      entities.push({
        type: 'platform',
        value: acc.url,
        label: `Linked ${acc.service.toUpperCase()} Profile: ${acc.url}`,
        sourceTool: 'gravatar_unmasker',
        confidence: 0.96,
        metadata: {
          service: acc.service,
          url: acc.url,
          unmaskedVia: 'Gravatar Profile Links',
        },
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Gravatar Unmasker resolved ${cleanTarget} to Gravatar account (${profile.displayName || profile.preferredUsername || 'Active Avatar'}) with ${profile.verifiedAccounts?.length || 0} linked social profiles.`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        profile,
      },
    };
  }
}
