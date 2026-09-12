/**
 * SSRF (Server-Side Request Forgery) Protection Utility
 * Prevents runners from querying internal, loopback, private RFC-1918, or cloud metadata endpoints.
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '::',
  '169.254.169.254', // AWS/GCP/Azure IMDS metadata
  'fd00:ec2::254', // AWS IMDS IPv6
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
]);

export function isInternalOrBlockedTarget(target: string): boolean {
  if (!target) return true;
  const clean = target
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/^\[|\]$/g, '');

  if (BLOCKED_HOSTS.has(clean)) {
    return true;
  }

  // Check localhost / local / internal domain suffixes
  if (
    clean.endsWith('.localhost') ||
    clean.endsWith('.local') ||
    clean.endsWith('.internal') ||
    clean.endsWith('.lan') ||
    clean.endsWith('.home') ||
    clean.endsWith('.corp') ||
    clean.endsWith('.intranet') ||
    clean.endsWith('.arpa')
  ) {
    return true;
  }

  // Check IPv6 link-local and unique local addresses
  if (
    clean === '::1' ||
    clean.startsWith('fe80:') ||
    clean.startsWith('fc00:') ||
    clean.startsWith('fd00:')
  ) {
    return true;
  }

  // Check IPv4 Private and Link-Local Ranges
  const ipv4Match = clean.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-local / Cloud Metadata)
    if (a === 169 && b === 254) return true;
    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 0.0.0.0/8
    if (a === 0) return true;
  }

  return false;
}
