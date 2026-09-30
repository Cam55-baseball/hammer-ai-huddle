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
 *  - An ungraded value inside its floor is still reported, flagged
 *    below_floor: true ("no change the camera can detect") — for a
 *    "maintained/held" tile that is the informative answer, not missingness.
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

export const HITTING_CARD_TILES_VERSION = "hitting_card_tiles@2.1.0-back-heel-2026-09-29";

/* ---------- floors: still clip 15d75bc9, measured by scripts before any threshold ---------- */
export const CARD_FLOORS = {
  heel_minus_toe_pct: 1.5,        // still max 1.415 (worst side R; p99 1.03)
  back_heel_rise_pct: 1.2,        // still max positive heel-to-toe change from first 25 frames: R 1.0499%, L 0.5964%
  shoulder_tilt_spread_deg: 1.7,  // still worst 0.7 s window p90−p10 1.647
  finish_com_sway_pct: 0.5,       // still worst 0.25 s window p90−p10 of pelvis-mid forward 0.438
  knee_angle_deg: 4.9,            // still max |med3 − median| 4.816 (worst side L)
  hip_fwd_pct: 1.0,               // still pelvis-mid forward max 0.984
  hand_height_pct: 3.2,           // still single-wrist height max 3.127 (hand point may be one wrist)
  elbow_angle_deg: 3.0,           // still max 2.878 on the well-conditioned arm; arms <6% stature are refused (L forearm 4.4% gave 17.9)
  head_vertical_spread_pct: 1.2,  // still worst 0.7 s window p90−p10 1.143
  pelvis_rot_deg: 12.0,           // still hip rigid-solve θ max 11.9 — ill-conditioned near closed
  spacing_pct: 2.3,               // hand point minus rear shoulder: HANDS_OUTSIDE floor
} as const;

/**
 * Owner doctrine 2026-09-28 replaced most thresholds with a rule (docs/HITTING-PHILOSOPHY.md §11).
 * Resolved and NOT outstanding: hand_load depth (ungraded by the fascial-variation ruling),
 * head_discipline (com_at_p2 line), hip_load (back-leg position method, no maximum), heel_plant,
 * back elbow (hands-back/elbow-forward relationship), shoulder plane (score, not pass/fail),
 * back knee, hip drift, hands at heel landing, head after landing, lead elbow (athlete's own P2).
 */
export const CARD_TILE_OWNER_NUMBERS_NEEDED = [
  "finish_balance: how far off the base (stance fraction) and how much sway is still 'balanced'",
  "pelvis_square_to_fair: how close to square counts as square (owner has no angle; measured only)",
  "back_elbow_connection: elbow path direction toward square-to-fair — owner has no angle; measured only, and side-on cannot see it",
] as const;

/** Coaching text in the owner's reasoning — athletes see WHY, not just a verdict. */
export const CARD_COACHING: Record<string, string> = {
  heel_plant: "Your front heel wasn't down when you landed. Getting it on the floor gives you a stable base, sets the side bend that clears a path for your back arm to the ball, and helps keep your eyes steady.",
   back_heel_early_rise: "Your back heel came off the ground before your swing started. It should stay planted until the swing releases — when it lifts early, your back leg has already given up the weight.",
  back_elbow_connection: "The back elbow (bicep) releases the swing out of the P3 stretch. The elbow gains ground forward while the hands stay back with the shoulder — that is what gives a linear move its rotation. The goal is an elbow that gets the bat square to fair territory.",
  shoulder_plane_steadiness: "Higher is better. Holding your shoulder plane from the start of P4 shows you were not fooled. This is not pass/fail — you can have a poor shoulder plane and still hit the ball well.",
  back_knee_flex_maintained: "From the end of P2 to landing, your back knee should not straighten. It is part of your back leg holding the weight.",
  post_landing_hip_drift: "After landing your hips should turn, not slide. Any forward drift after landing causes problems, and hips that neither drift nor turn have still missed the point.",
  hands_stay_up_at_plant: "Your hands can dip during P2 as long as they climb back above your back elbow by heel landing. Hands above the elbow at landing start P4; P4 then drops them to get behind the ball on plane. Hands low at landing go with lost power and a front shoulder that turns early.",
  head_vertical_movement_post_landing: "Your head can sink after landing. Your head coming up before the ball is off the bat is too much.",
  lead_elbow_bend_increasing: "Your lead elbow should not bend more than it was at the end of P2. Full extension is ideal, but your own P2 position is the honest measure of what your arm can do.",
  pelvis_rotation_efficiency: "Because you stride to the pitcher, not the ball, your pelvis should be able to get square to fair (the front of home plate) by the end of P4, before you run.",
  sequencing: "Your swing is a chain you load, then release. In P3 your glute drives forward, but a proper P1 and P2 load keeps your body from travelling, so that drive turns into more coil instead. The coil keeps building until your back elbow moves forward. The elbow turns your back knee and makes the triangles. The knee starts your hips turning. The hips catapult your shoulders out of the square position they held for separation, and the shoulders drive the barrel through the ball. Your hips turning early, or your shoulders firing before your hips, spends the load before the elbow can release it.",
  shoulder_to_shoulder_hold: "Keep your chin and front shoulder tucked together until the swing goes. The tuck makes the move easier on your body and keeps both eyes on the ball. A front shoulder that pulls away from your chin before the swing is a leak: it opens you early and costs you the look at the pitch.",
};

