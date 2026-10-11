/**
 * Lifting Blueprint — which areas a lift trains (primary first). Pure.
 * Used to measure weekly coverage of the planner's own choices and to report
 * areas no legal exercise can reach (the rule wins; the gap is reported).
 */
import type { Area } from "./blueprint.ts";

const RULES: Array<[RegExp, Area[]]> = [
  [/clean|snatch|jerk|jump|french_contrast|high_pull|kb_clean_press|push_press/, ["power"]],
  [/nordic|leg_curl|bridge_curl|slider_ham|ham_curl/, ["hamstring"]],
  [/copenhagen|adduct|cossack|lateral_lunge|slide_lunge|slideboard|lateral_db_step_up/, ["groin_lateral", "squat"]],
  [/hip_thrust|glute_bridge|sled_march|sled/, ["hip_ext"]],
  [/rdl|deadlift|good_morning|pull_through/, ["hinge", "hamstring"]],
  [/squat|lunge|step_?up|patrick_step|sissy/, ["squat"]],
  [/calf|tib|pogo|ankle/, ["calf_foot"]],
  [/hip_rotation|90_90|airplane|hip_er|hip_ir|clam|band_walk|abduct/, ["hip_rotation"]],
  [/press|bench|pushup|dip/, ["upper_push"]],
  [/row|pullup|pulldown|face_pull|pullapart/, ["upper_pull"]],
  [/carry|pallof|getup|rollout|dragon|plank|twist|deadbug|mcgill|hip_flexor/, ["trunk"]],
];

export function areasOf(slug: string): Area[] {
  for (const [re, a] of RULES) if (re.test(slug)) return a;
  return [];
}

/** Hard sets per area from a week of lift rows (primary area counts the sets). */
export function weeklyCoverage(rows: ReadonlyArray<{ slug: string; sets: number }>): Partial<Record<Area, number>> {
  const out: Partial<Record<Area, number>> = {};
  for (const r of rows) {
    const a = areasOf(r.slug)[0];
    if (a) out[a] = (out[a] ?? 0) + r.sets;
  }
  return out;
}

/** Areas none of the given candidate slugs can train at all. */
export function unreachableAreas(candidates: ReadonlyArray<string>, areas: ReadonlyArray<Area>): Area[] {
  const hit = new Set(candidates.flatMap(areasOf));
  return areas.filter((a) => !hit.has(a));
}
