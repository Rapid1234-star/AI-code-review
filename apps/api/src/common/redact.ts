export function redact(value: string): string {
  return value
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(
      /("?(?:apiKey|api_key|password|authorization)"?\s*[:=]\s*")[^"]+/gi,
      '$1[redacted]',
    );
}
