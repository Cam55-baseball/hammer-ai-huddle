/**
 * Baseball pitching card — the eleven remaining tiles (built 2026-09-29).
 * Rides the SAME delivery gate, stance lock and camera gate as pitchingTiles.ts
 * (one implementation). Pure, deterministic, canonical missingness.
 *
 * UNVALIDATED: there is no confirmed pitching fixture. Every value here is
 * unvalidated until the owner supplies a pitching clip with a known answer.
 *
 * FRONT FOOT is resolved from the throwing side through strideSide.ts
 * (R thrower → LEFT foot, L thrower → RIGHT foot). Never a fixed left/right.
 *
 * NOISE FLOORS — still clip 15d75bc9, p2–p98 range, measured BEFORE any
 * threshold (docs/landmark-noise-floors.md §Pitching card 2026-09-29):
 *   shoulder tilt 2.74°   eye tilt 5.00°   balance angle 1.69°
 *   ankle x 2.0 % stature (per ankle; stride diff ≈ 2.8 %)
 *   nose-ahead-of-ears 0.077 ear-widths
 *   wrist + toe in inches (70 in athlete) ≈ 1.7–2.9 in  ← LARGER than half the
 *     owner's 4-inch release-extension band (8–12 in). Band edges are not resolvable.
 *   pinky→thumb direction 6.7–19.7° on a bare, still hand; the glove hides the
 *     hand landmarks in a real delivery → glove swivel refuses.
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import { MISSINGNESS_REASONS as R, missingness, type MissingnessRecord, type MissingnessReason } from "./missingness";
import { uncalibrated, missingConfidence, type ConfidenceRecord } from "./confidence";
import { computeTempoSec } from "./tempoSec";
import { findPitchingDelivery, type PitchingDelivery } from "./pitchingTiles";
import { detectStanceLock, unroll, type StanceLock } from "../anchors/stanceLock";
import { pointPx, round4, type Pt } from "../anchors/poseKinematics";
import { detectCameraView, checkCameraRequirement, type CameraViewResult } from "../camera/cameraView";
import { measureArmSlot } from "./armSlot";
import { frontAnkleIndex, rearAnkleIndex, type Handedness } from "../side/strideSide";

export const PITCHING_CARD_TILES_VERSION = "pitching_card_tiles@1.1.0-2026-09-29-any-slot-unvalidated";

/** Owner coaching standards. NOT derived from data. */
export const PITCHING_CARD_STANDARDS = {
  tempo_sec: { pass_max: 1.05, source: "owner_coaching_standard" },
  shoulder_tilt_deg: { pass_max: 10, source: "owner_coaching_standard" },
  stride_pct_of_height: { pass_min: 90, source: "owner_coaching_standard" },
  head_at_release_deg: { pass_max: 15, source: "owner_coaching_standard" },
  drag_line: { length_max_foot_lengths: 2, direction: "straight to target", source: "owner_coaching_standard" },
  stack_and_track: { pass_max: 10, elite: 0, source: "owner_coaching_standard" },
  balance_at_landing: { pass_max_from_vertical_deg: 15, source: "owner_coaching_standard" },
  eyes_on_target_at_peak_lift: { pass: "eyes on target before moving forward", source: "owner_coaching_standard" },
  glove_swivel: { pass: "open → closed, pinky to body, inside the shoulder frame", source: "owner_coaching_standard" },
  glove_drift_outside_frame_in: { pass_max: 0, source: "owner_coaching_standard" },
  release_extension: { band_in: [8, 12], source: "owner_coaching_standard" },
} as const;

/** Still-clip floors (see header). */
export const PITCHING_CARD_FLOORS = {
  shoulder_tilt_deg: 2.74, eye_tilt_deg: 5.0, balance_deg: 1.69, stride_pct: 2.8,
  nose_ahead_ear_widths: 0.077, release_extension_in: 2.9, drag_foot_lengths: 0.2, swivel_deg: 19.7,
} as const;
/** A line seen within this fraction of its stance length is edge-on to the camera — its tilt is ill-conditioned. */
export const MIN_LINE_VISIBLE_FRACTION = 0.5;

export type CardKey = keyof typeof PITCHING_CARD_STANDARDS;
export interface PitchingCardTile {
  readonly key: CardKey;
  readonly value: number | null;
  readonly unit: string;
  readonly verdict: "pass" | "fail" | null;
  readonly elite: boolean | null;
  readonly graded: boolean;
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly standard: (typeof PITCHING_CARD_STANDARDS)[CardKey];
  readonly lineage: Readonly<Record<string, unknown>>;
}

