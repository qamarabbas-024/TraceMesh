import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

interface CountryPlan {
  code: string;
  country: string;
  iso: string;
  timezones: string[];
  nationalLength: number[];
}

const COUNTRY_DIAL_PLANS: Record<string, CountryPlan> = {
  '1': { code: '+1', country: 'United States / Canada', iso: 'US/CA', timezones: ['America/New_York', 'America/Chicago', 'America/Los_Angeles'], nationalLength: [10] },
  '44': { code: '+44', country: 'United Kingdom', iso: 'GB', timezones: ['Europe/London'], nationalLength: [10, 11] },
  '49': { code: '+49', country: 'Germany', iso: 'DE', timezones: ['Europe/Berlin'], nationalLength: [10, 11] },
  '33': { code: '+33', country: 'France', iso: 'FR', timezones: ['Europe/Paris'], nationalLength: [9] },
  '92': { code: '+92', country: 'Pakistan', iso: 'PK', timezones: ['Asia/Karachi'], nationalLength: [10] },
  '91': { code: '+91', country: 'India', iso: 'IN', timezones: ['Asia/Kolkata'], nationalLength: [10] },
  '81': { code: '+81', country: 'Japan', iso: 'JP', timezones: ['Asia/Tokyo'], nationalLength: [10] },
  '86': { code: '+86', country: 'China', iso: 'CN', timezones: ['Asia/Shanghai'], nationalLength: [11] },
  '61': { code: '+61', country: 'Australia', iso: 'AU', timezones: ['Australia/Sydney'], nationalLength: [9] },
  '7': { code: '+7', country: 'Russia / Kazakhstan', iso: 'RU', timezones: ['Europe/Moscow'], nationalLength: [10] },
  '34': { code: '+34', country: 'Spain', iso: 'ES', timezones: ['Europe/Madrid'], nationalLength: [9] },
  '39': { code: '+39', country: 'Italy', iso: 'IT', timezones: ['Europe/Rome'], nationalLength: [9, 10] },
  '55': { code: '+55', country: 'Brazil', iso: 'BR', timezones: ['America/Sao_Paulo'], nationalLength: [10, 11] },
};

@Injectable()
export class PhoneInfogaRunner implements ToolRunner {
  readonly toolName = 'phoneinfoga';
  readonly supportedInputTypes: InputType[] = ['phone'];
  private readonly logger = new Logger(PhoneInfogaRunner.name);

  async execute(phone: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');

    if (inputType !== 'phone' || cleanPhone.length < 7) {
      return {
        status: 'error',
        summary: 'Valid international E.164 phone number required',
        entities: [],
        error: 'Phone number format invalid',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    const normalizedDigits = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone;

    // Resolve Country Code & ITU Telecom Routing
    let matchedPlan: CountryPlan = {
      code: 'Unknown',
      country: 'International Telecom Jurisdiction',
      iso: 'INT',
      timezones: ['UTC'],
      nationalLength: [],
    };

    for (let len = 3; len >= 1; len--) {
      const prefix = normalizedDigits.slice(0, len);
      if (COUNTRY_DIAL_PLANS[prefix]) {
        matchedPlan = COUNTRY_DIAL_PLANS[prefix];
        break;
      }
    }

    // 1. ITU Jurisdiction Node
    entities.push({
      type: 'record',
      value: `${matchedPlan.country} (${matchedPlan.code} / ${matchedPlan.iso})`,
      label: `National Telecom Jurisdiction: ${matchedPlan.country}`,
      sourceTool: 'phoneinfoga',
      confidence: 1.0,
      metadata: {
        category: 'ITU Telecom Plan',
        country: matchedPlan.country,
        countryCode: matchedPlan.code,
        isoCode: matchedPlan.iso,
        timezones: matchedPlan.timezones,
      },
    });

    // 2. Standardized E.164 Node
    const e164 = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
    entities.push({
      type: 'phone',
      value: e164,
      label: `Standardized E.164 Number: ${e164}`,
      sourceTool: 'phoneinfoga',
      confidence: 1.0,
      metadata: {
        format: 'E.164 International',
        digitsCount: normalizedDigits.length,
      },
    });

    // 3. Timezone Metadata Node
    entities.push({
      type: 'metadata',
      value: `Primary Timezone: ${matchedPlan.timezones.join(', ')}`,
      label: `Geographic Timezone Range`,
      sourceTool: 'phoneinfoga',
      confidence: 0.95,
      metadata: { timezones: matchedPlan.timezones },
    });

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `PhoneInfoga parsed E.164 format and resolved ITU jurisdiction for ${e164} (${matchedPlan.country})`,
      entities,
      durationMs,
      raw: {
        e164,
        country: matchedPlan.country,
        iso: matchedPlan.iso,
      },
    };
  }
}
