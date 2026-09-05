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
};

export function rootPatternForFault(faultKey: string): RootPattern | null {
  const key = ROOT_BY_FAULT[faultKey];
  return key ? ROOT_PATTERNS[key] ?? null : null;
}

export function rootPattern(key: string | null | undefined): RootPattern | null {
  return key ? ROOT_PATTERNS[key] ?? null : null;
}
