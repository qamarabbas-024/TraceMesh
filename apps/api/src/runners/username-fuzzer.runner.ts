import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface UsernameVariant {
  handle: string;
  mutationType: 'DELIMITER_SWAP' | 'LEETSPEAK' | 'SUFFIX_APPEND' | 'PREFIX_PREPEND' | 'PHONETIC_VOWEL_DROP';
  levenshteinDistance: number;
  sampleProfileUrls: { platform: string; url: string }[];
}

@Injectable()
export class UsernameFuzzerRunner implements ToolRunner {
  readonly toolName = 'username_fuzzer';
  readonly supportedInputTypes: InputType[] = ['username', 'email'];
  private readonly logger = new Logger(UsernameFuzzerRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    let baseHandle = targetInput.trim().toLowerCase();
    if (baseHandle.includes('@')) {
      baseHandle = baseHandle.split('@')[0];
    }
    baseHandle = baseHandle.replace(/[^a-z0-9._-]/g, '');

    if (!baseHandle || baseHandle.length < 2) {
      return {
        status: 'error',
        summary: 'Target username handle required for variant fuzzing',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const variantsMap = new Map<string, UsernameVariant>();

    // 1. Delimiter Mutations
    const delimiters = ['_', '.', '-', ''];
    const parts = baseHandle.split(/[_.-]/);
    if (parts.length > 1) {
      for (const d of delimiters) {
        const mutated = parts.join(d);
        if (mutated !== baseHandle) {
          variantsMap.set(mutated, {
            handle: mutated,
            mutationType: 'DELIMITER_SWAP',
            levenshteinDistance: this.levenshtein(baseHandle, mutated),
            sampleProfileUrls: this.getProfileUrls(mutated),
          });
        }
      }
    }

    // 2. Leetspeak Substitutions
    let leet = baseHandle
      .replace(/o/g, '0')
      .replace(/e/g, '3')
      .replace(/i/g, '1')
      .replace(/a/g, '4')
      .replace(/s/g, '5');

    if (leet !== baseHandle) {
      variantsMap.set(leet, {
        handle: leet,
        mutationType: 'LEETSPEAK',
        levenshteinDistance: this.levenshtein(baseHandle, leet),
        sampleProfileUrls: this.getProfileUrls(leet),
      });
    }

    // 3. Vowel Dropping (Phonetic abbreviation)
    const noVowels = baseHandle.replace(/[aeiou]/g, '');
    if (noVowels.length >= 3 && noVowels !== baseHandle) {
      variantsMap.set(noVowels, {
        handle: noVowels,
        mutationType: 'PHONETIC_VOWEL_DROP',
        levenshteinDistance: this.levenshtein(baseHandle, noVowels),
        sampleProfileUrls: this.getProfileUrls(noVowels),
      });
    }

    // 4. Common Security / Dev Suffixes & Prefixes
    const suffixes = ['_dev', '_sec', '01', '_official', '_io', '2026'];
    for (const s of suffixes) {
      const suffixed = `${baseHandle}${s}`;
      variantsMap.set(suffixed, {
        handle: suffixed,
        mutationType: 'SUFFIX_APPEND',
        levenshteinDistance: s.length,
        sampleProfileUrls: this.getProfileUrls(suffixed),
      });
    }

    const prefixes = ['real_', 'the_', 'iam_'];
    for (const p of prefixes) {
      const prefixed = `${p}${baseHandle}`;
      variantsMap.set(prefixed, {
        handle: prefixed,
        mutationType: 'PREFIX_PREPEND',
        levenshteinDistance: p.length,
        sampleProfileUrls: this.getProfileUrls(prefixed),
      });
    }

    const variantsList = Array.from(variantsMap.values());
    const entities: DiscoveredEntity[] = [];

    for (const variant of variantsList) {
      entities.push({
        type: 'username',
        value: variant.handle,
        label: `Mutation [${variant.mutationType}]: @${variant.handle}`,
        sourceTool: 'username_fuzzer',
        confidence: Math.max(0.70, 0.98 - variant.levenshteinDistance * 0.05),
        metadata: {
          originalHandle: baseHandle,
          mutationType: variant.mutationType,
          levenshteinDistance: variant.levenshteinDistance,
          profileUrls: variant.sampleProfileUrls,
          category: 'Phonetic & Permutation Handle OSINT',
        },
      });

      // Include top profile url as platform pivot
      if (variant.sampleProfileUrls.length > 0) {
        const topLink = variant.sampleProfileUrls[0];
        entities.push({
          type: 'platform',
          value: topLink.url,
          label: `${topLink.platform}: @${variant.handle}`,
          sourceTool: 'username_fuzzer',
          confidence: 0.88,
          metadata: {
            platform: topLink.platform,
            variantHandle: variant.handle,
          },
        });
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Username Fuzzer generated ${variantsList.length} phonetic and delimiter mutations for "@${baseHandle}" across 6 platforms.`,
      entities,
      durationMs,
      raw: {
        baseHandle,
        totalVariants: variantsList.length,
        variants: variantsList,
      },
    };
  }

  private getProfileUrls(handle: string): { platform: string; url: string }[] {
    return [
      { platform: 'GitHub', url: `https://github.com/${handle}` },
      { platform: 'DockerHub', url: `https://hub.docker.com/u/${handle}` },
      { platform: 'Keybase', url: `https://keybase.io/${handle}` },
      { platform: 'GitLab', url: `https://gitlab.com/${handle}` },
    ];
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}