export type CardKey =
  | "heel_plant" | "back_heel_early_rise" | "sequencing" | "back_elbow_connection" | "shoulder_plane_steadiness" | "finish_balance"
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
  ({ key, value: round4(value), unit, uncertainty: unc, verdict, missingness: null, confidence: uncalibrated(), lineage: verdict == null ? { graded: false, why_ungraded: "owner number not supplied", ...lineage } : lineage });

/* ---------- context ---------- */
interface Ctx {
  s: LandmarkSeries; side: Handedness; dir: 1 | -1; lock: StanceLock; v: SegmentValidity | null; st: number; fps: number;
  lead: { sh: number; el: number; wr: number }; rear: { sh: number; el: number; wr: number; hip: number; knee: number; ankle: number };
  frontHeel: number; frontToe: number; backHeel: number; backToe: number;
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
export function angleDeg(a: Pt | null, b: Pt | null, cc: Pt | null, minLenPx = 0) {
  if (!a || !b || !cc) return null;
  // A limb pointing at the camera (either segment < minLen) makes the 2-D angle ill-conditioned: refuse, never guess.
  if (Math.hypot(a.x - b.x, a.y - b.y) < minLenPx || Math.hypot(cc.x - b.x, cc.y - b.y) < minLenPx) return null;
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

/* ================= 6 heel_plant — BINARY, heel must touch (owner 2026-09-28) ================= */
function heelPlant(c: Ctx, plantK: number, liftFrame: number | null): CardTileResult {
  const K: CardKey = "heel_plant", u = "percent_stature";
  const h = (j: number) => { const he = Up(c, P(c, j, c.frontHeel)), to = Up(c, P(c, j, c.frontToe)); return he == null || to == null ? null : he - to; };
  // D-PLANT marks initial front-foot strike (the toe can land first). Follow
  // that SAME front foot until its heel settles; never inspect the back heel.
  const end = Math.min(c.s.frames.length - 2, plantK + Math.ceil(c.fps * 0.5));
  const observed = Array.from({ length: end - plantK + 1 }, (_, i) => plantK + i)
    .map((k) => ({ k, height: m3(c, k, h) }))
    .filter((x): x is { k: number; height: number } => x.height != null);
  if (!observed.length) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "front_heel_or_toe_untrusted_after_strike" });
  const contact = observed.find((x) => x.height <= CARD_FLOORS.heel_minus_toe_pct);
  const best = contact ?? observed.reduce((a, b) => b.height < a.height ? b : a);
  void liftFrame;
  const touching = !!contact;
  return ok(K, u, best.height, CARD_FLOORS.heel_minus_toe_pct, touching ? "pass" : "fail", {
    first_strike_frame: c.s.frames[plantK].frame_index, front_heel_settle_frame: c.s.frames[best.k].frame_index,
     front_foot: c.side === "L" ? "right" : "left", heel_touching: touching,
     rule: "front heel settles after front-foot strike; back heel is separately graded until P4; still-clip noise floor only",
    sign: "front heel minus front toe height; + = heel above toe", coaching: CARD_COACHING.heel_plant,
  });
}