const mr = (r: MissingnessReason) => missingness(r, "D-METRIC");
const refuse = (key: CardKey, unit: string, rec: MissingnessRecord, lineage: Record<string, unknown>): PitchingCardTile =>
  ({ key, value: null, unit, verdict: null, elite: null, graded: false, missingness: rec, confidence: missingConfidence(), standard: PITCHING_CARD_STANDARDS[key], lineage });
const ok = (key: CardKey, unit: string, value: number, verdict: "pass" | "fail" | null, lineage: Record<string, unknown>, elite: boolean | null = null): PitchingCardTile =>
  ({ key, value: round4(value), unit, verdict, elite, graded: verdict != null, missingness: null, confidence: uncalibrated(), standard: PITCHING_CARD_STANDARDS[key], lineage });

interface Ctx { s: LandmarkSeries; d: PitchingDelivery; lock: StanceLock; side: Handedness; dir: 1 | -1; heightIn: number | null }
const P = (c: Ctx, f: LandmarkSeriesFrame | undefined, i: number): Pt | null => {
  if (!f) return null; const p = pointPx(c.s, f, i); return p ? unroll(p, c.lock.baseline?.roll_deg ?? 0) : null;
};
/** Median of a per-frame value over k-1..k+1 (one bad frame never decides). */
const med3 = (c: Ctx, k: number, g: (f: LandmarkSeriesFrame) => number | null): number | null => {
  const v = [k - 1, k, k + 1].map((j) => (c.s.frames[j] ? g(c.s.frames[j]) : null)).filter((x): x is number => x != null).sort((a, b) => a - b);
  return v.length >= 2 ? v[Math.floor((v.length - 1) / 2)] : null;
};
const tiltDeg = (a: Pt, b: Pt) => (Math.atan2(Math.abs(b.y - a.y), Math.abs(b.x - a.x)) * 180) / Math.PI;

function tempo(c: Ctx): PitchingCardTile {
  const t = computeTempoSec({ peak_leg_lift_frame_index: c.s.frames[c.d.lift_k!].frame_index, front_foot_strike_frame_index: c.s.frames[c.d.plant_k!].frame_index, fps_true: c.s.header.fps_true });
  if (t.value == null) return refuse("tempo_sec", "seconds", t.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { upstream: t.lineage });
  return ok("tempo_sec", "seconds", t.value, t.value <= PITCHING_CARD_STANDARDS.tempo_sec.pass_max ? "pass" : "fail", { ...t.lineage, note: "revalidate against a real pitching clip" });
}

function lineTilt(c: Ctx, k: number, a: number, b: number, refLen: number | null) {
  return med3(c, k, (f) => {
    const p = P(c, f, a), q = P(c, f, b);
    if (!p || !q || !refLen) return null;
    if (Math.abs(q.x - p.x) < MIN_LINE_VISIBLE_FRACTION * refLen) return null; // edge-on → ill-conditioned
    return tiltDeg(p, q);
  });
}

function shoulderTilt(c: Ctx): PitchingCardTile {
  const v = lineTilt(c, c.d.release_k!, 11, 12, c.lock.baseline!.shoulder_len_px);
  if (v == null) return refuse("shoulder_tilt_deg", "degrees", mr(R.LANDMARK_OCCLUDED), { reason: "shoulders_edge_on_to_camera_at_release", min_visible_fraction: MIN_LINE_VISIBLE_FRACTION });
  return ok("shoulder_tilt_deg", "degrees", v, v <= PITCHING_CARD_STANDARDS.shoulder_tilt_deg.pass_max ? "pass" : "fail", { release_frame: c.s.frames[c.d.release_k!].frame_index, noise_floor_deg: PITCHING_CARD_FLOORS.shoulder_tilt_deg });
}

