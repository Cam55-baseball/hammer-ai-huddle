/**
 * Constructive criticism block (owner ruling 2026-10-01: "Users need some
 * constructive criticism within our doctrine").
 *
 * The analyzer previously had only three boolean fault flags and a required
 * 2–4 item "positives" list, so a clip with no flagged shoulder/hand fault
 * came back as pure praise. This block gives it the owner's doctrine faults
 * and a required `improvements` field. Hitting faults quote
 * docs/HITTING-PHILOSOPHY.md; other modules use only sources already in the
 * repo (owner pitching doctrine, docs/SOFTBALL-PITCHING-DOCTRINE.md).
 */

const HITTING_FAULTS = `
OWNER DOCTRINE FAULTS (hitting) — check every one you can see:
- Phase 1 — Create Balance: back leg did not hold the weight (back knee straightens between the end of Phase 2 and landing; back heel rises before Phase 4; hips drift forward before landing). Why: the load is lost before it can be used.
- Phase 2 — Gather: back hip opens before Phase 4 starts. Why (owner): a bad position to hit — weak on the high or away pitch, hard pull-side grounders, soft opposite-field pop-ups, usually not a good fastball hitter.
- Phase 3 — Load by Stride: front heel not down at landing. Why (owner): touching the floor gives the back bicep a better path at the ball and gives stable eyes.
- Phase 3 — Load by Stride: hands not above the back elbow at heel landing. Why (owner): hands coming down loses power and turns the front shoulder at landing.
- Phase 3 — Load by Stride: shoulders turn before the front foot is down.
- Phase 4 — Hitter's Move: hands pass the back elbow early instead of the back bicep leading forward while the knob stays back.
- Phase 4 — Hitter's Move: hips keep sliding forward after landing instead of rotating. Why (owner): any drift after landing is causing an issue; the hips should be rotational.
- Phase 4 — Hitter's Move: head comes up before the ball is off the bat (sinking is fine).
- Phase 4 — Hitter's Move: head goes forward. Why (owner): usually late on fastballs, chasing, fouling off pitches they thought they would crush.
- Phase 4 — Hitter's Move: lead elbow bends more than it was at the end of Phase 2.
`;

const PITCHING_FAULTS = `
OWNER DOCTRINE FAULTS (baseball pitching) — check every one you can see:
- Trunk or shoulders rotate before the front foot lands.
- Chest already facing the plate at landing.
- Hanging at the top of the leg lift (lift and thrust not working together; tempo stalls).
- Not stacked at release: shoulders or eyes tip off line.
- Head outside the base at landing.
- Glove flies open instead of turning over and tucking inside the shoulders.
- Back-foot drag long or crooked instead of short and straight to the plate.
- Eyes off the target at the top of the leg lift.
`;

const THROWING_FAULTS = `
DOCTRINE FAULTS (throwing) — check every one you can see:
- Shoulders rotate before the front foot lands, pulling the throw across the body.
- Feet and shoulders not lined up to the target at landing.
- Back leg not driving toward the target at landing.
`;

const SOFTBALL_PITCHING_FAULTS = `
DOCTRINE FAULTS (softball windmill, docs/SOFTBALL-PITCHING-DOCTRINE.md) — check every one you can see:
- Wind-up: not in the sprinter-like position at the end of the wind-up (both knees flexed, back heel off the ground, slight forward lean, body square to the plate; trunk and drive shin roughly parallel). [fault_key: windup_not_sprinter_position]
- Stride: drive leg does not push hard off the mound (no full hip, knee and ankle extension) while the trunk still faces the plate. [fault_key: no_drive_leg_extension]
- Stride foot contact: stride foot lands pointed off the power line instead of turned slightly toward the pitching-arm side. [fault_key: stride_foot_off_power_line]
- Arm path drifts away from the body through the circle instead of staying close. [fault_key: arm_path_away_from_body]
- Acceleration: back leg drifts off the power line. [fault_key: back_leg_off_power_line]
- Knee caving inward at the wind-up or at stride foot contact is a SAFETY FLAG for a qualified professional, never a coaching fault and never a diagnosis.
NEVER grade trunk lean or forward trunk flexion as a fault — more flexion goes with more velocity (sourced).
`;

