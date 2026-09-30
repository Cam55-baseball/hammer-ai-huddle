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
 *  A. ACTIVE STRIDE vs FALLING — window: end of stance (Stance Lock) → front-foot
 *     plant. Back-hip forward travel toward the pitcher vs the pelvis (centre-of-
 *     mass proxy) dropping. Classification uses ONLY the still-clip floors:
 *       active  = back hip drove beyond its floor, pelvis did not drop beyond its floor
 *       falling = pelvis dropped beyond its floor, back hip did not drive beyond its floor
 *       mixed   = both beyond their floors; no_travel = neither.
 *     Evidence for the back-leg root pattern is MAPPED but NOT EMITTED until the
 *     owner rules on it (ROOT_EVIDENCE_ENABLED = false).
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
export const STRIDE_RHYTHM_FLOORS = { pelvis_drop_pct: 2.8, back_hip_drive_pct: 1.3, body_speed_pct_s: 6.5 } as const;
/** A central difference + 3-frame median spans ~4 frames; a dip must fill more than that to be seen at all. */
export const MIN_PAUSE_WINDOW_FRAMES = 5;
export const ROOT_EVIDENCE_ENABLED = false;

export type StridePattern = "active" | "falling" | "mixed" | "no_travel";
export interface ActiveStrideResult {
  readonly key: "active_stride";
  readonly version: string;
  readonly pattern: StridePattern | null;
  /** Back-hip forward travel toward the pitcher, % stature. Record-only. */
  readonly value: number | null;
  readonly unit: "percent_stature";
  readonly missing_reason: string | null;
  /** Would-be evidence for back_leg_did_not_hold_load. Never emitted while ROOT_EVIDENCE_ENABLED is false. */
  readonly root_evidence: { fault_key: "active_stride_falling"; raised: boolean; emitted: false } | null;
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
  const refuse = (reason: string, lineage: Record<string, unknown> = {}): ActiveStrideResult =>
    ({ key: "active_stride", version: STRIDE_RHYTHM_VERSION, pattern: null, value: null, unit: "percent_stature", missing_reason: reason, root_evidence: null, lineage: { reason, ...lineage } });
  if (!o.side) return refuse("batting_side_unknown");
  const c = context(series, o.side);
  if (!c) return refuse("stance_lock_or_direction_missing");
  if (c.plantK < 0) return refuse("front_foot_plant_missing");
  const startK = c.lock.end_k! + 1;
  if (c.plantK - startK < 3) return refuse("stride_window_too_short");
  const backHip = o.side === "R" ? LM.R_HIP : LM.L_HIP;
  const fw = (k: number) => { const p = c.P(k, backHip); return p ? (p.x * c.dir * 100) / c.st : null; };
  const down = (k: number) => { const p = mid(c.P(k, LM.L_HIP), c.P(k, LM.R_HIP)); return p ? (p.y * 100) / c.st : null; };
  const pelFw = (k: number) => { const p = mid(c.P(k, LM.L_HIP), c.P(k, LM.R_HIP)); return p ? (p.x * c.dir * 100) / c.st : null; };
  const h0 = c.m3(startK, fw), h1 = c.m3(c.plantK, fw), d0 = c.m3(startK, down), d1 = c.m3(c.plantK, down), f0 = c.m3(startK, pelFw), f1 = c.m3(c.plantK, pelFw);
  if (h0 == null || h1 == null || d0 == null || d1 == null) return refuse("back_hip_or_pelvis_unobserved");
  const drive = h1 - h0, drop = d1 - d0, F = STRIDE_RHYTHM_FLOORS;
  const drove = drive > F.back_hip_drive_pct, fell = drop > F.pelvis_drop_pct;
  const pattern: StridePattern = drove && !fell ? "active" : fell && !drove ? "falling" : drove && fell ? "mixed" : "no_travel";
  return {
    key: "active_stride", version: STRIDE_RHYTHM_VERSION, pattern, value: round4(drive), unit: "percent_stature", missing_reason: null,
    root_evidence: { fault_key: "active_stride_falling", raised: pattern === "falling", emitted: false },
    lineage: { window: { start_frame: series.frames[startK].frame_index, plant_frame: series.frames[c.plantK].frame_index },
      back_hip_drive_pct: round4(drive), pelvis_drop_pct: round4(drop), pelvis_forward_pct: f0 != null && f1 != null ? round4(f1 - f0) : null,
      floors: F, record_only: true, graded: false, root_pattern: "back_leg_did_not_hold_load", root_evidence_enabled: ROOT_EVIDENCE_ENABLED },
  };
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
