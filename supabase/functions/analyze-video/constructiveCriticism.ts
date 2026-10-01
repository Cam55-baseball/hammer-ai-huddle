/**
 * Constructive criticism block (owner ruling 2026-10-01: "Users need some
 * constructive criticism within our doctrine").
 *
 * Every fault carries a stable `fault_key` so the drill library
 * (src/data/drills/faultDrillLibrary.ts) can match drills automatically.
 * Keys here and in the library must stay in step.
 *
 * 2026-10-01 fix: the previous version told the model to "ignore broadcast
 * graphics". Naming broadcast footage primed it to invent broadcast camera
 * edits ("the swing is cut out by a camera edit") on clips that contained the
 * swing. This block never names footage sources and forbids any claim about
 * missing, cut or edited content.
 */

export interface DoctrineFault { key: string; phase: string; text: string }

export const HITTING_FAULT_LIST: DoctrineFault[] = [
  { key: "back_leg_did_not_hold_load", phase: "Phase 1 — Create Balance", text: "back leg did not hold the weight (back knee straightens between the end of Phase 2 and landing; back heel rises before Phase 4; hips drift forward before landing). Why: the load is lost before it can be used." },
  { key: "back_hip_opens_early", phase: "Phase 2 — Gather", text: "back hip opens before Phase 4 starts. Why (owner): a bad position to hit — weak on the high or away pitch, hard pull-side grounders, soft opposite-field pop-ups, usually not a good fastball hitter." },
  { key: "front_heel_not_down_at_landing", phase: "Phase 3 — Load by Stride", text: "front heel not down at landing. Why (owner): touching the floor gives the back bicep a better path at the ball and gives stable eyes." },
  { key: "hands_below_back_elbow_at_heel_landing", phase: "Phase 3 — Load by Stride", text: "hands not above the back elbow at heel landing. Why (owner): hands coming down loses power and turns the front shoulder at landing." },
  { key: "early_shoulder_rotation", phase: "Phase 3 — Load by Stride", text: "shoulders turn before the front foot is down." },
  { key: "hands_pass_elbow_early", phase: "Phase 4 — Hitter's Move", text: "hands pass the back elbow early instead of the back bicep leading forward while the knob stays back." },
  { key: "post_landing_hip_drift", phase: "Phase 4 — Hitter's Move", text: "hips keep sliding forward after landing instead of rotating. Why (owner): any drift after landing is causing an issue; the hips should be rotational." },
  { key: "head_comes_up_early", phase: "Phase 4 — Hitter's Move", text: "head comes up before the ball is off the bat (sinking is fine)." },
  { key: "head_goes_forward", phase: "Phase 4 — Hitter's Move", text: "head goes forward. Why (owner): usually late on fastballs, chasing, fouling off pitches they thought they would crush." },
  { key: "lead_elbow_bends", phase: "Phase 4 — Hitter's Move", text: "lead elbow bends more than it was at the end of Phase 2." },
];

export const PITCHING_FAULT_LIST: DoctrineFault[] = [
  { key: "pitch_trunk_rotates_before_landing", phase: "Stride", text: "trunk or shoulders rotate before the front foot lands." },
  { key: "pitch_chest_open_at_landing", phase: "Landing", text: "chest already facing the plate at landing." },
  { key: "pitch_hang_at_lift", phase: "Leg lift", text: "hanging at the top of the leg lift (lift and thrust not working together; tempo stalls)." },
  { key: "pitch_not_stacked_at_release", phase: "Release", text: "not stacked at release: shoulders or eyes tip off line." },
  { key: "pitch_head_outside_base", phase: "Landing", text: "head outside the base at landing." },
  { key: "pitch_glove_flies_open", phase: "Release", text: "glove flies open instead of turning over and tucking inside the shoulders." },
  { key: "pitch_drag_line_off", phase: "Finish", text: "back-foot drag long or crooked instead of short and straight to the plate." },
];

export const THROWING_FAULT_LIST: DoctrineFault[] = [
  { key: "throw_shoulders_rotate_before_landing", phase: "Landing", text: "shoulders rotate before the front foot lands, pulling the throw across the body." },
  { key: "throw_not_lined_up_to_target", phase: "Landing", text: "feet and shoulders not lined up to the target at landing." },
  { key: "throw_back_leg_not_driving", phase: "Landing", text: "back leg not driving toward the target at landing." },
];

