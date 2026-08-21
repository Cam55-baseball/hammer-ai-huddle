/**
 * Movement-aware log templates. Each Hammers Today prescription resolves to
 * exactly ONE template whose fields correspond to what that specific movement
 * actually produces — never generic velo/distance for a lift, never RPE for a
 * mobility drill. Resolver order matters; first match wins.
 */
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

export type FieldKind = "number" | "time" | "quality" | "side";

export type RoundField = {
  key: string;
  label: string;
  unit?: string;
  kind: FieldKind;
  step?: number;
  min?: number;
  max?: number;
  optional?: boolean;
  prefillFromRx?: (rx: WkRx) => number | null | undefined;
};

export type LogTemplate = {
  id: string;
  intro?: string;
  fields: RoundField[];
  meta: {
    rpe?: boolean;
    barFeel?: boolean;
    armFeel?: boolean;
    surface?: boolean;
    intent?: boolean;
    quality?: boolean;
  };
  defaultRounds: number;
};

const has = (s: string, re: RegExp) => re.test(s);

// ------------------------------ Templates ------------------------------

const BARBELL_LIFT: LogTemplate = {
  id: "barbell_lift",
  intro: "Log each set — weight × reps.",
  fields: [
    { key: "weight", label: "Weight", unit: "lb", kind: "number", step: 5, min: 0 },
    { key: "reps", label: "Reps", kind: "number", step: 1, min: 0, prefillFromRx: (r) => r.reps ?? undefined },
  ],
  meta: { rpe: true, barFeel: true },
  defaultRounds: 3,
};

const ACCESSORY_LIFT: LogTemplate = {
  id: "accessory_lift",
  intro: "Log each set.",
  fields: [
    { key: "weight", label: "Weight", unit: "lb", kind: "number", step: 5, min: 0 },
    { key: "reps", label: "Reps", kind: "number", step: 1, min: 0, prefillFromRx: (r) => r.reps ?? undefined },
  ],
  meta: { rpe: true },
  defaultRounds: 3,
};

const UNILATERAL_LIFT: LogTemplate = {
  id: "unilateral_lift",
  intro: "Log each side.",
  fields: [
    { key: "side", label: "Side", kind: "side" },
    { key: "weight", label: "Weight", unit: "lb", kind: "number", step: 5, min: 0 },
    { key: "reps", label: "Reps", kind: "number", step: 1, min: 0, prefillFromRx: (r) => r.reps ?? undefined },
  ],
  meta: { rpe: true },
  defaultRounds: 4,
};

const ISOMETRIC_HOLD: LogTemplate = {
  id: "isometric_hold",
  intro: "Hold time under tension.",
  fields: [
    { key: "time", label: "Hold", unit: "s", kind: "time", step: 5, prefillFromRx: (r) => r.duration_seconds ?? undefined },
    { key: "weight", label: "Load", unit: "lb", kind: "number", step: 5, optional: true },
  ],
  meta: { rpe: true },
  defaultRounds: 3,
};

const CARRY: LogTemplate = {
  id: "carry",
  intro: "Load × distance (or time).",
  fields: [
    { key: "weight", label: "Load", unit: "lb", kind: "number", step: 5 },
    { key: "distance", label: "Distance", unit: "ft", kind: "number", step: 5, prefillFromRx: (r) => r.distance_feet ?? undefined },
    { key: "time", label: "Time", unit: "s", kind: "time", step: 1, optional: true },
  ],
  meta: { rpe: true },
  defaultRounds: 3,
};

const JUMP_PLYO: LogTemplate = {
  id: "jump_plyo",
  intro: "Log reps and quality of ground contact.",
  fields: [
    { key: "reps", label: "Reps", kind: "number", step: 1, min: 0, prefillFromRx: (r) => r.reps ?? undefined },
    { key: "height", label: "Height", unit: "in", kind: "number", step: 1, optional: true },
    { key: "quality", label: "Contact", kind: "quality", optional: true },
  ],
  meta: { intent: true },
  defaultRounds: 3,
};

