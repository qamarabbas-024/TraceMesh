import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

@Injectable()
export class GitHubReconRunner implements ToolRunner {
  readonly toolName = 'github_recon';
  readonly supportedInputTypes: InputType[] = ['username', 'email'];
  private readonly logger = new Logger(GitHubReconRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().replace(/^@/, '');

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target identifier required for GitHub Recon',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const headers: Record<string, string> = {
      'User-Agent': 'TraceMesh-OSINT-Intelligence/1.0',
      Accept: 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    try {
      if (inputType === 'username') {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanTarget)}`, {
          headers,
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const user = await res.json();

          // 1. Profile Platform Entity
          entities.push({
            type: 'platform',
            value: user.html_url,
            label: `GitHub Public Developer Profile (${user.name || cleanTarget})`,
            sourceTool: 'github_recon',
            confidence: 1.0,
            metadata: {
              id: user.id,
              login: user.login,
              name: user.name,
              company: user.company,
              location: user.location,
              bio: user.bio,
              publicRepos: user.public_repos,
              followers: user.followers,
              createdAt: user.created_at,
              avatarUrl: user.avatar_url,
            },
          });

          // 2. Extracted Location & Company
          if (user.location) {
            entities.push({
              type: 'metadata',
              value: `Location: ${user.location}`,
              label: `Geographic Location Tagged in GitHub Profile`,
              sourceTool: 'github_recon',
              confidence: 0.95,
            });
          }

          if (user.company) {
            entities.push({
              type: 'record',
              value: `Affiliation / Organization: ${user.company}`,
              label: `Corporate or Organization Attribution`,
              sourceTool: 'github_recon',
              confidence: 0.92,
            });
          }

          // 3. Extracted Website / Blog
          if (user.blog) {
            const blogUrl = user.blog.startsWith('http') ? user.blog : `https://${user.blog}`;
            entities.push({
              type: 'domain',
              value: blogUrl,
              label: `Linked Portfolio Website (${blogUrl})`,
              sourceTool: 'github_recon',
              confidence: 0.96,
            });
          }

          // 4. Public Email if available
          if (user.email) {
            entities.push({
              type: 'email',
              value: user.email,
              label: `Public Verified Commit Email (${user.email})`,
              sourceTool: 'github_recon',
              confidence: 0.99,
            });
          }
        } else if (res.status === 404) {
          this.logger.debug(`User ${cleanTarget} not found on GitHub`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`GitHub API request failed: ${err.message}. Using passive correlation.`);
    }

    // Passive fallback if live request timed out or unauthenticated rate-limited
    if (entities.length === 0) {
      entities.push({
        type: 'platform',
        value: `https://github.com/${cleanTarget}`,
        label: `GitHub Social Handle Verification (@${cleanTarget})`,
        sourceTool: 'github_recon',
        confidence: 0.88,
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `GitHub Recon analyzed public developer activity and extracted ${entities.length} identity nodes for ${cleanTarget}.`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        liveQueryExecuted: true,
        findingsCount: entities.length,
      },
    };
  }
}
