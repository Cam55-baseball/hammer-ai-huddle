/**
 * Owner Exercise Vault — double-check validator for a draft exercise.
 * Returns plain-language problems; empty = may be made live.
 */
export interface VaultExercise {
  slug: string;
  name: string;
  how_to_one_rep: string;
  setup?: string;
  steps?: string;
  cue?: string;
  why?: string;
  stop_if?: string;
  movements?: string[];
  default_sets?: number | null;
  default_reps?: number | null;
  default_seconds?: number | null;
  default_distance_ft?: number | null;
  default_load_pct?: number | null;
  measure_type: string;
  equipment: string[];
  equipment_alternatives?: string[][];
  card_type: string;
  sports: string[];
  season_phases: string[];
  min_age?: number | null;
  rest_rule?: string;
  arm_weight?: number | null;
  primer_role?: "primer_lift" | "explosive_action" | "none";
  video_url?: string | null;
  /** Planner (wk_movement_catalog) category — required for brand-new exercises. */
  catalog_category?: string | null;
  /** Warm-up stage (0 = tissue prep … 9 = prime). Required for every warm-up movement. */
  warmup_stage?: number | null;
  /** Optional fine-tuning order inside the stage (1 = first). */
  warmup_stage_order?: number | null;
}

/** Canonical wk_movement_catalog categories the plan builder files exercises under. */
export const CATALOG_CATEGORIES = [
  "arm_care", "bat_speed", "compound", "conditioning", "cross_sport", "hand_wrist_chain",
  "kot", "max_effort_strength", "movement_capacity", "movement_patterning", "pap_bridge",
  "posterior_chain", "rotational_strength", "shoulder_prep", "speed_lab", "speed_mechanics",
  "sprint_mechanics", "strength", "supplemental", "throwing_plyo", "trunk", "unilateral_lower",
  "unilateral_pull", "unilateral_push", "upper_body_plyo", "warmup", "windmill_pitching",
] as const;

const FILLER = [/full, controlled movement from start to finish/i, /smooth, controlled form/i];
const SERIES = /series|circuit|complex|full chart|routine/i;
const REP_DEF = /One rep is|One round is|check-off task|Hold the position/i;
const EQUIP: Array<[RegExp, RegExp]> = [
  [/\bdb\b|dumbbell/i, /dumbbell/i],
  [/\bkb\b|kettlebell/i, /kettlebell/i],
  [/\bbb\b|barbell/i, /barbell/i],
  [/\bband\b/i, /band/i],
  [/\bcable\b/i, /cable|band/i],
  [/\bsled\b/i, /sled/i],
  [/med ?ball/i, /med(?:icine)?[ -]?ball/i],
];

export const MEASURE_TYPES = [
  "weight_reps", "reps", "hold_seconds", "duration", "sprint_time", "jump_distance", "jump_height",
  "throw_count", "velocity", "bat_speed", "exit_velocity", "swing_count", "check_off",
] as const;

const DOSE_NEEDS: Record<string, Array<keyof VaultExercise>> = {
  weight_reps: ["default_sets", "default_reps"],
  reps: ["default_sets", "default_reps"],
  hold_seconds: ["default_sets", "default_seconds"],
  duration: ["default_seconds"],
  sprint_time: ["default_sets", "default_distance_ft"],
  jump_distance: ["default_sets", "default_reps"],
  jump_height: ["default_sets", "default_reps"],
  throw_count: ["default_sets", "default_reps"],
  swing_count: ["default_sets", "default_reps"],
};

export function validateExercise(e: VaultExercise, opts?: { isNew?: boolean }): string[] {
  const out: string[] = [];
  const t = (s?: string) => (s ?? "").trim();
  if (opts?.isNew && !(CATALOG_CATEGORIES as readonly string[]).includes(t(e.catalog_category ?? undefined))) {
    out.push("Pick a planner category (where the plan builder files it).");
  }
  if (!t(e.name)) out.push("Add a full name.");
  if (!/^[a-z0-9_]+$/.test(e.slug)) out.push("The code may only use lowercase letters, numbers and _.");
  if (!t(e.how_to_one_rep)) out.push('Add "How to do one rep".');
  else {
    if (FILLER.some((f) => f.test(e.how_to_one_rep))) out.push('"How to do one rep" uses generic filler — say exactly what one rep is.');
    if (!REP_DEF.test(e.how_to_one_rep)) out.push('"How to do one rep" must say what one rep is (start with "One rep is…").');
  }
  if (!t(e.cue)) out.push("Add the key cue.");
  if (!t(e.stop_if)) out.push('Add "Stop if".');
  if (!(MEASURE_TYPES as readonly string[]).includes(e.measure_type)) out.push("Pick a measure type.");
  for (const k of DOSE_NEEDS[e.measure_type] ?? []) {
    const v = e[k] as number | null | undefined;
    if (!(typeof v === "number" && v > 0)) out.push(`The measure type needs a default ${String(k).replace("default_", "").replace("_ft", " (ft)")}.`);
  }
  if (/jump/i.test(e.name) && ["hold_seconds", "duration"].includes(e.measure_type)) out.push("Jumps log distance or height, never time.");
  if (SERIES.test(e.name) && (e.movements ?? []).filter((m) => t(m)).length < 2) out.push("A series must list every movement.");
  const text = `${e.how_to_one_rep} ${e.setup ?? ""}`;
  for (const [nameTok, must] of EQUIP) {
    if (nameTok.test(e.name) && !must.test(text)) out.push(`The name says ${must.source.split("|")[0]} but the description doesn't.`);
  }
  if (!e.equipment.length && !(e.equipment_alternatives?.length)) out.push('List equipment (use "none" if nothing is needed).');
  if (e.equipment_alternatives?.some(group => !group.length || group.some(item => !item.trim()))) out.push("Each gear option needs a complete, nonempty list.");
  if (!t(e.card_type)) out.push("Pick a card type.");
  if (t(e.card_type) === "warmup") {
    const st = e.warmup_stage;
    if (!(typeof st === "number" && Number.isInteger(st) && st >= 0 && st <= 9)) out.push("Pick a warm-up stage (every warm-up movement needs one).");
    const o = e.warmup_stage_order;
    if (o != null && !(Number.isInteger(o) && o >= 1)) out.push("Order within stage must be a whole number from 1.");
  }
  if (!e.sports.length) out.push("Pick at least one sport.");
  if (!e.season_phases.length) out.push("Pick at least one season phase.");
  if (e.min_age == null) out.push("Set a minimum age.");
  if (!t(e.rest_rule)) out.push("Pick a rest-rule category.");
  if (e.measure_type === "throw_count" && !(typeof e.arm_weight === "number" && e.arm_weight > 0)) out.push("Throws need an arm-ledger weight.");
  if (e.primer_role === "explosive_action" && e.measure_type === "weight_reps") out.push("An explosive action can't be a weighted lift.");
  const vid = t(e.video_url ?? undefined);
  if (vid) {
    if (/^https:\/\//i.test(vid)) {
      if (!/\.(mp4|webm|mov)(\?|#|$)/i.test(vid)) out.push("The video link must point at an MP4, WebM or MOV file.");
    } else if (!/^exercise-videos\/[a-z0-9_][a-z0-9_./-]*\.(mp4|webm|mov)$/i.test(vid)) {
      out.push("The video must be an uploaded exercise-videos file or an https link to an MP4, WebM or MOV.");
    }
  }
  return out;
}
