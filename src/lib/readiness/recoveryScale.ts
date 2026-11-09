/**
 * Owner Nov 9 (round 3): the morning check-in asks Perceived Recovery on a 1–10 scale.
 * 4 or below counts as poor recovery; a missing answer is unknown (never a default).
 */
export const RECOVERY_SCALE_MAX = 10;
export const POOR_RECOVERY_MAX = 4;

/** null = unknown (no answer); never treated as poor or fine. */
export function isPoorRecovery(value: number | null | undefined): boolean | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value <= POOR_RECOVERY_MAX;
}
