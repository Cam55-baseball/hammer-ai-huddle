import { describe, it, expect } from "vitest";
import { proportionProfile, proportionBonus, leverClass } from "../../supabase/functions/_shared/wic/lift/proportionEmphasis";
import { resolveGoalEmphasis, emphasisFor } from "../../supabase/functions/_shared/wic/goals/emphasis";
import { selectFromBand } from "../../supabase/functions/_shared/wic/lift/rotationBand";

const LOWER = [
  { slug: "back_squat", name: "Back Squat" },
  { slug: "front_squat", name: "Front Squat" },
  { slug: "trap_bar_deadlift", name: "Trap Bar Deadlift" },
  { slug: "rear_foot_elevated_split_squat", name: "Split Squat" },
  { slug: "walking_lunge", name: "Walking Lunge" },
];
const PRESS = [
  { slug: "barbell_bench_press", name: "Bench Press" },
  { slug: "db_neutral_grip_press", name: "DB Neutral Press" },
  { slug: "landmine_press", name: "Landmine Press" },
];

/** Simulate 200 days; `legal` filters (injury gate) happen BEFORE scoring. */
function simulate(anthro: Record<string, number>, pool: typeof LOWER, injuredOut: string[] = []) {
  const p = proportionProfile(anthro);
  const counts: Record<string, number> = {};
  for (let d = 0; d < 200; d++) {
    const legal = pool.filter((m) => !injuredOut.includes(m.slug));
    const cands = legal.map((m, i) => ({ item: m, score: 1 + proportionBonus(p, m, `u|day${d}`) - i * 0.001 }));
    const picked = selectFromBand(cands, `seed${d}`).picked!;
    const c = leverClass(picked)!;
    counts[c] = (counts[c] ?? 0) + 1;
  }
  return counts;
}

describe("limb proportions shift emphasis, never legality", () => {
  it("long femur → more single-limb/trap bar, bilateral still appears", () => {
    const long = simulate({ femur_in: 20, torso_in: 16.5, height_in: 72 }, LOWER);
    const avg = simulate({ femur_in: 18, torso_in: 18, height_in: 72 }, LOWER);
    const longUni = (long.single_limb_lower ?? 0) + (long.trap_bar ?? 0);
    const avgUni = (avg.single_limb_lower ?? 0) + (avg.trap_bar ?? 0);
    expect(longUni).toBeGreaterThan(avgUni);
    expect(long.bilateral_squat ?? 0).toBeGreaterThan(0);
    console.log("long femur", long, "average", avg);
  });
  it("short femur leans bilateral, single-limb still appears", () => {
    const short = simulate({ femur_in: 16, torso_in: 19, height_in: 72 }, LOWER);
    expect(short.bilateral_squat).toBeGreaterThan(100);
    expect((short.single_limb_lower ?? 0) + (short.trap_bar ?? 0)).toBeGreaterThan(0);
  });
  it("long arms → more DB/neutral presses, barbell still appears", () => {
    const c = simulate({ wingspan_in: 76, height_in: 72 }, PRESS as typeof LOWER);
    expect(c.db_neutral_press).toBeGreaterThan(c.barbell_press);
    expect(c.barbell_press ?? 0).toBeGreaterThan(0);
  });
  it("only the injury gate excludes: proportions never zero out a legal option across a sweep", () => {
    let violations = 0;
    for (let f = 14; f <= 24; f += 0.5) for (let t = 14; t <= 22; t += 0.5) {
      const p = proportionProfile({ femur_in: f, torso_in: t, wingspan_in: 70 + (f - 14), height_in: 72 });
      for (const m of [...LOWER, ...PRESS]) {
        const b = proportionBonus(p, m, `x|${f}|${t}`);
        if (!(b >= 0) || b > 0.31) violations++; // bonus only, bounded, never negative
      }
      if (p.legTilt === 0) continue; // average build = today's behaviour, nothing to shift
      const c = simulate({ femur_in: f, torso_in: t, height_in: 72 }, LOWER);
      if (!c.bilateral_squat || !((c.single_limb_lower ?? 0) + (c.trap_bar ?? 0))) violations++;
    }
    expect(violations).toBe(0);
  });
  it("an injury removal still removes regardless of proportions", () => {
    const c = simulate({ femur_in: 16, torso_in: 19, height_in: 72 }, LOWER, ["back_squat", "front_squat"]);
    expect(c.bilateral_squat ?? 0).toBe(0);
  });
  it("missing measurements = no change", () => {
    const p = proportionProfile({});
    for (const m of [...LOWER, ...PRESS]) expect(proportionBonus(p, m, "d")).toBe(0);
  });
});

describe("goals shape exercise choice", () => {
  const power = { slug: "box_jump", category: "plyometric", pattern: "plyometric" } as any;
  it("training_preferences.goal, category_goals and goal_priority_rank all raise their domain", () => {
    const base = resolveGoalEmphasis({});
    expect(resolveGoalEmphasis({ trainingGoal: "strength" }).weights.strength).toBeGreaterThan(base.weights.strength);
    expect(resolveGoalEmphasis({ priorityRank: ["speed", "power"] }).weights.speed).toBeGreaterThan(base.weights.speed);
    const cg = { baseball: { position: { throwing: [{ id: "arm_strength", rank: "primary" }], hitting: [] } } };
    const e = resolveGoalEmphasis({ categoryGoals: cg });
    expect(e.weights.throwing).toBeGreaterThan(e.weights.hitting);
    expect(emphasisFor(resolveGoalEmphasis({ trainingGoal: "power" }), power)).toBeGreaterThanOrEqual(emphasisFor(base, power));
  });
  it("weights stay inside the bounded range (never a gate)", () => {
    const e = resolveGoalEmphasis({ trainingGoal: "power", priorityRank: ["power"], goalHorizon: "this season", categoryOrder: ["power", "speed", "hitting", "throwing", "fielding"] });
    for (const w of Object.values(e.weights)) { expect(w).toBeLessThanOrEqual(1.6); expect(w).toBeGreaterThanOrEqual(0.85); }
  });
});
