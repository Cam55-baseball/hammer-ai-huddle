// Learning loop: a "Do this" is marked only after a comparable re-measure.
export type Outcome = "worked" | "no_change" | "got_worse";
/** Change smaller than this (same units as the score) counts as "No change". */
export const NO_CHANGE_BAND = 3;

export function judgeOutcome(baseline: number | null, recheck: number | null, higherIsBetter = true): Outcome | null {
  if (baseline == null || recheck == null) return null; // never guess
  const diff = (recheck - baseline) * (higherIsBetter ? 1 : -1);
  if (Math.abs(diff) < NO_CHANGE_BAND) return "no_change";
  return diff > 0 ? "worked" : "got_worse";
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  worked: "It worked",
  no_change: "No change",
  got_worse: "Got worse",
};
