/**
 * Category specs for the six report cards (owner rulings 2026-09-30).
 * Baseball and softball share the SAME structure, weights and order for hitting
 * and throwing; only the athlete-facing words differ (see copy.ts).
 */
import {
  verdictAt, scoreAt, recordAt, missingTile, pitcherAbsent, at,
  type CardCategorySpec, type TileReading,
} from "./scoring";

/* ============================ HITTING ============================ */
/** raw = { pose, card, owner, gather } from runHittingTilesFromText (+ gather). */
const naPitcher = { naIf: pitcherAbsent };
const gatherPresent = (raw: unknown): TileReading => {
  const g = at(raw, "gather") as { pattern?: string | null; value?: number | null; missing_reason?: string | null } | undefined;
  if (!g || g.pattern == null) return { kind: "missing", reason: g?.missing_reason ?? "not_measured" };
  if (g.pattern === "none" || g.value == null) return { kind: "not_applicable", reason: "no_front_leg_gather_used" };
  return { kind: "record", value: g.value };
};

export const HITTING_CATEGORIES: CardCategorySpec = {
  card: "hitting",
  sections: [],
  scaleTo: 100,
  showTotal: true,
  cardNotes: [
    "The five scored categories add up to 100. Front Leg Gather is a bonus on top and the total is capped at 100, so a hitter who doesn't use a gather can still reach 100.",
  ],
  categories: [
    { key: "p1", title: "P1: Create Balance", points: 20, tiles: [
      { key: "hip_load", name: "Back hip socket rotation reached at P1", points: 13, nonNegotiable: true, read: verdictAt("pose.hip_load") },
      { key: "back_leg_balance_at_load", name: "Back-leg balance at load", points: 7, read: missingTile("no_separate_detector_yet") },
    ] },
    { key: "p2", title: "P2: Gather", points: 13, tiles: [
      { key: "hand_load", name: "Hands loaded behind the head", points: 5, read: verdictAt("pose.hand_load") },
      { key: "hand_load_depth", name: "Hand load depth", points: 4, recordOnly: true, baselineKey: "hitting_pose_tiles_deterministic.hand_load", read: recordAt("pose.hand_load") },
      { key: "p2_timing", name: "Hand load timing vs the pitcher", points: 4, read: verdictAt("pose.p2_timing", naPitcher) },
    ] },
    { key: "p3", title: "P3: Load by Stride", points: 17, tiles: [
      { key: "back_hip_socket_hold", name: "Back hip socket holds or increases", points: 3, nonNegotiable: true, staffOnly: true, read: verdictAt("owner.tile20") },
      { key: "head_path_through_stride", name: "Head path through the stride", points: 2, staffOnly: true, read: verdictAt("owner.tile19") },
      { key: "head_discipline", name: "Head discipline", points: 2, read: verdictAt("pose.head_discipline") },
      { key: "back_heel_early_rise", name: "Back heel stays down until P4", points: 2, read: verdictAt("card.back_heel_early_rise") },
      { key: "stride_direction", name: "Stride direction to the pitcher", points: 2, read: verdictAt("pose.stride_direction") },
      { key: "p3_timing", name: "Foot-down timing vs the pitcher", points: 2, read: verdictAt("pose.p3_timing", naPitcher) },
      { key: "back_knee_flex_maintained", name: "Back knee holds its bend", points: 1, read: verdictAt("card.back_knee_flex_maintained") },
      { key: "heel_plant", name: "Front heel down at landing", points: 1, read: verdictAt("card.heel_plant") },
      { key: "hands_outside_shoulders_at_landing", name: "Hands outside the shoulders at landing", points: 1, read: verdictAt("pose.hands_outside_shoulders_at_landing") },
      { key: "hands_stay_up_at_plant", name: "Hands above the back elbow at heel landing", points: 1, read: verdictAt("card.hands_stay_up_at_plant") },
    ] },
    { key: "p4", title: "P4: Hitter's Move", points: 40, note: "This meter is the Hitter's Move composite.", tiles: [
      { key: "sequencing", name: "Sequence: hips, torso, lead shoulder, lead arm", points: 9, nonNegotiable: true, read: verdictAt("card.sequencing") },
      { key: "shoulder_to_shoulder_hold", name: "Chin-to-shoulder hold and front-shoulder leak", points: 9, nonNegotiable: true, read: verdictAt("card.shoulder_to_shoulder_hold") },
      { key: "back_elbow_connection", name: "Hands stay back while the elbow gains ground", points: 5, read: verdictAt("card.back_elbow_connection") },
      { key: "shoulder_plane_steadiness", name: "Shoulder plane steadiness", points: 5, read: scoreAt("card.shoulder_plane_steadiness") },
      { key: "lead_elbow_bend_increasing", name: "Lead elbow bend no more than at the end of P2", points: 4, read: verdictAt("card.lead_elbow_bend_increasing") },
      { key: "head_vertical_movement_post_landing", name: "Head not rising before the ball is gone", points: 4, read: verdictAt("card.head_vertical_movement_post_landing") },
      { key: "post_landing_hip_drift", name: "Hips rotating after landing, not drifting", points: 4, read: verdictAt("card.post_landing_hip_drift") },
    ] },
    { key: "finish", title: "The Finish", points: 7, tiles: [
      { key: "pelvis_rotation_efficiency", name: "Pelvis square to fair at the end of P4", points: 4, read: verdictAt("card.pelvis_rotation_efficiency") },
      { key: "finish_balance", name: "Finish balance", points: 3, read: verdictAt("card.finish_balance") },
    ] },
    { key: "front_leg_gather", title: "Front Leg Gather (bonus)", points: 3, additive: true,
      note: "A power-loading option during P2, never required. It can only add points, never take them away.",
      tiles: [
        { key: "front_leg_gather", name: "Front leg gather", points: 3, recordOnly: true, baselineKey: "hitting_gather.front_leg_gather", read: gatherPresent },
      ] },
  ],
};

