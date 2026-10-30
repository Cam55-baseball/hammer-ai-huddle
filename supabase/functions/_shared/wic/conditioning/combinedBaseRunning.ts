// Owner Oct 30: for 5Tool and Golden 2Way, base running and running
// conditioning are ONE session ("Base running & conditioning") booked on the
// same day. Running conditioning therefore only lives on a day whose base
// running work is ready; on any other day the running rows are removed (never
// added), so the two can't be split across days. Complete Pitcher keeps its own
// pitcher conditioning and is never touched. Non-running safe substitutes
// (restricted bike/flush) are untouched.
import { isRunningConditioning } from "./weeklyFloor.ts";

export function isCombinedBaseConditioningProgram(modules: readonly string[], sport: string): boolean {
  return modules.includes(`${sport}_5tool`) || modules.includes(`${sport}_golden2way`);
}

export function combinedRunningRowsToDrop(
  rows: readonly { slot: string; movement_slug: string }[],
  input: { combined: boolean; baserunningReady: boolean },
): number[] {
  if (!input.combined || input.baserunningReady) return [];
  return rows.flatMap((r, i) => (r.slot === "conditioning" && isRunningConditioning([r.movement_slug]) ? [i] : []));
}

/** Base routes by sport: 60-ft softball bases, 90-ft baseball bases. */
export function baseDistanceFeet(sport: "baseball" | "softball"): number {
  return sport === "softball" ? 60 : 90;
}
