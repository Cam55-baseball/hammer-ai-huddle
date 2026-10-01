/**
 * Tracking diagnosis — says WHY the athlete track broke, in plain language,
 * with a filming instruction. It replaces the bare "track unreliable".
 *
 * Pure function of the persisted landmark series. No model call, no clock, no
 * randomness: same series → same diagnosis.
 *
 * Causes (each needs its own evidence; none is ever inferred from another):
 *   left_frame       body box touching a frame edge on the last frame before a
 *                    tracking gap of ≥ MIN_GAP_FRAMES
 *   body_cut_off     head or feet outside the frame / not visible on more than
 *                    CUT_OFF_SHARE of tracked frames
 *   multiple_people  ≥ 2 people detected on at least MULTI_MIN_FRAMES frames
 *                    (needs per-frame people counts — series written before
 *                    that was recorded report this cause as "not assessed")
 *   too_small        on most frames NOBODY was detected at all (gap_reason
 *                    "no_person" on ≥ TOO_SMALL_NO_PERSON_SHARE of frames) AND
 *                    the body box on held frames is below TOO_SMALL_BODY of
 *                    the frame height — the detector cannot find a figure that
 *                    small (e.g. a TV broadcast wide shot). Ranked first when
 *                    present: missing feet on a tiny figure is a symptom, not
 *                    the cause.
 *   low_light        torso landmark visibility below LOW_VIS on average
 *   camera_moving    head AND both feet drift the same way by ≥ CAMERA_SHIFT
 *                    body heights (smoothed), while the gap between the ankles
 *                    and the athlete's on-screen size stay constant — i.e. the
 *                    body moved rigidly, as it does when the phone pans. A
 *                    stride, a step or walking toward the lens changes the
 *                    ankle gap or the size and does not count.
 *
 * Ordering: by severity (share of the clip the cause explains), dominant first.
 * If the track is unreliable and no cause has evidence, the answer is
 * "undetermined" — never a guessed cause.
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "./landmarkSeriesFormat";

export const TRACK_DIAGNOSIS_VERSION = "track_diagnosis@1.1.0";

const VIS = 0.5;
const EDGE = 0.02;
const MIN_GAP_FRAMES = 3;
const CUT_OFF_SHARE = 0.25;
const MULTI_MIN_FRAMES = 5;
const MULTI_MIN_SHARE = 0.1;
const LOW_VIS = 0.6;
/** Share of frames where nobody at all was detected. */
const TOO_SMALL_NO_PERSON_SHARE = 0.5;
/** Median held body-box height (share of frame height). Phone clips that work sit ~0.7; the failing broadcast clips sit ~0.1. */
const TOO_SMALL_BODY = 0.3;
const MIN_OBSERVED = 10;
const CAMERA_SHIFT = 0.25;
const SMOOTH = 15;
/** Ankle-gap change allowed, as a share of the shift, for the feet to count as moving together. */
const SEP_RIGID_SHARE = 0.3;
/** On-screen size change (share of body height) allowed for a camera move. */
const SIZE_TOLERANCE = 0.15;

const NOSE = 0, L_SH = 11, R_SH = 12, L_HIP = 23, R_HIP = 24, L_ANK = 27, R_ANK = 28;

export type TrackCause =
  | { kind: "left_frame"; severity: number; exits: { start_sec: number; end_sec: number | null; edge: "left" | "right" | "top" | "bottom" }[]; frames: number }
  | { kind: "body_cut_off"; severity: number; end: "head" | "feet" | "head_and_feet"; head_share: number; feet_share: number }
  | { kind: "multiple_people"; severity: number; multi_frames: number; max_people: number; lost_to_other: number; regained: number }
  | { kind: "too_small"; severity: number; no_person_share: number; body_height_share: number }
  | { kind: "low_light"; severity: number; torso_visibility: number }
  | { kind: "camera_moving"; severity: number; shift_body: number };

export interface TrackCauseMessage { readonly title: string; readonly detail: string; readonly fix: string; }

export type TrackDiagnosis =
  | { status: "clean"; version: string }
  | {
      status: "diagnosed" | "undetermined";
      version: string;
      track_reliable: boolean | null;
      frames_total: number;
      frames_lost: number;
      reacquisitions: number;
      causes: TrackCause[];
      messages: TrackCauseMessage[];
      not_assessed: string[];
    };