/* Back heel stays planted through P3; relative to the back toe so camera motion cannot look like lift. */
function backHeelEarlyRise(c: Ctx, p4K: number): CardTileResult {
  const K: CardKey = "back_heel_early_rise", u = "percent_stature";
  const h = (j: number) => { const he = Up(c, P(c, j, c.backHeel)), to = Up(c, P(c, j, c.backToe)); return he == null || to == null ? null : he - to; };
   const base = lockMed(c, h);
   if (base == null || p4K <= c.lock.end_k) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "back_heel_stance_or_p4_unavailable" });
  const observations: { k: number; rise: number }[] = [];
   for (let j = c.lock.end_k + 1; j < p4K; j++) {
    const v = m3(c, j, h);
    if (v != null) observations.push({ k: j, rise: v - base });
  }
   if (observations.length < 2 || observations.length < (p4K - c.lock.end_k - 1) * 0.6)
    return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "back_heel_untrusted_through_pre_p4_window", observed: observations.length });
  const peak = observations.reduce((a, b) => b.rise > a.rise ? b : a);
  const rise = Math.max(0, peak.rise), fail = rise > CARD_FLOORS.back_heel_rise_pct;
  return ok(K, u, rise, CARD_FLOORS.back_heel_rise_pct, fail ? "fail" : "pass", {
    back_foot: c.side === "L" ? "left" : "right", stance_baseline_heel_minus_toe_pct: round4(base),
    peak_pre_p4_frame: c.s.frames[peak.k].frame_index, p4_start_frame_excluded: c.s.frames[p4K].frame_index,
    rule: "back heel-to-toe rise above measured still-clip floor before P4 is a fault; P4 itself is excluded",
    root_pattern_key: fail ? "back_leg_did_not_hold_load" : null, coaching: CARD_COACHING.back_heel_early_rise,
  });
}

/* ================= 9 sequencing — OWNER'S CHAIN (2026-09-30) =================
 * "…until the back bicep/elbow moves forward which turns the back knee … which
 *  begins the hip rotation which catapults shoulders (Rotationally) from their
 *  square position … which drives the barrel through the ball."
 * Order checked: back elbow → back knee → pelvis → shoulders. The barrel link
 * is bat tracking and belongs to DelayCam. Forward travel is the BUFFER that
 * loads the chain, not a link in it — no linear term enters (owner 2026-09-30).
 * Every segment is timed by its PEAK ANGULAR SPEED:
 *   back_elbow — back upper arm (shoulder → elbow) turning in the image plane
 *   back_knee  — back thigh (hip → knee) turning in the image plane (the knee turn that makes the triangles)
 *   pelvis     — hip line turning out of the image plane (rigid length: acos(width ÷ stance width))
 *   shoulders  — shoulder line turning out of the image plane (same solve)
 * Rigid solves are unsigned, so speed is |dθ/dt|. */
