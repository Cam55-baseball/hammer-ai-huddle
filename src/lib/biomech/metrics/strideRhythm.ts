/**
 * Stride rhythm — hitting, RECORD-ONLY (owner doctrine 2026-09-30):
 * "our stride and step are not momentum or gravity based. We create that
 *  reach/stride/stretch/direction with the back hip toward the pitcher to get us
 *  all the way to the ground from our P2 position. As we operate on micro pauses,
 *  P1-P2-Pause-P3-Pause-P4."
 *
 * Two readings, neither graded, neither worth points until the athlete has a
 * baseline, no owner duration or threshold invented:
 *
 *  A. ACTIVE STRIDE — back-hip ROTATION only (ruling 2026-09-30), P2 position →
 *     plant. Body travel is measured by foot_vs_body, never here, so the two can
 *     no longer contradict. Refuses when the turn is inside the still-clip floor.
 *
 *  B. MICRO-PAUSES — body speed (median of wrists/shoulders/hips/ankles) in two
 *     windows: end of P2 (load apex) → plant, and plant → swing start. Records the
 *     deepest slowing (min ÷ peak) and how long speed sat near that minimum.
 *     Needs ≥ MIN_PAUSE_WINDOW_FRAMES in each window, otherwise refuses.
 *
 * Floors — still clip 15d75bc9 (29.97 fps), measured 2026-09-30 BEFORE any use,
 * worst side, max |med3 − series median|, % of shoulder-to-ankle height:
 *   pelvis vertical 2.727 · back hip fore-aft 1.291 · body speed max 6.46 %/s.
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { LM, pointPx, median, mid, round4, type Pt } from "../anchors/poseKinematics";
import { detectStanceLock, unroll } from "../anchors/stanceLock";
import { buildSegmentValidity } from "../validity/segmentValidity";
import { deriveDirectionSign, type Handedness } from "../side/strideSide";
import { frontFootPlantFromSeries } from "./hittingOwnerTiles";
import { detectLoadApex, detectSwingStart } from "../anchors/poseEvents";

export const STRIDE_RHYTHM_VERSION = "stride_rhythm@1.0.0-2026-09-30-record-only";
export const ROUTED_TO_DELAYCAM = ["micro_pauses"] as const;
export const STRIDE_RHYTHM_FLOORS = { pelvis_drop_pct: 2.8, back_hip_drive_pct: 1.3, body_speed_pct_s: 6.5 } as const;
/** A central difference + 3-frame median spans ~4 frames; a dip must fill more than that to be seen at all. */
export const MIN_PAUSE_WINDOW_FRAMES = 5;
export const ROOT_EVIDENCE_ENABLED = false;

export type StridePattern = "hip_turned";
/** Still clip 15d75bc9, measured 2026-09-30 before use: rigid pelvis-turn wobble 11.73° (hip line near edge-on). */
export const ACTIVE_STRIDE_TURN_FLOOR_DEG = 11.8;
export interface ActiveStrideResult {
  readonly key: "active_stride";
  readonly version: string;
  readonly pattern: StridePattern | null;
  /** Back-hip (pelvis) turn during the stride, degrees, unsigned. Record-only. */
  readonly value: number | null;
  readonly unit: "degrees";
  readonly missing_reason: string | null;
  /** Would-be evidence for back_leg_did_not_hold_load. Never emitted while ROOT_EVIDENCE_ENABLED is false. */
  readonly root_evidence: null;
  readonly lineage: Readonly<Record<string, unknown>>;
}
export interface PauseReading { dip_ratio: number | null; dwell_sec: number | null; slowing_detectable: boolean | null; frames: number; missing_reason: string | null }
export interface MicroPauseResult {
  readonly key: "micro_pauses";
  readonly version: string;
  readonly p2_to_p3: PauseReading;
  readonly p3_to_p4: PauseReading;
  /** Record-only value for the baseline: deepest P3→P4 slowing (min ÷ peak). */
  readonly value: number | null;
  readonly missing_reason: string | null;
  readonly lineage: Readonly<Record<string, unknown>>;
}

