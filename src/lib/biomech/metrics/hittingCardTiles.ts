/**
 * Hitting upload card — tiles 6, 9–13, 16–21 and 22 (pose-only, body only).
 * Built 2026-09-28. Pattern: tempoSec.ts — pure, deterministic, canonical
 * missingness, no model in the value path.
 *
 * Shared rules (same as hittingPoseTiles.ts):
 *  - Stance Lock baseline; coordinates stance-unrolled, % of stature, + forward
 *    = toward the pitcher, + up = up.
 *  - Every landmark read goes through SEGMENT VALIDITY: a landmark whose rigid
 *    segment deviates >20% from its Stance Lock length is missing in that frame.
 *  - 3-frame medians at an anchor; robust spread = p90 − p10, never max − min.
 *  - Every floor measured on still clip 15d75bc9 (worst of p99/max, see
 *    docs/landmark-noise-floors.md "Hitting card tiles 2026-09-28").
 *  - No owner number → value reported UNGRADED (verdict null), listed in
 *    CARD_TILE_OWNER_NUMBERS_NEEDED. Never invented.
 *  - D-SWING-PEAK is the fastest torso turn, NOT contact.
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { MISSINGNESS_REASONS as R, missingness, type MissingnessRecord, type MissingnessReason } from "./missingness";
import { uncalibrated, missingConfidence, type ConfidenceRecord } from "./confidence";
import { detectSwingStart, detectSwingPeak, detectFinish, detectP4, detectLoadApex } from "../anchors/poseEvents";
import { frontFootPlantFromSeries, centreOfMassPx } from "./hittingOwnerTiles";
import { deriveDirectionSign, type Handedness } from "../side/strideSide";
import { LM, pointPx, median, mid, round4, smooth, type Pt } from "../anchors/poseKinematics";
import { detectStanceLock, unroll, headCentroidPx, type StanceLock } from "../anchors/stanceLock";
import { buildSegmentValidity, type SegmentValidity } from "../validity/segmentValidity";
import { fuseShoulderOpen } from "./shoulderOpenFusion";
import { detectCameraView, checkCameraRequirement } from "../camera/cameraView";
import { handPointPx, runHittingPoseTiles } from "./hittingPoseTiles";

export const HITTING_CARD_TILES_VERSION = "hitting_card_tiles@1.0.0-2026-09-28";

/* ---------- floors: still clip 15d75bc9, measured by scripts before any threshold ---------- */
export const CARD_FLOORS = {
  heel_minus_toe_pct: 1.0,      // still max 0.93 (p99 0.78)
  shoulder_tilt_spread_deg: 2.3, // still worst 0.7 s window p90−p10 2.21
  finish_com_sway_pct: 0.9,     // still worst 0.25 s window p90−p10 0.84
  knee_angle_deg: 3.0,          // still max |med3 − median| 2.93 (worst side)
  hip_fwd_pct: 0.8,             // same as HIP_LOAD_NOISE_FLOOR_PCT (pelvis mid)
  hand_height_pct: 2.8,         // still hand-point vertical max 2.72
  elbow_angle_deg: 6.0,         // still max |med3 − median| 5.8 (worst side)
  head_vertical_spread_pct: 0.6, // still worst 0.7 s window p90−p10 0.55
  pelvis_rot_deg: 9.0,          // still hip rigid-solve θ max |med3 − median| 8.6 — ill-conditioned near closed
  spacing_pct: 2.3,             // hand point minus rear shoulder: HANDS_OUTSIDE floor
} as const;

export const CARD_TILE_OWNER_NUMBERS_NEEDED = [
  "heel_plant: heel-above-toe allowance at full plant, and a first-touch→full-plant time",
  "sequencing: none needed for order; owner to confirm hips→torso→lead shoulder→lead arm is judged on peak forward speed",
  "back_elbow_connection: back-elbow slot angle range at swing peak; allowed elbow rise above shoulder at swing start",
  "shoulder_plane_steadiness: maximum shoulder-tilt spread (degrees) through the swing",
  "finish_balance: how far off the base (stance fraction) and how much sway is still 'balanced'",
  "back_knee_flex_maintained: maximum back-knee extension (degrees) from stance to plant",
  "post_landing_hip_drift: allowed pelvis forward travel plant → P4 (owner doctrine says drift is the fault; no number given)",
  "hands_stay_up_at_plant: maximum hand drop (% stature) from hands-set to plant",
  "lead_elbow_bend_increasing: minimum bend change (degrees)",
  "head_vertical_movement_post_landing: maximum head vertical spread (% stature)",
  "pelvis_rotation_efficiency: target pelvis rotation (degrees) plant → swing peak",
] as const;

