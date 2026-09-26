import { createHmac } from 'crypto';
import { verifyGithubSignature } from './signature';

describe('GitHub webhook signature', () => {
  it('accepts a matching signature and rejects a tampered body', () => {
    const secret = 'test-secret';
    const body = Buffer.from('{"ref":"refs/heads/main"}');
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
    expect(verifyGithubSignature(body, signature, secret)).toBe(true);
    expect(verifyGithubSignature(Buffer.from('{}'), signature, secret)).toBe(
      false,
    );
  });
});
