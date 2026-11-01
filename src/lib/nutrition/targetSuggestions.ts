/**
 * Owner Nov 1 D2 — "Not sure? Get suggestions" for daily nutrition targets.
 * Pure. Standard sports-nutrition ranges (ISSN / ACSM position stands):
 *  - protein 1.4–2.0 g per kg body weight (1.6–2.2 when building muscle or
 *    losing fat as an adult; 1.2–1.8 for players under 18)
 *  - carbohydrate by training load: light 3–5, moderate 5–7, high 6–10 g/kg
 *  - fat 20–35% of daily energy
 *  - fluids about half to two-thirds of an ounce per pound of body weight
 * Players under 18 never get weight-loss or calorie-cutting suggestions.
 * Suggestions only — the player accepts or edits them before saving.
 */
import { calculateBMR, calculateTDEE, lbsToKg, type ActivityLevel, type GoalType, type Sex } from "@/utils/tdeeCalculations";

export interface SuggestionInput {
  weightLbs: number | null;
  heightInches: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  goalType: GoalType | null;
  /** Today's training load from the schedule (game/practice = higher). */
  dayType?: "rest" | "training" | "practice" | "game" | "travel" | null;
}
export interface Range { min: number; max: number; unit: string }
export interface NutritionSuggestion {
  ok: true;
  calories: Range | null;
  protein: Range;
  carbs: Range;
  fats: Range;
  hydration: Range;
  minor: boolean;
  notes: string[];
}
export type SuggestionResult = NutritionSuggestion | { ok: false; reason: string };

const LOAD: Record<ActivityLevel, "light" | "moderate" | "high"> = {
  sedentary: "light", lightly_active: "light", moderately_active: "moderate", very_active: "high", extra_active: "high",
};
const CARB_G_PER_KG = { light: [3, 5], moderate: [5, 7], high: [6, 10] } as const;
const CUT_GOALS: ReadonlySet<GoalType> = new Set(["lose_weight", "lose_fat"]);

export function suggestNutritionTargets(i: SuggestionInput): SuggestionResult {
  if (!i.weightLbs || i.weightLbs <= 0) return { ok: false, reason: "Add your body weight first so we can suggest amounts." };
  const kg = lbsToKg(i.weightLbs);
  const minor = i.age !== null && i.age < 18;
  const goal: GoalType = i.goalType ?? "maintain";
  // Minors: a cutting goal is treated as maintain (growth-safe).
  const effectiveGoal: GoalType = minor && CUT_GOALS.has(goal) ? "maintain" : goal;
  let load = LOAD[i.activityLevel ?? "moderately_active"];
  if ((i.dayType === "game" || i.dayType === "practice") && load === "light") load = "moderate";
  const [cMin, cMax] = CARB_G_PER_KG[load];
  const [pMin, pMax] = minor ? [1.2, 1.8]
    : effectiveGoal === "gain_lean_muscle" || effectiveGoal === "lose_fat" ? [1.6, 2.2] : [1.4, 2.0];

  let calories: Range | null = null;
  if (i.heightInches && i.age && i.sex) {
    const tdee = calculateTDEE(calculateBMR(i.weightLbs, i.heightInches, i.age, i.sex), i.activityLevel ?? "moderately_active");
    const shift = effectiveGoal === "gain_lean_muscle" ? 250 : effectiveGoal === "gain_weight" ? 400
      : effectiveGoal === "lose_fat" ? -400 : effectiveGoal === "lose_weight" ? -500 : 0;
    const safeShift = minor ? Math.max(0, shift) : shift;
    const mid = tdee + safeShift;
    calories = { min: Math.round(mid * 0.95), max: Math.round(mid * 1.05), unit: "kcal" };
  }
  const fatKcal = calories ? [calories.min * 0.2, calories.max * 0.35] : null;
  const notes: string[] = [];
  if (minor) {
    notes.push("You're still growing, so these never cut calories. Eat enough to grow and train.");
    if (CUT_GOALS.has(goal)) notes.push("Weight-loss amounts aren't suggested under 18.");
    notes.push("Talk with a parent or a professional (like a doctor or dietitian) before changing how you eat.");
  }
  if (!calories) notes.push("Add your height, age and sex to also get a calorie range.");
  return {
    ok: true,
    minor,
    calories,
    protein: { min: Math.round(kg * pMin), max: Math.round(kg * pMax), unit: "g" },
    carbs: { min: Math.round(kg * cMin), max: Math.round(kg * cMax), unit: "g" },
    fats: fatKcal ? { min: Math.round(fatKcal[0] / 9), max: Math.round(fatKcal[1] / 9), unit: "g" }
      : { min: Math.round(kg * 0.8), max: Math.round(kg * 1.2), unit: "g" },
    hydration: { min: Math.round(i.weightLbs * 0.5), max: Math.round(i.weightLbs * 0.67), unit: "oz" },
    notes,
  };
}

export const midpoint = (r: Range) => Math.round((r.min + r.max) / 2);
