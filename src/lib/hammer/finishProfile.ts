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

export type FailureAction = { kind: "birthday" | "equipment" | "retry"; sentence: string; button: string };

/** One plain sentence + the button that fixes it. Never a missing-details dead end. */
export function failureAction(code: string | null, reasons: readonly string[], missingFields: readonly string[]): FailureAction {
  if (code === "age_required") return { kind: "birthday", sentence: "Add your birthday so we can build a safe plan for your age.", button: "Add birthday" };
  if (missingFields.includes("equipment") || reasons.some((r) => /equipment|gear/i.test(r))) return { kind: "equipment", sentence: "Tell us what equipment you have so we can pick exercises you can do.", button: "Add equipment" };
  if (code === "initial_inputs_missing") return { kind: "retry", sentence: "Your plan is being updated. Tap to load it.", button: "Load my plan" };
  return { kind: "retry", sentence: reasons[0] ? `${reasons[0]} Tap to try again.` : "This part didn't load. Tap to try again.", button: "Try again" };
}
