/**
 * Camera position from the pose itself. Pure, deterministic.
 *
 * Geometry: in the stance a hitter / pitcher stands SIDEWAYS to the target line.
 *  - Camera 90° to the target line ("side_on") sees the chest: the shoulder
 *    segment is near full length in the image (width / torso-height ≈ 0.6–0.7
 *    for adults) and the feet are spread left–right in the image.
 *  - Camera ON the rubber-to-plate line ("on_line", behind plate / centre field)
 *    sees the athlete in profile: shoulder segment collapses toward zero and the
 *    feet overlap in x.
 * Both signals must agree; otherwise "undetermined". Never guessed.
 *
 * Thresholds are GEOMETRIC, not fitted: 0.45 sits between the frontal (~0.6)
 * and profile (~0.15) shoulder ratios; 0.25 is the on-line ceiling. Validated
 * only on side-on clips so far (still 0.59, 914cf54c 0.60); NO confirmed
 * on-line clip exists — the on_line branch is geometry-only until one does.
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { LM, pointPx, median, round4 } from "../anchors/poseKinematics";
import { detectStanceLock } from "../anchors/stanceLock";

export const CAMERA_VIEW_VERSION = "camera_view@1.0.0-stance-shoulder-ratio-ankle-spread";
export const SIDE_ON_MIN_SHOULDER_RATIO = 0.45;
export const ON_LINE_MAX_SHOULDER_RATIO = 0.25;
/** Ankle x-spread as a fraction of shoulder→ankle height. */
export const SIDE_ON_MIN_ANKLE_SPREAD = 0.15;
export const ON_LINE_MAX_ANKLE_SPREAD = 0.08;

export type CameraView = "side_on" | "on_line";
export type CameraRequirement = CameraView | "either" | "two_view";
export interface CameraViewResult {
  readonly view: CameraView | null;
  readonly reason: string | null;
  readonly shoulder_ratio: number | null;
  readonly ankle_spread: number | null;
  readonly window: "stance_lock" | "first_second" | null;
  readonly version: string;
}

export function detectCameraView(series: LandmarkSeries): CameraViewResult {
  const lock = detectStanceLock(series);
  let k0: number, k1: number, window: CameraViewResult["window"];
  if (lock.ok) { k0 = lock.start_k!; k1 = lock.end_k!; window = "stance_lock"; }
  else {
    const fps = series.header.fps_true;
    const n = Number.isFinite(fps) && fps > 0 ? Math.round(fps) : 30;
    k0 = 0; k1 = Math.min(series.frames.length - 1, n - 1); window = "first_second";
  }
  const sr: number[] = [], as: number[] = [];
  for (let k = k0; k <= k1; k++) {
    const f = series.frames[k];
    const ls = pointPx(series, f, LM.L_SHOULDER), rs = pointPx(series, f, LM.R_SHOULDER);
    const lh = pointPx(series, f, LM.L_HIP), rh = pointPx(series, f, LM.R_HIP);
    const la = pointPx(series, f, LM.L_ANKLE), ra = pointPx(series, f, LM.R_ANKLE);
    if (!ls || !rs || !lh || !rh) continue;
    const torso = Math.abs((lh.y + rh.y) / 2 - (ls.y + rs.y) / 2);
    if (torso > 0) sr.push(Math.abs(ls.x - rs.x) / torso);
    if (la && ra) {
      const h = Math.abs((la.y + ra.y) / 2 - (ls.y + rs.y) / 2);
      if (h > 0) as.push(Math.abs(la.x - ra.x) / h);
    }
  }
  const s = median(sr), a = median(as);
  const base = { shoulder_ratio: s == null ? null : round4(s), ankle_spread: a == null ? null : round4(a), window, version: CAMERA_VIEW_VERSION };
  if (s == null || a == null) return { ...base, view: null, reason: "shoulders_hips_or_ankles_unobserved_in_stance" };
  const sideOn = s >= SIDE_ON_MIN_SHOULDER_RATIO && a >= SIDE_ON_MIN_ANKLE_SPREAD;
  const onLine = s <= ON_LINE_MAX_SHOULDER_RATIO && a <= ON_LINE_MAX_ANKLE_SPREAD;
  if (sideOn) return { ...base, view: "side_on", reason: null };
  if (onLine) return { ...base, view: "on_line", reason: null };
  return { ...base, view: null, reason: "signals_between_side_on_and_on_line_or_disagree" };
}

