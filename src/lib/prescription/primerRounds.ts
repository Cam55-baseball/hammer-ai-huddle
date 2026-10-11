/**
 * Power Primer inside the lift: lift set → rest → all-out explosive set, repeated.
 * Every explosive round needs a 1–5 quality rating. The next explosive set only
 * appears after the next lift set when the rating is 4 or 5, no speed-drop stop
 * rule fired and every cap still has room. The lift itself always continues.
 * Caps, gates and the stop rule come from the builder's power_primer payload.
 */
export const QUALITY = [
  { value: 5, label: "Felt excellent" },
  { value: 4, label: "Felt good" },
  { value: 3, label: "Lost snap" },
  { value: 2, label: "Mechanics changed" },
  { value: 1, label: "Ground feels soft" },
] as const;

export const REAL_THROW_ARM_WEIGHT = 1.5;

export type PrimerStop =
  | { kind: "throw_swing"; drop_pct: number; in_a_row: number }
  | { kind: "sprint"; drop_pct: number }
  | { kind: "feel" };

export interface PrimerRules {
  max_sets: number;
  max_total_reps: number | null;
  stop: PrimerStop;
  actionReps: number;
  realThrow: boolean;
}

export interface PrimerRound { rating: number | null; value: number | null }

export interface PrimerState {
  /** Rated explosive rounds counted so far. */
  done: number;
  /** True when another explosive set is due after the next lift set. */
  next: boolean;
  /** Why explosive sets ended (null while they continue). */
  stopReason: string | null;
  totalReps: number;
  realThrows: number;
  armUnits: number;
}

function speedDrop(r: PrimerRules, values: number[]): string | null {
  if (!values.length) return null;
  if (r.stop.kind === "throw_swing") {
    const best = Math.max(...values);
    const n = r.stop.in_a_row;
    if (values.length >= n && values.slice(-n).every((v) => v <= best * (1 - (r.stop as any).drop_pct / 100)))
      return `Your speed dropped ${r.stop.drop_pct}% — that was your last all-out set.`;
  }
  if (r.stop.kind === "sprint") {
    const best = Math.min(...values);
    if (values[values.length - 1] >= best * (1 + r.stop.drop_pct / 100))
      return `You got ${r.stop.drop_pct}% slower — that was your last all-out set.`;
  }
  return null;
}

export function primerState(rules: PrimerRules, rounds: PrimerRound[]): PrimerState {
  let done = 0; let totalReps = 0; let stopReason: string | null = null;
  const values: number[] = [];
  for (const rd of rounds) {
    if (rd.rating == null) break;
    done += 1;
    totalReps += rules.actionReps;
    if (rd.value != null && rd.value > 0) values.push(rd.value);
    if (rd.rating <= 3) { stopReason = "Quality dropped — that was your last all-out set. Finish your lift."; break; }
    const drop = speedDrop(rules, values);
    if (drop) { stopReason = drop; break; }
    if (done >= rules.max_sets) { stopReason = "You reached today's limit of all-out sets. Finish your lift."; break; }
    if (rules.max_total_reps != null && totalReps + rules.actionReps > rules.max_total_reps) { stopReason = "You reached today's throw limit. Finish your lift."; break; }
  }
  const realThrows = rules.realThrow ? totalReps : 0;
  return { done, next: stopReason == null, stopReason, totalReps, realThrows, armUnits: realThrows * REAL_THROW_ARM_WEIGHT };
}
