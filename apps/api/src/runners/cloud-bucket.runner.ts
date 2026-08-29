import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface CloudBucketProbe {
  provider: 'AWS S3' | 'Google Cloud Storage' | 'Azure Blob Storage';
  bucketName: string;
  url: string;
  status: 'PUBLIC_OPEN' | 'PROTECTED_EXISTS' | 'NOT_FOUND' | 'ERROR';
  httpStatus: number;
  exposedFilesCount?: number;
  sampleKeys?: string[];
}

const BUCKET_PERMUTATION_SUFFIXES = [
  '',
  '-backup',
  '-backups',
  '-data',
  '-assets',
  '-public',
  '-dev',
  '-staging',
  '-prod',
  '-logs',
  '-files',
  '-media',
  '-static',
  '-internal',
  '-corp',
];

@Injectable()
export class CloudBucketRunner implements ToolRunner {
  readonly toolName = 'cloud_bucket';
  readonly supportedInputTypes: InputType[] = ['domain', 'username'];
  private readonly logger = new Logger(CloudBucketRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const rawTarget = targetInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const baseName = rawTarget.split('.')[0];

    if (!baseName || baseName.length < 2) {
      return {
        status: 'error',
        summary: 'Target domain or organization identifier required for Cloud Bucket scan',
        entities: [],
        error: 'Invalid target identifier',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const discoveredBuckets: CloudBucketProbe[] = [];

    // Generate permutation targets
    const bucketNames = BUCKET_PERMUTATION_SUFFIXES.map((suffix) => `${baseName}${suffix}`);

    // Parallel probes across AWS S3, GCP, Azure
    await Promise.all(
      bucketNames.map(async (name) => {
        // 1. AWS S3 Probe
        const s3Url = `https://${name}.s3.amazonaws.com`;
        try {
          const res = await fetch(s3Url, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 TraceMesh-Cloud-Audit/1.0' },
            signal: AbortSignal.timeout(4000),
          });

          if (res.status === 200) {
            const body = await res.text();
            const keyMatches = body.match(/<Key>(.*?)<\/Key>/g) || [];
            discoveredBuckets.push({
              provider: 'AWS S3',
              bucketName: name,
              url: s3Url,
              status: 'PUBLIC_OPEN',
              httpStatus: res.status,
              exposedFilesCount: keyMatches.length,
              sampleKeys: keyMatches.slice(0, 5).map((k) => k.replace(/<\/?Key>/g, '')),
            });
          } else if (res.status === 403) {
            discoveredBuckets.push({
              provider: 'AWS S3',
              bucketName: name,
              url: s3Url,
              status: 'PROTECTED_EXISTS',
              httpStatus: res.status,
            });
          }
        } catch {
          // Probe timeout or connection drop
        }

        // 2. Google Cloud Storage Probe
        const gcpUrl = `https://storage.googleapis.com/${name}`;
        try {
          const resGcp = await fetch(gcpUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 TraceMesh-Cloud-Audit/1.0' },
            signal: AbortSignal.timeout(4000),
          });

          if (resGcp.status === 200) {
            discoveredBuckets.push({
              provider: 'Google Cloud Storage',
              bucketName: name,
              url: gcpUrl,
              status: 'PUBLIC_OPEN',
              httpStatus: resGcp.status,
            });
          } else if (resGcp.status === 403) {
            discoveredBuckets.push({
              provider: 'Google Cloud Storage',
              bucketName: name,
              url: gcpUrl,
              status: 'PROTECTED_EXISTS',
              httpStatus: resGcp.status,
            });
          }
        } catch {
          // Ignore timeout
        }

        // 3. Azure Blob Storage Probe
        const azureUrl = `https://${name}.blob.core.windows.net/?comp=list`;
        try {
          const resAzure = await fetch(azureUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 TraceMesh-Cloud-Audit/1.0' },
            signal: AbortSignal.timeout(4000),
          });

          if (resAzure.status === 200) {
            discoveredBuckets.push({
              provider: 'Azure Blob Storage',
              bucketName: name,
              url: azureUrl,
              status: 'PUBLIC_OPEN',
              httpStatus: resAzure.status,
            });
          } else if (resAzure.status === 400 || resAzure.status === 403) {
            discoveredBuckets.push({
              provider: 'Azure Blob Storage',
              bucketName: name,
              url: `https://${name}.blob.core.windows.net`,
              status: 'PROTECTED_EXISTS',
              httpStatus: resAzure.status,
            });
          }
        } catch {
          // Ignore timeout
        }
      }),
    );

    // Transform into Graph Entities
    for (const bucket of discoveredBuckets) {
      const isOpen = bucket.status === 'PUBLIC_OPEN';
      entities.push({
        type: 'record',
        value: bucket.url,
        label: `${isOpen ? '⚠️ PUBLIC' : '🔒'} ${bucket.provider}: ${bucket.bucketName}`,
        sourceTool: 'cloud_bucket',
        confidence: isOpen ? 0.99 : 0.92,
        metadata: {
          provider: bucket.provider,
          bucketName: bucket.bucketName,
          accessStatus: bucket.status,
          httpStatus: bucket.httpStatus,
          exposedFilesCount: bucket.exposedFilesCount || 0,
          sampleKeys: bucket.sampleKeys || [],
          severity: isOpen ? 'CRITICAL' : 'INFO',
          category: 'Cloud Storage Reconnaissance',
        },
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Cloud Storage Scanner probed ${bucketNames.length * 3} endpoints for organization base "${baseName}", discovering ${discoveredBuckets.length} registered cloud buckets (${discoveredBuckets.filter((b) => b.status === 'PUBLIC_OPEN').length} publicly accessible).`,
      entities,
      durationMs,
      raw: {
        baseName,
        totalProbed: bucketNames.length * 3,
        discoveredCount: discoveredBuckets.length,
        buckets: discoveredBuckets,
      },
    };
  }
}
