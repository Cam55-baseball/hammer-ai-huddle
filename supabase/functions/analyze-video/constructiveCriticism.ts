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
`;

const THROWING_FAULTS = `
DOCTRINE FAULTS (throwing) — check every one you can see:
- Shoulders rotate before the front foot lands, pulling the throw across the body.
- Feet and shoulders not lined up to the target at landing.
- Back leg not driving toward the target at landing.
`;

const SOFTBALL_PITCHING_FAULTS = `
DOCTRINE FAULTS (softball windmill, docs/SOFTBALL-PITCHING-DOCTRINE.md) — check every one you can see:
- Shoulders open early in the circle instead of staying closed through the whip.
- Stride foot lands pointed too far open or closed for the drive line.
- Knee caves inward at the windup or at front-foot contact (a flag for a professional, never a diagnosis).
Never grade trunk lean as a fault.
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
- For each: the phase with its number written out (e.g. "Phase 3 — Load by Stride"), the fault in plain coach language, why it matters using the reasoning above, and exactly what to change.
- NEVER flatter. A swing with a fault is told about the fault, even if it is a professional swing.
- NEVER invent a fault. If you cannot see it clearly, leave it out.
- Only if the clip genuinely shows none of these faults may the list be empty — then say in "clean_reason" which checks you verified.
- Positives are optional (0–3) and only for things the clip clearly shows.
- Ignore broadcast graphics, exit velocity, results and player identity. Judge the body only.
`;
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
