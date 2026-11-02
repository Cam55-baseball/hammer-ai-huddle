export type MissingItem = { key: string; label: string; to: string };

const NUTRITION = ["calorie_goal", "protein_goal", "carbs_goal", "fats_goal", "hydration_goal"];
const PITCHER = ["pitcher_focus", "pitching_role"];

/**
 * Steps for the guided Finish-your-profile flow. Birthday has its own
 * required sheet (account gate) so it is never a skippable step here;
 * the starting point only matters before Start. The five nutrition goals
 * share one screen, as do the two pitcher questions and goals + ranking.
 */
export function profileFlowItems(missing: readonly MissingItem[], started: boolean): MissingItem[] {
  const out: MissingItem[] = [];
  const seen = new Set<string>();
  for (const m of missing) {
    if (m.key === "birthday") continue;
    if (started && m.key === "starting_point") continue;
    const group = NUTRITION.includes(m.key) ? "nutrition" : PITCHER.includes(m.key) ? "pitcher" : m.key === "ranking" ? "goals" : m.key;
    if (seen.has(group)) continue;
    seen.add(group);
    out.push(group === "nutrition" ? { ...m, label: "Your daily nutrition targets" } : group === "pitcher" ? { ...m, label: "Your pitching role" } : group === "goals" ? { ...m, key: "goals", label: "Your goals" } : m);
  }
  return out;
}

/** About 15 seconds per detail, never under 1 minute. */
export const minutesFor = (n: number) => Math.max(1, Math.round(n * 0.25));