export type CardKey =
  | "heel_plant" | "sequencing" | "back_elbow_connection" | "shoulder_plane_steadiness" | "finish_balance"
  | "shoulder_to_shoulder_hold" | "back_knee_flex_maintained" | "post_landing_hip_drift" | "hands_stay_up_at_plant"
  | "lead_elbow_bend_increasing" | "head_vertical_movement_post_landing" | "pelvis_rotation_efficiency" | "hitters_move";
export interface CardTileResult {
  readonly key: CardKey;
  readonly value: number | null;
  readonly unit: string;
  readonly uncertainty: number | null;
  readonly verdict: "pass" | "fail" | "elite" | null;
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly lineage: Readonly<Record<string, unknown>>;
}
const mr = (r: MissingnessReason) => missingness(r, "D-METRIC");
const refuse = (key: CardKey, unit: string, rec: MissingnessRecord, lineage: Record<string, unknown>): CardTileResult =>
  ({ key, value: null, unit, uncertainty: null, verdict: null, missingness: rec, confidence: missingConfidence(), lineage });
const ok = (key: CardKey, unit: string, value: number, unc: number | null, verdict: CardTileResult["verdict"], lineage: Record<string, unknown>): CardTileResult =>
  ({ key, value: round4(value), unit, uncertainty: unc, verdict, missingness: null, confidence: uncalibrated(), lineage: verdict == null ? { ...lineage, graded: false, why_ungraded: "owner number not supplied" } : lineage });

/* ---------- context ---------- */
interface Ctx {
  s: LandmarkSeries; side: Handedness; dir: 1 | -1; lock: StanceLock; v: SegmentValidity | null; st: number; fps: number;
  lead: { sh: number; el: number; wr: number }; rear: { sh: number; el: number; wr: number; hip: number; knee: number; ankle: number };
  frontHeel: number; frontToe: number;
}
const kOf = (s: LandmarkSeries, fi: number | null) => (fi == null ? -1 : s.frames.findIndex((f) => f.frame_index === fi));
function P(c: Ctx, k: number, i: number): Pt | null {
  const f = c.s.frames[k]; if (!f) return null;
  if (c.v && !c.v.trusted(k, i)) return null;
  return pointPx(c.s, f, i);
}
const U = (c: Ctx, p: Pt | null) => (p ? unroll(p, c.lock.baseline!.roll_deg) : null);
/** forward, % stature */
const Fw = (c: Ctx, p: Pt | null) => { const u = U(c, p); return u ? (u.x * c.dir * 100) / c.st : null; };
/** up, % stature */
const Up = (c: Ctx, p: Pt | null) => { const u = U(c, p); return u ? (-u.y * 100) / c.st : null; };
function m3(c: Ctx, k: number, g: (j: number) => number | null) {
  const xs = [k - 1, k, k + 1].filter((j) => c.s.frames[j]).map(g).filter((x): x is number => x != null);
  return xs.length >= 2 ? median(xs) : null;
}
function lockMed(c: Ctx, g: (j: number) => number | null) {
  const xs: number[] = []; for (let j = c.lock.start_k!; j <= c.lock.end_k!; j++) { const x = g(j); if (x != null) xs.push(x); }
  return xs.length ? median(xs) : null;
}
function q(xs: number[], p: number) { const t = [...xs].sort((a, b) => a - b); return t[Math.min(t.length - 1, Math.max(0, Math.round(p * (t.length - 1))))]; }
/** p90 − p10 — robust spread, never max − min. */
export function robustSpread(xs: number[]) { return xs.length >= 3 ? q(xs, 0.9) - q(xs, 0.1) : null; }
/** Interior angle at b (degrees), 2-D. */
export function angleDeg(a: Pt | null, b: Pt | null, cc: Pt | null) {
  if (!a || !b || !cc) return null;
  const u = { x: a.x - b.x, y: a.y - b.y }, w = { x: cc.x - b.x, y: cc.y - b.y };
  const nu = Math.hypot(u.x, u.y), nw = Math.hypot(w.x, w.y); if (!(nu > 0 && nw > 0)) return null;
  return (Math.acos(Math.max(-1, Math.min(1, (u.x * w.x + u.y * w.y) / (nu * nw)))) * 180) / Math.PI;
}
export function shoulderTiltDeg(c: { s: LandmarkSeries; lock: StanceLock }, l: Pt | null, r: Pt | null) {
  if (!l || !r) return null;
  const a = unroll(l, c.lock.baseline!.roll_deg), b = unroll(r, c.lock.baseline!.roll_deg);
  const dx = Math.abs(b.x - a.x), dy = b.y - a.y;
  // side-on the shoulder line is short in x: tilt is measured as vertical gap over the stance shoulder width, not atan of an ill-conditioned dx.
  const w = c.lock.baseline!.shoulder_len_px;
  if (!w) return null;
  void dx;
  return (Math.asin(Math.max(-1, Math.min(1, dy / w))) * 180) / Math.PI;
}

