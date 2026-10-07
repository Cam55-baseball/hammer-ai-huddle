/**
 * Busy gym (owner 2026-10-07): when the barbell or trap bar is taken, every
 * barbell / trap-bar lift needs an equivalent with the same movement pattern
 * and purpose. The catalog's own families are often single-lift, so this table
 * names the dumbbell / kettlebell / bodyweight equivalents by real pattern.
 * Every pick still passes isSameOrLowerRisk (age judged against the player).
 */
export const BUSY_GYM_GROUPS: { pattern: string; match: RegExp; equivalents: string[] }[] = [
  { pattern: "olympic", match: /power_clean|power_snatch|clean_pull|snatch|jump_shrug|mid_thigh_pull/, equivalents: ["lift_db_snatch", "lift_kb_swing_american", "lift_kb_swing_russian"] },
  { pattern: "hinge", match: /trap_bar|trap_dl|deadlift|block_pull|rdl|good_morning|hip_thrust/, equivalents: ["lift_sl_rdl", "dumbbell_split_stance_rdl", "dumbbell_rdl_to_row", "lift_kb_swing_russian", "sp_sl_rdl_iso"] },
  { pattern: "squat", match: /squat|zercher|lunge/, equivalents: ["bulgarian_ss", "kot_atg_split_squat", "lift_atg_split_squat", "lift_split_squat_iso"] },
  { pattern: "rotation", match: /landmine.*rot|rot.*landmine/, equivalents: ["med_ball_shot_put"] },
  { pattern: "press", match: /bench|floor_press|overhead_press|push_press/, equivalents: ["push_up_start", "ring_push_up"] },
];

export function busyGymEquivalents(slug: string | null | undefined): string[] {
  const s = String(slug ?? "");
  const g = BUSY_GYM_GROUPS.find((x) => x.match.test(s));
  return g ? g.equivalents.filter((e) => e !== s) : [];
}
