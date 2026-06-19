import type { BackoffPolicy } from "./types";

/**
 * Computes the delay (ms) to wait before the next attempt, given the policy and
 * the attempt that just failed (1-based). Pure function — the source of truth for
 * retry timing, shared in spirit with BullMQ's native backoff.
 *
 * - fixed: always `delayMs`.
 * - exponential: `delayMs * 2^(attempt-1)` (delayMs, 2·delayMs, 4·delayMs, …).
 */
export function computeBackoffDelay(
  policy: BackoffPolicy | undefined,
  failedAttempt: number,
): number {
  if (!policy) return 0;
  if (policy.type === "fixed") return policy.delayMs;
  const exponent = Math.max(0, failedAttempt - 1);
  return policy.delayMs * 2 ** exponent;
}
