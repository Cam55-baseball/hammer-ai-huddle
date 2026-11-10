/**
 * Owner Nov 9 (rounds 3 and 4): ONE recovery cutoff everywhere recovery is judged.
 * The morning check-in asks Perceived Recovery on a 1–10 scale. 4 or below is
 * "poor recovery" — and the same cutoff is the injury-risk planner's "high soreness".
 * A missing answer is unknown (never a default, never poor).
 * Pure and dependency-free so the browser and the edge functions share it.
 */
export const RECOVERY_SCALE_MAX = 10;
export const POOR_RECOVERY_MAX = 4;

/** null = unknown (no answer); never treated as poor or fine. */
export function isPoorRecovery(value: number | null | undefined): boolean | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value <= POOR_RECOVERY_MAX;
}
