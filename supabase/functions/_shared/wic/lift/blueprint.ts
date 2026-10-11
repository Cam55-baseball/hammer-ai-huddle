/**
 * Lifting Blueprint v1 (owner-approved 2026-10-11) — pure rules, no I/O.
 * Athletes, not bodybuilders: whole body every week through compound,
 * athletic movements. Isolation work (incl. Nordics, Copenhagen planks) is
 * legal ONLY inside the off-season "Add size" goal block. Coverage comes from
 * rotating choices, never from adding sets beyond HT's scheme. When a target
 * cannot be met without breaking a rule, the rule wins and the gap is reported.
 */
export type Area =
  | "squat" | "hinge" | "hamstring" | "hip_ext" | "groin_lateral"
  | "hip_rotation" | "calf_foot" | "upper_push" | "upper_pull" | "trunk" | "power";

export const AREAS: readonly Area[] = [
  "squat", "hinge", "hamstring", "hip_ext", "groin_lateral",
  "hip_rotation", "calf_foot", "upper_push", "upper_pull", "trunk", "power",
];

export const AREA_LABEL: Record<Area, string> = {
  squat: "Squat-type (two legs and single leg)",
  hinge: "Hinge and back of the legs",
  hamstring: "Hamstring strength",
  hip_ext: "Hip extension and glutes",
  groin_lateral: "Groin and side-to-side strength",
  hip_rotation: "Hip stability and rotation strength",
  calf_foot: "Calves, feet and ankle stiffness",
  upper_push: "Upper push",
  upper_pull: "Upper pull",
  trunk: "Trunk: anti-rotation and carries",
  power: "Total-body power",
};

/** Proposed weekly minimum hard sets per area. In-season = maintenance floor. */
export const WEEKLY_MIN: Record<"off" | "in", Record<Area, number>> = {
  off: { squat: 6, hinge: 4, hamstring: 3, hip_ext: 3, groin_lateral: 3, hip_rotation: 2, calf_foot: 3, upper_push: 5, upper_pull: 6, trunk: 4, power: 4 },
  in:  { squat: 2, hinge: 2, hamstring: 1, hip_ext: 1, groin_lateral: 1, hip_rotation: 1, calf_foot: 1, upper_push: 2, upper_pull: 3, trunk: 2, power: 2 },
};

/** Lift-day order. The planner sorts blocks by this rank; ties keep current order. */
export const LIFT_DAY_ORDER = [
  "warmup", "primer_main", "main_lower", "second_lower", "upper",
  "athletic_strength", "robustness", "log",
] as const;
export type LiftBlock = (typeof LIFT_DAY_ORDER)[number];
export const liftBlockRank = (b: LiftBlock) => LIFT_DAY_ORDER.indexOf(b);

/** Isolation / single-muscle movements: Add-size block only. */
export const ISOLATION_SLUGS = new Set([
  "lift_copenhagen_plank", "copenhagen_plank", "nordic_curl", "lift_nordic_curl",
  "nordic_hamstring_curl", "leg_curl", "lying_leg_curl", "seated_leg_curl",
  "leg_extension", "adductor_machine", "abductor_machine", "calf_raise_machine",
  "bicep_curl", "tricep_extension", "lateral_raise",
]);
const ISOLATION_RE = /(nordic|copenhagen|leg_curl|leg_ext|_machine$|bicep_curl|tricep_ext|lateral_raise)/;

export function isIsolation(slug: string): boolean {
  return ISOLATION_SLUGS.has(slug) || ISOLATION_RE.test(slug);
}

export interface IsolationCtx { phase: string; goalBlock?: string | null }
/** Off-season only (os_q1–os_q4), and only inside the "add_size" goal block. */
export function isolationAllowed(slug: string, ctx: IsolationCtx): boolean {
  if (!isIsolation(slug)) return true;
  return /^os_q[1-4]$/.test(ctx.phase) && ctx.goalBlock === "add_size";
}

/**
 * Progressive overload, inside HT's scheme. Reps first (to the top of the
 * prescribed range), then load. A load step needs every prescribed rep logged
 * at or under the target effort with quality ≥ 4, and a verified max.
 */
export interface OverloadInput {
  region: "lower" | "upper";
  verifiedMax: number | null;
  repRange: [number, number];
  currentReps: number;
  loggedAllReps: boolean;
  effort: number | null;   // 1–10
  targetEffort: number;
  quality: number | null;  // 1–5
}
export type OverloadStep =
  | { kind: "hold"; reason: string }
  | { kind: "reps"; reps: number }
  | { kind: "load"; newMax: number };

export const LOAD_STEP = { lower: 0.05, upper: 0.025 } as const;
export const PLATE_LB = 5;

export function overloadStep(i: OverloadInput): OverloadStep {
  if (!i.loggedAllReps) return { kind: "hold", reason: "not_all_reps_logged" };
  if (i.effort == null || i.effort > i.targetEffort) return { kind: "hold", reason: "effort_above_target" };
  if (i.quality == null || i.quality < 4) return { kind: "hold", reason: "quality_below_4" };
  if (i.currentReps < i.repRange[1]) return { kind: "reps", reps: i.currentReps + 1 };
  if (!i.verifiedMax) return { kind: "hold", reason: "no_verified_max" };
  const raw = i.verifiedMax * (1 + LOAD_STEP[i.region]);
  const rounded = Math.floor(raw / PLATE_LB) * PLATE_LB;
  return rounded > i.verifiedMax ? { kind: "load", newMax: rounded } : { kind: "hold", reason: "below_one_plate" };
}

/** Weekly coverage gaps: areas below their minimum. Reported, never forced. */
export function coverageGaps(week: Partial<Record<Area, number>>, season: "off" | "in"): Area[] {
  return AREAS.filter((a) => (week[a] ?? 0) < WEEKLY_MIN[season][a]);
}

/**
 * Planner lift slots → blueprint block. Arm care and the trunk primer are
 * pre-lift prep (they run with the warm-up), so they rank with "warmup".
 */
export const SLOT_BLOCK: Record<string, LiftBlock> = {
  arm_care: "warmup", trunk_primer: "warmup", mobility: "warmup",
  compound_lower: "main_lower", unilateral_lower: "second_lower",
  upper_push: "upper", upper_pull: "upper",
  carry_antirotation: "athletic_strength", trunk_finisher: "robustness",
};
export const slotRank = (slot: string) => liftBlockRank(SLOT_BLOCK[slot] ?? "robustness");