function stride(c: Ctx): PitchingCardTile {
  const st = c.lock.baseline!.stature_px;
  if (!st) return refuse("stride_pct_of_height", "percent_of_height", mr(R.CALIBRATION_UNAVAILABLE), { reason: "stature_unobserved_in_stance" });
  const back = med3(c, c.d.lift_k!, (f) => P(c, f, rearAnkleIndex(c.side))?.x ?? null);
  const front = med3(c, c.d.plant_k!, (f) => P(c, f, frontAnkleIndex(c.side))?.x ?? null);
  if (back == null || front == null) return refuse("stride_pct_of_height", "percent_of_height", mr(R.LANDMARK_OCCLUDED), { reason: "ankle_unobserved_at_lift_or_plant" });
  const pct = (((front - back) * c.dir) / st) * 100;
  return ok("stride_pct_of_height", "percent_of_height", pct, pct >= PITCHING_CARD_STANDARDS.stride_pct_of_height.pass_min ? "pass" : "fail",
    { back_ankle: rearAnkleIndex(c.side), front_ankle: frontAnkleIndex(c.side), noise_floor_pct: PITCHING_CARD_FLOORS.stride_pct, stature_source: "stance_lock_pixels" });
}

/** Lateral (across-the-target-line) quantities: a side-on camera looks straight down that axis. */
function lateralOnly(key: CardKey, unit: string, cam: CameraViewResult, what: string): PitchingCardTile {
  return refuse(key, unit, mr(R.CALIBRATION_UNAVAILABLE), {
    reason: cam.view === "on_line" ? "not_built:no_on_line_pitching_fixture" : "camera_view_mismatch:needs_on_line_view",
    message: `${what} runs across the target line; a side-on camera sees it end-on. Needs a clip filmed from behind or in front of the pitcher.`,
  });
}

function drag(c: Ctx): PitchingCardTile {
  const toe = c.side === "R" ? 32 : 31, heel = c.side === "R" ? 30 : 29; // rear (throwing-side) foot
  const lk = c.lock;
  const lens: number[] = [];
  for (let k = lk.start_k!; k <= lk.end_k!; k++) { const a = P(c, c.s.frames[k], toe), b = P(c, c.s.frames[k], heel); if (a && b) lens.push(Math.hypot(a.x - b.x, a.y - b.y)); }
  lens.sort((a, b) => a - b);
  const footLen = lens.length ? lens[Math.floor((lens.length - 1) / 2)] : null;
  const x0 = med3(c, c.d.plant_k!, (f) => P(c, f, toe)?.x ?? null), x1 = med3(c, c.d.release_k!, (f) => P(c, f, toe)?.x ?? null);
  if (!footLen || x0 == null || x1 == null) return refuse("drag_line", "foot_lengths", mr(R.LANDMARK_OCCLUDED), { reason: "rear_foot_unobserved" });
  const len = Math.max(0, ((x1 - x0) * c.dir) / footLen);
  return ok("drag_line", "foot_lengths", len, len <= PITCHING_CARD_STANDARDS.drag_line.length_max_foot_lengths ? "pass" : "fail",
    { window: "front-foot plant → release", foot_length_px: round4(footLen), direction: { value: null, reason: "camera_view_mismatch:needs_on_line_view" }, noise_floor_foot_lengths: PITCHING_CARD_FLOORS.drag_foot_lengths });
}

function stackTrack(c: Ctx): PitchingCardTile {
  const sh = lineTilt(c, c.d.release_k!, 11, 12, c.lock.baseline!.shoulder_len_px);
  const ey = lineTilt(c, c.d.release_k!, 2, 5, c.lock.baseline!.ear_width_px);
  if (sh == null || ey == null) return refuse("stack_and_track", "degrees", mr(R.LANDMARK_OCCLUDED), { reason: sh == null ? "shoulders_edge_on_to_camera_at_release" : "eyes_edge_on_to_camera_at_release", shoulders: sh, eyes: ey });
  const v = Math.max(sh, ey);
  return ok("stack_and_track", "degrees", v, v <= PITCHING_CARD_STANDARDS.stack_and_track.pass_max ? "pass" : "fail",
    { shoulders_deg: round4(sh), eyes_deg: round4(ey), elite_note: `elite (0°) is only resolvable to the ${PITCHING_CARD_FLOORS.eye_tilt_deg}° eye-line floor`, root_pattern_key: POSTURE_ROOT }, v <= PITCHING_CARD_FLOORS.eye_tilt_deg);
}