/** Per-tile optimal camera position, from geometry (see docs/camera-requirements.md). */
export const TILE_CAMERA_REQUIREMENTS: Readonly<Record<string, CameraRequirement>> = {
  // pitching
  energy_angle_deg: "side_on",
  lift_thrust: "side_on",
  head_vertical_movement_pct: "either",
  premature_shoulder_open_deg: "side_on", // v2.2 fusion reads side-on 2-D signals
  // pitching card 2026-09-29: lines that face the target at release are edge-on to a side-on camera.
  tempo_sec: "either",
  shoulder_tilt_deg: "on_line",
  stack_and_track: "on_line",
  head_at_release_deg: "on_line",
  glove_drift_outside_frame_in: "on_line",
  stride_pct_of_height: "side_on",
  drag_line: "side_on",
  release_extension: "side_on",
  eyes_on_target_at_peak_lift: "side_on",
  balance_at_landing: "either",
  glove_swivel: "either",
  // hitting owner tiles
  head_path_through_stride: "side_on",
  back_hip_socket_hold: "side_on",
  // pose-only hitting tiles
  hip_load: "side_on",
  hand_load: "side_on",
  head_discipline: "side_on",
  // ground-plane angle: side-on sees only the forward component, on-line only the lateral one.
  stride_direction: "two_view",
  heel_plant: "side_on",
  back_heel_early_rise: "side_on",
  hands_outside_shoulders_at_landing: "side_on",
  shoulder_plane_steadiness: "side_on",
  finish_balance: "either",
  back_knee_flex_maintained: "side_on",
  post_landing_hip_drift: "side_on",
  hands_stay_up_at_plant: "either",
  lead_elbow_bend_increasing: "side_on",
  head_vertical_movement_post_landing: "either",
  sequencing: "side_on",
  back_elbow_connection: "side_on",
  shoulder_to_shoulder_hold: "side_on",
  pelvis_rotation_efficiency: "side_on",
  tempo: "either",
};

const VIEW_TEXT: Record<CameraView, string> = {
  side_on: "the camera side-on, 90° to the line from the pitcher to home plate",
  on_line: "the camera on the pitcher-to-plate line (behind home plate or from centre field)",
};

export interface CameraGate { readonly ok: boolean; readonly detail: string | null; readonly message: string | null }

/** ok=false only when the clip's view is KNOWN and wrong. Undetermined view proceeds (noted). */
export function checkCameraRequirement(tile: string, view: CameraView | null): CameraGate {
  const req = TILE_CAMERA_REQUIREMENTS[tile] ?? "either";
  if (req === "either") return { ok: true, detail: null, message: null };
  if (req === "two_view") return {
    ok: false, detail: "camera_view_mismatch:needs_two_view_pair",
    message: "This measurement needs two clips of the same swing: one side-on and one on the pitcher-to-plate line. A single camera sees only half of the angle.",
  };
  if (view == null) return { ok: true, detail: `camera_view_undetermined:needs_${req}`, message: null };
  if (view === req) return { ok: true, detail: null, message: null };
  return {
    ok: false,
    detail: `camera_view_mismatch:needs_${req}:clip_${view}`,
    message: `This measurement needs ${VIEW_TEXT[req]}. This clip is ${view === "side_on" ? "side-on" : "filmed on the pitcher-to-plate line"}.`,
  };
}

export function tilesForView(view: CameraView | null): { can: string[]; cannot: string[] } {
  const can: string[] = [], cannot: string[] = [];
  for (const t of Object.keys(TILE_CAMERA_REQUIREMENTS)) (checkCameraRequirement(t, view).ok ? can : cannot).push(t);
  return { can, cannot };
}