const MEDBALL_THROW: LogTemplate = {
  id: "medball_throw",
  intro: "Med-ball rotational throws.",
  fields: [
    { key: "reps", label: "Reps", kind: "number", step: 1, prefillFromRx: (r) => r.reps ?? undefined },
    { key: "ball_weight", label: "Ball", unit: "lb", kind: "number", step: 1, optional: true },
    { key: "quality", label: "Intent", kind: "quality", optional: true },
  ],
  meta: { intent: true },
  defaultRounds: 3,
};

const SPRINT_TIMED: LogTemplate = {
  id: "sprint_timed",
  intro: "Log each sprint.",
  fields: [
    { key: "distance", label: "Distance", unit: "ft", kind: "number", step: 5, prefillFromRx: (r) => r.distance_feet ?? undefined },
    { key: "time", label: "Time", unit: "s", kind: "time", step: 0.01 },
  ],
  meta: { rpe: true, surface: true },
  defaultRounds: 4,
};

const SLED: LogTemplate = {
  id: "sled",
  intro: "Sled / prowler — load and distance.",
  fields: [
    { key: "weight", label: "Load", unit: "lb", kind: "number", step: 5 },
    { key: "distance", label: "Distance", unit: "ft", kind: "number", step: 5, prefillFromRx: (r) => r.distance_feet ?? undefined },
    { key: "time", label: "Time", unit: "s", kind: "time", step: 0.1, optional: true },
  ],
  meta: { rpe: true, surface: true },
  defaultRounds: 4,
};

const AGILITY: LogTemplate = {
  id: "agility",
  intro: "Change-of-direction timed reps.",
  fields: [
    { key: "time", label: "Time", unit: "s", kind: "time", step: 0.01 },
    { key: "quality", label: "Quality", kind: "quality", optional: true },
  ],
  meta: { surface: true },
  defaultRounds: 4,
};

const LONG_TOSS: LogTemplate = {
  id: "long_toss",
  intro: "Long toss / pulldowns.",
  fields: [
    { key: "throws", label: "Throws", kind: "number", step: 1, prefillFromRx: (r) => r.reps ?? undefined },
    { key: "distance", label: "Peak dist", unit: "ft", kind: "number", step: 10, optional: true },
    { key: "peak_velo", label: "Peak velo", unit: "mph", kind: "number", step: 1, optional: true },
  ],
  meta: { armFeel: true },
  defaultRounds: 1,
};

const BULLPEN: LogTemplate = {
  id: "bullpen_pitching",
  intro: "Bullpen — pitches, strikes, and feel.",
  fields: [
    { key: "pitches", label: "Pitches", kind: "number", step: 1, prefillFromRx: (r) => r.reps ?? undefined },
    { key: "strikes", label: "Strikes", kind: "number", step: 1, optional: true },
    { key: "first_pitch_strikes", label: "1st-pitch strikes", kind: "number", step: 1, optional: true },
    { key: "peak_velo", label: "Peak velo", unit: "mph", kind: "number", step: 1, optional: true },
    { key: "avg_velo", label: "Avg velo", unit: "mph", kind: "number", step: 1, optional: true },
  ],
  meta: { armFeel: true, intent: true },
  defaultRounds: 1,
};

const OUTING: LogTemplate = {
  id: "pitching_outing",
  intro: "Start / relief outing — the full line.",
  fields: [
    { key: "innings", label: "IP", kind: "number", step: 0.1 },
    { key: "pitches", label: "Pitches", kind: "number", step: 1, prefillFromRx: (r) => r.reps ?? undefined },
    { key: "strikes", label: "Strikes", kind: "number", step: 1, optional: true },
    { key: "first_pitch_strikes", label: "1st-pitch K", kind: "number", step: 1, optional: true },
    { key: "hits", label: "Hits", kind: "number", step: 1, optional: true },
    { key: "runs", label: "R / ER", kind: "number", step: 1, optional: true },
    { key: "walks", label: "BB", kind: "number", step: 1, optional: true },
    { key: "strikeouts", label: "K", kind: "number", step: 1, optional: true },
    { key: "peak_velo", label: "Peak velo", unit: "mph", kind: "number", step: 1, optional: true },
    { key: "whiff_pct", label: "Whiff %", kind: "number", step: 1, optional: true },
  ],
  meta: { armFeel: true, intent: true },
  defaultRounds: 1,
};

