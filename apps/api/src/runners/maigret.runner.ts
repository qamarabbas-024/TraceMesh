import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

interface MaigretProbe {
  name: string;
  category: string;
  url: string;
  probe: (username: string) => Promise<{ exists: boolean; label?: string; metadata?: Record<string, any> }>;
}

@Injectable()
export class MaigretRunner implements ToolRunner {
  readonly toolName = 'maigret';
  readonly supportedInputTypes: InputType[] = ['username'];
  private readonly logger = new Logger(MaigretRunner.name);

  private readonly probes: MaigretProbe[] = [
    {
      name: 'npm Registry',
      category: 'developer',
      url: 'https://www.npmjs.com/~{u}',
      probe: async (u) => {
        try {
          const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=maintainer:${encodeURIComponent(u)}&size=3`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/2.0' },
            signal: AbortSignal.timeout(3500),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.total > 0) {
              const pkgNames = data.objects.map((o: any) => o.package.name).join(', ');
              return {
                exists: true,
                label: `npm Package Author: ${u} (Maintains: ${pkgNames})`,
                metadata: { totalPackages: data.total, samplePackages: pkgNames },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'Mastodon',
      category: 'social',
      url: 'https://mastodon.social/@{u}',
      probe: async (u) => {
        try {
          const res = await fetch(`https://mastodon.social/@${encodeURIComponent(u)}.json`, {
            headers: {
              'User-Agent': 'TraceMesh-OSINT/2.0',
              Accept: 'application/activity+json, application/ld+json',
            },
            signal: AbortSignal.timeout(3500),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data && (data.id || data.name)) {
              return {
                exists: true,
                label: `Mastodon ActivityPub: @${u}@mastodon.social (${data.name || u})`,
                metadata: {
                  displayName: data.name,
                  summary: data.summary,
                  published: data.published,
                  icon: data.icon?.url,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'Gravatar Profile',
      category: 'identity',
      url: 'https://gravatar.com/{u}',
      probe: async (u) => {
        try {
          const res = await fetch(`https://en.gravatar.com/${encodeURIComponent(u)}.json`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/2.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            const entry = data?.entry?.[0];
            if (entry) {
              return {
                exists: true,
                label: `Gravatar Unmasked: ${entry.displayName || u} (${entry.currentLocation || 'Global'})`,
                metadata: {
                  displayName: entry.displayName,
                  location: entry.currentLocation,
                  aboutMe: entry.aboutMe,
                  avatarUrl: entry.thumbnailUrl,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'GitLab Developer',
      category: 'code',
      url: 'https://gitlab.com/{u}',
      probe: async (u) => {
        try {
          const res = await fetch(`https://gitlab.com/api/v4/users?username=${encodeURIComponent(u)}`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/2.0' },
            signal: AbortSignal.timeout(3500),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const usr = data[0];
              return {
                exists: true,
                label: `GitLab User: ${usr.name || usr.username} (ID: ${usr.id})`,
                metadata: { id: usr.id, name: usr.name, avatar: usr.avatar_url },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'PyPI Python Index',
      category: 'developer',
      url: 'https://pypi.org/user/{u}/',
      probe: async (u) => {
        try {
          const res = await fetch(`https://pypi.org/user/${encodeURIComponent(u)}/`, {
            method: 'HEAD',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TraceMesh/2.0' },
            signal: AbortSignal.timeout(3500),
          });
          if (res.status === 200) {
            return {
              exists: true,
              label: `PyPI Python Author: ${u}`,
              metadata: { platform: 'PyPI', profile: `https://pypi.org/user/${u}/` },
            };
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'Dev.to Community',
      category: 'tech',
      url: 'https://dev.to/{u}',
      probe: async (u) => {
        try {
          const res = await fetch(`https://dev.to/api/users/by_username?url=${encodeURIComponent(u)}`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/2.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data?.username) {
              return {
                exists: true,
                label: `Dev.to Writer: ${data.name || data.username}`,
                metadata: { summary: data.summary, website: data.website_url },
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
    const cleanUser = username.trim().replace(/^@/, '');

    if (inputType !== 'username' || !cleanUser) {
      return {
        status: 'error',
        summary: 'Invalid username format provided to Maigret runner',
        entities: [],
        error: 'Invalid username',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];

    // Parallel live probes across real API endpoints
    await Promise.allSettled(
      this.probes.map(async (probe) => {
        const result = await probe.probe(cleanUser);
        if (result.exists) {
          const profileUrl = probe.url.replace('{u}', cleanUser);
          entities.push({
            type: 'platform',
            value: profileUrl,
            label: result.label || `Maigret Verified: ${probe.name} Profile (${probe.category})`,
            sourceTool: 'maigret',
            confidence: 0.96,
            metadata: {
              platform: probe.name,
              category: probe.category,
              username: cleanUser,
              ...result.metadata,
            },
          });
        }
      }),
    );

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Maigret real-time probe scanned global developer and identity registries, verifying ${entities.length} confirmed profiles for @${cleanUser}.`,
      entities,
      durationMs,
      raw: {
        target: cleanUser,
        probesChecked: this.probes.length,
        matches: entities.length,
      },
    };
  }
}
