/**
 * Owner Nov 3 — the Fuel plan shows in "Before you start" every day.
 * The plan builder already makes a Fueling card for every day of the week (it is an
 * always-on anchor); this turns that card into the player's version using their
 * saved nutrition goal and the amounts they saved from the existing suggestions.
 * Safety: under 18 (or age unknown) → growth-safe only: a weight-loss goal reads as
 * "eat enough to grow and train", never calorie-cutting or body-composition wording.
 * No new numbers: only the builder's existing lines and the player's own saved amounts.
 */
import type { GoalType } from "@/utils/tdeeCalculations";
import { safeNutritionGoal } from "@/lib/nutrition/healthSetup";

type Drill = { name: string; dosage?: string; cue?: string; [k: string]: unknown };
type Block = { modality: string; status: string; title: string; why: string; drills: readonly Drill[]; steps: readonly string[]; [k: string]: unknown };
export type SavedTargets = { calorie_goal?: number | null; protein_goal?: number | null; carbs_goal?: number | null; fats_goal?: number | null; hydration_goal?: number | null } | null;

const GOAL_LINE: Record<GoalType, string> = {
  maintain: "Your goal: keep your body steady and fuel your training.",
  gain_lean_muscle: "Your goal: build muscle — get protein at every meal.",
  gain_weight: "Your goal: gain weight — add a snack and don't skip meals.",
  lose_fat: "Your goal: lose fat — keep protein high and eat enough to train.",
  lose_weight: "Your goal: lose weight — eat enough to train and recover.",
};
const GROWTH = "You're still growing: eat enough to grow and train. Never skip meals to change your weight.";

export function fuelPlanToday<B extends Block>(block: B, o: { goalType: string | null; age: number | null; restDay: boolean; saved?: SavedTargets }): B {
  const minor = o.age === null || o.age < 18;
  const goal = safeNutritionGoal(o.goalType, o.age);
  // Under-18: drop body-composition lines the builder writes for off-season.
  let drills: Drill[] = block.drills.filter((d) => !(minor && /body-comp/i.test(`${d.name} ${d.dosage ?? ""}`)));
  if (o.restDay) {
    drills = [
      { name: "Regular meals", dosage: "eat your normal meals today", cue: "rest days still need food to recover" },
      { name: "Protein through the day", dosage: "some protein at each meal" },
      { name: "Water", dosage: "sip water all day" },
    ];
  }
  const s = o.saved;
  const mine = s ? [
    s.protein_goal ? `${s.protein_goal} g protein` : null,
    s.carbs_goal ? `${s.carbs_goal} g carbs` : null,
    s.hydration_goal ? `${s.hydration_goal} oz water` : null,
    !minor && s.calorie_goal ? `${s.calorie_goal} calories` : null,
  ].filter(Boolean) : [];
  if (mine.length) drills.push({ name: "Your saved daily amounts", dosage: mine.join(" · "), cue: "change them anytime in Nutrition Hub" });
  const goalLine = goal ? (minor && goal === "maintain" && o.goalType !== "maintain" ? GROWTH : GOAL_LINE[goal]) : null;
  const why = [minor ? GROWTH : null, goalLine && goalLine !== GROWTH ? goalLine : null,
    o.restDay ? "Rest day — eat normally so your body recovers." : "Carbs before you train. Protein and water after."].filter(Boolean).join(" ");
  const title = o.restDay ? "Fuel plan — rest day" : minor ? "Fuel plan — grow and train" : "Fuel plan";
  return { ...block, status: "ready", title, why, drills, steps: drills.map((d) => `${d.name}${d.dosage ? ` — ${d.dosage}` : ""}`) };
}