const PFP: LogTemplate = {
  id: "pfp_fielding",
  intro: "Pitcher fielding practice — quick log.",
  fields: [
    { key: "reps", label: "Reps", kind: "number", step: 1 },
    { key: "quality", label: "Quality", kind: "quality", optional: true },
  ],
  meta: {},
  defaultRounds: 1,
};

const CATCH_PLAY: LogTemplate = {
  id: "catch_play",
  intro: "Catch play — throws and distance.",
  fields: [
    { key: "throws", label: "Throws", kind: "number", step: 1, prefillFromRx: (r) => r.reps ?? undefined },
    { key: "distance", label: "Distance", unit: "ft", kind: "number", step: 10, optional: true },
  ],
  meta: { armFeel: true },
  defaultRounds: 1,
};

const BAT_SPEED_TEE: LogTemplate = {
  id: "bat_speed_tee",
  intro: "Tee / dry swings — log quality rounds.",
  fields: [
    { key: "contacts", label: "Swings", kind: "number", step: 1, prefillFromRx: (r) => r.reps ?? undefined },
    { key: "bat_speed", label: "Bat speed", unit: "mph", kind: "number", step: 1, optional: true },
  ],
  meta: { intent: true },
  defaultRounds: 3,
};

const BAT_SPEED_LIVE: LogTemplate = {
  id: "bat_speed_live",
  intro: "Front toss / machine / live — log rounds.",
  fields: [
    { key: "contacts", label: "Contacts", kind: "number", step: 1, prefillFromRx: (r) => r.reps ?? undefined },
    { key: "exit_velo", label: "Exit velo", unit: "mph", kind: "number", step: 1, optional: true },
    { key: "bat_speed", label: "Bat speed", unit: "mph", kind: "number", step: 1, optional: true },
  ],
  meta: { intent: true },
  defaultRounds: 3,
};

const OVERLOAD_BAT: LogTemplate = {
  id: "overload_bat",
  intro: "Overload / underload bat work.",
  fields: [
    { key: "swings", label: "Swings", kind: "number", step: 1, prefillFromRx: (r) => r.reps ?? undefined },
    { key: "implement_oz", label: "Implement", unit: "oz", kind: "number", step: 1, optional: true },
  ],
  meta: { intent: true },
  defaultRounds: 3,
};

const CONDITIONING_INTERVALS: LogTemplate = {
  id: "conditioning_intervals",
  intro: "Log each interval.",
  fields: [
    { key: "work", label: "Work", unit: "s", kind: "time", step: 5, prefillFromRx: (r) => r.duration_seconds ?? undefined },
    { key: "rest", label: "Rest", unit: "s", kind: "time", step: 5, optional: true },
    { key: "avg_hr", label: "Avg HR", unit: "bpm", kind: "number", step: 1, optional: true },
  ],
  meta: { rpe: true },
  defaultRounds: 4,
};

const CONDITIONING_STEADY: LogTemplate = {
  id: "conditioning_steady",
  intro: "Steady-state — one round.",
  fields: [
    { key: "duration", label: "Duration", unit: "s", kind: "time", step: 30, prefillFromRx: (r) => r.duration_seconds ?? undefined },
    { key: "avg_hr", label: "Avg HR", unit: "bpm", kind: "number", step: 1, optional: true },
  ],
  meta: { rpe: true },
  defaultRounds: 1,
};