export const SEQUENCING_CHAIN = ["back_elbow", "back_knee", "pelvis", "shoulders"] as const;
function sequencing(c: Ctx, ssK: number, pkK: number): CardTileResult {
  const K: CardKey = "sequencing", u = "boolean", n = c.s.frames.length;
  const dist = (j: number, a: number, b: number) => { const p = P(c, j, a), q = P(c, j, b); return p && q ? Math.hypot(p.x - q.x, p.y - q.y) : null; };
  const plantEnd = Math.min(n - 1, pkK);
  const stanceWidth = (a: number, b: number) => { let w = 0; for (let j = c.lock.start_k!; j <= plantEnd; j++) { const x = m3(c, j, (i) => dist(i, a, b)); if (x != null && x > w) w = x; } return w > 0 ? w : null; };
  const Lh = stanceWidth(LM.L_HIP, LM.R_HIP), Ls = stanceWidth(LM.L_SHOULDER, LM.R_SHOULDER);
  const rigid = (a: number, b: number, L: number | null) => (j: number) => { if (!L) return null; const d = dist(j, a, b); return d == null ? null : (Math.acos(Math.min(1, d / L)) * 180) / Math.PI; };
  const inPlane = (a: number, b: number) => (j: number) => { const p = P(c, j, a), q = P(c, j, b); return p && q ? (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI : null; };
  const chans: [string, (j: number) => number | null, boolean][] = [
    ["back_elbow", inPlane(c.rear.sh, c.rear.el), true],
    ["back_knee", inPlane(c.rear.hip, c.rear.knee), true],
    ["pelvis", rigid(LM.L_HIP, LM.R_HIP, Lh), false],
    ["shoulders", rigid(LM.L_SHOULDER, LM.R_SHOULDER, Ls), false],
  ];
  // Window: swing start → a little past D-SWING-PEAK (fastest torso turn), so a segment peaking after the shoulders is not cut off.
  const k0 = Math.max(1, ssK - 1), k1 = Math.min(n - 2, pkK + Math.ceil(c.fps * 0.125));
  const peaks: Record<string, { frame: number | null; deg_per_s: number | null; coverage: number }> = {};
  for (const [name, g, wrap] of chans) {
    let raw = c.s.frames.map((_, j) => g(j));
    if (wrap) { let off = 0; raw = raw.map((x, j) => { if (x == null) return null; const prev = raw.slice(0, j).reverse().find((y) => y != null); if (prev != null) { const d = x + off - (prev as number); if (d > 180) off -= 360; else if (d < -180) off += 360; } return x + off; }); }
    const x = smooth(raw, 1);
    let best = -1, bv = -Infinity, seen = 0;
    for (let j = k0; j <= k1; j++) { const a = x[j - 1], b = x[j + 1]; if (a == null || b == null) continue; seen++; const w = Math.abs(((b - a) * c.fps) / 2); if (w > bv) { bv = w; best = j; } }
    peaks[name] = { frame: best < 0 ? null : c.s.frames[best].frame_index, deg_per_s: best < 0 ? null : round4(bv), coverage: round4(seen / (k1 - k0 + 1)) };
  }
  const base = { method: "peak_angular_speed_every_segment", chain: "owner_2026-09-30: back elbow → back knee → pelvis → shoulders → barrel", barrel_link: "DelayCam (bat tracking) — not checked on the upload card", linear_terms: "none", linear_terms_why: "forward travel is the buffer that loads the chain, not a link in it", swing_start_frame: c.s.frames[ssK].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, window_end_frame: c.s.frames[k1].frame_index, stance_width_px: { pelvis: Lh && round4(Lh), shoulders: Ls && round4(Ls) }, per_segment: peaks, frame_uncertainty: 1, coaching: CARD_COACHING.sequencing };
  const thin = chans.filter(([nm]) => peaks[nm].frame == null || peaks[nm].coverage < 0.6).map(([nm]) => nm);
  if (thin.length) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { ...base, reason: `segment_unobserved_for_most_of_window:${thin.join(",")}` });
  const order = chans.map(([nm]) => peaks[nm].frame!);
  const out: string[] = [];
  // Every link is checked against every link before it, so "shoulders before elbow" is caught even if a middle link ties.
  for (let i = 1; i < order.length; i++) for (let h = 0; h < i; h++) if (order[i] < order[h] - 1) out.push(`${chans[i][0]}_before_${chans[h][0]}`);
  return ok(K, u, out.length === 0 ? 1 : 0, null, out.length === 0 ? "pass" : "fail", { ...base, out_of_order: out, rule: "a link reaching its fastest turn more than 1 frame before any earlier link in the owner's chain is out of order; within 1 frame cannot be ordered at this frame rate" });
}

/* ================= 10 back-elbow connection — a PATH, not an angle (owner 2026-09-28) ================= */
function backElbow(c: Ctx, ssK: number, pkK: number): CardTileResult {
  const K: CardKey = "back_elbow_connection", u = "percent_stature";
  // Both relative to the back shoulder, forward axis: elbow should gain ground, hands should stay back.
  const rel = (j: number, i: number | "hand") => { const s = Fw(c, P(c, j, c.rear.sh)); const x = i === "hand" ? Fw(c, handPointPx(c.s, j, c.v).p) : Fw(c, P(c, j, i)); return s == null || x == null ? null : x - s; };
  // Window: swing start (release from the P3 stretch) → the frame the elbow's lead over the hands is largest, capped at swing peak.
  const e0 = m3(c, ssK, (j) => rel(j, c.rear.el)), h0 = m3(c, ssK, (j) => rel(j, "hand"));
  if (e0 == null || h0 == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "back_elbow_or_hands_untrusted_at_swing_start" });
  let best: { k: number; lead: number; eg: number; hg: number } | null = null;
  for (let j = ssK + 1; j <= pkK; j++) { const e = m3(c, j, (x) => rel(x, c.rear.el)), hh = m3(c, j, (x) => rel(x, "hand")); if (e == null || hh == null) continue; const eg = e - e0, hg = hh - h0, lead = eg - hg; if (!best || lead > best.lead) best = { k: j, lead, eg, hg }; }
  if (!best) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "back_elbow_or_hands_untrusted_through_window" });
  const F = CARD_FLOORS.spacing_pct;
  const pass = best.eg > F && best.lead > F;
  // Elbow path direction (square-to-fair): side-on sees only forward vs vertical, never the lateral component toward fair territory.
  const eA = P(c, ssK, c.rear.el), eB = P(c, best.k, c.rear.el);
  const pathDeg = eA && eB ? (() => { const a = U(c, eA)!, b = U(c, eB)!; return round4((Math.atan2(-(b.y - a.y), (b.x - a.x) * c.dir) * 180) / Math.PI); })() : null;
  return ok(K, u, best.lead, F, pass ? "pass" : "fail", {
    swing_start_frame: c.s.frames[ssK].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, measured_at_frame: c.s.frames[best.k].frame_index,
    elbow_gain_vs_back_shoulder_pct: round4(best.eg), hands_gain_vs_back_shoulder_pct: round4(best.hg),
    rule: "owner 2026-09-28: elbow gains ground forward while hands stay back with the shoulder. value = elbow gain − hands gain (% stature, best frame in swing start → swing peak); pass when elbow gain AND the lead both exceed the floor",
    elbow_path_direction_deg_ungraded: { value: pathDeg, meaning: "image-plane angle of the elbow's move, 0 = straight at the pitcher, + = upward", why_ungraded: "owner has no square-to-fair angle; side-on cannot see the lateral component toward fair territory" },
    slot_angle: "removed — owner has no slot-angle band", coaching: CARD_COACHING.back_elbow_connection,
  });
}

