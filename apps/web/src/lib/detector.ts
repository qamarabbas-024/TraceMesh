import type { InputType } from '@tracemesh/shared';

export function detectInputType(raw: string): InputType {
  const input = raw.trim();
  if (!input) return 'username';

  // 1. Email detection
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (emailRegex.test(input)) {
    return 'email';
  }

  // 2. IP address detection (IPv4)
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(input)) {
    return 'ip';
  }

  // 3. Image URL or data URI or filename
  if (
    input.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|gif|webp|bmp|tiff|heic)(\?.*)?$/i.test(input)
  ) {
    return 'image';
  }

  // 4. Phone number detection (starts with + or contains standard international format with digits)
  const phoneRegex = /^(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
  const digitsOnly = input.replace(/\D/g, '');
  if ((input.startsWith('+') || (digitsOnly.length >= 8 && digitsOnly.length <= 15 && /^[0-9+\-()\s]+$/.test(input))) && phoneRegex.test(input)) {
    return 'phone';
  }

  // 5. Domain name / URL detection
  const domainRegex = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;
  if (domainRegex.test(input) && (input.includes('.') || input.startsWith('http'))) {
    return 'domain';
  }

  // 6. Default to username
  return 'username';
}
