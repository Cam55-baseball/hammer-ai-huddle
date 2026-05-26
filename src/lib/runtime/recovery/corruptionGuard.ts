/**
 * Wave 2 — Projection corruption guard.
 *
 * Compares stored inputsHash against a freshly computed hash of the
 * source event IDs that produced the projection. On mismatch the
 * projection is dropped (never silently repaired); the caller recomputes
 * from the ledger.
 */

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function hashInputs(eventIds: string[]): string {
  return fnv1a([...eventIds].sort().join("|"));
}

export function isCorrupt(
  expectedHash: string,
  actualEventIds: string[],
): boolean {
  return hashInputs(actualEventIds) !== expectedHash;
}