/* ================= 6 heel_plant — first touch → full plant ================= */
function heelPlant(c: Ctx, plantK: number, liftFrame: number | null): CardTileResult {
  const K: CardKey = "heel_plant", u = "percent_stature";
  const h = (j: number) => { const he = Up(c, P(c, j, c.frontHeel)), to = Up(c, P(c, j, c.frontToe)); return he == null || to == null ? null : he - to; };
  const atPlant = m3(c, plantK, h);
  if (atPlant == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "front_heel_or_toe_untrusted_at_plant" });
  // First touch: first frame after peak lift where the front toe is within the floor of its plant height.
  const toePlant = m3(c, plantK, (j) => Up(c, P(c, j, c.frontToe)));
  const kLift = kOf(c.s, liftFrame);
  let firstK: number | null = null;
  if (toePlant != null && kLift >= 0) for (let j = kLift; j <= plantK; j++) { const t = m3(c, j, (x) => Up(c, P(c, x, c.frontToe))); if (t != null && t - toePlant <= CARD_FLOORS.heel_minus_toe_pct) { firstK = j; break; } }
  const touchMs = firstK == null ? { value: null, reason: kLift < 0 ? "no_peak_lift_anchor" : "toe_never_reached_plant_height" } : { value: round4(((plantK - firstK) * 1000) / c.fps), uncertainty_ms: round4(1000 / c.fps), first_touch_frame: c.s.frames[firstK].frame_index };
  if (Math.abs(atPlant) < CARD_FLOORS.heel_minus_toe_pct) return ok(K, u, 0, CARD_FLOORS.heel_minus_toe_pct, null, { plant_frame: c.s.frames[plantK].frame_index, heel_level_with_toe_within_noise: true, raw: round4(atPlant), first_touch_to_full_plant_ms_ungraded: touchMs, sign: "heel minus toe height at full plant; + = heel above toe" });
  return ok(K, u, atPlant, CARD_FLOORS.heel_minus_toe_pct, null, { plant_frame: c.s.frames[plantK].frame_index, first_touch_to_full_plant_ms_ungraded: touchMs, sign: "heel minus toe height at full plant; + = heel above toe" });
}

/* ================= 9 sequencing — hips → torso → lead shoulder → lead arm ================= */
function sequencing(c: Ctx, ssK: number, pkK: number): CardTileResult {
  const K: CardKey = "sequencing", u = "boolean";
  const chans: [string, (j: number) => Pt | null][] = [
    ["hips", (j) => mid(P(c, j, LM.L_HIP), P(c, j, LM.R_HIP))],
    ["torso", (j) => mid(P(c, j, LM.L_SHOULDER), P(c, j, LM.R_SHOULDER))],
    ["lead_shoulder", (j) => P(c, j, c.lead.sh)],
    ["lead_arm", (j) => P(c, j, c.lead.el)],
  ];
  // Window: swing start → swing peak, +1 frame each side for the centred derivative.
  const k0 = Math.max(1, ssK - 1), k1 = Math.min(c.s.frames.length - 2, pkK + 1);
  const peaks: Record<string, number | null> = {};
  for (const [name, g] of chans) {
    const x = smooth(c.s.frames.map((_, j) => Fw(c, g(j))), 1); // zero-phase centred
    let best = -1, bv = -Infinity;
    for (let j = k0; j <= k1; j++) { const a = x[j - 1], b = x[j + 1]; if (a == null || b == null) continue; const vel = ((b - a) * c.fps) / 2; if (vel > bv) { bv = vel; best = j; } }
    peaks[name] = best < 0 ? null : c.s.frames[best].frame_index;
  }
  const order = chans.map(([n]) => peaks[n]);
  if (order.some((x) => x == null)) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "segment_untrusted_through_window", peak_frames: peaks });
  // A later segment peaking earlier by more than the ±1-frame anchor uncertainty is out of order.
  const out: string[] = [];
  for (let i = 1; i < order.length; i++) if (order[i]! < order[i - 1]! - 1) out.push(`${chans[i][0]}_before_${chans[i - 1][0]}`);
  const lin = { swing_start_frame: c.s.frames[ssK].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, peak_forward_speed_frames: peaks, frame_uncertainty: 1, out_of_order: out, rule: "a segment peaking earlier than the one before it by more than 1 frame is out of order; ties within 1 frame cannot be ordered at this frame rate and count as in order" };
  return ok(K, u, out.length === 0 ? 1 : 0, null, out.length === 0 ? "pass" : "fail", lin);
}