function context(series: LandmarkSeries, side: Handedness) {
  const dir = deriveDirectionSign(series, side);
  const lock = detectStanceLock(series);
  if (dir == null || !lock.ok || !lock.baseline?.stature_px || lock.start_k == null || lock.end_k == null) return null;
  const v = buildSegmentValidity(series, lock);
  const st = lock.baseline.stature_px, roll = lock.baseline.roll_deg;
  const P = (k: number, i: number): Pt | null => { const f = series.frames[k]; if (!f || (v && !v.trusted(k, i))) return null; const p = pointPx(series, f, i); return p ? unroll(p, roll) : null; };
  const m3 = (k: number, g: (j: number) => number | null) => { const xs = [k - 1, k, k + 1].map(g).filter((x): x is number => x != null); return xs.length >= 2 ? median(xs) : null; };
  const { plant } = frontFootPlantFromSeries(series, side);
  const plantK = plant.frame_index == null ? -1 : series.frames.findIndex((f) => f.frame_index === plant.frame_index);
  return { dir, lock, st, P, m3, plantK };
}

export function runActiveStride(series: LandmarkSeries, o: { side: Handedness | null }): ActiveStrideResult {
  // ANGULAR only (owner ruling 2026-09-30): the glute driving is back-hip ROTATION.
  // Body travel is foot_vs_body's job and never enters this tile.
  const refuse = (reason: string, lineage: Record<string, unknown> = {}): ActiveStrideResult =>
    ({ key: "active_stride", version: STRIDE_RHYTHM_VERSION, pattern: null, value: null, unit: "degrees", missing_reason: reason, root_evidence: null, lineage: { reason, method: "pelvis_turn_rigid_length", linear_terms: "none", ...lineage } });
  if (!o.side) return refuse("batting_side_unknown");
  const c = context(series, o.side);
  if (!c) return refuse("stance_lock_or_direction_missing");
  if (c.plantK < 0) return refuse("front_foot_plant_missing");
  const apex = detectLoadApex(series, c.dir);
  const startK = apex.frame_index == null ? -1 : series.frames.findIndex((f) => f.frame_index === apex.frame_index);
  if (startK < 0) return refuse("p2_position_missing:load_apex_not_detected");
  if (c.plantK - startK < 3) return refuse("stride_window_too_short");
  const w = (k: number) => { const a = c.P(k, LM.L_HIP), b = c.P(k, LM.R_HIP); return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null; };
  let L = 0; for (let k = c.lock.start_k as number; k <= c.plantK; k++) { const x = c.m3(k, w); if (x != null && x > L) L = x; }
  if (!(L > 0)) return refuse("hips_unobserved");
  const th = (k: number) => { const x = c.m3(k, w); return x == null ? null : (Math.acos(Math.min(1, x / L)) * 180) / Math.PI; };
  const t0 = th(startK); if (t0 == null) return refuse("hips_unobserved_at_p2");
  let exc = 0, n = 0; for (let k = startK + 1; k <= c.plantK; k++) { const t = th(k); if (t == null) continue; n++; if (Math.abs(t - t0) > Math.abs(exc)) exc = t - t0; }
  const lin = { window: { start_frame: series.frames[startK].frame_index, plant_frame: series.frames[c.plantK].frame_index }, pelvis_turn_excursion_deg: round4(exc), floor_deg: ACTIVE_STRIDE_TURN_FLOOR_DEG, samples: n, record_only: true, graded: false,
    limitation: "side-on, the hip line is near edge-on to the camera at stance; the length solve is unsigned and ill-conditioned there, so a turn smaller than the still-clip floor cannot be told apart from noise" };
  if (n < 3) return refuse("hips_unobserved_through_stride", lin);
  if (Math.abs(exc) <= ACTIVE_STRIDE_TURN_FLOOR_DEG) return refuse("back_hip_turn_within_still_noise_side_on", lin);
  return { key: "active_stride", version: STRIDE_RHYTHM_VERSION, pattern: "hip_turned", value: round4(Math.abs(exc)), unit: "degrees", missing_reason: null,
    root_evidence: null, lineage: { ...lin, method: "pelvis_turn_rigid_length", linear_terms: "none", direction: "unsigned" } };
}

