/**
 * Owner goal weighting (Oct 20). The player's ranked goals set the weight on
 * each skill: the top goal gets the first skill slot after warm-up and a larger
 * share of skill minutes, but every skill keeps at least its minimum and never
 * exceeds its maximum. Rules come first: callers pass only skills the plan has
 * already made legal today (rest, throw counts, phase, injury, pre-game days),
 * with their legal min/max. Lifting is never passed here and never changes.
 */
export interface WeightedSkill {
  readonly skill: string;
  readonly minMin: number;
  readonly maxMin: number;
}

export interface GoalWeightResult {
  readonly order: string[];
  readonly minutes: Record<string, number>;
  readonly because: Record<string, string>;
}

/** Weight by goal rank: #1 = 3, #2 = 2, others (or unranked) = 1. */
export function goalWeight(skill: string, goals: readonly string[]): number {
  const i = goals.indexOf(skill);
  return i === 0 ? 3 : i === 1 ? 2 : 1;
}

export function weightSkills(skills: readonly WeightedSkill[], goals: readonly string[], totalMin: number): GoalWeightResult {
  const rank = (s: string) => { const i = goals.indexOf(s); return i === -1 ? 99 : i; };
  const order = [...skills].sort((a, b) => rank(a.skill) - rank(b.skill)).map((s) => s.skill);
  const minutes: Record<string, number> = {};
  for (const s of skills) minutes[s.skill] = s.minMin;
  let left = Math.max(0, totalMin - skills.reduce((t, s) => t + s.minMin, 0));
  // Hand out spare minutes 5 at a time, by weight, until max or none left.
  while (left >= 5) {
    const open = skills.filter((s) => minutes[s.skill] + 5 <= s.maxMin);
    if (open.length === 0) break;
    const pick = open.reduce((best, s) => {
      const share = (x: WeightedSkill) => minutes[x.skill] / goalWeight(x.skill, goals);
      return share(s) < share(best) ? s : best;
    });
    minutes[pick.skill] += 5;
    left -= 5;
  }
  const because: Record<string, string> = {};
  const top = goals[0];
  if (top && order[0] === top && skills.length > 1) because[top] = `Because: ${top} is your #1 goal.`;
  return { order, minutes, because };
}