const MOBILITY_FRC: LogTemplate = {
  id: "mobility_frc",
  intro: "Mobility — rate the range you felt.",
  fields: [
    { key: "quality", label: "Range", kind: "quality" },
  ],
  meta: {},
  defaultRounds: 1,
};

const BREATHWORK: LogTemplate = {
  id: "breathwork",
  intro: "Breath rounds.",
  fields: [
    { key: "rounds", label: "Rounds", kind: "number", step: 1 },
    { key: "hold", label: "Hold", unit: "s", kind: "time", step: 5, optional: true },
  ],
  meta: {},
  defaultRounds: 1,
};

const WARMUP_ACTIVATION: LogTemplate = {
  id: "warmup_activation",
  intro: "Quick check — how did it prime you?",
  fields: [
    { key: "quality", label: "Feel", kind: "quality" },
  ],
  meta: {},
  defaultRounds: 1,
};

// ------------------------------ Resolver ------------------------------

export function resolveTemplate(rx: WkRx): LogTemplate {
  const slug = (rx.movement_slug ?? "").toLowerCase();
  const unit = (rx.dosage_unit ?? "").toLowerCase();
  const slot = rx.slot;
  const role = (rx.sequence_role ?? "").toLowerCase();
  const sets = rx.sets ?? 0;

  // 1. Bat speed
  if (slot === "bat_speed") {
    if (has(slug, /overload|underload|heavy_bat|light_bat/)) return OVERLOAD_BAT;
    if (has(slug, /front_toss|machine|live|bp_round|batting_practice/)) return BAT_SPEED_LIVE;
    return BAT_SPEED_TEE;
  }

  // 2. Speed slot
  if (slot === "speed") {
    if (has(slug, /sled|prowler/)) return SLED;
    if (has(slug, /jump|bound|hop|depth|pogo|plyo/)) return JUMP_PLYO;
    if (has(slug, /shuffle|agility|change_of_direction|pro_agility|shuttle|cod/)) return AGILITY;
    if (has(slug, /med_ball|medball|mb_/)) return MEDBALL_THROW;
    return SPRINT_TIMED;
  }

  // 3. Throwing / arm care
  if (unit === "throws" || has(slug, /long_toss|pulldown|bullpen|mound|pen_|catch_play|warmup_throwing|plyo_ball|arm_care|outing|start_pitch|game_pitch|pfp/)) {
    if (has(slug, /outing|start_pitch|game_pitch|competitive_mound/)) return OUTING;
    if (has(slug, /pfp|fielding_pitcher/)) return PFP;
    if (has(slug, /bullpen|mound|pen_/)) return BULLPEN;
    if (has(slug, /long_toss|pulldown|plyo_ball/)) return LONG_TOSS;
    return CATCH_PLAY;
  }

  // 4. Conditioning
  if (slot === "conditioning") {
    return sets > 1 ? CONDITIONING_INTERVALS : CONDITIONING_STEADY;
  }

  // 5. Cross-sport / warmup / mobility / breath
  if (has(slug, /breath|co2|o2_tolerance|wim_hof/)) return BREATHWORK;
  if (has(slug, /frc|car_|pails|rails|mobility|kinstretch/)) return MOBILITY_FRC;
  if (slot === "cross_sport" || has(role, /warmup|activation|primer/)) {
    // Med-ball warmup?
    if (has(slug, /med_ball|medball|mb_/)) return MEDBALL_THROW;
    return WARMUP_ACTIVATION;
  }

  // 6. Lift slot family fanout
  if (slot === "lift" || slot === "supplemental") {
    if (has(slug, /carry|farmer|suitcase|yoke/)) return CARRY;
    if (has(slug, /split|lunge|single_leg|pistol|bulgarian|rfe|step_up|single_arm|1_arm|kb_single/)) return UNILATERAL_LIFT;
    if (unit === "seconds" && has(slug, /iso|hold|plank|dead_hang|wall_sit/)) return ISOMETRIC_HOLD;
    if (has(slug, /med_ball|medball|mb_/)) return MEDBALL_THROW;
    if (has(slug, /squat|bench|deadlift|dl_|press|clean|snatch|jerk|row_barbell|bb_/)) return BARBELL_LIFT;
    if (unit === "seconds") return ISOMETRIC_HOLD;
    return ACCESSORY_LIFT;
  }

  // 7. Fallback — never expose velo/distance blindly.
  return WARMUP_ACTIVATION;
}

