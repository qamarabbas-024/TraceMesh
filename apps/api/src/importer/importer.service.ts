import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DiscoveredEntity, InputType } from '@tracemesh/shared';

export interface ExtractedEntityReport {
  totalEntities: number;
  entities: DiscoveredEntity[];
  preview: string;
  sourceType: 'text' | 'chat_export' | 'file';
}

@Injectable()
export class ImporterService {
  private readonly logger = new Logger(ImporterService.name);

  // Email regex
  private readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  // Username handle regex (@username or u/username)
  private readonly USERNAME_REGEX = /(?:@|u\/|user\/)([a-zA-Z0-9_]{3,30})/g;
  // International phone regex
  private readonly PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  // Domain regex
  private readonly DOMAIN_REGEX = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g;
  // IPv4 regex
  private readonly IP_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
  // Cryptographic Hashes (SHA-256: 64 hex, SHA-1: 40 hex, MD5: 32 hex)
  private readonly SHA256_REGEX = /\b[a-fA-F0-9]{64}\b/g;
  private readonly SHA1_REGEX = /\b[a-fA-F0-9]{40}\b/g;
  private readonly MD5_REGEX = /\b[a-fA-F0-9]{32}\b/g;
  // Binary executable filename regex (.exe, .apk, .dll, .so, .bin, .msi, .dmg)
  private readonly BINARY_FILE_REGEX = /\b[a-zA-Z0-9_\-.]+\.(?:exe|apk|dll|so|bin|msi|dmg|app)\b/gi;

