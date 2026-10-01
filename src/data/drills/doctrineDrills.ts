/**
 * Doctrine drill library — one drill per doctrine fault, all six analyses.
 *
 * DRAFT FOR OWNER REVIEW (2026-10-01). Every entry traces to a fault the
 * analysis emits as `improvements[].fault_key` (see
 * supabase/functions/analyze-video/constructiveCriticism.ts) and to the
 * doctrine named in `source`. No general fitness work, no invented theory.
 * `videoUrl` is left empty for the owner to attach his own recording.
 *
 * Sources:
 *  - hitting: docs/HITTING-PHILOSOPHY.md (owner)
 *  - baseball pitching: owner pitching doctrine as recorded in
 *    src/lib/reportCard/pitchingCopy.ts
 *  - throwing: owner throwing faults + arm slot is never a fault
 *  - softball windmill: docs/SOFTBALL-PITCHING-DOCTRINE.md (Friesen et al.)
 */
import type { EliteDrill, EliteDrillLevel } from "./eliteDrillCatalog";

interface Spec {
  id: string;
  name: string;
  category: EliteDrill["category"];
  sports: EliteDrill["sports"];
  faultKey: string;
  phase: string;
  level: EliteDrillLevel;
  fixes: string;
  setup: string;
  steps: string[];
  cue: string;
  feel: string;
  dosage: string;
  equipment: string[];
  source: string;
  basis?: "doctrine_fix" | "proposed_shape";
}

const d = (s: Spec): EliteDrill => ({
  id: s.id,
  name: s.name,
  category: s.category,
  sports: s.sports,
  subSkill: s.phase,
  level: s.level,
  fixes: s.fixes,
  setup: s.setup,
  steps: s.steps,
  cues: [s.cue],
  dosage: s.dosage,
  equipment: s.equipment,
  violationKeys: [s.faultKey],
  pieV2Signals: [],
  movementPatterns: [],
  phase: s.phase,
  feel: s.feel,
  source: s.source,
  videoUrl: null,
  ownerReview: "pending_owner_review",
  basis: s.basis ?? "doctrine_fix",
});

const BOTH: EliteDrill["sports"] = ["baseball", "softball"];
const HIT = "Owner doctrine — docs/HITTING-PHILOSOPHY.md";
const BP = "Owner pitching doctrine";
const TH = "Owner throwing doctrine";
const SP = "docs/SOFTBALL-PITCHING-DOCTRINE.md — SOURCED movement; any pass line PROPOSED";