export function runMicroPauses(series: LandmarkSeries, o: { side: Handedness | null }): MicroPauseResult {
  const empty = (reason: string): PauseReading => ({ dip_ratio: null, dwell_sec: null, slowing_detectable: null, frames: 0, missing_reason: reason });
  const refuse = (reason: string, lineage: Record<string, unknown> = {}): MicroPauseResult =>
    ({ key: "micro_pauses", version: STRIDE_RHYTHM_VERSION, p2_to_p3: empty(reason), p3_to_p4: empty(reason), value: null, missing_reason: reason, lineage: { reason, ...lineage } });
  if (!o.side) return refuse("batting_side_unknown");
  const c = context(series, o.side);
  if (!c) return refuse("stance_lock_or_direction_missing");
  if (c.plantK < 0) return refuse("front_foot_plant_missing");
  const fps = series.header.fps_true ?? 0;
  if (!(fps > 0)) return refuse("insufficient_temporal_resolution:unknown_frame_rate");
  const apex = detectLoadApex(series, c.dir), swing = detectSwingStart(series, c.dir, apex);
  const kOf = (fi: number | null) => (fi == null ? -1 : series.frames.findIndex((f) => f.frame_index === fi));
  const apexK = kOf(apex.frame_index), swingK = kOf(swing.frame_index);
  const IDX = [LM.L_WRIST, LM.R_WRIST, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP, LM.L_ANKLE, LM.R_ANKLE];
  const rawSpeed = (k: number): number | null => {
    const a = series.frames[k - 1], b = series.frames[k + 1]; if (!a || !b) return null;
    const dt = b.timestamp_seconds - a.timestamp_seconds; if (!(dt > 0)) return null;
    const v = IDX.map((i) => { const p = c.P(k - 1, i), q = c.P(k + 1, i); return p && q ? (Math.hypot(q.x - p.x, q.y - p.y) / dt) * 100 / c.st : null; }).filter((x): x is number => x != null);
    return v.length >= 6 ? median(v) : null;
  };
  const speed = (k: number) => c.m3(k, rawSpeed);
  const reading = (a: number, b: number, label: string): PauseReading => {
    if (a < 0 || b < 0) return empty(`${label}_anchor_missing`);
    if (b <= a) return empty(`${label}_anchors_out_of_order`);
    const n = b - a + 1;
    if (n < MIN_PAUSE_WINDOW_FRAMES) return { ...empty(`insufficient_temporal_resolution:${n}_frames_between_anchors`), frames: n };
    const xs: { k: number; v: number }[] = [];
    for (let k = a; k <= b; k++) { const v = speed(k); if (v != null) xs.push({ k, v }); }
    if (xs.length < MIN_PAUSE_WINDOW_FRAMES) return { ...empty("body_unobserved_between_anchors"), frames: n };
    const peak = Math.max(...xs.map((x) => x.v));
    const interior = xs.filter((x) => x.k > a && x.k < b);
    const min = interior.length ? Math.min(...interior.map((x) => x.v)) : Math.min(...xs.map((x) => x.v));
    const F = STRIDE_RHYTHM_FLOORS.body_speed_pct_s;
    const dwell = interior.filter((x) => x.v <= min + F).length;
    return { dip_ratio: peak > 0 ? round4(min / peak) : null, dwell_sec: round4(dwell / fps), slowing_detectable: peak - min > F, frames: n, missing_reason: null };
  };
  const p2p3 = reading(apexK, c.plantK, "p2_end_to_plant"), p3p4 = reading(c.plantK, swingK, "plant_to_swing_start");
  return {
    key: "micro_pauses", version: STRIDE_RHYTHM_VERSION, p2_to_p3: p2p3, p3_to_p4: p3p4, value: p3p4.dip_ratio,
    missing_reason: p2p3.missing_reason && p3p4.missing_reason ? p3p4.missing_reason : null,
    lineage: { fps, min_window_frames: MIN_PAUSE_WINDOW_FRAMES, shortest_resolvable_sec: round4(MIN_PAUSE_WINDOW_FRAMES / fps), floors: STRIDE_RHYTHM_FLOORS,
      anchors: { load_apex: apex.frame_index, plant: series.frames[c.plantK].frame_index, swing_start: swing.frame_index }, record_only: true, graded: false, owner_duration: "not_supplied" },
  };
}

/* ================= P3 COIL — owner doctrine 2026-09-30 (second quote) =================
 * "…should not actually gain ground but become more coiled as 'forward move' P3
 *  stride happens… It is not a gravity move but a controlled voluntary movement."
 *
 * Four RECORD-ONLY readings over P3: the front foot's rearmost point between
 * stance and plant (after any gather) → front-foot plant. No owner numbers exist; nothing is graded. Classification
 * uses only still-clip floors. All four map to back_leg_did_not_hold_load but are
 * NOT emitted while ROOT_EVIDENCE_ENABLED is false.
 *
 *  A foot_vs_body   — front-ankle forward travel ÷ pelvis forward travel.
 *  B hands_opposite — hand-centroid travel against the front foot (rearward = correct).
 *  C side_bend      — change in the in-plane trunk tilt away from the pitcher. The
 *                     "chest toward the plate" part is depth and is not visible from
 *                     a side view; this is the in-plane proxy. Linked to heel_plant.
 *  D sink           — pelvis drop, with where the pelvis sits between the feet at plant
 *                     (0 = over the back ankle, 1 = over the front ankle).
 *
 * Floors — still clip 15d75bc9, measured 2026-09-30 before use, max |med3 − median|:
 *   front ankle x 1.415 % (worst side) · pelvis x 0.828 % · hands x 1.396 % ·
 *   trunk tilt 1.104° · shoulder line 1.775° · pelvis vertical 2.727 %.
 */