/* ======================== BASEBALL PITCHING ======================== */
/** raw = { tiles, card } from runPitchingFromText. Balance & Set dropped (owner ruling 8); its 13 points: L&T +4, D&S +6, Finish +3. */
export const PITCHING_CATEGORIES: CardCategorySpec = {
  card: "pitching_baseball",
  sections: [],
  scaleTo: 100,
  showTotal: true,
  cardNotes: ["A starting-position category will be added once a set-position standard is defined."],
  categories: [
    { key: "lift_thrust", title: "Lift & Thrust", points: 21, tiles: [
      { key: "lift_thrust", name: "Lift and thrust together", points: 10, read: verdictAt("tiles.lift_thrust") },
      { key: "energy_angle_deg", name: "Energy angle at peak lift", points: 6, read: verdictAt("tiles.energy_angle_deg") },
      { key: "eyes_on_target_at_peak_lift", name: "Eyes on target at peak lift", points: 5, read: verdictAt("card.tiles.eyes_on_target_at_peak_lift") },
    ] },
    { key: "drive_stride", title: "Drive & Stride", points: 29, tiles: [
      { key: "tempo_sec", name: "Tempo", points: 6, read: verdictAt("card.tiles.tempo_sec") },
      { key: "stride_pct_of_height", name: "Stride length", points: 6, read: verdictAt("card.tiles.stride_pct_of_height") },
      { key: "drag_line", name: "Drag line", points: 6, read: verdictAt("card.tiles.drag_line") },
      { key: "balance_at_landing", name: "Balance at landing", points: 6, read: verdictAt("card.tiles.balance_at_landing") },
      { key: "head_vertical_movement_pct", name: "Head stability", points: 5, read: verdictAt("tiles.head_vertical_movement_pct") },
    ] },
    { key: "release", title: "Release", points: 40, tiles: [
      { key: "hip_shoulder_separation", name: "Hip and shoulder separation", points: 14, nonNegotiable: true, recordOnly: true, baselineKey: "pitching_tiles_deterministic.premature_shoulder_open_deg", read: recordAt("tiles.premature_shoulder_open_deg") },
      { key: "shoulder_tilt_deg", name: "Shoulder tilt at release", points: 7, read: verdictAt("card.tiles.shoulder_tilt_deg") },
      { key: "head_at_release_deg", name: "Head at release", points: 7, read: verdictAt("card.tiles.head_at_release_deg") },
      { key: "stack_and_track", name: "Stack and track", points: 6, read: verdictAt("card.tiles.stack_and_track") },
      { key: "release_extension", name: "Release extension", points: 6, read: verdictAt("card.tiles.release_extension") },
    ] },
    { key: "finish", title: "The Finish", points: 10, tiles: [
      { key: "glove_drift_outside_frame_in", name: "Glove control", points: 5, read: verdictAt("card.tiles.glove_drift_outside_frame_in") },
      { key: "glove_swivel", name: "Glove swivel", points: 0, read: verdictAt("card.tiles.glove_swivel") },
      { key: "finish_balance", name: "Finish balance", points: 5, read: missingTile("no_pitching_finish_detector_yet") },
    ] },
  ],
};