/* ================= 11 shoulder plane — a SCORE from P4 start, higher is better, never pass/fail ================= */
function shoulderPlane(c: Ctx, p4K: number, pkK: number): CardTileResult {
  const K: CardKey = "shoulder_plane_steadiness", u = "score_100";
  const n = pkK - p4K;
  if (n < 1) return refuse(K, u, mr(R.ANCHOR_NOT_DETECTED), { reason: "swing_peak_not_after_p4_start", p4_start_frame: c.s.frames[p4K].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, note: "no P4 window to score: P4 start is on or after the fastest torso turn, and no end-of-P4 anchor (settled finish) was found" });
  const t0 = m3(c, p4K, (j) => shoulderTiltDeg(c, P(c, j, LM.L_SHOULDER), P(c, j, LM.R_SHOULDER)));
  if (t0 == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "shoulders_untrusted_at_p4_start" });
  let held = 0, broke: number | null = null, unobs = 0;
  for (let j = p4K + 1; j <= pkK; j++) { const t = m3(c, j, (x) => shoulderTiltDeg(c, P(c, x, LM.L_SHOULDER), P(c, x, LM.R_SHOULDER))); if (t == null) { unobs++; continue; } if (Math.abs(t - t0) > CARD_FLOORS.shoulder_tilt_spread_deg) { broke = j; break; } held = j - p4K; }
  if (unobs > n / 2) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "shoulders_unobserved_for_most_of_window", unobserved_frames: unobs, window_frames: n });
  const score = broke == null ? 100 : (held / n) * 100;
  return ok(K, u, score, round4(100 / n), null, {
    p4_start_frame: c.s.frames[p4K].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, tilt_at_p4_start_deg: round4(t0), plane_broke_frame: broke == null ? null : c.s.frames[broke].frame_index,
    graded: false, why_ungraded: "owner 2026-09-28: not a pass/fail test — higher is better; a poor score does not mean a poor outcome",
    statistic: "% of P4 start → swing peak before shoulder tilt leaves its P4-start value by more than the still-clip floor; target 100", coaching: CARD_COACHING.shoulder_plane_steadiness,
  });
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

/* ================= 16 back knee — end of P2 → P3 landing, zero straightening ================= */
function backKnee(c: Ctx, apexK: number, plantK: number): CardTileResult {
  const K: CardKey = "back_knee_flex_maintained", u = "degrees";
  if (apexK >= plantK) return refuse(K, u, mr(R.ANCHOR_NOT_DETECTED), { reason: "end_of_p2_not_before_landing", end_of_p2_frame: c.s.frames[apexK].frame_index, landing_frame: c.s.frames[plantK].frame_index });
  const ang = (j: number) => angleDeg(P(c, j, c.rear.hip), P(c, j, c.rear.knee), P(c, j, c.rear.ankle));
  const b = m3(c, apexK, ang), a = m3(c, plantK, ang);
  if (b == null || a == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "back_leg_untrusted_at_end_of_p2_or_landing" });
  const d = a - b, fail = d > CARD_FLOORS.knee_angle_deg;
  return ok(K, u, d, CARD_FLOORS.knee_angle_deg, fail ? "fail" : "pass", { end_of_p2_frame: c.s.frames[apexK].frame_index, landing_frame: c.s.frames[plantK].frame_index, knee_deg_end_of_p2: round4(b), knee_deg_landing: round4(a), sign: "+ = back knee straightened", rule: "owner 2026-09-28: any straightening beyond the still-clip floor is a fault", reference: "athlete's own knee angle at end of P2", root_pattern_key: fail ? "back_leg_did_not_hold_load" : null, coaching: CARD_COACHING.back_knee_flex_maintained });
}