/* ================= 10 back-elbow connection ================= */
function backElbow(c: Ctx, ssK: number, pkK: number): CardTileResult {
  const K: CardKey = "back_elbow_connection", u = "degrees";
  const slot = m3(c, pkK, (j) => angleDeg(P(c, j, c.rear.sh), P(c, j, c.rear.el), P(c, j, c.rear.wr)));
  const rise = m3(c, ssK, (j) => { const e = Up(c, P(c, j, c.rear.el)), s = Up(c, P(c, j, c.rear.sh)); return e == null || s == null ? null : e - s; });
  const gapAt = (j: number) => { const e = Fw(c, P(c, j, c.rear.el)), h = Fw(c, P(c, j, c.rear.hip)); return e == null || h == null ? null : e - h; };
  if (slot == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "back_arm_untrusted_at_swing_peak" });
  return ok(K, u, slot, CARD_FLOORS.elbow_angle_deg, null, {
    swing_start_frame: c.s.frames[ssK].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index,
    slot_angle_deg_at_swing_peak: round4(slot),
    elbow_above_shoulder_at_swing_start_pct: rise == null ? null : round4(rise),
    elbow_ahead_of_rear_hip_pct: { at_swing_start: (() => { const g = m3(c, ssK, gapAt); return g == null ? null : round4(g); })(), at_swing_peak: (() => { const g = m3(c, pkK, gapAt); return g == null ? null : round4(g); })() },
    channels_removed: "barrel-to-ball direction moved to DelayCam spec",
  });
}

/* ================= 11 shoulder plane steadiness ================= */
function shoulderPlane(c: Ctx, ssK: number, pkK: number): CardTileResult {
  const K: CardKey = "shoulder_plane_steadiness", u = "degrees";
  const xs: number[] = [];
  for (let j = ssK; j <= pkK; j++) { const t = shoulderTiltDeg(c, P(c, j, LM.L_SHOULDER), P(c, j, LM.R_SHOULDER)); if (t != null) xs.push(t); }
  const sp = robustSpread(xs);
  if (sp == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "shoulders_untrusted_through_window", samples: xs.length });
  return ok(K, u, sp, CARD_FLOORS.shoulder_tilt_spread_deg, null, { swing_start_frame: c.s.frames[ssK].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, samples: xs.length, statistic: "p90 − p10 of shoulder tilt (vertical gap over stance shoulder length)", below_floor: sp < CARD_FLOORS.shoulder_tilt_spread_deg });
}

/* ================= 12 finish balance ================= */
function stanceFrac(c: Ctx, j: number, p: Pt | null) {
  const fa = P(c, j, c.side === "R" ? LM.L_ANKLE : LM.R_ANKLE), ra = P(c, j, c.rear.ankle);
  if (!p || !fa || !ra) return null;
  const x = (z: Pt) => unroll(z, c.lock.baseline!.roll_deg).x;
  const w = x(fa) - x(ra); if ((Math.abs(w) * 100) / c.st < 10) return null;
  return (x(p) - x(ra)) / w;
}
function finishBalance(c: Ctx, pkK: number, finK: number): CardTileResult {
  const K: CardKey = "finish_balance", u = "stance_fraction";
  const hold = Math.max(3, Math.round(c.fps * 0.25));
  const fr: number[] = [], sway: number[] = [];
  for (let j = finK; j < Math.min(c.s.frames.length, finK + hold); j++) {
    const com = centreOfMassPx(c.s, c.s.frames[j]);
    const f = c.v && com && !c.v.trustedAll(j, [LM.L_ANKLE, LM.R_ANKLE, LM.L_HIP, LM.R_HIP]) ? null : stanceFrac(c, j, com);
    if (f != null) fr.push(f);
    const x = Fw(c, com); if (x != null) sway.push(x);
  }
  if (fr.length < 2) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "com_or_ankles_untrusted_at_finish", finish_frame: c.s.frames[finK].frame_index });
  const f = median(fr)!, sw = robustSpread(sway);
  return ok(K, u, f, null, null, { swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, finish_frame: c.s.frames[finK].frame_index, com_stance_frac_at_finish: round4(f), inside_base: f >= 0 && f <= 1, com_sway_pct_ungraded: sw == null ? null : sw < CARD_FLOORS.finish_com_sway_pct ? { value: null, reason: "below_still_clip_noise_floor", raw: round4(sw) } : round4(sw), sign: "0 = over back ankle, 1 = over front ankle; position-based estimate" });
}

