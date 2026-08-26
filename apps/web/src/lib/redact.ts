/**
 * OPSEC Live Data Redaction & Masking Utility
 * Masks emails, phone numbers, IP addresses, credentials, and usernames
 * to protect sensitive intelligence during demos, screen recording, or audits.
 */

export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return maskGeneral(email);
  const [name, domain] = parts;
  const maskedName =
    name.length <= 2 ? `${name[0]}*` : `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
  const domainParts = domain.split('.');
  const maskedDomain = domainParts
    .map((dp, i) => (i === domainParts.length - 1 ? dp : `${dp[0]}${'*'.repeat(Math.max(1, dp.length - 1))}`))
    .join('.');
  return `${maskedName}@${maskedDomain}`;
}

export function maskIP(ip: string): string {
  const octets = ip.split('.');
  if (octets.length === 4) {
    return `${octets[0]}.${octets[1]}.*.*`;
  }
  const v6 = ip.split(':');
  if (v6.length > 2) {
    return `${v6.slice(0, 2).join(':')}:****:****`;
  }
  return maskGeneral(ip);
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return `${phone.slice(0, 5)}${'*'.repeat(Math.max(2, phone.length - 8))}${phone.slice(-3)}`;
}

export function maskGeneral(val: string): string {
  if (!val || val.length <= 3) return '***';
  return `${val.slice(0, 2)}${'*'.repeat(Math.max(2, val.length - 4))}${val.slice(-2)}`;
}

export function maskSensitiveValue(value: string, type?: string): string {
  if (!value) return '';
  const trimmed = value.trim();

  if (type === 'email' || trimmed.includes('@')) {
    return maskEmail(trimmed);
  }
  if (type === 'ip' || /^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
    return maskIP(trimmed);
  }
  if (type === 'phone' || /^\+?\d{7,15}$/.test(trimmed)) {
    return maskPhone(trimmed);
  }
  return maskGeneral(trimmed);
}
