import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface DecentralizedStorageRecord {
  protocol: 'IPFS (InterPlanetary File System)' | 'Arweave Permaweb' | 'Filecoin Deal';
  contentId: string;
  gatewayUrl: string;
  contentType?: string;
  contentLengthBytes?: number;
  statusCode: number;
  resolvedTitle?: string;
}

@Injectable()
export class IpfsArweaveRunner implements ToolRunner {
  readonly toolName = 'ipfs_arweave';
  readonly supportedInputTypes: InputType[] = ['domain', 'username'];
  private readonly logger = new Logger(IpfsArweaveRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanInput = targetInput.trim().replace(/^ipfs:\/\//, '').replace(/^ar:\/\//, '');

    const isIpfsCidV0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cleanInput);
    const isIpfsCidV1 = /^bafy[a-z0-9]{55}$/i.test(cleanInput);
    const isArweave = /^[a-zA-Z0-9_-]{43}$/.test(cleanInput);

    if (!isIpfsCidV0 && !isIpfsCidV1 && !isArweave) {
      return {
        status: 'success',
        summary: `Decentralized Storage Resolver: "${targetInput}" is not a valid IPFS CID (Qm/bafy) or Arweave transaction hash.`,
        entities: [],
        durationMs: Date.now() - startTime,
        raw: { isDWebStorage: false },
      };
    }

    const entities: DiscoveredEntity[] = [];
    let record: DecentralizedStorageRecord | null = null;

    if (isIpfsCidV0 || isIpfsCidV1) {
      const gatewayUrl = `https://ipfs.io/ipfs/${cleanInput}`;
      let statusCode = 200;
      let contentType = 'application/octet-stream';
      let contentLength = 0;

      try {
        const res = await fetch(gatewayUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'TraceMesh-DWebResolver/2.0' },
          signal: AbortSignal.timeout(5000),
        });
        statusCode = res.status;
        contentType = res.headers.get('content-type') || contentType;
        contentLength = parseInt(res.headers.get('content-length') || '0', 10);
      } catch (err: any) {
        this.logger.debug(`IPFS Gateway probe failed: ${err.message}`);
      }

      record = {
        protocol: 'IPFS (InterPlanetary File System)',
        contentId: cleanInput,
        gatewayUrl,
        contentType,
        contentLengthBytes: contentLength,
        statusCode,
        resolvedTitle: `IPFS Content (${cleanInput.slice(0, 10)}...)`,
      };
    } else if (isArweave) {
      const gatewayUrl = `https://arweave.net/${cleanInput}`;
      let statusCode = 200;
      let contentType = 'application/json';
      let contentLength = 0;

      try {
        const res = await fetch(gatewayUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'TraceMesh-DWebResolver/2.0' },
          signal: AbortSignal.timeout(5000),
        });
        statusCode = res.status;
        contentType = res.headers.get('content-type') || contentType;
        contentLength = parseInt(res.headers.get('content-length') || '0', 10);
      } catch (err: any) {
        this.logger.debug(`Arweave Gateway probe failed: ${err.message}`);
      }

      record = {
        protocol: 'Arweave Permaweb',
        contentId: cleanInput,
        gatewayUrl,
        contentType,
        contentLengthBytes: contentLength,
        statusCode,
        resolvedTitle: `Arweave Permaweb Document (${cleanInput.slice(0, 10)}...)`,
      };
    }

    if (record) {
      entities.push({
        type: 'record',
        value: `${record.protocol}:${record.contentId}`,
        label: `📦 [${record.protocol}] MIME: ${record.contentType}`,
        sourceTool: 'ipfs_arweave',
        confidence: 0.99,
        metadata: {
          protocol: record.protocol,
          contentId: record.contentId,
          gatewayUrl: record.gatewayUrl,
          contentType: record.contentType,
          sizeBytes: record.contentLengthBytes,
          category: 'Decentralized Storage & P2P Mirror',
        },
      });

      entities.push({
        type: 'platform',
        value: record.gatewayUrl,
        label: `Public Gateway Mirror: ${record.contentId.slice(0, 12)}...`,
        sourceTool: 'ipfs_arweave',
        confidence: 0.96,
        metadata: {
          gateway: record.gatewayUrl,
        },
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: record
        ? `Decentralized Storage Resolver mapped ${record.protocol} content ${record.contentId.slice(0, 12)}... (MIME: ${record.contentType || 'unknown'}).`
        : `No storage record resolved.`,
      entities,
      durationMs,
      raw: { record },
    };
  }
}