/* ================= 17 post-landing hip drift — zero tolerance, AND the hips must rotate ================= */
function hipDrift(c: Ctx, plantK: number, p4K: number, pkK: number): CardTileResult {
  const K: CardKey = "post_landing_hip_drift", u = "percent_stature";
  const g = (j: number) => Fw(c, mid(P(c, j, LM.L_HIP), P(c, j, LM.R_HIP)));
  const a = m3(c, plantK, g), b = m3(c, p4K, g);
  if (a == null || b == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "pelvis_untrusted_at_plant_or_p4" });
  const d = b - a, drift = d > CARD_FLOORS.hip_fwd_pct;
  // Rotation: rigid hip-length out-of-plane angle, plant → swing peak. Unsigned; floor 12° (ill-conditioned near closed).
  const L = c.lock.baseline?.hip_len_px;
  const th = (j: number) => { const x = P(c, j, LM.L_HIP), y = P(c, j, LM.R_HIP); if (!x || !y || !L) return null; const dd = Math.hypot(x.x - y.x, x.y - y.y); return dd > L * 1.03 ? null : (Math.acos(Math.min(1, dd / L)) * 180) / Math.PI; };
  const r0 = m3(c, plantK, th), r1 = pkK > plantK ? m3(c, pkK, th) : null;
  const rot = r0 == null || r1 == null ? null : Math.abs(r1 - r0);
  const rotating = rot == null ? null : rot > CARD_FLOORS.pelvis_rot_deg ? true : null;
  const lin = { plant_frame: c.s.frames[plantK].frame_index, p4_frame: c.s.frames[p4K].frame_index, drift_beyond_floor: drift, sign: "+ = pelvis still moving toward the pitcher after landing",
    hips_rotating: rotating, hip_rotation_deg_plant_to_swing_peak: rot == null ? null : round4(rot), rotation_floor_deg: CARD_FLOORS.pelvis_rot_deg,
    rotation_note: rotating === true ? "hips turned beyond the floor" : rot == null ? "hip rotation not observable (hips untrusted or over-length)" : "hip rotation within the side-on noise floor — cannot confirm the hips turned; the camera cannot confirm the owner's rotation standard here",
    rule: "owner 2026-09-28: any forward drift after landing is a fault; the standard is rotation, so rotation is reported alongside", coaching: CARD_COACHING.post_landing_hip_drift };
  return ok(K, u, d, CARD_FLOORS.hip_fwd_pct, drift ? "fail" : "pass", drift ? { ...lin, root_pattern_key: "back_leg_did_not_hold_load" } : lin);
}

/* ================= 18 hands above the back elbow at heel landing (replaces "hands stay up") ================= */
function handsUp(c: Ctx, plantK: number): CardTileResult {
  const K: CardKey = "hands_stay_up_at_plant", u = "percent_stature";
  const g = (j: number) => { const h = Up(c, handPointPx(c.s, j, c.v).p), e = Up(c, P(c, j, c.rear.el)); return h == null || e == null ? null : h - e; };
  const d = m3(c, plantK, g);
  if (d == null) return refuse(K, u, mr(R.HANDS_NOT_DETECTED), { reason: "hands_or_back_elbow_untrusted_at_heel_landing" });
  const F = CARD_FLOORS.hand_height_pct;
  if (Math.abs(d) < F) return refuse(K, u, mr(R.INSUFFICIENT_TEMPORAL_RESOLUTION), { reason: "hands_level_with_back_elbow_within_noise", raw: round4(d), floor: F, heel_landing_frame: c.s.frames[plantK].frame_index });
  const pass = d > 0;
  return ok(K, u, d, F, pass ? "pass" : "fail", { heel_landing_frame: c.s.frames[plantK].frame_index, sign: "hands height minus back-elbow height at heel landing; + = hands above", rule: "owner 2026-09-28: only heel landing is graded; a P2 dip is allowed, a P4 drop is correct", linked_root_pattern: pass ? null : "trunk_rotates_before_front_foot_plant", coaching: CARD_COACHING.hands_stay_up_at_plant });
}

