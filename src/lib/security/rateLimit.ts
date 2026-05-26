/**
 * Wave 2 — Client-side soft throttle for override emissions.
 *
 * Window-based counter to slow runaway UI loops. The server remains
 * the hard authority (per directive, no new backend rate-limit infra).
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const BUCKETS = new Map<string, Bucket>();

export function softLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const b = BUCKETS.get(key);
  if (!b || now - b.windowStart > windowMs) {
    BUCKETS.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

export function resetLimit(key?: string): void {
  if (key) BUCKETS.delete(key);
  else BUCKETS.clear();
}