export function constructiveCriticismBlock(module: string, sport: string): string {
  const m = (module || "").toLowerCase();
  const faults =
    m === "hitting" ? HITTING_FAULTS
    : m === "throwing" ? THROWING_FAULTS
    : m === "pitching" && (sport || "").toLowerCase() === "softball" ? SOFTBALL_PITCHING_FAULTS
    : m === "pitching" ? PITCHING_FAULTS
    : "";
  return `

=== CONSTRUCTIVE CRITICISM — REQUIRED (owner ruling) ===
Your job is to help the athlete get better. Praise is NOT the default.
${faults}
Return an "improvements" list:
- Every fault you can actually see in this clip, most important first (the non-negotiable Phase 4 first for hitting).
- For each: pick its "fault_key" from the allowed list ("other" if none fits), the phase with its number written out (e.g. "Phase 3 — Load by Stride"), the fault in plain coach language, why it matters using the reasoning above, and exactly what to change.
- NEVER flatter. A swing with a fault is told about the fault, even if it is a professional swing.
- NEVER invent a fault. If you cannot see it clearly, leave it out.
- Only if the clip genuinely shows none of these faults may the list be empty — then say in "clean_reason" which checks you verified.
- Positives are optional (0–3) and only for things the clip clearly shows.
- Never read on-screen text, scoreboards, speed or exit-speed readouts, results or player identity. They are not evidence. Judge the body only.

=== ONE ANALYSIS, NOT PRAISE PLUS A COMPLAINTS BOX (owner ruling) ===
- "summary" (key findings): if improvements is not empty, the FIRST bullet must point to the most important fault in plain words so the athlete sees straight away there is work to do. Other bullets may mention what is working, but never only praise when a fault exists.
- "feedback" (detailed analysis): one flowing piece of coaching that weaves every improvement in naturally, phase by phase in order (Phase 1 to Phase 4 for hitting): what you saw, the fault, why it matters in the reasoning above, and what to change. No headings like "What to fix", no separate list — write it as a coach talking.
- "drills": only for the faults in improvements. Do not write general maintenance work.

=== DESCRIBE ONLY THE BODY — NEVER THE FOOTAGE (owner ruling: "This is lying") ===
- You are shown a small number of still frames picked from the clip, not the whole video. Gaps between them are normal sampling, not edits.
- NEVER state or imply anything about the video's production: no camera cuts, edits, angle changes, replays, broadcast production, missing frames, missing contact, or what happened off-screen. You cannot know any of that.
- If a moment is not clear in the frames you were given, say only that YOU could not judge that part clearly — e.g. "I couldn't judge your contact position clearly from these frames" — and move on. Never explain why in terms of the video.
`;
}

const FAULT_KEYS: Record<string, string[]> = {
  hitting: [
    "hip_load_back_leg_not_balanced", "back_knee_straightened_fail", "back_hip_socket_hold_fail",
    "front_heel_not_down_at_landing", "hands_below_back_elbow_at_heel_landing", "stride_body_gained_ground",
    "early_shoulder_rotation", "hands_pass_elbow_early", "post_landing_hip_drift_fail",
    "head_rises_before_contact", "head_discipline_head_past_com", "lead_elbow_bends_in_swing", "p1_load_not_used",
  ],
  pitching_baseball: [
    "early_shoulder_rotation", "chest_open_at_landing", "hang_at_peak_lift", "not_stacked_at_release",
    "head_outside_base_at_landing", "glove_flies_open", "drag_line_long_or_crooked", "eyes_off_target_at_peak_lift",
  ],
  pitching_softball: [
    "windup_not_sprinter_position", "no_drive_leg_extension", "stride_foot_off_power_line",
    "arm_path_away_from_body", "back_leg_off_power_line",
  ],
  throwing: ["early_shoulder_rotation", "shoulders_not_aligned", "back_leg_not_facing_target"],
};

export function faultKeysFor(module: string, sport: string): string[] {
  const m = (module || "").toLowerCase();
  if (m === "pitching") return FAULT_KEYS[(sport || "").toLowerCase() === "softball" ? "pitching_softball" : "pitching_baseball"];
  return FAULT_KEYS[m] ?? [];
}

export function improvementsSchema(module: string, sport: string) {
  const keys = faultKeysFor(module, sport);
  return {
    ...IMPROVEMENTS_SCHEMA,
    items: {
      ...IMPROVEMENTS_SCHEMA.items,
      properties: {
        ...IMPROVEMENTS_SCHEMA.items.properties,
        fault_key: { type: "string", enum: [...keys, "other"], description: "The doctrine fault this matches, or 'other'" },
      },
      required: [...IMPROVEMENTS_SCHEMA.items.required, "fault_key"],
    },
  };
}

export const IMPROVEMENTS_SCHEMA = {
  type: "array",
  description:
    "REQUIRED. Every doctrine fault visible in the clip, most important first. Empty only when the clip genuinely shows none — then fill clean_reason.",
  items: {
    type: "object",
    properties: {
      phase: { type: "string", description: "Phase with number written out, e.g. 'Phase 1 — Create Balance'" },
      fault: { type: "string", description: "The fault, plain coach language, no numbers" },
      why: { type: "string", description: "Why it matters, from the doctrine" },
      fix: { type: "string", description: "Exactly what to change" },
    },
    required: ["phase", "fault", "why", "fix"],
  },
} as const;