  /**
   * Extract intelligence entities from raw text or transcripts
   */
  extractEntitiesFromText(text: string, sourceType: 'text' | 'chat_export' | 'file' = 'text'): ExtractedEntityReport {
    if (!text || typeof text !== 'string') {
      throw new BadRequestException('Valid text content is required for entity extraction');
    }

    const entityMap = new Map<string, DiscoveredEntity>();

    // 1. Extract Cryptographic Hashes (SHA-256, SHA-1, MD5)
    const sha256Matches = text.match(this.SHA256_REGEX) || [];
    for (const h of sha256Matches) {
      const clean = h.toLowerCase().trim();
      const key = `hash:sha256:${clean}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          type: 'record',
          value: clean,
          label: `Extracted SHA-256 Hash (${clean.substring(0, 10)}...)`,
          sourceTool: 'importer_nlp',
          confidence: 0.99,
          metadata: { hashType: 'SHA-256' },
        });
      }
    }

    const sha1Matches = text.match(this.SHA1_REGEX) || [];
    for (const h of sha1Matches) {
      const clean = h.toLowerCase().trim();
      const key = `hash:sha1:${clean}`;
      // Prevent colliding if substring of sha256
      if (!entityMap.has(key) && !sha256Matches.some((s) => s.toLowerCase().includes(clean))) {
        entityMap.set(key, {
          type: 'record',
          value: clean,
          label: `Extracted SHA-1 Hash (${clean.substring(0, 8)}...)`,
          sourceTool: 'importer_nlp',
          confidence: 0.95,
          metadata: { hashType: 'SHA-1' },
        });
      }
    }

    const md5Matches = text.match(this.MD5_REGEX) || [];
    for (const h of md5Matches) {
      const clean = h.toLowerCase().trim();
      const key = `hash:md5:${clean}`;
      // Prevent colliding if substring of sha256 or sha1
      if (
        !entityMap.has(key) &&
        !sha256Matches.some((s) => s.toLowerCase().includes(clean)) &&
        !sha1Matches.some((s) => s.toLowerCase().includes(clean))
      ) {
        entityMap.set(key, {
          type: 'record',
          value: clean,
          label: `Extracted MD5 Hash (${clean.substring(0, 8)}...)`,
          sourceTool: 'importer_nlp',
          confidence: 0.95,
          metadata: { hashType: 'MD5' },
        });
      }
    }

    // 2. Extract Binary & Executable Artifact Names
    const binaryMatches = text.match(this.BINARY_FILE_REGEX) || [];
    for (const bin of binaryMatches) {
      const clean = bin.trim();
      const key = `binary:${clean.toLowerCase()}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          type: 'metadata',
          value: clean,
          label: `Extracted Executable/Binary Artifact (${clean})`,
          sourceTool: 'importer_nlp',
          confidence: 0.93,
          metadata: { fileArtifact: true },
        });
      }
    }

    // 3. Extract Emails
    const emails = text.match(this.EMAIL_REGEX) || [];
    for (const email of emails) {
      const clean = email.toLowerCase().trim();
      const key = `email:${clean}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          type: 'email',
          value: clean,
          label: `Extracted Email Address (${clean})`,
          sourceTool: 'importer_nlp',
          confidence: 0.98,
        });
      }
    }

    // 4. Extract Usernames
    let match: RegExpExecArray | null;
    const userRegex = new RegExp(this.USERNAME_REGEX);
    while ((match = userRegex.exec(text)) !== null) {
      const user = match[1]?.toLowerCase().trim();
      if (user && user.length >= 3) {
        const key = `username:${user}`;
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            type: 'username',
            value: user,
            label: `Extracted Social Handle (@${user})`,
            sourceTool: 'importer_nlp',
            confidence: 0.92,
          });
        }
      }
    }

    // 5. Extract IPv4
    const ips = text.match(this.IP_REGEX) || [];
    for (const ip of ips) {
      const clean = ip.trim();
      if (clean !== '127.0.0.1' && clean !== '0.0.0.0') {
        const key = `ip:${clean}`;
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            type: 'ip',
            value: clean,
            label: `Extracted Public IPv4 Address (${clean})`,
            sourceTool: 'importer_nlp',
            confidence: 0.96,
          });
        }
      }
    }

    // 6. Extract Domains
    const domainRegex = new RegExp(this.DOMAIN_REGEX);
    while ((match = domainRegex.exec(text)) !== null) {
      const domain = match[1]?.toLowerCase().trim();
      const binaryExtensions = ['.exe', '.apk', '.dll', '.so', '.bin', '.msi', '.dmg', '.png', '.jpg', '.jpeg', '.gif', '.js', '.css'];
      const isBinaryExt = binaryExtensions.some((ext) => domain?.endsWith(ext));
      if (domain && !isBinaryExt) {
        const key = `domain:${domain}`;
        if (!entityMap.has(key) && !domain.includes('@')) {
          entityMap.set(key, {
            type: 'domain',
            value: domain,
            label: `Extracted Domain Identifier (${domain})`,
            sourceTool: 'importer_nlp',
            confidence: 0.94,
          });
        }
      }
    }

    // 7. Extract Phone Numbers
    const phones = text.match(this.PHONE_REGEX) || [];
    for (const phone of phones) {
      const clean = phone.replace(/[^0-9+]/g, '');
      if (clean.length >= 8 && clean.length <= 15) {
        const key = `phone:${clean}`;
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            type: 'phone',
            value: clean.startsWith('+') ? clean : `+${clean}`,
            label: `Extracted Telecom Number (${clean})`,
            sourceTool: 'importer_nlp',
            confidence: 0.88,
          });
        }
      }
    }

    const entities = Array.from(entityMap.values());
    const preview = text.length > 300 ? `${text.substring(0, 300)}...` : text;

    return {
      totalEntities: entities.length,
      entities,
      preview,
      sourceType,
    };
  }

  /**
   * Parse structured LLM Chat Export (ChatGPT / Claude / Telegram JSON export format)
   */
  parseChatExport(jsonContent: any): ExtractedEntityReport {
    let combinedText = '';

    if (typeof jsonContent === 'string') {
      try {
        jsonContent = JSON.parse(jsonContent);
      } catch {
        return this.extractEntitiesFromText(jsonContent, 'chat_export');
      }
    }

    // Recursively extract text from JSON chat messages
    const extractText = (obj: any) => {
      if (!obj) return;
      if (typeof obj === 'string') {
        combinedText += ` ${obj}`;
      } else if (Array.isArray(obj)) {
        obj.forEach(extractText);
      } else if (typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
          if (['content', 'text', 'message', 'prompt', 'response', 'body'].includes(k)) {
            extractText(obj[k]);
          } else if (typeof obj[k] === 'object') {
            extractText(obj[k]);
          }
        }
      }
    };

    extractText(jsonContent);
    if (!combinedText.trim()) {
      return {
        totalEntities: 0,
        entities: [],
        preview: 'No extractable text found in chat export structure',
        sourceType: 'chat_export',
      };
    }
    return this.extractEntitiesFromText(combinedText, 'chat_export');
  }
}