/* ================= 13 shoulder-to-shoulder hold — four outputs ================= */
function shoulderToShoulder(c: Ctx, plantK: number, pkK: number): CardTileResult {
  const K: CardKey = "shoulder_to_shoulder_hold", u = "percent_of_window";
  const sp = (j: number) => { const h = Fw(c, handPointPx(c.s, j, c.v).p), s = Fw(c, P(c, j, c.rear.sh)); return h == null || s == null ? null : h - s; };
  const s0 = m3(c, plantK, sp);
  if (s0 == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "hands_or_back_shoulder_untrusted_at_plant" });
  const n = pkK - plantK;
  if (n < 1) return refuse(K, u, mr(R.ANCHOR_NOT_DETECTED), { reason: "swing_peak_not_after_plant" });
  // Held while the spacing has not closed (hands moved forward relative to the back shoulder) beyond the floor.
  let held = 0, broke: number | null = null, unobs = 0;
  for (let j = plantK + 1; j <= pkK; j++) {
    const x = m3(c, j, sp);
    if (x == null) { unobs++; continue; }
    if (x - s0 > CARD_FLOORS.spacing_pct) { broke = j; break; }
    held = j - plantK;
  }
  if (unobs > n / 2) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "spacing_unobserved_for_most_of_window", unobserved_frames: unobs, window_frames: n });
  const pct = broke == null ? 100 : (held / n) * 100;
  const leak = fuseShoulderOpen(c.s, c.lock, plantK, c.dir, c.side);
  const leakBool = leak.verdict === "fail" ? true : leak.verdict === "pass" ? false : null;
  const lin = {
    plant_frame: c.s.frames[plantK].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index,
    outputs: {
      spacing_held_pct_of_window: round4(pct),
      hold_ended_frame: broke == null ? null : c.s.frames[broke].frame_index,
      front_shoulder_leak_before_swing_peak: leakBool, front_shoulder_leak_reason: leak.reason,
      verdict_basis: "owner standard: held ≥50% of plant → swing peak = pass, ≥95% = elite; front-shoulder leak = auto-fail",
    },
    spacing_at_plant_pct: round4(s0), frame_uncertainty_pct: round4(100 / n), unobserved_frames: unobs,
  };
  if (leakBool === true) return ok(K, u, pct, round4(100 / n), "fail", { ...lin, auto_fail: "front shoulder opened by landing — nullifies the hold" });
  return ok(K, u, pct, round4(100 / n), pct >= 95 ? "elite" : pct >= 50 ? "pass" : "fail", lin);
}

/* ================= 16 back knee flex maintained — stance → plant ================= */
function backKnee(c: Ctx, plantK: number): CardTileResult {
  const K: CardKey = "back_knee_flex_maintained", u = "degrees";
  const ang = (j: number) => angleDeg(P(c, j, c.rear.hip), P(c, j, c.rear.knee), P(c, j, c.rear.ankle));
  const b = lockMed(c, ang), a = m3(c, plantK, ang);
  if (b == null || a == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "back_leg_untrusted_in_stance_or_at_plant" });
  const d = a - b;
  return ok(K, u, d, CARD_FLOORS.knee_angle_deg, null, { plant_frame: c.s.frames[plantK].frame_index, stance_knee_deg: round4(b), plant_knee_deg: round4(a), below_floor: Math.abs(d) < CARD_FLOORS.knee_angle_deg, sign: "+ = back knee straightened (lost flex)" });
}

/* ================= 17 post-landing hip drift — plant → P4 ================= */
function hipDrift(c: Ctx, plantK: number, p4K: number): CardTileResult {
  const K: CardKey = "post_landing_hip_drift", u = "percent_stature";
  const g = (j: number) => Fw(c, mid(P(c, j, LM.L_HIP), P(c, j, LM.R_HIP)));
  const a = m3(c, plantK, g), b = m3(c, p4K, g);
  if (a == null || b == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "pelvis_untrusted_at_plant_or_p4" });
  const d = b - a;
  return ok(K, u, d, CARD_FLOORS.hip_fwd_pct, null, { plant_frame: c.s.frames[plantK].frame_index, p4_frame: c.s.frames[p4K].frame_index, below_floor: Math.abs(d) < CARD_FLOORS.hip_fwd_pct, root_pattern_key: "back_leg_did_not_hold_load", sign: "+ = pelvis still moving toward the pitcher after landing" });
}