function balance(c: Ctx): PitchingCardTile {
  const v = med3(c, c.d.plant_k!, (f) => {
    const a = P(c, f, 27), b = P(c, f, 28), e1 = P(c, f, 2), e2 = P(c, f, 5);
    if (!a || !b || !e1 || !e2) return null;
    const bx = (a.x + b.x) / 2, by = (a.y + b.y) / 2, ex = (e1.x + e2.x) / 2, ey = (e1.y + e2.y) / 2;
    return by > ey ? Math.abs((Math.atan2(ex - bx, by - ey) * 180) / Math.PI) : null;
  });
  if (v == null) return refuse("balance_at_landing", "degrees", mr(R.LANDMARK_OCCLUDED), { reason: "eyes_or_ankles_unobserved_at_plant" });
  return ok("balance_at_landing", "degrees", v, v <= PITCHING_CARD_STANDARDS.balance_at_landing.pass_max_from_vertical_deg ? "pass" : "fail",
    { interpretation: "eye midpoint within 15° of vertical over the midpoint of the two ankles at front-foot strike — OWNER TO CONFIRM", noise_floor_deg: PITCHING_CARD_FLOORS.balance_deg, root_pattern_key: POSTURE_ROOT });
}

/** MediaPipe cannot see the eyes or where they look. */
export const EYES_PROXY = {
  measures: "head direction (nose ahead of the ear line toward the target) at peak leg lift",
  is_proxy_for: "eye direction",
  cannot_see: "pupils, gaze, or whether the eyes are on the glove; a pitcher can face the target and look elsewhere",
} as const;
function eyesOnTarget(c: Ctx): PitchingCardTile {
  const ew = c.lock.baseline!.ear_width_px;
  const v = med3(c, c.d.lift_k!, (f) => { const n = P(c, f, 0), a = P(c, f, 7), b = P(c, f, 8); return n && a && b && ew ? ((n.x - (a.x + b.x) / 2) * c.dir) / ew : null; });
  if (v == null) return refuse("eyes_on_target_at_peak_lift", "ear_widths", mr(R.LANDMARK_OCCLUDED), { reason: "face_unobserved_at_peak_lift", proxy: EYES_PROXY });
  if (Math.abs(v) < PITCHING_CARD_FLOORS.nose_ahead_ear_widths) return refuse("eyes_on_target_at_peak_lift", "ear_widths", mr(R.INSUFFICIENT_TEMPORAL_RESOLUTION), { reason: "nose_on_ear_line_within_noise", raw: round4(v), proxy: EYES_PROXY });
  return ok("eyes_on_target_at_peak_lift", "ear_widths", v, v > 0 ? "pass" : "fail", { sign: "+ = nose ahead of the ears toward the target", noise_floor: PITCHING_CARD_FLOORS.nose_ahead_ear_widths, proxy: EYES_PROXY });
}

function releaseExtension(c: Ctx): PitchingCardTile {
  const W = c.side === "R" ? 16 : 15, toe = c.side === "R" ? 31 : 32; // throwing wrist, FRONT toe
  const st = c.lock.baseline!.stature_px;
  const v = med3(c, c.d.release_k!, (f) => { const w = P(c, f, W), t = P(c, f, toe); return w && t ? (w.x - t.x) * c.dir : null; });
  if (v == null) return refuse("release_extension", "inches", mr(R.LANDMARK_OCCLUDED), { reason: "throwing_wrist_or_front_toe_unobserved_at_release" });
  if (!c.heightIn || !st) return refuse("release_extension", "inches", mr(R.CALIBRATION_UNAVAILABLE), { reason: "athlete_height_unavailable", raw_px: round4(v) });
  const inch = (v / st) * c.heightIn, [lo, hi] = PITCHING_CARD_STANDARDS.release_extension.band_in, fl = PITCHING_CARD_FLOORS.release_extension_in;
  // Owner 2026-09-29 "Keep" — but call only clear cases. A pass needs the value inside the band by more
  // than the floor on BOTH sides; with a 2.9 in floor and a 4 in band that window is empty, so a pass
  // can never be called honestly today. Only a release clearly outside the band (by > floor) fails.
  const lin = { noise_floor_in: fl, note: "floor exceeds half the owner's band — only clear fails can be called; a pass is not resolvable" };
  const passLo = lo + fl, passHi = hi - fl;
  if (passLo <= passHi && inch >= passLo && inch <= passHi) return ok("release_extension", "inches", inch, "pass", lin);
  if (inch < lo - fl || inch > hi + fl) return ok("release_extension", "inches", inch, "fail", lin);
  return refuse("release_extension", "inches", mr(R.INSUFFICIENT_TEMPORAL_RESOLUTION), { ...lin, reason: "near_band_edge_within_noise_no_call", raw_in: round4(inch) });
}

export const POSTURE_ROOT = "posture_did_not_stay_stacked" as const;

