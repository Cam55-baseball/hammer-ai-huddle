/**
 * Root movement patterns.
 *
 * A fault flag is a symptom in one discipline. A root pattern is the movement
 * problem underneath it. `early_shoulder_rotation` in hitting and the same flag
 * in throwing or pitching are one pattern expressed three ways — fix it once
 * and all three improve.
 *
 * Mirrors `supabase/functions/_shared/faultFindings.ts`; the two must stay in
 * step. Nothing here is inferred from prose.
 */

export interface RootPattern {
  key: string;
  /** Plain-language name an athlete can read. */
  label: string;
  /** What the pattern actually is, in one sentence. */
  plain: string;
  /** Why fixing it once matters everywhere. */
  why: string;
}

export const ROOT_PATTERNS: Record<string, RootPattern> = {
  trunk_rotates_before_front_foot_plant: {
    key: "trunk_rotates_before_front_foot_plant",
    label: "Your body turns before your front foot lands",
    plain:
      "Your chest and shoulders start opening while the front foot is still in the air, so the ground never gets a chance to push back into the movement.",
    why:
      "It is the same movement whether you are swinging, throwing or pitching. Fixing the timing once carries into every one of them.",
  },
  direction_off_the_target_line: {
    key: "direction_off_the_target_line",
    label: "You are not lined up at your target",
    plain:
      "Your feet, back leg or shoulders finish pointing somewhere other than where the ball is meant to go.",
    why: "Direction is one habit. Correcting it shows up in every skill that has a target.",
  },
  back_leg_did_not_hold_load: {
    key: "back_leg_did_not_hold_load",
    label: "Your back leg didn't hold the load",
    plain:
      "As you load, your weight should sit balanced on your back leg. When it doesn't, it shows up later: the head moves past your centre of mass, the back hip gives up its turn, the hips keep drifting forward after the front foot lands, or the stride falls forward instead of being driven by the back hip.",
    why: "These all come from one thing, not separate problems. Get your weight settled on your back leg as you load and they all clean up together.",
  },
  hands_leak_forward_early: {
    key: "hands_leak_forward_early",
    label: "Your hands leave early",
    plain: "The hands start forward before the rest of the body has done its work.",
    why: "The same early-hands habit costs you barrel time and arm speed alike.",
  },
};

const ROOT_BY_FAULT: Record<string, string> = {
  early_shoulder_rotation: "trunk_rotates_before_front_foot_plant",
  front_shoulder_opens_early: "trunk_rotates_before_front_foot_plant",
  shoulders_not_aligned: "direction_off_the_target_line",
  back_leg_not_facing_target: "direction_off_the_target_line",
  hands_pass_elbow_early: "hands_leak_forward_early",
  // Owner doctrine 2026-09-27 — one root pattern, P1 is the cause, these are the evidence.
  hip_load_back_leg_not_balanced: "back_leg_did_not_hold_load",
  head_discipline_head_past_com: "back_leg_did_not_hold_load",
  head_path_through_stride_fail: "back_leg_did_not_hold_load",
  back_hip_socket_hold_fail: "back_leg_did_not_hold_load",
  post_landing_hip_drift_fail: "back_leg_did_not_hold_load",
  back_knee_straightened_fail: "back_leg_did_not_hold_load",
  // Owner doctrine 2026-09-30: a stride that falls instead of being driven by the back hip is the same root. Mapped; not emitted until the owner rules (strideRhythm ROOT_EVIDENCE_ENABLED).
  active_stride_falling: "back_leg_did_not_hold_load",
  hands_below_back_elbow_at_heel_landing: "trunk_rotates_before_front_foot_plant",
};

export function rootPatternForFault(faultKey: string): RootPattern | null {
  const key = ROOT_BY_FAULT[faultKey];
  return key ? ROOT_PATTERNS[key] ?? null : null;
}

export function rootPattern(key: string | null | undefined): RootPattern | null {
  return key ? ROOT_PATTERNS[key] ?? null : null;
}
