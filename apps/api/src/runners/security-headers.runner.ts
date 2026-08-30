import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import { isInternalOrBlockedTarget } from '../common/utils/ssrf-protection';

interface HeaderCheck {
  name: string;
  present: boolean;
  value?: string;
  score: number;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation?: string;
}

@Injectable()
export class SecurityHeadersRunner implements ToolRunner {
  readonly toolName = 'security_headers';
  readonly supportedInputTypes: InputType[] = ['domain', 'ip'];
  private readonly logger = new Logger(SecurityHeadersRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!cleanTarget || isInternalOrBlockedTarget(cleanTarget)) {
      return {
        status: 'error',
        summary: `Target "${cleanTarget || targetInput}" is private, internal, or invalid (SSRF protection active).`,
        entities: [],
        error: 'Invalid or restricted internal target',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const url = `https://${cleanTarget}`;
    let rawHeaders: Record<string, string> = {};
    let statusCode = 0;

    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 TraceMesh-SecAudit/2.0' },
        signal: AbortSignal.timeout(6000),
      });
      statusCode = res.status;
      res.headers.forEach((val, key) => {
        rawHeaders[key.toLowerCase()] = val;
      });
    } catch {
      // Retry via HTTP if HTTPS fails
      try {
        const httpUrl = `http://${cleanTarget}`;
        const resHttp = await fetch(httpUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 TraceMesh-SecAudit/2.0' },
          signal: AbortSignal.timeout(4000),
        });
        statusCode = resHttp.status;
        resHttp.headers.forEach((val, key) => {
          rawHeaders[key.toLowerCase()] = val;
        });
      } catch (err: any) {
        this.logger.warn(`Security headers probe failed for ${cleanTarget}: ${err.message}`);
      }
    }

    // Security Headers Evaluation Matrix
    const checks: HeaderCheck[] = [
      {
        name: 'Strict-Transport-Security',
        present: Boolean(rawHeaders['strict-transport-security']),
        value: rawHeaders['strict-transport-security'],
        score: rawHeaders['strict-transport-security'] ? 25 : 0,
        importance: 'CRITICAL',
        recommendation: 'Enforce HSTS with max-age >= 31536000; includeSubDomains; preload',
      },
      {
        name: 'Content-Security-Policy',
        present: Boolean(rawHeaders['content-security-policy']),
        value: rawHeaders['content-security-policy'],
        score: rawHeaders['content-security-policy'] ? 25 : 0,
        importance: 'CRITICAL',
        recommendation: 'Define strict Content Security Policy to mitigate XSS and data injection',
      },
      {
        name: 'X-Frame-Options',
        present: Boolean(rawHeaders['x-frame-options']),
        value: rawHeaders['x-frame-options'],
        score: rawHeaders['x-frame-options'] ? 15 : 0,
        importance: 'HIGH',
        recommendation: 'Set X-Frame-Options to DENY or SAMEORIGIN to prevent Clickjacking',
      },
      {
        name: 'X-Content-Type-Options',
        present: Boolean(rawHeaders['x-content-type-options']),
        value: rawHeaders['x-content-type-options'],
        score: rawHeaders['x-content-type-options'] ? 15 : 0,
        importance: 'HIGH',
        recommendation: 'Set X-Content-Type-Options to nosniff to prevent MIME confusion attacks',
      },
      {
        name: 'Referrer-Policy',
        present: Boolean(rawHeaders['referrer-policy']),
        value: rawHeaders['referrer-policy'],
        score: rawHeaders['referrer-policy'] ? 10 : 0,
        importance: 'MEDIUM',
        recommendation: 'Set Referrer-Policy to strict-origin-when-cross-origin',
      },
      {
        name: 'Permissions-Policy',
        present: Boolean(rawHeaders['permissions-policy']),
        value: rawHeaders['permissions-policy'],
        score: rawHeaders['permissions-policy'] ? 10 : 0,
        importance: 'MEDIUM',
        recommendation: 'Restrict camera, microphone, and geolocation APIs via Permissions-Policy',
      },
    ];

    const totalScore = checks.reduce((acc, c) => acc + c.score, 0);
    let grade = 'F';
    if (totalScore >= 90) grade = 'A+';
    else if (totalScore >= 80) grade = 'A';
    else if (totalScore >= 65) grade = 'B';
    else if (totalScore >= 50) grade = 'C';
    else if (totalScore >= 35) grade = 'D';

    // Server and Technology Banner Information Leaks
    const serverBanner = rawHeaders['server'];
    const poweredBy = rawHeaders['x-powered-by'];
    const aspNetVersion = rawHeaders['x-aspnet-version'];

    if (serverBanner) {
      entities.push({
        type: 'record',
        value: `Server: ${serverBanner}`,
        label: `Server Banner Disclosure: ${serverBanner}`,
        sourceTool: 'security_headers',
        confidence: 0.98,
        metadata: {
          category: 'Server Banner Exposure',
          header: 'Server',
          disclosedTechnology: serverBanner,
        },
      });
    }

    if (poweredBy || aspNetVersion) {
      const tech = poweredBy || aspNetVersion;
      entities.push({
        type: 'record',
        value: `X-Powered-By: ${tech}`,
        label: `Framework Disclosure: ${tech}`,
        sourceTool: 'security_headers',
        confidence: 0.99,
        metadata: {
          category: 'Framework Fingerprint Disclosure',
          header: poweredBy ? 'X-Powered-By' : 'X-AspNet-Version',
          disclosedFramework: tech,
        },
      });
    }

    // Overall Security Posture Record Entity
    entities.push({
      type: 'record',
      value: `Grade: ${grade} (${totalScore}/100)`,
      label: `HTTP Security Grade: ${grade} (${totalScore}/100) on ${cleanTarget}`,
      sourceTool: 'security_headers',
      confidence: 0.99,
      metadata: {
        score: totalScore,
        grade,
        httpStatus: statusCode,
        missingHeaders: checks.filter((c) => !c.present).map((c) => c.name),
        presentHeaders: checks.filter((c) => c.present).map((c) => c.name),
      },
    });

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `HTTP Security Headers Auditor evaluated ${cleanTarget}: Security Grade ${grade} (${totalScore}/100) with ${checks.filter((c) => c.present).length}/${checks.length} defensive headers implemented.`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        statusCode,
        grade,
        totalScore,
        checks,
        rawHeaders,
      },
    };
  }
}
