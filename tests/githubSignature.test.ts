import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyGitHubSignature } from '../src/utils/githubSignature.js';

function sign(payload: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
}

describe('verifyGitHubSignature', () => {
  const secret = 'test-secret-123';
  const payload = '{"action":"assigned"}';

  it('accepts valid signature', () => {
    const sig = sign(payload, secret);
    expect(verifyGitHubSignature(payload, sig, secret)).toBe(true);
  });

  it('rejects invalid signature', () => {
    expect(verifyGitHubSignature(payload, 'sha256=invalid', secret)).toBe(false);
  });

  it('rejects missing signature', () => {
    expect(verifyGitHubSignature(payload, undefined, secret)).toBe(false);
  });

  it('rejects wrong secret', () => {
    const sig = sign(payload, 'wrong-secret');
    expect(verifyGitHubSignature(payload, sig, secret)).toBe(false);
  });

  it('works with Buffer payload', () => {
    const buf = Buffer.from(payload);
    const sig = sign(payload, secret);
    expect(verifyGitHubSignature(buf, sig, secret)).toBe(true);
  });
});