export const DOCTRINE_DRILLS: EliteDrill[] = [
  // ── HITTING (baseball + softball) ───────────────────────────────────
  d({ id: "doc.hit.back_leg_hold_stride", name: "Back-Leg Hold Stride", category: "hitting", sports: BOTH,
    faultKey: "hip_load_back_leg_not_balanced", phase: "Phase 1 — Create Balance", level: "feel",
    fixes: "The back leg was not truly holding the load, so the stride gave ground.",
    setup: "No ball. Stance in front of a mirror or with a partner watching your head.",
    steps: ["Load the back hip and settle the weight onto the back leg.", "Take your stride and freeze when the front foot lands — no swing.", "Check your head and chest stayed over the back half."],
    cue: "Fix the load, not the stride — get your weight truly settled on your back leg as you load.",
    feel: "Pressure deep in the back hip as the front foot touches, nothing travelling with the foot.",
    dosage: "3 x 6", equipment: ["mirror"], source: HIT }),
  d({ id: "doc.hit.knee_bend_hold", name: "Back-Knee Bend Hold", category: "hitting", sports: BOTH,
    faultKey: "back_knee_straightened_fail", phase: "Phase 1 — Create Balance", level: "iso",
    fixes: "The back knee straightened between the gather and landing, so the load leaked.",
    setup: "Tee or dry. Stance with the back knee softly bent.",
    steps: ["Gather into the back leg.", "Stride and land while keeping the same back-knee bend.", "Hold the landing, then swing."],
    cue: "Keep the back knee bent until the swing starts.",
    feel: "The back thigh and glute working the whole way to landing.",
    dosage: "3 x 6", equipment: ["tee"], source: HIT }),
  d({ id: "doc.hit.back_pocket_hold", name: "Back-Hip Socket Hold", category: "hitting", sports: BOTH,
    faultKey: "back_hip_socket_hold_fail", phase: "Phase 2 — Gather", level: "feel",
    fixes: "The back hip opened before Phase 4 started.",
    setup: "Tee middle of the plate.",
    steps: ["Load the bat and the front leg together.", "Stride and land with the back hip still closed in its socket.", "Only then let the swing go."],
    cue: "Back hip stays in its socket — holding or increasing — until Phase 4 starts.",
    feel: "The back glute loaded and the back pocket still facing the catcher at landing.",
    dosage: "3 x 8", equipment: ["tee", "net"], source: HIT }),
  d({ id: "doc.hit.heel_down_freeze", name: "Heel-Down Stride Freeze", category: "hitting", sports: BOTH,
    faultKey: "front_heel_not_down_at_landing", phase: "Phase 3 — Load by Stride", level: "constraint",
    fixes: "The front heel was not down at landing.",
    setup: "Front toss or tee.",
    steps: ["Take a deliberate power step.", "Get the front heel to the floor and freeze for a beat.", "Swing from the planted foot."],
    cue: "Heel to the floor — it gives the back bicep a better path at the ball and keeps your eyes still.",
    feel: "The whole front foot quiet on the ground before anything turns.",
    dosage: "3 x 8", equipment: ["tee", "net"], source: HIT }),
  d({ id: "doc.hit.hands_above_elbow", name: "Hands-Above-Elbow Landing Check", category: "hitting", sports: BOTH,
    faultKey: "hands_below_back_elbow_at_heel_landing", phase: "Phase 3 — Load by Stride", level: "feel",
    fixes: "The hands dropped below the back elbow at heel landing.",
    setup: "Dry or tee, side-on to a mirror.",
    steps: ["Stride and freeze at heel landing.", "Check the hands sit above the back elbow.", "Swing and let Phase 4 drop the barrel."],
    cue: "Hands stay above the back elbow at landing — Phase 4 drops the barrel, not the stride.",
    feel: "Hands up and quiet while the heel lands, front shoulder still closed.",
    dosage: "3 x 8", equipment: ["mirror", "tee"], source: HIT }),
  d({ id: "doc.hit.glute_power_step", name: "Glute-Driven Power Step", category: "hitting", sports: BOTH,
    faultKey: "stride_body_gained_ground", phase: "Phase 3 — Load by Stride", level: "constraint",
    fixes: "The body travelled with the stride and gained ground.",
    setup: "Tee. A marker where the front foot should land.",
    steps: ["Drive the stride from the back glute.", "Get the foot to the floor at the marker before the pitch would leave the hand.", "Check the head stayed back over the back half."],
    cue: "Take a deliberate power step driven by the back glute — momentum does not play into your stride.",
    feel: "The foot goes, the body stays.",
    dosage: "3 x 8", equipment: ["tee", "marker"], source: HIT }),
  d({ id: "doc.hit.bicep_leads_tee", name: "Bicep-Leads Tee", category: "hitting", sports: BOTH,
    faultKey: "hands_pass_elbow_early", phase: "Phase 4 — Hitter's Move", level: "feel",
    fixes: "The hands passed the back elbow early instead of the back bicep leading.",
    setup: "Tee, start from the landed stride position.",
    steps: ["Start from a planted front foot.", "Let the back bicep start forward through the ball while the knob stays back.", "Release the swing."],
    cue: "From a planted foot, the back bicep starts forward while the knob stays back.",
    feel: "The back elbow coming in first and the barrel releasing late and fast.",
    dosage: "3 x 10", equipment: ["tee", "net"], source: HIT }),
  d({ id: "doc.hit.planted_foot_turn", name: "Planted-Foot Turn", category: "hitting", sports: BOTH,
    faultKey: "post_landing_hip_drift_fail", phase: "Phase 4 — Hitter's Move", level: "constraint",
    fixes: "The hips kept sliding forward after landing instead of turning.",
    setup: "Tee. Start already landed in your stride.",
    steps: ["Set up in your landed stride.", "Swing turning the hips in place.", "Finish with the hips rotated, not shifted forward."],
    cue: "Once the foot lands, the hips turn — any drift after landing is causing an issue.",
    feel: "Rotation around the front leg, belt buckle turning rather than moving forward.",
    dosage: "3 x 10", equipment: ["tee", "net"], source: HIT }),
  d({ id: "doc.hit.back_hip_drive", name: "Back-Hip Drive Turn", category: "hitting", sports: BOTH,
    faultKey: "p1_load_not_used", phase: "Phase 4 — Hitter's Move", level: "transfer",
    fixes: "The load was held but the back hip never drove the swing.",
    setup: "Front toss.",
    steps: ["Load and hold the back leg.", "Land the stride.", "Drive the swing from the back hip so the hips lead the turn."],
    cue: "Drive from the back hip and turn it into the swing.",
    feel: "The back hip firing first and pulling the swing through.",
    dosage: "3 x 8", equipment: ["net", "balls"], source: HIT }),
  d({ id: "doc.hit.chin_tuck_hold", name: "Chin-Tuck Contact Hold", category: "hitting", sports: BOTH,
    faultKey: "head_rises_before_contact", phase: "Phase 4 — Hitter's Move", level: "feel",
    fixes: "The head came up before the ball was off the bat.",
    setup: "Tee.",
    steps: ["Swing through the ball.", "Keep the chin tucked and eyes on the contact point until the ball is gone.", "Then let the head release."],
    cue: "Chin stays tucked until the ball is off the bat — sinking is fine, coming up is not.",
    feel: "Eyes still on the tee after the ball has left.",
    dosage: "3 x 10", equipment: ["tee", "net"], source: HIT }),
  d({ id: "doc.hit.head_stays_back", name: "Head-Stays-Back Tee", category: "hitting", sports: BOTH,
    faultKey: "head_discipline_head_past_com", phase: "Phase 4 — Hitter's Move", level: "constraint",
    fixes: "The head went forward through the swing.",
    setup: "Tee set slightly deeper than normal.",
    steps: ["Stride and land with the head over the back half.", "Swing without letting the head go to the ball.", "Let the ball travel to you."],
    cue: "Head stays back — let the ball come to you.",
    feel: "Seeing the ball deep and the head staying where it landed.",
    dosage: "3 x 8", equipment: ["tee", "net"], source: HIT }),

  // ── BASEBALL PITCHING ───────────────────────────────────────────────
  d({ id: "doc.bp.closed_landing", name: "Closed-Landing Freeze", category: "pitching", sports: ["baseball"],
    faultKey: "chest_open_at_landing", phase: "Landing", level: "feel",
    fixes: "The chest was already facing the plate at landing.",
    setup: "Flat ground, no throw.",
    steps: ["Lift and stride.", "Freeze when the front foot lands.", "Check the chest is still sideways before turning."],
    cue: "Land sideways — the chest turns after the foot is down.",
    feel: "Front shoulder still pointed at the target as the foot lands.",
    dosage: "3 x 6", equipment: [], source: BP }),
  d({ id: "doc.bp.lift_and_go", name: "Lift-and-Go Rhythm", category: "pitching", sports: ["baseball"],
    faultKey: "hang_at_peak_lift", phase: "Leg lift", level: "timing",
    fixes: "Hanging at the top of the leg lift.",
    setup: "Flat ground throws to a partner.",
    steps: ["Lift the knee.", "Keep moving down the mound the moment the knee gets up.", "Throw."],
    cue: "Keep the move going once the knee gets up.",
    feel: "One continuous move from lift to landing, no pause at the top.",
    dosage: "3 x 8", equipment: ["balls"], source: BP }),
  d({ id: "doc.bp.stack_and_track", name: "Stack-and-Track Line Throws", category: "pitching", sports: ["baseball"],
    faultKey: "not_stacked_at_release", phase: "Release", level: "constraint",
    fixes: "Shoulders or eyes tipped off line at release.",
    setup: "A straight line on the ground to the target.",
    steps: ["Stride along the line.", "Release with shoulders level and eyes level.", "Finish on the line."],
    cue: "Keep your shoulders and your eyes level so your whole body throws on one line.",
    feel: "Throwing down a hallway — nothing tipping sideways.",
    dosage: "3 x 8", equipment: ["balls", "tape"], source: BP }),
  d({ id: "doc.bp.landing_balance", name: "Landing Balance Hold", category: "pitching", sports: ["baseball"],
    faultKey: "head_outside_base_at_landing", phase: "Landing", level: "iso",
    fixes: "The head was outside the base when the front foot landed.",
    setup: "Flat ground, no throw.",
    steps: ["Stride and land.", "Hold the landing with the head over the legs.", "Then throw."],
    cue: "Land with your head over your legs.",
    feel: "Balanced between both feet, able to hold the landing still.",
    dosage: "3 x 6", equipment: [], source: BP }),
  d({ id: "doc.bp.glove_swivel", name: "Glove Swivel Mirror", category: "pitching", sports: ["baseball"],
    faultKey: "glove_flies_open", phase: "Landing to release", level: "feel",
    fixes: "The glove flew open instead of turning over and tucking.",
    setup: "In front of a mirror, dry.",
    steps: ["Stride with the glove out front.", "At landing turn the glove over, pinky to your body.", "Tuck it inside the shoulders as you throw."],
    cue: "Turn it over, pinky to your body, and keep it inside your shoulders.",
    feel: "The glove side firm and tucked into the chest.",
    dosage: "3 x 8", equipment: ["mirror"], source: BP }),
  d({ id: "doc.bp.finish_the_push", name: "Finish-the-Push Drag", category: "pitching", sports: ["baseball"],
    faultKey: "drag_line_long_or_crooked", phase: "Drive", level: "constraint",
    fixes: "The back-foot drag was long or crooked.",
    setup: "Flat ground with a line to the target.",
    steps: ["Push off the rubber.", "Finish the push and let the back foot come through.", "Check the drag is short and straight to the plate."],
    cue: "Finish the push and let the foot come through — short and straight to the plate.",
    feel: "The back foot releasing and following the body, not dragging behind.",
    dosage: "3 x 8", equipment: ["balls"], source: BP }),
  d({ id: "doc.bp.eyes_locked", name: "Eyes-Locked Lift", category: "pitching", sports: ["baseball"],
    faultKey: "eyes_off_target_at_peak_lift", phase: "Leg lift", level: "feel",
    fixes: "Eyes off the target at the top of the leg lift.",
    setup: "Partner holding a glove target.",
    steps: ["Lift with the eyes on the glove.", "Keep them there through the move forward.", "Throw."],
    cue: "Lock onto the glove before you go.",
    feel: "The target never leaving your eyes.",
    dosage: "3 x 8", equipment: ["balls"], source: BP }),

  // ── THROWING (baseball + softball) ──────────────────────────────────
  d({ id: "doc.th.land_then_turn", name: "Land-Then-Turn Partner Throws", category: "throwing", sports: BOTH,
    faultKey: "early_shoulder_rotation", phase: "Landing", level: "constraint",
    fixes: "The shoulders turned before the front foot landed, pulling the throw across the body.",
    setup: "Partner throws at a comfortable distance.",
    steps: ["Step to the target.", "Land the front foot with the shoulders still closed.", "Then turn and throw."],
    cue: "Foot down first, then the shoulders turn.",
    feel: "The throw going straight to the target, not across you.",
    dosage: "3 x 10", equipment: ["balls"], source: TH }),
  d({ id: "doc.th.line_up_landing", name: "Line-Up Landing Throws", category: "throwing", sports: BOTH,
    faultKey: "shoulders_not_aligned", phase: "Landing", level: "constraint",
    fixes: "Feet and shoulders not lined up to the target at landing.",
    setup: "A line on the ground pointing at the target.",
    steps: ["Line the feet up on the line.", "Land with the front shoulder pointing down the line.", "Throw along it."],
    cue: "Feet and shoulders lined up at the target when you land.",
    feel: "Everything pointing the same way as the throw.",
    dosage: "3 x 10", equipment: ["balls", "tape"], source: TH }),
  d({ id: "doc.th.back_leg_drive", name: "Back-Leg Drive to Target", category: "throwing", sports: BOTH,
    faultKey: "back_leg_not_facing_target", phase: "Landing", level: "feel",
    fixes: "The back leg was not driving toward the target at landing.",
    setup: "Partner throws.",
    steps: ["Push off the back leg toward the target.", "Let the back knee and foot turn to face the target as you throw.", "Finish facing the target."],
    cue: "Drive the back leg at the target.",
    feel: "The back hip and knee coming through toward where the ball is going.",
    dosage: "3 x 10", equipment: ["balls"], source: TH }),

  // ── SOFTBALL WINDMILL ───────────────────────────────────────────────
  d({ id: "doc.sp.sprinter_start", name: "Sprinter-Start Hold", category: "pitching", sports: ["softball"],
    faultKey: "windup_not_sprinter_position", phase: "Wind-up", level: "iso",
    fixes: "Not in the sprinter-like position at the end of the wind-up.",
    setup: "On the rubber, no ball.",
    steps: ["Finish the wind-up.", "Hold: both knees bent, back heel up, slight forward lean, body square to the plate.", "Push off from the hold."],
    cue: "Get into your sprinter's start — square to the plate, ready to push.",
    feel: "Loaded like a sprinter in the blocks, trunk and drive shin leaning together.",
    dosage: "3 x 6", equipment: [], source: SP }),
  d({ id: "doc.sp.push_off_drive", name: "Push-Off Drive", category: "pitching", sports: ["softball"],
    faultKey: "no_drive_leg_extension", phase: "Stride", level: "constraint",
    fixes: "The drive leg did not push hard off the mound.",
    setup: "Flat ground or mound.",
    steps: ["From the sprinter's start, push off hard.", "Fully extend the hip, knee and ankle of the drive leg.", "Keep the trunk facing the plate as you go."],
    cue: "Push away from the mound with the whole drive leg.",
    feel: "The drive leg finishing long behind you as you travel.",
    dosage: "3 x 6", equipment: [], source: SP }),
  d({ id: "doc.sp.power_line_landing", name: "Power-Line Landing", category: "pitching", sports: ["softball"],
    faultKey: "stride_foot_off_power_line", phase: "Stride foot contact", level: "constraint",
    fixes: "The stride foot landed pointed off the power line.",
    setup: "A tape line from the rubber to the plate.",
    steps: ["Stride down the power line.", "Land with the stride foot turned slightly toward the pitching-arm side.", "Finish the pitch."],
    cue: "Land on the power line with the foot turned slightly to your throwing side.",
    feel: "A firm front side that lets the hips work, not a foot blocking or flying open.",
    dosage: "3 x 8", equipment: ["tape", "balls"], source: SP }),
  d({ id: "doc.sp.close_circle", name: "Close-Circle Arm Path", category: "pitching", sports: ["softball"],
    faultKey: "arm_path_away_from_body", phase: "Stride to acceleration", level: "feel",
    fixes: "The arm path drifted away from the body through the circle.",
    setup: "Short distance to a partner, half-speed.",
    steps: ["Make the circle with the arm staying close to the body.", "Keep it close down through acceleration.", "Release."],
    cue: "Keep the arm close to your body through the circle.",
    feel: "The arm brushing past the body rather than swinging wide.",
    dosage: "3 x 10", equipment: ["balls"], source: SP }),
  d({ id: "doc.sp.power_line_back_leg", name: "Back Leg on the Line", category: "pitching", sports: ["softball"],
    faultKey: "back_leg_off_power_line", phase: "Acceleration", level: "constraint",
    fixes: "The back leg drifted off the power line during acceleration.",
    setup: "A tape line from the rubber to the plate.",
    steps: ["Pitch down the line.", "Let the back leg follow the line through acceleration.", "Check where the back foot finished."],
    cue: "Back leg stays close to the power line.",
    feel: "Everything travelling straight at the plate.",
    dosage: "3 x 8", equipment: ["tape", "balls"], source: SP }),
];

/** Faults the analysis can emit that deliberately have no drill. */
export const FAULTS_WITHOUT_DRILL: Array<{ analysis: string; faultKey: string; reason: string }> = [
  { analysis: "hitting", faultKey: "lead_elbow_bends_in_swing", reason: "Doctrine names the fault but gives no fix; owner to supply." },
  { analysis: "pitching_baseball", faultKey: "energy_angle / lift-and-thrust", reason: "No owner wording for a fix in the repo yet." },
  { analysis: "pitching_softball", faultKey: "knee caving inward", reason: "Safety flag for a qualified professional, never a coaching drill." },
  { analysis: "throwing", faultKey: "arm slot", reason: "Owner ruling: arm slot is fascial and never a fault." },
  { analysis: "throwing", faultKey: "arm-care flags", reason: "Research flags carry no grade; no drill without owner wording." },
];
