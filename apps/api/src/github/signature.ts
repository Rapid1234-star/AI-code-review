import { createHmac, timingSafeEqual } from 'crypto';

export function verifyGithubSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
) {
  if (!signature?.startsWith('sha256=')) return false;
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expected = Buffer.from(`sha256=${digest}`);
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
