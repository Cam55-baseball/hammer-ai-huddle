/**
 * Front Leg Gather — hitting, ADDITIVE ONLY (owner doctrine 2026-09-30).
 * "P2 is the simultaneous timing for front leg movement to happen as well. It is
 * not mandatory ... Leg kick, toe tap, etc. ... a way to accumulate power."
 *
 *  - Detects whether the front leg gathered between the end of the stance
 *    (Stance Lock) and front-foot plant, and which pattern.
 *  - NEVER a fault. No gather = "none", which is a legal, complete answer.
 *  - The gather's size (`value`) is RECORD-ONLY: it earns its bonus only once the
 *    athlete has a baseline, on proximity to their own range. No universal size.
 *  - Floors measured on still clip 15d75bc9 BEFORE any threshold
 *    (see GATHER_FLOORS; worst of max |med3 − stance median|, either side).
 *  - Every landmark read goes through segment validity.
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { LM, pointPx, median, round4, type Pt } from "../anchors/poseKinematics";
import { detectStanceLock, unroll } from "../anchors/stanceLock";
import { buildSegmentValidity } from "../validity/segmentValidity";
import { deriveDirectionSign, type Handedness } from "../side/strideSide";
import { frontFootPlantFromSeries } from "./hittingOwnerTiles";

export const FRONT_LEG_GATHER_VERSION = "front_leg_gather@1.0.0-2026-09-30-additive-record-only";

/** Still clip 15d75bc9, % stature. Measured by src/lib/biomech/__tests__/frontLegGather.test.ts ("still floors"). */
export const GATHER_FLOORS = { knee_up_pct: 1.2, knee_back_pct: 1.2, ankle_up_pct: 1.2 } as const;

export type GatherPattern = "leg_kick" | "toe_tap" | "float" | "knee_turn" | "none";
export interface FrontLegGatherResult {
  readonly key: "front_leg_gather";
  readonly version: string;
  readonly pattern: GatherPattern | null;
  /** Peak gather size, % stature. Record-only. null when refused or pattern "none". */
  readonly value: number | null;
  readonly unit: "percent_stature";
  readonly missing_reason: string | null;
  readonly lineage: Readonly<Record<string, unknown>>;
}
const refuse = (reason: string, lineage: Record<string, unknown> = {}): FrontLegGatherResult =>
  ({ key: "front_leg_gather", version: FRONT_LEG_GATHER_VERSION, pattern: null, value: null, unit: "percent_stature", missing_reason: reason, lineage: { reason, ...lineage } });

/** Raw per-frame signals relative to the stance median (exported so the still floor can be measured). */
export function gatherSignals(series: LandmarkSeries, side: Handedness) {
  const dir = deriveDirectionSign(series, side);
  const lock = detectStanceLock(series);
  if (dir == null || !lock.ok || !lock.baseline?.stature_px || lock.start_k == null || lock.end_k == null) return null;
  const v = buildSegmentValidity(series, lock);
  const st = lock.baseline.stature_px, roll = lock.baseline.roll_deg;
  const knee = side === "R" ? LM.L_KNEE : LM.R_KNEE, ankle = side === "R" ? LM.L_ANKLE : LM.R_ANKLE;
  const P = (k: number, i: number): Pt | null => { const f = series.frames[k]; if (!f || (v && !v.trusted(k, i))) return null; const p = pointPx(series, f, i); return p ? unroll(p, roll) : null; };
  const up = (k: number, i: number) => { const p = P(k, i); return p ? (-p.y * 100) / st : null; };
  const fw = (k: number, i: number) => { const p = P(k, i); return p ? (p.x * dir * 100) / st : null; };
  const m3 = (k: number, g: (j: number) => number | null) => { const xs = [k - 1, k, k + 1].map(g).filter((x): x is number => x != null); return xs.length >= 2 ? median(xs) : null; };
  const base = (g: (j: number) => number | null) => { const xs: number[] = []; for (let j = lock.start_k!; j <= lock.end_k!; j++) { const x = g(j); if (x != null) xs.push(x); } return xs.length ? median(xs) : null; };
  const kUp0 = base((j) => up(j, knee)), kFw0 = base((j) => fw(j, knee)), aUp0 = base((j) => up(j, ankle));
  if (kUp0 == null || kFw0 == null || aUp0 == null) return null;
  const rows = series.frames.map((_, k) => ({
    knee_up: (() => { const x = m3(k, (j) => up(j, knee)); return x == null ? null : x - kUp0; })(),
    knee_back: (() => { const x = m3(k, (j) => fw(j, knee)); return x == null ? null : -(x - kFw0); })(),
    ankle_up: (() => { const x = m3(k, (j) => up(j, ankle)); return x == null ? null : x - aUp0; })(),
  }));
  return { rows, lock, dir };
}

export function runFrontLegGather(series: LandmarkSeries, o: { side: Handedness | null }): FrontLegGatherResult {
  if (!o.side) return refuse("batting_side_unknown");
  const sig = gatherSignals(series, o.side);
  if (!sig) return refuse("stance_lock_or_direction_missing");
  const { plant } = frontFootPlantFromSeries(series, o.side);
  const plantK = plant.frame_index == null ? -1 : series.frames.findIndex((f) => f.frame_index === plant.frame_index);
  if (plantK < 0) return refuse("front_foot_plant_missing");
  const startK = sig.lock.end_k! + 1;
  if (plantK - startK < 3) return refuse("p2_window_too_short");
  const win = sig.rows.slice(startK, plantK + 1);
  const cover = win.filter((r) => r.knee_up != null && r.ankle_up != null).length / win.length;
  if (cover < 0.8) return refuse("front_leg_unobserved_in_p2", { coverage: round4(cover) });
  const pk = (g: (r: (typeof win)[number]) => number | null) => Math.max(...win.map(g).map((x) => x ?? -Infinity));
  const kneeUp = pk((r) => r.knee_up), kneeBack = pk((r) => r.knee_back), ankleUp = pk((r) => r.ankle_up);
  const F = GATHER_FLOORS;
  // Lift episodes: runs of ankle above its floor. Two or more separate episodes = a tap and re-lift.
  let episodes = 0, inEp = false;
  for (const r of win) { const on = (r.ankle_up ?? 0) > F.ankle_up_pct; if (on && !inEp) episodes++; inEp = on; }
  let pattern: GatherPattern;
  if (kneeUp > 3 * F.knee_up_pct && ankleUp > F.ankle_up_pct) pattern = "leg_kick";
  else if (ankleUp > F.ankle_up_pct && episodes >= 2) pattern = "toe_tap";
  else if (ankleUp > F.ankle_up_pct) pattern = "float";
  else if (kneeBack > F.knee_back_pct) pattern = "knee_turn";
  else pattern = "none";
  const size = pattern === "none" ? null : round4(Math.max(kneeUp, kneeBack, ankleUp));
  return {
    key: "front_leg_gather", version: FRONT_LEG_GATHER_VERSION, pattern, value: size, unit: "percent_stature", missing_reason: null,
    lineage: { window: { start_frame: series.frames[startK].frame_index, plant_frame: plant.frame_index }, peaks_pct: { knee_up: round4(kneeUp), knee_back: round4(kneeBack), ankle_up: round4(ankleUp) }, lift_episodes: episodes, floors: F, additive_only: true, never_a_fault: true },
  };
}