export function runPitchingCardTiles(series: LandmarkSeries, o: { throwing_side: Handedness | null; athlete_height_in: number | null }) {
  const d = findPitchingDelivery(series, o.throwing_side);
  const cam = detectCameraView(series);
  const U: Record<CardKey, string> = { tempo_sec: "seconds", shoulder_tilt_deg: "degrees", stride_pct_of_height: "percent_of_height", head_at_release_deg: "degrees", drag_line: "foot_lengths", stack_and_track: "degrees", balance_at_landing: "degrees", eyes_on_target_at_peak_lift: "ear_widths", glove_swivel: "pattern", glove_drift_outside_frame_in: "inches", release_extension: "inches" };
  const keys = Object.keys(U) as CardKey[];
  const all = (rec: MissingnessRecord, l: Record<string, unknown>) => Object.fromEntries(keys.map((k) => [k, refuse(k, U[k], rec, l)])) as Record<CardKey, PitchingCardTile>;
  const base = { version: PITCHING_CARD_TILES_VERSION, validated: false, camera_view: cam, delivery: { ok: d.ok, refusal_detail: d.refusal_detail } };
  if (!d.ok) return { ...base, tiles: all(d.refusal!, { gate: d.refusal_detail }) };
  const lock = detectStanceLock(series, { before_frame: series.frames[d.lift_k!].frame_index });
  const noBase = !lock.ok || !lock.baseline?.stature_px;
  const c: Ctx = { s: series, d, lock, side: d.throwing_side!, dir: d.direction_sign!, heightIn: o.athlete_height_in };
  const gate = (t: PitchingCardTile): PitchingCardTile => {
    const g = checkCameraRequirement(t.key, cam.view);
    return g.ok || t.missingness ? t : refuse(t.key, t.unit, mr(R.CALIBRATION_UNAVAILABLE), { reason: g.detail, message: g.message });
  };
  const lockRef = (k: CardKey) => refuse(k, U[k], lock.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: lock.detail ?? "stance_lock_missing" });
  const needLock = (k: CardKey, f: () => PitchingCardTile) => (noBase ? lockRef(k) : f());
  const tiles: Record<CardKey, PitchingCardTile> = {
    tempo_sec: tempo(c),
    shoulder_tilt_deg: needLock("shoulder_tilt_deg", () => shoulderTilt(c)),
    stride_pct_of_height: needLock("stride_pct_of_height", () => stride(c)),
    head_at_release_deg: lateralOnly("head_at_release_deg", "degrees", cam, "The head's angle to the target line"),
    drag_line: needLock("drag_line", () => drag(c)),
    stack_and_track: needLock("stack_and_track", () => stackTrack(c)),
    balance_at_landing: balance({ ...c }),
    eyes_on_target_at_peak_lift: needLock("eyes_on_target_at_peak_lift", () => eyesOnTarget(c)),
    glove_swivel: refuse("glove_swivel", "pattern", mr(R.HANDS_NOT_DETECTED), { reason: "glove_hides_hand_landmarks", permanent_until: "a detector that can see the glove hand", never_approximated_from: "wrist", still_bare_hand_floor_deg: PITCHING_CARD_FLOORS.swivel_deg, message: "The pose model's finger points are guesses under a glove; the open→closed turn cannot be read from them." }),
    glove_drift_outside_frame_in: lateralOnly("glove_drift_outside_frame_in", "inches", cam, "Glove drift outside the shoulder frame"),
    release_extension: needLock("release_extension", () => releaseExtension(c)),
  };
  for (const k of keys) tiles[k] = gate(tiles[k]);
  return { ...base, arm_slot: measureArmSlot(series, d.release_k, d.throwing_side), stance_lock: { ok: lock.ok, detail: lock.detail }, tiles };
}

/** Root pattern: shoulder tilt, stack & track and balance at landing read one fault — the body not staying stacked. One finding. */
export function pitchingRootPatterns(t: Record<CardKey, PitchingCardTile>, headVerticalVerdict: "pass" | "fail" | null = null) {
  const evidence = [
    t.shoulder_tilt_deg.verdict === "fail" ? "shoulder_tilt_deg" : null,
    t.stack_and_track.verdict === "fail" ? "stack_and_track" : null,
    t.balance_at_landing.verdict === "fail" ? "balance_at_landing" : null,
    headVerticalVerdict === "fail" ? "head_vertical_movement_pct" : null,
  ].filter((x): x is string => x != null);
  return evidence.length ? [{ root_pattern_key: POSTURE_ROOT, evidence }] : [];
}
