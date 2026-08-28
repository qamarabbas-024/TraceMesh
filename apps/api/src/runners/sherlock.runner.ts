import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import * as crypto from 'crypto';

interface ServiceProbe {
  name: string;
  url: string;
  check: (username: string) => Promise<{ exists: boolean; label?: string; metadata?: Record<string, any> }>;
}

@Injectable()
export class SherlockRunner implements ToolRunner {
  readonly toolName = 'sherlock';
  readonly supportedInputTypes: InputType[] = ['username'];
  private readonly logger = new Logger(SherlockRunner.name);

  private readonly serviceProbes: ServiceProbe[] = [
    {
      name: 'GitHub',
      url: 'https://github.com/{u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://api.github.com/users/${u}`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/1.0', Accept: 'application/vnd.github.v3+json' },
            signal: AbortSignal.timeout(3500),
          });
          if (res.status === 200) {
            const data = await res.json();
            return {
              exists: true,
              label: `GitHub: ${data.name || data.login}`,
              metadata: {
                platform: 'GitHub',
                bio: data.bio,
                publicRepos: data.public_repos,
                followers: data.followers,
                location: data.location,
                blog: data.blog,
                avatar: data.avatar_url,
                createdAt: data.created_at,
              },
            };
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'HackerNews',
      url: 'https://news.ycombinator.com/user?id={u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://hacker-news.firebaseio.com/v0/user/${u}.json`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data && data.id) {
              return {
                exists: true,
                label: `HackerNews: ${data.id} (Karma: ${data.karma || 0})`,
                metadata: {
                  platform: 'HackerNews',
                  karma: data.karma,
                  about: data.about,
                  created: data.created ? new Date(data.created * 1000).toISOString() : undefined,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'Reddit',
      url: 'https://www.reddit.com/user/{u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://www.reddit.com/user/${u}/about.json`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TraceMesh/1.0' },
            signal: AbortSignal.timeout(3500),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data?.data?.name) {
              return {
                exists: true,
                label: `Reddit: u/${data.data.name}`,
                metadata: {
                  platform: 'Reddit',
                  totalKarma: (data.data.link_karma || 0) + (data.data.comment_karma || 0),
                  created: data.data.created_utc ? new Date(data.data.created_utc * 1000).toISOString() : undefined,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'GitLab',
      url: 'https://gitlab.com/{u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://gitlab.com/api/v4/users?username=${u}`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
            signal: AbortSignal.timeout(3500),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const user = data[0];
              return {
                exists: true,
                label: `GitLab: ${user.name || user.username}`,
                metadata: {
                  platform: 'GitLab',
                  name: user.name,
                  avatar: user.avatar_url,
                  state: user.state,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'Dev.to',
      url: 'https://dev.to/{u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://dev.to/api/users/by_username?url=${u}`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data?.username) {
              return {
                exists: true,
                label: `Dev.to: ${data.name || data.username}`,
                metadata: {
                  platform: 'Dev.to',
                  summary: data.summary,
                  joinedAt: data.joined_at,
                  websiteUrl: data.website_url,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'Chess.com',
      url: 'https://www.chess.com/member/{u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://api.chess.com/pub/player/${u}`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data?.username) {
              return {
                exists: true,
                label: `Chess.com: ${data.name || data.username}`,
                metadata: {
                  platform: 'Chess.com',
                  followers: data.followers,
                  country: data.country,
                  status: data.status,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'DockerHub',
      url: 'https://hub.docker.com/u/{u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://hub.docker.com/v2/users/${u}`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data?.username) {
              return {
                exists: true,
                label: `DockerHub: ${data.username}`,
                metadata: {
                  platform: 'DockerHub',
                  joined: data.date_joined,
                  type: data.type,
                },
              };
            }
          }
        } catch {}
        return { exists: false };
      },
    },
    {
      name: 'Keybase',
      url: 'https://keybase.io/{u}',
      check: async (u) => {
        try {
          const res = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?usernames=${u}`, {
            headers: { 'User-Agent': 'TraceMesh-OSINT/1.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (res.status === 200) {
            const data = await res.json();
            if (data?.status?.code === 0 && data?.them?.[0]?.basics?.username) {
              return {
                exists: true,
                label: `Keybase Identity: ${u}`,
                metadata: {
                  platform: 'Keybase',
                  keyFingerprint: data.them[0].public_keys?.primary?.key_fingerprint,
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
        summary: 'Invalid username provided to Sherlock runner',
        entities: [],
        error: 'Invalid username format',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];

    // Execute real live parallel network probes
    const results = await Promise.allSettled(
      this.serviceProbes.map(async (probe) => {
        const probeResult = await probe.check(cleanUsername);
        if (probeResult.exists) {
          const profileUrl = probe.url.replace('{u}', cleanUsername);
          entities.push({
            type: 'platform',
            value: profileUrl,
            label: probeResult.label || `${probe.name}: ${cleanUsername}`,
            sourceTool: 'sherlock',
            confidence: 1.0,
            metadata: {
              platform: probe.name,
              username: cleanUsername,
              ...probeResult.metadata,
            },
          });

          // If GitHub returned a website / blog, add as domain pivot
          if (probe.name === 'GitHub' && probeResult.metadata?.blog) {
            const blogClean = probeResult.metadata.blog.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            if (blogClean && blogClean.includes('.')) {
              entities.push({
                type: 'domain',
                value: blogClean,
                label: `GitHub Linked Website (${blogClean})`,
                sourceTool: 'sherlock',
                confidence: 0.95,
                metadata: { category: 'Operator Website' },
              });
            }
          }
        }
      }),
    );

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Sherlock completed live network probes across 8 major developer and social platforms, discovering ${entities.length} verified active accounts.`,
      entities,
      durationMs,
      raw: {
        username: cleanUsername,
        platformsFound: entities.map((e) => e.metadata?.platform).filter(Boolean),
      },
    };
  }
}
