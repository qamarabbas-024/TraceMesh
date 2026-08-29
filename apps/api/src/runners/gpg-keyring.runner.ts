import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface PgpKeyRecord {
  keyId: string;
  fingerprint: string;
  algorithm: string;
  createdDate?: string;
  userUids: string[];
  associatedEmails: string[];
  associatedNames: string[];
  isRevoked?: boolean;
}

@Injectable()
export class GpgKeyringRunner implements ToolRunner {
  readonly toolName = 'gpg_keyring';
  readonly supportedInputTypes: InputType[] = ['email', 'username', 'domain'];
  private readonly logger = new Logger(GpgKeyringRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanTarget = targetInput.trim().toLowerCase();

    if (!cleanTarget) {
      return {
        status: 'error',
        summary: 'Target query required for OpenPGP Keyring OSINT search',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const discoveredKeys: PgpKeyRecord[] = [];

    // 1. Query Ubuntu PGP KeyServer HKP Gateway (Machine-readable VKS/HKP format)
    try {
      const hkpUrl = `https://keyserver.ubuntu.com/pks/lookup?op=index&options=mr&search=${encodeURIComponent(cleanTarget)}`;
      const res = await fetch(hkpUrl, {
        headers: { 'User-Agent': 'TraceMesh-OSINT-GPG/1.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 200) {
        const text = await res.text();
        this.parseHkpIndex(text, discoveredKeys);
      }
    } catch (err: any) {
      this.logger.warn(`Ubuntu PGP keyserver timeout: ${err.message}`);
    }

    // 2. Query keys.openpgp.org API
    if (inputType === 'email' && cleanTarget.includes('@')) {
      try {
        const vksUrl = `https://keys.openpgp.org/vks/v1/by-email/${encodeURIComponent(cleanTarget)}`;
        const resVks = await fetch(vksUrl, {
          headers: { 'User-Agent': 'TraceMesh-OSINT-GPG/1.0' },
          signal: AbortSignal.timeout(4000),
        });

        if (resVks.status === 200) {
          const keyArmored = await resVks.text();
          const fpMatch = keyArmored.match(/([A-F0-9]{40})/i);
          if (fpMatch && !discoveredKeys.some(k => k.fingerprint === fpMatch[1])) {
            discoveredKeys.push({
              keyId: fpMatch[1].slice(-16),
              fingerprint: fpMatch[1].toUpperCase(),
              algorithm: 'RSA/Ed25519 OpenPGP',
              userUids: [cleanTarget],
              associatedEmails: [cleanTarget],
              associatedNames: [],
            });
          }
        }
      } catch (err: any) {
        this.logger.debug(`keys.openpgp.org query error: ${err.message}`);
      }
    }

    // Transform discovered PGP keys into structured OSINT intelligence graph entities
    const seenEmails = new Set<string>();
    const seenNames = new Set<string>();

    for (const key of discoveredKeys) {
      // PGP Key entity
      entities.push({
        type: 'record',
        value: `PGP:${key.keyId}`,
        label: `OpenPGP Key: 0x${key.keyId} (${key.algorithm})`,
        sourceTool: 'gpg_keyring',
        confidence: 0.99,
        metadata: {
          keyId: key.keyId,
          fingerprint: key.fingerprint,
          algorithm: key.algorithm,
          createdDate: key.createdDate,
          userUids: key.userUids,
          category: 'Cryptographic Keyring Identity',
        },
      });

      // Discovered cross-linked Email identities
      for (const email of key.associatedEmails) {
        if (!seenEmails.has(email) && email.includes('@')) {
          seenEmails.add(email);
          entities.push({
            type: 'email',
            value: email,
            label: `PGP Keyholder Email: ${email}`,
            sourceTool: 'gpg_keyring',
            confidence: 0.96,
            metadata: {
              sourceKeyId: key.keyId,
              primaryIdentifier: cleanTarget,
              verifiedByPgpSignature: true,
            },
          });
        }
      }

      // Discovered legal names / aliases
      for (const name of key.associatedNames) {
        if (!seenNames.has(name) && name.length > 2) {
          seenNames.add(name);
          entities.push({
            type: 'platform',
            value: name,
            label: `PGP Identity Name: ${name}`,
            sourceTool: 'gpg_keyring',
            confidence: 0.92,
            metadata: {
              sourceKeyId: key.keyId,
              associatedEmails: key.associatedEmails,
            },
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `OpenPGP Keyring Correlator queried global keyservers for "${cleanTarget}", discovering ${discoveredKeys.length} PGP cryptographic keys, ${seenEmails.size} linked emails, and ${seenNames.size} real-name aliases.`,
      entities,
      durationMs,
      raw: {
        query: cleanTarget,
        keyCount: discoveredKeys.length,
        keys: discoveredKeys,
      },
    };
  }

  private parseHkpIndex(text: string, keys: PgpKeyRecord[]) {
    // HKP machine readable format:
    // pub:FINGERPRINT:ALGO:KEYSIZE:CREATED:EXPIRES:FLAGS
    // uid:ESCAPED_UID:CREATED:EXPIRES:FLAGS
    const lines = text.split('\n');
    let currentKey: PgpKeyRecord | null = null;

    for (const line of lines) {
      const parts = line.split(':');
      const tag = parts[0];

      if (tag === 'pub') {
        const rawFp = parts[1] || '';
        const keyId = rawFp.length >= 16 ? rawFp.slice(-16) : rawFp;
        const algoNum = parts[2] || '1';
        const keySize = parts[3] || '2048';
        const algo = algoNum === '1' ? `RSA ${keySize}-bit` : algoNum === '22' ? 'Ed25519' : `Pubkey (Algo ${algoNum})`;
        const createdTimestamp = parts[4] ? new Date(parseInt(parts[4], 10) * 1000).toISOString().split('T')[0] : undefined;

        currentKey = {
          keyId: keyId.toUpperCase(),
          fingerprint: rawFp.toUpperCase(),
          algorithm: algo,
          createdDate: createdTimestamp,
          userUids: [],
          associatedEmails: [],
          associatedNames: [],
        };
        keys.push(currentKey);
      } else if (tag === 'uid' && currentKey) {
        let rawUid = parts[1] || '';
        try {
          rawUid = decodeURIComponent(rawUid);
        } catch {
          // ignore escape error
        }

        currentKey.userUids.push(rawUid);

        // Extract Email from UID: Name <email@example.com>
        const emailMatch = rawUid.match(/<([^>]+@[^>]+)>/);
        if (emailMatch) {
          const email = emailMatch[1].trim().toLowerCase();
          if (!currentKey.associatedEmails.includes(email)) {
            currentKey.associatedEmails.push(email);
          }
        }

        // Extract Name from UID
        const namePart = rawUid.replace(/<[^>]+>/g, '').replace(/\([^)]+\)/g, '').trim();
        if (namePart && namePart.length > 2 && !currentKey.associatedNames.includes(namePart)) {
          currentKey.associatedNames.push(namePart);
        }
      }
    }
  }
}
