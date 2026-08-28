import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import * as crypto from 'crypto';

interface BlackbirdProbe {
  name: string;
  url: string;
  check: (username: string) => Promise<{ exists: boolean; label?: string; metadata?: Record<string, any> }>;
}

@Injectable()
export class BlackbirdRunner implements ToolRunner {
  readonly toolName = 'blackbird';
  readonly supportedInputTypes: InputType[] = ['username'];
  private readonly logger = new Logger(BlackbirdRunner.name);

  private readonly probes: BlackbirdProbe[] = [
    {
      name: 'Gravatar',
      url: 'https://gravatar.com/{u}',
      check: async (u) => {
        try {
          const hash = crypto.createHash('md5').update(u.toLowerCase()).digest('hex');
          const res = await fetch(`https://en.gravatar.com/${hash}.json`, {
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            const entry = data?.entry?.[0];
            if (entry) {
              return {
                exists: true,
                label: `Gravatar Profile: ${entry.displayName || u}`,
                metadata: {
                  platform: 'Gravatar',
                  displayName: entry.displayName,
                  avatar: entry.thumbnailUrl,
                  profileUrl: entry.profileUrl,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'Codeforces',
      url: 'https://codeforces.com/profile/{u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://codeforces.com/api/user.info?handles=${u}`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data.status === 'OK' && data.result?.[0]) {
              const user = data.result[0];
              return {
                exists: true,
                label: `Codeforces: ${user.handle} (Rank: ${user.rank || 'Unrated'}, Rating: ${user.rating || 0})`,
                metadata: {
                  platform: 'Codeforces',
                  rating: user.rating,
                  rank: user.rank,
                  country: user.country,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'npm Registry',
      url: 'https://www.npmjs.com/~{u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=maintainer:${u}&size=1`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data.total > 0) {
              return {
                exists: true,
                label: `npm Maintainer: ~${u} (${data.total} published packages)`,
                metadata: {
                  platform: 'npm',
                  packageCount: data.total,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'Mastodon Social',
      url: 'https://mastodon.social/@{u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://mastodon.social/api/v1/accounts/lookup?acct=${u}`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data.id && data.username) {
              return {
                exists: true,
                label: `Mastodon: @${data.username}@mastodon.social (${data.display_name || ''})`,
                metadata: {
                  platform: 'Mastodon',
                  followers: data.followers_count,
                  note: data.note,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'Duolingo',
      url: 'https://www.duolingo.com/profile/{u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://www.duolingo.com/2017-06-30/users?username=${u}`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data.users && data.users.length > 0) {
              const user = data.users[0];
              return {
                exists: true,
                label: `Duolingo: ${user.name || user.username} (Streak: ${user.streak || 0} days)`,
                metadata: {
                  platform: 'Duolingo',
                  streak: user.streak,
                  learningLanguage: user.learningLanguage,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
  ];

  async execute(username: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanUsername = username.trim().replace(/^@/, '');

    if (inputType !== 'username' || !cleanUsername) {
      return {
        status: 'error',
        summary: 'Invalid username provided to Blackbird runner',
        entities: [],
        error: 'Invalid username format',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];

    // Run parallel live queries
    await Promise.allSettled(
      this.probes.map(async (probe) => {
        const probeResult = await probe.check(cleanUsername);
        if (probeResult.exists) {
          entities.push({
            type: 'platform',
            value: probe.url.replace('{u}', cleanUsername),
            label: probeResult.label || `${probe.name}: ${cleanUsername}`,
            sourceTool: 'blackbird',
            confidence: 1.0,
            metadata: {
              platform: probe.name,
              username: cleanUsername,
              ...probeResult.metadata,
            },
          });
        }
      }),
    );

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Blackbird verified ${entities.length} active live profiles across open federated, coding, and educational networks for "${cleanUsername}"`,
      entities,
      durationMs,
      raw: {
        username: cleanUsername,
        platformsFound: entities.map((e) => e.metadata?.platform).filter(Boolean),
      },
    };
  }
}
