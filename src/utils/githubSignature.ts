import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Validates the GitHub webhook signature (X-Hub-Signature-256).
 * Uses HMAC SHA-256 with timing-safe comparison.
 */
export function verifyGitHubSignature(
  payload: string | Buffer,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;

  const expected =
    'sha256=' +
    createHmac('sha256', secret)
      .update(typeof payload === 'string' ? payload : payload)
      .digest('hex');

  if (expected.length !== signature.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