/* ============================ THROWING ============================ */
/** raw = runThrowingTiles result. Arm Care on top, no weight; ONE mechanics meter (owner ruling 6). */
const flagAt = (key: string) => (raw: unknown): TileReading => {
  const t = at(raw, `injury.${key}`) as { flag?: string | null; missing_reason?: string | null } | undefined;
  if (!t || t.flag == null) return { kind: "missing", reason: t?.missing_reason ?? "not_measured" };
  return { kind: "verdict", pass: t.flag === "clear" };
};
const notShuffle = (raw: unknown) => ((raw as { pattern?: string })?.pattern === "shuffle" ? null : "only_measured_on_a_sideways_shuffle_throw");
export const THROWING_CATEGORIES: CardCategorySpec = {
  card: "throwing",
  sections: [{
    key: "arm_care", title: "Arm Care",
    note: "These are flags, not grades, and they carry no points. If one is raised, or your arm is sore, have a qualified coach or medical professional look at your throwing.",
    tiles: [
      { key: "trunk_rotation_before_foot_contact", name: "Shoulders turning before the front foot lands", read: flagAt("trunk_rotation_before_foot_contact") },
      { key: "horizontal_abduction_at_foot_contact", name: "Arm dragging behind the body", read: flagAt("horizontal_abduction_at_foot_contact") },
      { key: "stride_foot_direction", name: "Front foot landing across the body", read: flagAt("stride_foot_direction") },
    ],
  }],
  scaleTo: 100,
  showTotal: true,
  cardNotes: ["The mechanics section is small today and will grow as more throwing checks are validated."],
  categories: [
    { key: "mechanics", title: "Throwing Mechanics", points: 100, tiles: [
      { key: "tempo", name: "Throwing tempo", points: 25, read: verdictAt("tempo") },
      { key: "stride_length", name: "Stride from the final step", points: 25, read: verdictAt("stride_length") },
      { key: "energy_angle", name: "Shuffle energy angle", points: 25, read: (raw) => { const na = notShuffle(raw); return na ? { kind: "not_applicable", reason: na } : verdictAt("energy_angle")(raw); } },
      { key: "head_stability", name: "Head and balance through the throw", points: 25, read: verdictAt("head_stability") },
    ] },
  ],
};

/* ======================= SOFTBALL WINDMILL ======================= */
/** raw = runSoftballPitchingTiles result. Wind-up and Follow-through dropped (no tiles). No total. */
const spVerdict = (key: string) => (raw: unknown): TileReading => {
  const t = at(raw, `tiles.${key}`) as { verdict?: string | null; missing_reason?: string | null } | undefined;
  if (t?.verdict === "pass") return { kind: "verdict", pass: true };
  if (t?.verdict === "fail") return { kind: "verdict", pass: false };
  return { kind: "missing", reason: t?.missing_reason ?? "not_measured" };
};
const spRecord = (key: string) => (raw: unknown): TileReading => {
  const t = at(raw, `tiles.${key}`) as { values?: Record<string, number | null>; missing_reason?: string | null } | undefined;
  const v = t?.values ? Object.values(t.values).find((x) => typeof x === "number" && Number.isFinite(x)) : undefined;
  return typeof v === "number" ? { kind: "record", value: v } : { kind: "missing", reason: t?.missing_reason ?? "not_measured" };
};
const spFlag = (key: string) => (raw: unknown): TileReading => {
  const t = at(raw, `tiles.${key}`) as { flag?: string | null; missing_reason?: string | null } | undefined;
  return t?.flag == null ? { kind: "missing", reason: t?.missing_reason ?? "not_measured" } : { kind: "verdict", pass: t.flag === "clear" };
};
export const WINDMILL_CATEGORIES: CardCategorySpec = {
  card: "pitching_softball_windmill",
  sections: [{
    key: "safety", title: "Safety Flags",
    note: "Flags, not grades, with no points. If one is raised, have a qualified coach or medical professional look at your motion.",
    tiles: [
      { key: "windup_knee_valgus_flag", name: "Knee caving in during the wind-up", read: spFlag("windup_knee_valgus_flag") },
      { key: "sfc_knee_valgus_flag", name: "Knee caving in at stride-foot landing", read: spFlag("sfc_knee_valgus_flag") },
    ],
  }],
  scaleTo: 100,
  showTotal: false,
  cardNotes: ["Two phases, the wind-up and the follow-through, can't be measured yet, so this card shows no total."],
  categories: [
    { key: "stride", title: "Stride", points: 55, tiles: [
      { key: "stride_triple_extension", name: "Drive-leg push", points: 30, read: spVerdict("stride_triple_extension") },
      { key: "sfc_foot_angle", name: "Stride foot at landing", points: 25, read: spVerdict("sfc_foot_angle") },
      { key: "stride_profile", name: "Stride length", points: 0, recordOnly: true, baselineKey: "softball_pitching_tiles_deterministic.stride_profile", read: spRecord("stride_profile") },
      { key: "sfc_separation", name: "Separation at landing", points: 0, recordOnly: true, baselineKey: "softball_pitching_tiles_deterministic.sfc_separation", read: spRecord("sfc_separation") },
    ] },
    { key: "acceleration", title: "Acceleration", points: 45, tiles: [
      { key: "arm_path", name: "Arm path close to the body", points: 45, read: spVerdict("arm_path") },
      { key: "trunk_flexion", name: "Forward lean", points: 0, recordOnly: true, baselineKey: "softball_pitching_tiles_deterministic.trunk_flexion", read: spRecord("trunk_flexion") },
    ] },
  ],
};

export function categorySpecFor(sport: string | undefined, module: string | undefined): CardCategorySpec | null {
  const s = (sport ?? "baseball").toLowerCase(), m = (module ?? "").toLowerCase();
  if (m === "hitting") return HITTING_CATEGORIES;
  if (m === "throwing") return THROWING_CATEGORIES;
  if (m === "pitching") return s === "softball" ? WINDMILL_CATEGORIES : PITCHING_CATEGORIES;
  return null;
}