const pt = (f: LandmarkSeriesFrame, i: number) =>
  f.pose_detected && f.normalized.length >= (i + 1) * 3
    ? { x: f.normalized[i * 3], y: f.normalized[i * 3 + 1], v: f.visibility[i] ?? 0 }
    : null;

function median(a: number[]): number | null {
  if (a.length === 0) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r1 = (n: number) => Math.round(n * 10) / 10;

function smoothedRange(xs: Array<number | null>): { delta: number } | null {
  const sm: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const w: number[] = [];
    for (let j = Math.max(0, i - (SMOOTH >> 1)); j <= Math.min(xs.length - 1, i + (SMOOTH >> 1)); j++) {
      const v = xs[j];
      if (v != null) w.push(v);
    }
    if (w.length >= Math.ceil(SMOOTH / 3) && xs[i] != null) sm.push(median(w)!);
  }
  if (sm.length < MIN_OBSERVED) return null;
  // Signed net shift between the first and last smoothed positions.
  return { delta: sm[sm.length - 1] - sm[0] };
}

export function diagnoseTrack(series: LandmarkSeries): TrackDiagnosis {
  const frames = series.frames;
  const h = series.header;
  const total = frames.length;
  const observed = frames.filter((f) => f.pose_detected);
  const causes: TrackCause[] = [];
  const notAssessed: string[] = [];

  // Body height: median nose→ankle-mid vertical span on well-seen frames.
  const spans: number[] = [];
  for (const f of observed) {
    const n = pt(f, NOSE), a = pt(f, L_ANK), b = pt(f, R_ANK);
    if (n && a && b && n.v >= VIS && a.v >= VIS && b.v >= VIS) spans.push((a.y + b.y) / 2 - n.y);
  }
  const bodyH = median(spans);

  // ---- left_frame --------------------------------------------------------
  {
    const exits: { start_sec: number; end_sec: number | null; edge: "left" | "right" | "top" | "bottom" }[] = [];
    let explained = 0;
    let i = 0;
    let seen = false;
    while (i < total) {
      if (frames[i].pose_detected) { seen = true; i++; continue; }
      const start = i;
      while (i < total && !frames[i].pose_detected) i++;
      const len = i - start;
      if (!seen || len < MIN_GAP_FRAMES) continue;
      const last = frames[start - 1];
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      for (let k = 0; k < 33; k++) {
        const p = pt(last, k);
        if (!p || p.v < VIS) continue;
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
      const edge = minX <= EDGE ? "left" : maxX >= 1 - EDGE ? "right" : minY <= EDGE ? "top" : maxY >= 1 - EDGE ? "bottom" : null;
      if (!edge) continue;
      exits.push({ start_sec: r1(frames[start].timestamp_seconds), end_sec: i < total ? r1(frames[i].timestamp_seconds) : null, edge });
      explained += len;
    }
    if (exits.length > 0) causes.push({ kind: "left_frame", severity: explained / Math.max(1, total), exits, frames: explained });
  }

  // ---- body_cut_off ------------------------------------------------------
  if (observed.length >= MIN_OBSERVED) {
    let head = 0, feet = 0;
    for (const f of observed) {
      const n = pt(f, NOSE);
      if (!n || n.v < VIS || n.y < 0.01) head++;
      const a = pt(f, L_ANK), b = pt(f, R_ANK);
      if (!a || !b || Math.min(a.v, b.v) < VIS || Math.max(a.y, b.y) > 0.99) feet++;
    }
    const hs = head / observed.length, fs = feet / observed.length;
    if (hs > CUT_OFF_SHARE || fs > CUT_OFF_SHARE) {
      causes.push({
        kind: "body_cut_off",
        severity: Math.max(hs, fs) * 0.8,
        end: hs > CUT_OFF_SHARE && fs > CUT_OFF_SHARE ? "head_and_feet" : hs > CUT_OFF_SHARE ? "head" : "feet",
        head_share: r3(hs), feet_share: r3(fs),
      });
    }
  }

  // ---- multiple_people ---------------------------------------------------
  const hasCounts = frames.some((f) => f.candidates_detected !== undefined);
  if (!hasCounts) {
    notAssessed.push("multiple_people");
  } else {
    let multi = 0, maxPeople = 0, lostToOther = 0, regained = 0;
    let inOtherGap = false;
    for (const f of frames) {
      const c = f.candidates_detected ?? 0;
      maxPeople = Math.max(maxPeople, c);
      if (c >= 2) multi++;
      if (!f.pose_detected && f.gap_reason === "no_match" && c >= 1) { lostToOther++; inOtherGap = true; }
      else if (f.pose_detected && inOtherGap) { regained++; inOtherGap = false; }
      else if (!f.pose_detected) { /* gap for another reason; keep state */ }
    }
    if (multi >= MULTI_MIN_FRAMES && multi / Math.max(1, total) >= MULTI_MIN_SHARE) {
      causes.push({
        kind: "multiple_people",
        severity: lostToOther / Math.max(1, total) + 0.05,
        multi_frames: multi, max_people: maxPeople, lost_to_other: lostToOther, regained,
      });
    }
  }

  // ---- too_small ---------------------------------------------------------
  if (hasCounts && observed.length > 0) {
    const noPerson = frames.filter((f) => !f.pose_detected && f.gap_reason === "no_person").length / Math.max(1, total);
    const boxes: number[] = [];
    for (const f of observed) {
      let minY = 1, maxY = 0;
      for (let k = 0; k < 33; k++) {
        const y = f.normalized[k * 3 + 1];
        if (!Number.isFinite(y)) continue;
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      if (maxY > minY) boxes.push(maxY - minY);
    }
    const box = median(boxes);
    if (box != null && noPerson >= TOO_SMALL_NO_PERSON_SHARE && box < TOO_SMALL_BODY) {
      // +1 so it outranks the symptoms it explains (feet "cut off", lost frames).
      causes.push({ kind: "too_small", severity: 1 + noPerson, no_person_share: r3(noPerson), body_height_share: r3(box) });
    }
  }

  // ---- low_light ---------------------------------------------------------
  if (observed.length >= MIN_OBSERVED) {
    const vs: number[] = [];
    for (const f of observed) {
      const v = [L_SH, R_SH, L_HIP, R_HIP].map((k) => f.visibility[k] ?? 0);
      vs.push(v.reduce((s, x) => s + x, 0) / v.length);
    }
    const mean = vs.reduce((s, x) => s + x, 0) / vs.length;
    if (mean < LOW_VIS) causes.push({ kind: "low_light", severity: (LOW_VIS - mean) + 0.1, torso_visibility: r3(mean) });
  }

  // ---- camera_moving -----------------------------------------------------
  if (bodyH == null || !(bodyH > 0)) {
    notAssessed.push("camera_moving");
  } else {
    const series1 = (k: number, axis: "x" | "y") => frames.map((f) => { const p = pt(f, k); return p && p.v >= VIS ? p[axis] : null; });
    let best = 0;
    for (const axis of ["x", "y"] as const) {
      const hd = smoothedRange(series1(NOSE, axis));
      const la = smoothedRange(series1(L_ANK, axis));
      const ra = smoothedRange(series1(R_ANK, axis));
      if (!hd || !la || !ra) continue;
      const ds = [hd.delta, la.delta, ra.delta];
      const sameSign = ds.every((d) => d > 0) || ds.every((d) => d < 0);
      if (!sameSign) continue;
      const shift = Math.min(...ds.map(Math.abs)) / bodyH;
      // A moving camera carries both feet by the same amount: the gap between
      // the ankles stays put. Walking (or a different body) changes it.
      const sep = smoothedRange(frames.map((f) => {
        const a = pt(f, L_ANK), b = pt(f, R_ANK);
        return a && b && a.v >= VIS && b.v >= VIS ? a[axis] - b[axis] : null;
      }));
      if (!sep || Math.abs(sep.delta) / bodyH > SEP_RIGID_SHARE * shift) continue;
      // Nor does the athlete's size on screen change (walking toward/away does).
      const sz = smoothedRange(frames.map((f) => {
        const n = pt(f, NOSE), a = pt(f, L_ANK), b = pt(f, R_ANK);
        return n && a && b && n.v >= VIS && a.v >= VIS && b.v >= VIS ? (a.y + b.y) / 2 - n.y : null;
      }));
      if (!sz || Math.abs(sz.delta) / bodyH > SIZE_TOLERANCE) continue;
      best = Math.max(best, shift);
    }
    if (best >= CAMERA_SHIFT) causes.push({ kind: "camera_moving", severity: Math.min(1, best) * 0.6, shift_body: r3(best) });
  }

  causes.sort((a, b) => b.severity - a.severity || a.kind.localeCompare(b.kind));
  const reliable = h.subject_track_reliable ?? null;
  if (causes.length === 0 && reliable !== false) return { status: "clean", version: TRACK_DIAGNOSIS_VERSION };
  return {
    status: causes.length > 0 ? "diagnosed" : "undetermined",
    version: TRACK_DIAGNOSIS_VERSION,
    track_reliable: reliable,
    frames_total: total,
    frames_lost: h.subject_frames_lost ?? frames.filter((f) => !f.pose_detected).length,
    reacquisitions: h.subject_reacquisitions ?? 0,
    causes,
    messages: causes.map(describeCause),
    not_assessed: notAssessed,
  };
}

const EDGE_WORD = { left: "left edge", right: "right edge", top: "top", bottom: "bottom" } as const;

export function describeCause(c: TrackCause): TrackCauseMessage {
  switch (c.kind) {
    case "left_frame": {
      const when = c.exits
        .slice(0, 3)
        .map((e) => `at ${e.start_sec}s off the ${EDGE_WORD[e.edge]}${e.end_sec != null ? ` (back at ${e.end_sec}s)` : ""}`)
        .join(", ");
      return {
        title: "The athlete left the frame",
        detail: `The athlete went out of the picture ${when}.`,
        fix: "Step the camera back so there's room on every side for the whole movement, including the stride and follow-through.",
      };
    }
    case "body_cut_off": {
      const part = c.end === "head" ? "head" : c.end === "feet" ? "feet" : "head and feet";
      const share = Math.round(Math.max(c.head_share, c.feet_share) * 100);
      return {
        title: `The athlete's ${part} ${c.end === "head_and_feet" ? "were" : "was"} cut off`,
        detail: `The ${part} couldn't be seen in about ${share}% of the clip.`,
        fix: "Frame the athlete from head to feet with some space above the head and below the feet.",
      };
    }
    case "multiple_people":
      return {
        title: "More than one person was in the frame",
        detail: `Up to ${c.max_people} people were seen, in ${c.multi_frames} frames. Tracking lost the athlete for ${c.lost_to_other} frames while someone else was in view${c.regained > 0 ? ` and had to find them again ${c.regained} ${c.regained === 1 ? "time" : "times"}` : ""}.`,
        fix: "Film with only the athlete in frame — ask coaches, catchers and teammates to step out of the shot.",
      };
    case "too_small":
      return {
        title: "The athlete was too small in the picture",
        detail: `On most of the clip nobody could be found at all — the athlete only filled about ${Math.round(c.body_height_share * 100)}% of the picture's height. This happens with wide or TV broadcast shots.`,
        fix: "Film one rep from one steady camera, close enough that the athlete fills most of the picture from head to feet.",
      };
    case "low_light":
      return {
        title: "The athlete was hard to see",
        detail: `The body was only faintly visible for the whole clip (visibility ${Math.round(c.torso_visibility * 100)}%). This is usually poor lighting or a busy background.`,
        fix: "Film in brighter, even light with the light behind the camera, not behind the athlete.",
      };
    case "camera_moving":
      return {
        title: "The camera seemed to move",
        detail: `The whole body, feet included, shifted together by about ${Math.round(c.shift_body * 100)}% of the athlete's height. That usually means the phone moved (or the athlete walked during the clip).`,
        fix: "Put the phone on a tripod or prop it against something solid, and don't pan or zoom while recording.",
      };
  }
}

export const UNDETERMINED_MESSAGE: TrackCauseMessage = {
  title: "Tracking was lost and we couldn't tell why",
  detail: "The athlete couldn't be followed through the whole clip, and nothing in the clip showed a clear reason.",
  fix: "Try again with the whole body in frame, one person in the shot, good light and a steady phone.",
};