/* ================= 18 hands stay up at plant ================= */
function handsUp(c: Ctx, plantK: number): CardTileResult {
  const K: CardKey = "hands_stay_up_at_plant", u = "percent_stature";
  const g = (j: number) => Up(c, handPointPx(c.s, j, c.v).p);
  const apex = detectLoadApex(c.s, c.dir), kA = kOf(c.s, apex.frame_index);
  if (kA < 0) return refuse(K, u, apex.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: "load_apex_missing" });
  const b = m3(c, kA, g), a = m3(c, plantK, g);
  if (a == null || b == null) return refuse(K, u, mr(R.HANDS_NOT_DETECTED), { reason: "no_rigid_valid_wrist_at_apex_or_plant" });
  const d = b - a;
  return ok(K, u, d, CARD_FLOORS.hand_height_pct, null, { reference: "hands at the load apex (hands set on the handle)", apex_frame: apex.frame_index, plant_frame: c.s.frames[plantK].frame_index, below_floor: Math.abs(d) < CARD_FLOORS.hand_height_pct, sign: "+ = hands dropped between load and plant" });
}

/* ================= 19 lead elbow bend increasing ================= */
function leadElbow(c: Ctx, ssK: number, pkK: number): CardTileResult {
  const K: CardKey = "lead_elbow_bend_increasing", u = "degrees";
  const ang = (j: number) => angleDeg(P(c, j, c.lead.sh), P(c, j, c.lead.el), P(c, j, c.lead.wr));
  const a = m3(c, ssK, ang), b = m3(c, pkK, ang);
  if (a == null || b == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "lead_arm_untrusted_at_swing_start_or_peak" });
  const d = a - b;
  return ok(K, u, d, CARD_FLOORS.elbow_angle_deg, null, { swing_start_frame: c.s.frames[ssK].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, elbow_deg_start: round4(a), elbow_deg_peak: round4(b), below_floor: Math.abs(d) < CARD_FLOORS.elbow_angle_deg, sign: "+ = lead elbow bent MORE by swing peak", caveat: "2-D elbow angle; forearm foreshortening toward the camera changes it" });
}

/* ================= 20 head vertical movement post landing ================= */
function headVertical(c: Ctx, plantK: number, pkK: number): CardTileResult {
  const K: CardKey = "head_vertical_movement_post_landing", u = "percent_stature";
  const xs: number[] = [];
  for (let j = plantK; j <= pkK; j++) { if (c.v && !c.v.trustedAll(j, [0, 2, 5, 7, 8])) continue; const h = Up(c, headCentroidPx(c.s, c.s.frames[j])); if (h != null) xs.push(h); }
  const sp = robustSpread(xs);
  if (sp == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "head_untrusted_through_window", samples: xs.length });
  return ok(K, u, sp, CARD_FLOORS.head_vertical_spread_pct, null, { plant_frame: c.s.frames[plantK].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, samples: xs.length, statistic: "p90 − p10 of head-centroid height", below_floor: sp < CARD_FLOORS.head_vertical_spread_pct });
}

/* ================= 21 pelvis rotation efficiency ================= */
function pelvisRotation(c: Ctx, plantK: number, pkK: number): CardTileResult {
  const K: CardKey = "pelvis_rotation_efficiency", u = "degrees";
  const L = c.lock.baseline?.hip_len_px;
  if (!L) return refuse(K, u, mr(R.CALIBRATION_UNAVAILABLE), { reason: "no_stance_hip_length" });
  const th = (j: number) => { const a = P(c, j, LM.L_HIP), b = P(c, j, LM.R_HIP); if (!a || !b) return null; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > L * 1.03) return null; return (Math.acos(Math.min(1, d / L)) * 180) / Math.PI; };
  const a = m3(c, plantK, th), b = m3(c, pkK, th);
  if (a == null || b == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "hips_untrusted_or_over_length_at_plant_or_peak" });
  const d = b - a;
  return ok(K, u, Math.abs(d), CARD_FLOORS.pelvis_rot_deg, null, { plant_frame: c.s.frames[plantK].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, theta_plant_deg: round4(a), theta_peak_deg: round4(b), below_floor: Math.abs(d) < CARD_FLOORS.pelvis_rot_deg, method: "rigid hip-length solve, unsigned (sign unresolvable at θ≈0); ill-conditioned near closed — floor 9°", sign: "absolute change in out-of-plane pelvis angle" });
}

