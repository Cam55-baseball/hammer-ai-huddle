/**
 * Clip pre-check (owner 2026-10-01): judge a chosen clip in about a second,
 * BEFORE analysis, and tell the athlete exactly what to change.
 *
 * Advisory only: it never blocks the analysis (the analysis always runs);
 * it predicts whether the report-card tiles will read.
 *
 * Thresholds are PROPOSED (geometric, not fitted): the owner's failed clip
 * had pose on 67/180 frames with a small broadcast-size subject.
 */
import { getPoseLandmarkerForDenseCapture, detectDensePoseCandidates } from "./poseRunner";

export const PREFLIGHT_SAMPLES = 10;
/** Body (nose→lower ankle) must fill at least this share of frame height. PROPOSED. */
export const MIN_BODY_FILL = 0.4;
/** Share of sampled frames where a body must be found. PROPOSED. */
export const MIN_DETECTION_RATE = 0.7;
/** Wrist travel (share of body height) across samples that counts as movement. PROPOSED. */
export const MIN_MOVEMENT = 0.15;

export interface PreflightSample {
  people: number;
  /** Subject body height as share of frame height, null when no body. */
  bodyFill: number | null;
  /** Subject mid-wrist (x,y) normalized, null when no body. */
  wrist: [number, number] | null;
  /** Whether head and both ankles are inside the frame. */
  wholeBody: boolean;
}

export type PreflightIssue = "too_far" | "not_found" | "cut_off" | "many_people" | "no_movement" | "low_fps";

export interface PreflightVerdict {
  willRead: boolean;
  issues: { kind: PreflightIssue; title: string; fix: string }[];
  stats: { detectionRate: number; medianFill: number | null; maxPeople: number; movement: number | null };
}

const COPY: Record<PreflightIssue, { title: string; fix: string }> = {
  not_found: { title: "We can barely find the player in this clip", fix: "Film from closer with the player clearly in the middle of the shot." },
  too_far: { title: "You're too far from the camera", fix: "Move closer so the player fills most of the screen from head to feet." },
  cut_off: { title: "Part of the body is out of the shot", fix: "Keep the whole body in frame — head to feet — the entire time." },
  many_people: { title: "There's more than one person in the shot", fix: "Film with only the player in frame, or move so others are out of the shot." },
  no_movement: { title: "This clip may not contain the movement", fix: "Trim the clip so it starts just before the move and ends after the finish." },
  low_fps: { title: "This clip's frame rate is low", fix: "Record at the phone's normal or slow-motion setting, not a re-shared copy." },
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function judgeClipPreflight(samples: readonly PreflightSample[], fps: number | null): PreflightVerdict {
  const found = samples.filter((s) => s.bodyFill != null);
  const detectionRate = samples.length ? found.length / samples.length : 0;
  const medianFill = median(found.map((s) => s.bodyFill as number));
  const maxPeople = samples.reduce((m, s) => Math.max(m, s.people), 0);
  const multiShare = samples.length ? samples.filter((s) => s.people > 1).length / samples.length : 0;
  const wrists = found.map((s) => s.wrist).filter((w): w is [number, number] => !!w);
  let movement: number | null = null;
  if (wrists.length >= 3 && medianFill) {
    const xs = wrists.map((w) => w[0]), ys = wrists.map((w) => w[1]);
    movement = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / medianFill;
  }
  const kinds: PreflightIssue[] = [];
  if (detectionRate < MIN_DETECTION_RATE) kinds.push("not_found");
  if (medianFill != null && medianFill < MIN_BODY_FILL) kinds.push("too_far");
  if (found.length && found.filter((s) => !s.wholeBody).length / found.length > 0.3) kinds.push("cut_off");
  if (multiShare > 0.5) kinds.push("many_people");
  if (movement != null && movement < MIN_MOVEMENT) kinds.push("no_movement");
  if (fps != null && fps < 23.5) kinds.push("low_fps");
  const blocking: PreflightIssue[] = ["not_found", "too_far", "cut_off", "no_movement", "low_fps"];
  return {
    willRead: !kinds.some((k) => blocking.includes(k)),
    issues: kinds.map((kind) => ({ kind, ...COPY[kind] })),
    stats: { detectionRate, medianFill, maxPeople, movement },
  };
}

function sampleFromCandidate(normalized: number[], visibility: number[]): Omit<PreflightSample, "people"> {
  const y = (i: number) => normalized[i * 3 + 1];
  const x = (i: number) => normalized[i * 3];
  const top = y(0), bottom = Math.max(y(27), y(28));
  const inside = (i: number) => (visibility[i] ?? 0) > 0.5 && y(i) >= 0 && y(i) <= 1 && x(i) >= 0 && x(i) <= 1;
  return {
    bodyFill: Math.max(0, bottom - top),
    wrist: [(x(15) + x(16)) / 2, (y(15) + y(16)) / 2],
    wholeBody: inside(0) && inside(27) && inside(28),
  };
}

/** Sample ~10 frames from the file and judge it. Resolves in roughly a second. */
export async function runClipPreflight(file: File, fps: number | null): Promise<PreflightVerdict> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error("video_load_failed"));
    });
    const landmarker = await getPoseLandmarkerForDenseCapture();
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, 1));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no_canvas");
    const samples: PreflightSample[] = [];
    for (let i = 0; i < PREFLIGHT_SAMPLES; i++) {
      const t = ((i + 0.5) / PREFLIGHT_SAMPLES) * video.duration;
      await new Promise<void>((res) => {
        video.onseeked = () => res();
        video.currentTime = t;
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const cands = detectDensePoseCandidates(landmarker, canvas);
      if (!cands.length) {
        samples.push({ people: 0, bodyFill: null, wrist: null, wholeBody: false });
        continue;
      }
      const best = cands
        .map((c) => sampleFromCandidate(c.normalized, c.visibility))
        .sort((a, b) => (b.bodyFill ?? 0) - (a.bodyFill ?? 0))[0];
      samples.push({ people: cands.length, ...best });
    }
    return judgeClipPreflight(samples, fps);
  } finally {
    URL.revokeObjectURL(url);
  }
}