export const STRIDE_COIL_VERSION = "stride_coil@1.0.0-2026-09-30-record-only";
export const STRIDE_COIL_FLOORS = { foot_forward_pct: 1.5, pelvis_forward_pct: 0.9, hands_pct: 1.4, trunk_tilt_deg: 1.2, shoulder_line_deg: 1.8, pelvis_drop_pct: 2.8 } as const;

export interface CoilReading<P extends string> {
  readonly pattern: P | null;
  readonly value: number | null;
  readonly missing_reason: string | null;
  readonly root_evidence: { fault_key: string; raised: boolean; emitted: false } | null;
  readonly lineage: Readonly<Record<string, unknown>>;
}
export interface StrideCoilResult {
  readonly key: "stride_coil";
  readonly version: string;
  readonly foot_vs_body: CoilReading<"body_stayed_back" | "body_went_with_foot" | "no_stride">;
  readonly hands_opposite: CoilReading<"hands_went_back" | "hands_went_with_foot" | "hands_held">;
  readonly side_bend: CoilReading<"side_bend_increased" | "side_bend_decreased" | "held">;
  readonly sink: CoilReading<"sank_over_back_leg" | "fell_forward" | "no_sink" | "mixed">;
  readonly missing_reason: string | null;
}

export function runStrideCoil(series: LandmarkSeries, o: { side: Handedness | null }): StrideCoilResult {
  const miss = <P extends string>(r: string): CoilReading<P> => ({ pattern: null, value: null, missing_reason: r, root_evidence: null, lineage: { reason: r } });
  const refuse = (r: string): StrideCoilResult => ({ key: "stride_coil", version: STRIDE_COIL_VERSION, foot_vs_body: miss(r), hands_opposite: miss(r), side_bend: miss(r), sink: miss(r), missing_reason: r });
  if (!o.side) return refuse("batting_side_unknown");
  const c = context(series, o.side);
  if (!c) return refuse("stance_lock_or_direction_missing");
  if (c.plantK < 0) return refuse("front_foot_plant_missing");
  const F = STRIDE_COIL_FLOORS, dir = c.dir, st = c.st;
  const front = o.side === "R" ? LM.L_ANKLE : LM.R_ANKLE, back = o.side === "R" ? LM.R_ANKLE : LM.L_ANKLE;
  const fwd = (i: number) => (k: number) => { const p = c.P(k, i); return p ? (p.x * dir * 100) / st : null; };
  // P3 window starts when the FRONT FOOT starts toward the pitcher: its rearmost
  // point between stance and plant (after any gather). Not the hand extremum —
  // after the load apex the hands can only come forward, which would fake finding B.
  const b = c.plantK, lockEnd = c.lock.end_k as number;
  let a = -1, rear = Infinity;
  for (let k = lockEnd; k < b; k++) { const x = c.m3(k, fwd(front)); if (x != null && x < rear) { rear = x; a = k; } }
  if (a < 0) return refuse("front_ankle_unobserved_before_plant");
  if (b - a < 3) return refuse("stride_window_too_short");
  const pel = (k: number) => mid(c.P(k, LM.L_HIP), c.P(k, LM.R_HIP));
  const pelFw = (k: number) => { const p = pel(k); return p ? (p.x * dir * 100) / st : null; };
  const pelDn = (k: number) => { const p = pel(k); return p ? (p.y * 100) / st : null; };
  const hands = (k: number) => { const p = mid(c.P(k, LM.L_WRIST), c.P(k, LM.R_WRIST)); return p ? (p.x * dir * 100) / st : null; };
  const tilt = (k: number) => { const h = pel(k), s = mid(c.P(k, LM.L_SHOULDER), c.P(k, LM.R_SHOULDER)); return h && s ? (-Math.atan2((s.x - h.x) * dir, h.y - s.y) * 180) / Math.PI : null; };
  const d = (g: (k: number) => number | null) => { const x0 = c.m3(a, g), x1 = c.m3(b, g); return x0 == null || x1 == null ? null : x1 - x0; };
  const win = { start_frame: series.frames[a].frame_index, plant_frame: series.frames[b].frame_index };
  const ev = (key: string, raised: boolean) => ({ fault_key: key, raised, emitted: false as const });
  const base = { window: win, floors: F, record_only: true, graded: false, root_pattern: "back_leg_did_not_hold_load", root_evidence_enabled: ROOT_EVIDENCE_ENABLED };

  const footD = d(fwd(front)), pelD = d(pelFw), handD = d(hands), tiltD = d(tilt), dropD = d(pelDn);

  let foot_vs_body: StrideCoilResult["foot_vs_body"];
  if (footD == null || pelD == null) foot_vs_body = miss("front_ankle_or_pelvis_unobserved");
  else if (footD <= F.foot_forward_pct) foot_vs_body = { pattern: "no_stride", value: null, missing_reason: null, root_evidence: null, lineage: { ...base, foot_forward_pct: round4(footD), pelvis_forward_pct: round4(pelD) } };
  else {
    const went = pelD > F.pelvis_forward_pct;
    foot_vs_body = { pattern: went ? "body_went_with_foot" : "body_stayed_back", value: round4(footD / Math.max(Math.abs(pelD), F.pelvis_forward_pct)), missing_reason: null,
      root_evidence: ev("stride_body_gained_ground", went), lineage: { ...base, foot_forward_pct: round4(footD), pelvis_forward_pct: round4(pelD), ratio_note: "pelvis travel floored at its noise floor so a still body never divides by zero" } };
  }

  let hands_opposite: StrideCoilResult["hands_opposite"];
  if (handD == null || footD == null) hands_opposite = miss("hands_or_front_ankle_unobserved");
  else if (footD <= F.foot_forward_pct) hands_opposite = miss("no_stride_above_floor");
  else {
    const p = handD < -F.hands_pct ? "hands_went_back" : handD > F.hands_pct ? "hands_went_with_foot" : "hands_held";
    hands_opposite = { pattern: p, value: round4(-handD), missing_reason: null, root_evidence: ev("stride_hands_went_with_foot", p === "hands_went_with_foot"), lineage: { ...base, hands_rearward_pct: round4(-handD), foot_forward_pct: round4(footD) } };
  }

  let side_bend: StrideCoilResult["side_bend"];
  if (tiltD == null) side_bend = miss("trunk_unobserved");
  else {
    const p = tiltD > F.trunk_tilt_deg ? "side_bend_increased" : tiltD < -F.trunk_tilt_deg ? "side_bend_decreased" : "held";
    side_bend = { pattern: p, value: round4(tiltD), missing_reason: null, root_evidence: ev("stride_side_bend_lost", p === "side_bend_decreased"),
      lineage: { ...base, trunk_tilt_change_deg: round4(tiltD), proxy: "in_plane_tilt_away_from_pitcher", depth_component: "not_visible_side_on", linked_tile: "heel_plant" } };
  }

  let sink: StrideCoilResult["sink"];
  const pb = pel(b), fa = c.P(b, front), ba = c.P(b, back);
  if (dropD == null || pelD == null || !pb || !fa || !ba) sink = miss("pelvis_or_ankles_unobserved_at_plant");
  else {
    const span = (fa.x - ba.x) * dir;
    const frac = Math.abs(span) > 1e-6 ? ((pb.x - ba.x) * dir) / span : null;
    const dropped = dropD > F.pelvis_drop_pct, forward = pelD > F.pelvis_forward_pct, overBack = frac != null && frac < 0.5;
    const p = !dropped ? "no_sink" : overBack && !forward ? "sank_over_back_leg" : !overBack && forward ? "fell_forward" : "mixed";
    sink = { pattern: p, value: round4(dropD), missing_reason: null, root_evidence: ev("stride_fell_forward", p === "fell_forward"),
      lineage: { ...base, pelvis_drop_pct: round4(dropD), pelvis_forward_pct: round4(pelD), pelvis_between_feet_at_plant: frac == null ? null : round4(frac) } };
  }
  return { key: "stride_coil", version: STRIDE_COIL_VERSION, foot_vs_body, hands_opposite, side_bend, sink, missing_reason: null };
}