/* ================= runner ================= */
export function runHittingCardTiles(series: LandmarkSeries, o: { side: Handedness | null }) {
  const units: Record<Exclude<CardKey, "hitters_move">, string> = { heel_plant: "percent_stature", sequencing: "boolean", back_elbow_connection: "degrees", shoulder_plane_steadiness: "degrees", finish_balance: "stance_fraction", shoulder_to_shoulder_hold: "percent_of_window", back_knee_flex_maintained: "degrees", post_landing_hip_drift: "percent_stature", hands_stay_up_at_plant: "percent_stature", lead_elbow_bend_increasing: "degrees", head_vertical_movement_post_landing: "percent_stature", pelvis_rotation_efficiency: "degrees" };
  const allRefuse = (rec: MissingnessRecord, l: Record<string, unknown>) => Object.fromEntries(Object.entries(units).map(([k, u]) => [k, refuse(k as CardKey, u, rec, l)])) as Record<keyof typeof units, CardTileResult>;
  const cam = detectCameraView(series);
  const gate = (r: CardTileResult) => { const g = checkCameraRequirement(r.key, cam.view); if (g.ok) return g.detail ? { ...r, lineage: { ...r.lineage, camera_view: g.detail } } : r; return refuse(r.key, r.unit, mr(R.CALIBRATION_UNAVAILABLE), { reason: g.detail, message: g.message }); };
  const done = (t: Record<keyof typeof units, CardTileResult>) => {
    const g = Object.fromEntries(Object.entries(t).map(([k, r]) => [k, gate(r)])) as Record<keyof typeof units, CardTileResult>;
    return { version: HITTING_CARD_TILES_VERSION, ...g, hitters_move: hittersMove(series, o, g) };
  };
  if (!o.side) return done(allRefuse(mr(R.ANCHOR_NOT_DETECTED), { reason: "batting_side_unknown" }));
  const dir = deriveDirectionSign(series, o.side);
  if (dir == null) return done(allRefuse(mr(R.ANCHOR_NOT_DETECTED), { reason: "direction_sign_underivable" }));
  const lock = detectStanceLock(series);
  if (!lock.ok || !lock.baseline?.stature_px) return done(allRefuse(lock.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: lock.detail ?? "stance_lock_missing" }));
  const side = o.side, R_ = side === "R";
  const c: Ctx = {
    s: series, side, dir, lock, v: buildSegmentValidity(series, lock), st: lock.baseline.stature_px, fps: series.header.fps_true ?? 30,
    lead: R_ ? { sh: LM.L_SHOULDER, el: LM.L_ELBOW, wr: LM.L_WRIST } : { sh: LM.R_SHOULDER, el: LM.R_ELBOW, wr: LM.R_WRIST },
    rear: R_ ? { sh: LM.R_SHOULDER, el: LM.R_ELBOW, wr: LM.R_WRIST, hip: LM.R_HIP, knee: LM.R_KNEE, ankle: LM.R_ANKLE } : { sh: LM.L_SHOULDER, el: LM.L_ELBOW, wr: LM.L_WRIST, hip: LM.L_HIP, knee: LM.L_KNEE, ankle: LM.L_ANKLE },
    frontHeel: R_ ? 29 : 30, frontToe: R_ ? 31 : 32,
  };
  const { lift, plant } = frontFootPlantFromSeries(series, side);
  const plantK = kOf(series, plant.frame_index);
  const ss = detectSwingStart(series, dir), ssK = kOf(series, ss.frame_index);
  const pk = ss.frame_index == null ? null : detectSwingPeak(series, dir, ss), pkK = kOf(series, pk?.frame_index ?? null);
  const fin = detectFinish(series), finK = kOf(series, fin.frame_index);
  const p4 = detectP4(series, dir, plant.frame_index, plant), p4K = kOf(series, p4.frame_index);
  const need = (key: keyof typeof units, parts: [number, string, MissingnessRecord | null | undefined][], f: () => CardTileResult) => {
    for (const [k, why, m] of parts) if (k < 0) return refuse(key, units[key], m ?? mr(R.ANCHOR_NOT_DETECTED), { reason: why });
    return f();
  };
  const P_ = [plantK, `plant_missing:${plant.detail ?? ""}`, plant.missingness] as [number, string, MissingnessRecord | null];
  const SS = [ssK, "swing_start_missing", ss.missingness] as [number, string, MissingnessRecord | null];
  const PK = [pkK, `swing_peak_missing:${String(pk?.diagnostics.reason ?? "no_swing_start")}`, pk?.missingness] as [number, string, MissingnessRecord | null | undefined];
  const FIN = [finK, `finish_missing:${String(fin.diagnostics.reason ?? "")}`, fin.missingness] as [number, string, MissingnessRecord | null];
  const P4 = [p4K, `p4_missing:${String(p4.diagnostics.reason ?? "")}`, p4.missingness] as [number, string, MissingnessRecord | null];
  return done({
    heel_plant: need("heel_plant", [P_], () => heelPlant(c, plantK, lift.frame_index)),
    sequencing: need("sequencing", [SS, PK], () => sequencing(c, ssK, pkK)),
    back_elbow_connection: need("back_elbow_connection", [SS, PK], () => backElbow(c, ssK, pkK)),
    shoulder_plane_steadiness: need("shoulder_plane_steadiness", [SS, PK], () => shoulderPlane(c, ssK, pkK)),
    finish_balance: need("finish_balance", [PK, FIN], () => (finK <= pkK ? refuse("finish_balance", units.finish_balance, mr(R.ANCHOR_NOT_DETECTED), { reason: "finish_not_after_swing_peak" }) : finishBalance(c, pkK, finK))),
    shoulder_to_shoulder_hold: need("shoulder_to_shoulder_hold", [P_, SS, PK], () => shoulderToShoulder(c, plantK, pkK)),
    back_knee_flex_maintained: need("back_knee_flex_maintained", [P_], () => backKnee(c, plantK)),
    post_landing_hip_drift: need("post_landing_hip_drift", [P_, P4], () => hipDrift(c, plantK, p4K)),
    hands_stay_up_at_plant: need("hands_stay_up_at_plant", [P_], () => handsUp(c, plantK)),
    lead_elbow_bend_increasing: need("lead_elbow_bend_increasing", [SS, PK], () => leadElbow(c, ssK, pkK)),
    head_vertical_movement_post_landing: need("head_vertical_movement_post_landing", [P_, PK], () => (pkK <= plantK ? refuse("head_vertical_movement_post_landing", units.head_vertical_movement_post_landing, mr(R.ANCHOR_NOT_DETECTED), { reason: "swing_peak_not_after_plant" }) : headVertical(c, plantK, pkK))),
    pelvis_rotation_efficiency: need("pelvis_rotation_efficiency", [P_, PK], () => (pkK <= plantK ? refuse("pelvis_rotation_efficiency", units.pelvis_rotation_efficiency, mr(R.ANCHOR_NOT_DETECTED), { reason: "swing_peak_not_after_plant" }) : pelvisRotation(c, plantK, pkK))),
  });
}

