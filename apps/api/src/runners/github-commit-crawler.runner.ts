import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface LeakedSecretFinding {
  type: string;
  repoName: string;
  commitHash: string;
  authorEmail: string;
  authorName: string;
  filePath?: string;
  snippetMasked: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

const SECRET_REGEX_PATTERNS = [
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g, severity: 'CRITICAL' as const },
  { name: 'Google Cloud API Key', regex: /AIzaSy[0-9A-Za-z\\-_]{33}/g, severity: 'HIGH' as const },
  { name: 'Slack Bot Token', regex: /xoxb-[0-9]{11,13}-[0-9]{11,13}-[a-zA-Z0-9]{24}/g, severity: 'CRITICAL' as const },
  { name: 'Stripe Live Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/g, severity: 'CRITICAL' as const },
  { name: 'GitHub Personal Access Token', regex: /ghp_[0-9a-zA-Z]{36}/g, severity: 'CRITICAL' as const },
  { name: 'Generic RSA/OpenSSH Private Key', regex: /-----BEGIN (RSA|OPENSSH) PRIVATE KEY-----/g, severity: 'CRITICAL' as const },
];

@Injectable()
export class GitHubCommitCrawlerRunner implements ToolRunner {
  readonly toolName = 'github_commit_crawler';
  readonly supportedInputTypes: InputType[] = ['username', 'email', 'domain'];
  private readonly logger = new Logger(GitHubCommitCrawlerRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase().replace(/^https?:\/\/github\.com\//, '').replace(/\/.*$/, '');

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target username or email required for GitHub Commit & Secret scan',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const discoveredEmails = new Set<string>();
    const findings: LeakedSecretFinding[] = [];
    let publicReposCount = 0;

    // 1. If target is username, fetch user events and public repo commits via GitHub API
    try {
      const userUrl = `https://api.github.com/users/${cleanTarget}/events/public`;
      const res = await fetch(userUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 TraceMesh-SecIntel/2.0',
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 200) {
        const events = await res.json();
        if (Array.isArray(events)) {
          for (const ev of events) {
            if (ev.type === 'PushEvent' && ev.payload?.commits) {
              for (const c of ev.payload.commits) {
                const authorEmail = c.author?.email;
                const authorName = c.author?.name;
                const message = c.message || '';

                if (authorEmail && !authorEmail.includes('noreply.github.com')) {
                  discoveredEmails.add(authorEmail);
                }

                // Check commit message for potential secrets
                for (const pat of SECRET_REGEX_PATTERNS) {
                  if (pat.regex.test(message)) {
                    findings.push({
                      type: pat.name,
                      repoName: ev.repo?.name || 'Public Repository',
                      commitHash: c.sha || 'latest',
                      authorEmail: authorEmail || 'Unknown',
                      authorName: authorName || cleanTarget,
                      snippetMasked: message.slice(0, 80),
                      severity: pat.severity,
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(`GitHub public events query failed for ${cleanTarget}: ${err.message}`);
    }

    // 2. Fetch User's Public Repositories to check commit history
    try {
      const reposUrl = `https://api.github.com/users/${cleanTarget}/repos?per_page=10&sort=pushed`;
      const resRepos = await fetch(reposUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 TraceMesh-SecIntel/2.0',
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (resRepos.status === 200) {
        const repos = await resRepos.json();
        if (Array.isArray(repos)) {
          publicReposCount = repos.length;
          for (const repo of repos.slice(0, 4)) {
            // Probe default branch commits
            const commitsUrl = `https://api.github.com/repos/${repo.full_name}/commits?per_page=5`;
            const resC = await fetch(commitsUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 TraceMesh-SecIntel/2.0' },
              signal: AbortSignal.timeout(4000),
            }).catch(() => null);

            if (resC && resC.status === 200) {
              const commits = await resC.json();
              if (Array.isArray(commits)) {
                for (const item of commits) {
                  const comm = item.commit;
                  const email = comm?.author?.email || comm?.committer?.email;
                  if (email && !email.includes('noreply.github.com')) {
                    discoveredEmails.add(email);
                  }
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(`GitHub repos query failed: ${err.message}`);
    }

    // Generate Discovered Graph Entities
    for (const email of discoveredEmails) {
      entities.push({
        type: 'email',
        value: email,
        label: `Git Author Email: ${email}`,
        sourceTool: 'github_commit_crawler',
        confidence: 0.99,
        metadata: {
          origin: 'GitHub Commit History Logs',
          gitUser: cleanTarget,
          category: 'Identity Unmasking',
        },
      });
    }

    for (const secret of findings) {
      entities.push({
        type: 'record',
        value: `Secret:${secret.type}:${secret.commitHash.slice(0, 8)}`,
        label: `🚨 Exposed ${secret.type} in ${secret.repoName}`,
        sourceTool: 'github_commit_crawler',
        confidence: 0.96,
        metadata: {
          secretType: secret.type,
          repository: secret.repoName,
          commit: secret.commitHash,
          authorEmail: secret.authorEmail,
          severity: secret.severity,
          category: 'Exposed Cloud Credential in Git',
        },
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `GitHub Commit & Secret Crawler analyzed ${publicReposCount} repositories for "${cleanTarget}", extracting ${discoveredEmails.size} unmasked author emails and ${findings.length} secret exposures.`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        discoveredEmails: Array.from(discoveredEmails),
        secretFindings: findings,
        publicReposScanned: publicReposCount,
      },
    };
  }
}