/* ================= 19 lead elbow — ceiling is the athlete's own P2 ================= */
function leadElbow(c: Ctx, apexK: number, pkK: number): CardTileResult {
  const K: CardKey = "lead_elbow_bend_increasing", u = "degrees";
  if (apexK >= pkK) return refuse(K, u, mr(R.ANCHOR_NOT_DETECTED), { reason: "end_of_p2_not_before_swing_peak" });
  const ang = (j: number) => angleDeg(P(c, j, c.lead.sh), P(c, j, c.lead.el), P(c, j, c.lead.wr), 0.06 * c.st);
  const ref = m3(c, apexK, ang), b = m3(c, pkK, ang);
  const base = { end_of_p2_frame: c.s.frames[apexK].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, p2_reference_elbow_deg: ref == null ? null : round4(ref), reference: "athlete's own lead-elbow angle at end of P2 (per-athlete ceiling, not a universal number)", coaching: CARD_COACHING.lead_elbow_bend_increasing };
  if (ref == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { ...base, reason: "lead_arm_untrusted_or_pointing_at_camera_at_end_of_p2" });
  // Partial result: the P2 reference is recorded, but a verdict needs the swing-peak angle too — never a verdict from half the comparison.
  if (b == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { ...base, reason: "lead_arm_pointing_at_camera_at_swing_peak", partial: "P2 reference measured; comparison impossible" });
  const d = ref - b, fail = d > CARD_FLOORS.elbow_angle_deg;
  return ok(K, u, d, CARD_FLOORS.elbow_angle_deg, fail ? "fail" : "pass", { ...base, elbow_deg_peak: round4(b), sign: "+ = lead elbow bent MORE than at end of P2", caveat: "2-D elbow angle; forearm foreshortening toward the camera changes it" });
}

/* ================= 20 head after landing — the fault is RISING; sinking is allowed ================= */
function headVertical(c: Ctx, plantK: number, pkK: number): CardTileResult {
  const K: CardKey = "head_vertical_movement_post_landing", u = "percent_stature";
  const h = (j: number) => (c.v && !c.v.trustedAll(j, [0, 2, 5, 7, 8]) ? null : Up(c, headCentroidPx(c.s, c.s.frames[j])));
  const h0 = m3(c, plantK, h);
  if (h0 == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "head_untrusted_at_landing" });
  let rise = -Infinity, sink = Infinity, n = 0;
  for (let j = plantK + 1; j <= pkK; j++) { const x = m3(c, j, h); if (x == null) continue; n++; rise = Math.max(rise, x - h0); sink = Math.min(sink, x - h0); }
  if (n < 2) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "head_untrusted_through_window", samples: n });
  const r = Math.max(0, rise), fail = r > CARD_FLOORS.head_vertical_spread_pct;
  return ok(K, u, r, CARD_FLOORS.head_vertical_spread_pct, fail ? "fail" : "pass", { landing_frame: c.s.frames[plantK].frame_index, swing_peak_frame_not_contact: c.s.frames[pkK].frame_index, max_rise_pct: round4(r), max_sink_pct_allowed: round4(Math.min(0, sink)), samples: n, sign: "value = highest the head rose above its landing height; sinking is never penalised", window_end_note: "the owner's rule is 'before the ball is off the bat'; ball departure is a DelayCam event, so D-SWING-PEAK (fastest torso turn) is used as a pose-only PROXY — it is not ball departure", coaching: CARD_COACHING.head_vertical_movement_post_landing });
}

/* ================= 21 pelvis square to fair at the end of P4 ================= */
function pelvisSquare(c: Ctx, finK: number): CardTileResult {
  const K: CardKey = "pelvis_rotation_efficiency", u = "degrees";
  const L = c.lock.baseline?.hip_len_px;
  if (!L) return refuse(K, u, mr(R.CALIBRATION_UNAVAILABLE), { reason: "no_stance_hip_length" });
  // Side-on: square to fair = hips face the pitcher = hip line along the camera axis = θ≈90°. acos is well-conditioned near 90°.
  const th = (j: number) => { const a = P(c, j, LM.L_HIP), b = P(c, j, LM.R_HIP); if (!a || !b) return null; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > L * 1.03) return null; return (Math.acos(Math.min(1, d / L)) * 180) / Math.PI; };
  const t = m3(c, finK, th);
  if (t == null) return refuse(K, u, mr(R.LANDMARK_OCCLUDED), { reason: "hips_untrusted_or_over_length_at_end_of_p4" });
  return ok(K, u, 90 - t, null, null, { end_of_p4_frame: c.s.frames[finK].frame_index, end_of_p4_rule: "most-turned hip moment within half a second of the fastest torso turn; does not need the hitter to settle", pelvis_out_of_plane_deg: round4(t), sign: "degrees short of square to fair (0 = square)", why_ungraded: "owner has no 'close enough to square' angle; still clip is closed-stance so no noise floor near square exists yet", limitation: "unsigned rigid solve: over-rotating past square reads the same as under-rotating", reasoning: "we stride to the pitcher, not the ball — that is what makes square-to-fair reachable by the end of P4", coaching: CARD_COACHING.pelvis_rotation_efficiency });
}

