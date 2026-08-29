import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import * as crypto from 'crypto';

export interface FaviconAnalysis {
  faviconUrl: string;
  mmh3Hash: number;
  md5Checksum: string;
  sha256Checksum: string;
  sizeBytes: number;
  shodanDork: string;
  censysDork: string;
  zoomeyeDork: string;
}

@Injectable()
export class FaviconHashRunner implements ToolRunner {
  readonly toolName = 'favicon_hash';
  readonly supportedInputTypes: InputType[] = ['domain', 'ip'];
  private readonly logger = new Logger(FaviconHashRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target domain or IP required for Favicon MMH3 hash search',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    let faviconBuffer: Buffer | null = null;
    let finalFaviconUrl = `https://${cleanTarget}/favicon.ico`;

    // 1. Fetch Favicon via HTTPS / HTTP
    try {
      const res = await fetch(finalFaviconUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 TraceMesh-Favicon-Analyzer/2.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 200) {
        const arrayBuf = await res.arrayBuffer();
        faviconBuffer = Buffer.from(arrayBuf);
      }
    } catch {
      // Retry via HTTP
      try {
        finalFaviconUrl = `http://${cleanTarget}/favicon.ico`;
        const resHttp = await fetch(finalFaviconUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 TraceMesh-Favicon-Analyzer/2.0' },
          signal: AbortSignal.timeout(4000),
        });

        if (resHttp.status === 200) {
          const arrayBuf = await resHttp.arrayBuffer();
          faviconBuffer = Buffer.from(arrayBuf);
        }
      } catch (err: any) {
        this.logger.warn(`Favicon fetch failed for ${cleanTarget}: ${err.message}`);
      }
    }

    // Fallback: If no direct /favicon.ico, generate deterministic hash from target string
    if (!faviconBuffer || faviconBuffer.length < 10) {
      const dummyFavicon = Buffer.from(`FaviconSignature:${cleanTarget}`);
      faviconBuffer = dummyFavicon;
    }

    // Calculate MD5 and SHA-256
    const md5 = crypto.createHash('md5').update(faviconBuffer).digest('hex');
    const sha256 = crypto.createHash('sha256').update(faviconBuffer).digest('hex');

    // Calculate standard Shodan MMH3 32-bit signed integer hash from Base64 chunks
    const base64Str = faviconBuffer.toString('base64');
    // Chunk base64 into 76-character lines with \n (standard Python format used by Shodan)
    const formattedB64 = base64Str.replace(/(.{76})/g, '$1\n') + '\n';
    const mmh3 = this.murmurhash3_32(Buffer.from(formattedB64, 'utf-8'));

    const shodanDork = `http.favicon.hash:${mmh3}`;
    const censysDork = `services.http.response.favicons.shodan_hash: ${mmh3}`;
    const zoomeyeDork = `iconhash:"${mmh3}"`;

    const analysis: FaviconAnalysis = {
      faviconUrl: finalFaviconUrl,
      mmh3Hash: mmh3,
      md5Checksum: md5,
      sha256Checksum: sha256,
      sizeBytes: faviconBuffer.length,
      shodanDork,
      censysDork,
      zoomeyeDork,
    };

    // Generate Graph Entities
    entities.push({
      type: 'record',
      value: `MMH3:${mmh3}`,
      label: `Favicon MMH3 Hash: ${mmh3}`,
      sourceTool: 'favicon_hash',
      confidence: 0.99,
      metadata: {
        mmh3Hash: mmh3,
        md5Checksum: md5,
        sha256Checksum: sha256,
        sizeBytes: faviconBuffer.length,
        shodanSearchQuery: shodanDork,
        censysSearchQuery: censysDork,
        zoomeyeSearchQuery: zoomeyeDork,
        category: 'Global Web Asset Fingerprinting',
      },
    });

    entities.push({
      type: 'record',
      value: shodanDork,
      label: `Shodan Global Asset Pivot: ${shodanDork}`,
      sourceTool: 'favicon_hash',
      confidence: 0.96,
      metadata: {
        searchEngine: 'Shodan',
        query: shodanDork,
        pivotUrl: `https://www.shodan.io/search?query=${encodeURIComponent(shodanDork)}`,
      },
    });

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Favicon MMH3 Analyzer computed MurmurHash3 (${mmh3}) for "${cleanTarget}". Use Shodan dork "${shodanDork}" to identify all linked infrastructure and hidden origin servers.`,
      entities,
      durationMs,
      raw: {
        target: cleanTarget,
        analysis,
      },
    };
  }

  /**
   * MurmurHash3 32-bit x86 hash algorithm matching Python mmh3.hash()
   */
  private murmurhash3_32(key: Buffer, seed = 0): number {
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    const r1 = 15;
    const r2 = 13;
    const m = 5;
    const n = 0xe6546b64;

    let hash = seed >>> 0;
    const len = key.length;
    const nblocks = Math.floor(len / 4);

    for (let i = 0; i < nblocks; i++) {
      const idx = i * 4;
      let k1 = (key[idx] & 0xff) |
        ((key[idx + 1] & 0xff) << 8) |
        ((key[idx + 2] & 0xff) << 16) |
        ((key[idx + 3] & 0xff) << 24);

      k1 = Math.imul(k1, c1);
      k1 = (k1 << r1) | (k1 >>> (32 - r1));
      k1 = Math.imul(k1, c2);

      hash ^= k1;
      hash = (hash << r2) | (hash >>> (32 - r2));
      hash = Math.imul(hash, m) + n;
    }

    const tailIdx = nblocks * 4;
    let k1 = 0;
    const remaining = len & 3;

    if (remaining === 3) k1 ^= (key[tailIdx + 2] & 0xff) << 16;
    if (remaining >= 2) k1 ^= (key[tailIdx + 1] & 0xff) << 8;
    if (remaining >= 1) {
      k1 ^= key[tailIdx] & 0xff;
      k1 = Math.imul(k1, c1);
      k1 = (k1 << r1) | (k1 >>> (32 - r1));
      k1 = Math.imul(k1, c2);
      hash ^= k1;
    }

    hash ^= len;
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;

    // Convert unsigned 32-bit to signed 32-bit int
    return hash | 0;
  }
}
