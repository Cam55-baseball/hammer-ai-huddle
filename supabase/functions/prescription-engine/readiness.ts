// Owner Nov 12: an unknown readiness score stays unknown and causes NO readiness adjustment.
// hie-analyze sends null when there is no recent check-in (no stand-in such as 70).

export function readinessOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Drill-ranking multiplier: 1.0 (no adjustment) when unknown. */
export function readinessAdjustment(score: number | null): number {
  if (score === null) return 1.0;
  return score >= 70 ? 1.0 : score >= 50 ? 0.85 : 0.7;
}

/** Prompt lines: the score and its low-readiness rule only when the score is known. */
export function readinessPrompt(score: number | null): { line: string; rule: string } {
  if (score === null) {
    return { line: "READINESS: unknown (no recent check-in)", rule: "- Readiness is unknown: do not change reps or intensity for readiness" };
  }
  return { line: `READINESS: ${score}/100`, rule: "- If readiness < 60, reduce reps by 30% and cap intensity at 75" };
}
