// Owner Nov 12 ("make them follow the rule"): the plan builder's practice-day check uses the
// one shared rule (`_shared/practiceRules.ts`). Baserunning IQ sessions and Travel/Other notes
// never make a practice day; every real practice counts exactly as before.
import { countsAsPractice, type PracticeKindFields } from "../../practiceRules.ts";

export function trainingPracticesOf<T extends PracticeKindFields>(rows: readonly T[]): T[] {
  return rows.filter((r) => countsAsPractice(r));
}