function endOfP4Turn(c: Ctx, pkK: number): number {
  const L = c.lock.baseline?.hip_len_px; if (!L) return -1;
  const end = Math.min(c.s.frames.length - 2, pkK + Math.ceil(c.fps * 0.5));
  let best = -1, bw = Infinity;
  for (let k = pkK; k <= end; k++) { const w = m3(c, k, (j) => { const a = P(c, j, LM.L_HIP), b = P(c, j, LM.R_HIP); return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null; }); if (w != null && w < bw) { bw = w; best = k; } }
  return best;
}

/* ================= runner ================= */
export function runHittingCardTiles(series: LandmarkSeries, o: { side: Handedness | null }) {
   const units: Record<Exclude<CardKey, "hitters_move">, string> = { heel_plant: "percent_stature", back_heel_early_rise: "percent_stature", sequencing: "boolean", back_elbow_connection: "percent_stature", shoulder_plane_steadiness: "score_100", finish_balance: "stance_fraction", shoulder_to_shoulder_hold: "percent_of_window", back_knee_flex_maintained: "degrees", post_landing_hip_drift: "percent_stature", hands_stay_up_at_plant: "percent_stature", lead_elbow_bend_increasing: "degrees", head_vertical_movement_post_landing: "percent_stature", pelvis_rotation_efficiency: "degrees" };
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
    frontHeel: R_ ? 29 : 30, frontToe: R_ ? 31 : 32, backHeel: R_ ? 30 : 29, backToe: R_ ? 32 : 31,
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
  const apex = detectLoadApex(series, dir), apexK = kOf(series, apex.frame_index);
  const AP = [apexK, "end_of_p2_missing:load_apex", apex.missingness] as [number, string, MissingnessRecord | null];
  const P4 = [p4K, `p4_missing:${String(p4.diagnostics.reason ?? "")}`, p4.missingness] as [number, string, MissingnessRecord | null];
  return done({
    heel_plant: need("heel_plant", [P_], () => heelPlant(c, plantK, lift.frame_index)),
    back_heel_early_rise: need("back_heel_early_rise", [P4], () => backHeelEarlyRise(c, p4K)),
    sequencing: need("sequencing", [SS, PK], () => sequencing(c, ssK, pkK)),
    back_elbow_connection: need("back_elbow_connection", [SS, PK], () => backElbow(c, ssK, pkK)),
    shoulder_plane_steadiness: need("shoulder_plane_steadiness", [P4, PK], () => shoulderPlane(c, p4K, pkK)),
    finish_balance: need("finish_balance", [PK, FIN], () => (finK <= pkK ? refuse("finish_balance", units.finish_balance, mr(R.ANCHOR_NOT_DETECTED), { reason: "finish_not_after_swing_peak" }) : finishBalance(c, pkK, finK))),
    shoulder_to_shoulder_hold: need("shoulder_to_shoulder_hold", [P_, SS, PK], () => shoulderToShoulder(c, plantK, pkK)),
    back_knee_flex_maintained: need("back_knee_flex_maintained", [AP, P_], () => backKnee(c, apexK, plantK)),
    post_landing_hip_drift: need("post_landing_hip_drift", [P_, P4], () => hipDrift(c, plantK, p4K, pkK)),
    hands_stay_up_at_plant: need("hands_stay_up_at_plant", [P_], () => handsUp(c, plantK)),
    lead_elbow_bend_increasing: need("lead_elbow_bend_increasing", [AP, PK], () => leadElbow(c, apexK, pkK)),
    head_vertical_movement_post_landing: need("head_vertical_movement_post_landing", [P_, PK], () => (pkK <= plantK ? refuse("head_vertical_movement_post_landing", units.head_vertical_movement_post_landing, mr(R.ANCHOR_NOT_DETECTED), { reason: "swing_peak_not_after_plant" }) : headVertical(c, plantK, pkK))),
    // End of P4 = the hips' most-turned moment in the half second after D-SWING-PEAK. It does not wait for the hitter to settle (ruling 2026-09-30).
    pelvis_rotation_efficiency: need("pelvis_rotation_efficiency", [PK], () => { const k = endOfP4Turn(c, pkK); return k < 0 ? refuse("pelvis_rotation_efficiency", units.pelvis_rotation_efficiency, mr(R.LANDMARK_OCCLUDED), { reason: "hips_unobserved_after_swing_peak" }) : pelvisSquare(c, k); }),
  });
}

/* ================= hitter's move — aggregate, built last ================= */
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