/** Back-compat alias. */
export const pickTemplate = resolveTemplate;

// ------------------------------ Laterality ------------------------------

/**
 * Fallback laterality detection. The authoritative source is the movement
 * catalog's `unilateral` flag (see `useUnilateralMovements`); this regex only
 * covers rows whose flag has not been set yet.
 */
const UNILATERAL_SLUG_RE =
  /(single_?leg|single_?arm|sl_|_sl_|_sl$|1_?arm|1_?leg|one_?arm|one_?leg|\bsa_|split_squat|split_stance|lunge|step_?up|stepup|bulgarian|rfess|rfe_|pistol|shrimp|cossack|suitcase|waiter|pallof|paloff|chop|copenhagen|side_plank|skater|half_kneel|hk_|staggered|bird_dog|dead_?bug|turkish|get_?up|cars$|_cars)/;

export function matchesUnilateralSlug(slug: string | null | undefined): boolean {
  return UNILATERAL_SLUG_RE.test((slug ?? "").toLowerCase());
}

/**
 * Is this prescription performed one limb at a time?
 * `catalogUnilateral` is the catalog flag set (null while loading).
 */
export function isUnilateralRx(rx: WkRx, catalogUnilateral: ReadonlySet<string> | null): boolean {
  const slug = (rx.movement_slug ?? "").toLowerCase();
  // 1 — the generator's stamp, taken straight from the catalog at plan time.
  const stamped = (rx.why_payload as Record<string, unknown> | null)?.laterality;
  if (stamped === "unilateral") return true;
  // A swap can replace the movement after the stamp was written, so a
  // "bilateral" stamp is only trusted when the slug still matches the plan.
  const swapped = (rx.why_payload as Record<string, any> | null)?.athlete_substitution;
  const stampStillValid = !swapped || swapped.to_slug === rx.movement_slug ? false : true;
  // 2 — live catalog flag (also covers swapped-in movements).
  if (catalogUnilateral?.has(slug)) return true;
  if (stamped === "bilateral" && catalogUnilateral && !stampStillValid) return false;
  // 3 — slug fallback for rows generated before the stamp existed.
  return matchesUnilateralSlug(slug);
}

export const SIDE_FIELD: RoundField = { key: "side", label: "Side", kind: "side" };

/** Prepend the L/R selector to any template. No-op when it already has one. */
export function withSideField(template: LogTemplate): LogTemplate {
  if (template.fields.some((f) => f.kind === "side")) return template;
  return {
    ...template,
    id: `${template.id}__side`,
    intro: template.intro ? `${template.intro} Log each side separately.` : "Log each side separately.",
    fields: [SIDE_FIELD, ...template.fields],
    defaultRounds: Math.max(2, template.defaultRounds * 2),
  };
}

/** Does this template capture a side? */
export function templateHasSide(template: LogTemplate): boolean {
  return template.fields.some((f) => f.kind === "side");
}

/**
 * Single entry point used by the log sheet: resolve the movement template and
 * decorate it with a side selector when the movement is unilateral.
 */
export function resolveTemplateForRx(
  rx: WkRx,
  catalogUnilateral: ReadonlySet<string> | null,
): { template: LogTemplate; unilateral: boolean } {
  const base = resolveTemplate(rx);
  const unilateral = isUnilateralRx(rx, catalogUnilateral);
  return { template: unilateral ? withSideField(base) : base, unilateral };
}