/* ================= 22 hitter's move — aggregate, built last ================= */
/**
 * Constituents (owner): hip load, hand load, stride direction, heel plant,
 * sequencing, back-elbow connection. Only a GRADED verdict counts. If any
 * constituent is missing or ungraded, the aggregate is missing and names them —
 * never a partial score. Stride direction needs two camera views, so from one
 * upload camera the aggregate cannot complete; stated plainly.
 */
function hittersMove(series: LandmarkSeries, o: { side: Handedness | null }, t: Record<string, CardTileResult>): CardTileResult {
  const p = runHittingPoseTiles(series, o);
  const cons: Record<string, { verdict: string | null; value: number | null }> = {
    hip_load: p.hip_load, hand_load: p.hand_load, stride_direction: p.stride_direction,
    heel_plant: t.heel_plant, sequencing: t.sequencing, back_elbow_connection: t.back_elbow_connection,
  };
  const status = Object.fromEntries(Object.entries(cons).map(([k, r]) => [k, r.value == null ? "missing" : r.verdict == null ? "ungraded" : r.verdict]));
  const blocking = Object.entries(status).filter(([, s]) => s === "missing" || s === "ungraded").map(([k, s]) => `${k}:${s}`);
  if (blocking.length) return refuse("hitters_move", "boolean", mr(R.ANCHOR_NOT_DETECTED), { reason: "constituents_not_all_graded", blocking, constituents: status, note: "stride_direction needs two camera views and cannot be measured from one upload camera" });
  const fails = Object.entries(status).filter(([, s]) => s === "fail").map(([k]) => k);
  return ok("hitters_move", "boolean", fails.length ? 0 : 1, null, fails.length ? "fail" : "pass", { constituents: status, failed: fails });
}
