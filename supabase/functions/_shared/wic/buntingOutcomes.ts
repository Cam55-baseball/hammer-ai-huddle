import { BUNT_TYPES, validBuntOutcome, type BuntOutcome, type BuntType } from "./buntingProgram.ts";
type Rep = { batter_side?: string; bunt_type?: string; bunt_success?: boolean };
/** Only explicitly observed success/failure contributes to scaling; unknown is neither. */
export function recordedBuntOutcomes(reps: readonly Rep[]): BuntOutcome[] {
  const groups = new Map<string, BuntOutcome>();
  for (const rep of reps) {
    if (rep.batter_side !== "R" && rep.batter_side !== "L" || !BUNT_TYPES.includes(rep.bunt_type as BuntType) || typeof rep.bunt_success !== "boolean") continue;
    const key = `${rep.batter_side}:${rep.bunt_type}`;
    const group = groups.get(key) ?? { side: rep.batter_side, type: rep.bunt_type as BuntType, attempts: 0, successes: 0 };
    group.attempts++; if (rep.bunt_success) group.successes++;
    groups.set(key, group);
  }
  return [...groups.values()].filter(validBuntOutcome);
}