export const WINDMILL_FAULT_LIST: DoctrineFault[] = [
  { key: "windmill_shoulders_open_early", phase: "Circle", text: "shoulders open early in the circle instead of staying closed through the whip." },
  { key: "windmill_stride_foot_direction_off", phase: "Stride", text: "stride foot lands pointed too far open or closed for the drive line." },
  { key: "windmill_knee_caves_flag", phase: "Stride", text: "knee caves inward at the windup or at front-foot contact (a flag for a professional, never a diagnosis)." },
];

export function faultListFor(module: string, sport: string): DoctrineFault[] {
  const m = (module || "").toLowerCase();
  if (m === "hitting") return HITTING_FAULT_LIST;
  if (m === "throwing") return THROWING_FAULT_LIST;
  if (m === "pitching") return (sport || "").toLowerCase() === "softball" ? WINDMILL_FAULT_LIST : PITCHING_FAULT_LIST;
  return [];
}

export function constructiveCriticismBlock(module: string, sport: string): string {
  const list = faultListFor(module, sport);
  const faults = list.length
    ? "DOCTRINE FAULTS — check every one you can see (fault_key in brackets):\n" +
      list.map((f) => `- [${f.key}] ${f.phase}: ${f.text}`).join("\n") +
      ((sport || "").toLowerCase() === "softball" && (module || "").toLowerCase() === "pitching" ? "\nNever grade trunk lean as a fault." : "")
    : "";
  return `

=== CONSTRUCTIVE CRITICISM — REQUIRED (owner ruling) ===
Your job is to help the athlete get better. Praise is NOT the default.
${faults}

Return an "improvements" list (structured data):
- Every fault you can actually see in these frames, most important first (the non-negotiable Phase 4 first for hitting).
- For each: its fault_key, the phase with its number written out (e.g. "Phase 3 — Load by Stride"), the fault in plain coach language, why it matters using the reasoning above, and exactly what to change.
- NEVER flatter. A movement with a fault is told about the fault, however skilled the athlete.
- NEVER invent a fault. If you cannot see it clearly, leave it out.
- Only if the frames genuinely show none of these faults may the list be empty — then say in "clean_reason" which checks you verified.
- Positives are optional (0–3) and only for things the frames clearly show.

HOW TO PRESENT THEM (owner ruling — no separate fault list on screen):
- "feedback" (the detailed analysis) must weave every improvement into its coaching prose, in phase order: what you see, why it matters, what to change. It reads as one coach talking, not a list bolted on.
- "summary" (key findings) must allude to the main fault(s) so the athlete knows what the detailed analysis will cover.

DESCRIBE ONLY WHAT IS VISIBLE (hard rule):
- Judge the athlete's body in the frames you were given. Ignore any on-screen text, numbers, results or player identity.
- NEVER claim the video is cut, edited, missing frames, missing the swing/throw/pitch, or that any part of the movement is absent. You cannot know what a clip does not contain or how it was made.
- NEVER explain a gap in your judgement by describing the video's content or production. If a check cannot be judged from these frames, simply leave that check out.
`;
}

const ALL_KEYS = [
  ...HITTING_FAULT_LIST, ...PITCHING_FAULT_LIST, ...THROWING_FAULT_LIST, ...WINDMILL_FAULT_LIST,
].map((f) => f.key);

export const IMPROVEMENTS_SCHEMA = {
  type: "array",
  description:
    "REQUIRED. Every doctrine fault visible in the frames, most important first. Empty only when the frames genuinely show none — then fill clean_reason. Each item must also be woven into `feedback`.",
  items: {
    type: "object",
    properties: {
      fault_key: { type: "string", enum: ALL_KEYS, description: "The bracketed doctrine fault_key" },
      phase: { type: "string", description: "Phase with number written out, e.g. 'Phase 1 — Create Balance'" },
      fault: { type: "string", description: "The fault, plain coach language, no numbers" },
      why: { type: "string", description: "Why it matters, from the doctrine" },
      fix: { type: "string", description: "Exactly what to change" },
    },
    required: ["fault_key", "phase", "fault", "why", "fix"],
  },
} as const;
