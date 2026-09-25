/**
 * DelayCam rep splitter — pure, deterministic.
 *
 * Input: a uniformly sampled landmark series of the WHOLE session (the stored
 * scout pass, never the live preview). Output: confident rep windows plus a
 * log of every movement window that could NOT be split confidently, each with
 * a canonical missingness reason. An uncertain window never becomes a rep.
 *
 * Signal: body-height-normalized speed of wrists + ankles (the parts that move
 * in a swing, delivery or throw), smoothed over 3 samples.
 *   rest   = speed below REST for >= MIN_REST_MS
 *   rep    = a contiguous above-rest region, bracketed by rest on both sides,
 *            whose peak passes the module's BURST threshold, whose duration is
 *            inside the module's plausible range, and in which the locked
 *            athlete is observed on >= MIN_COVERAGE of samples.
 *
 * Thresholds are PROPOSED values pending validation on real DelayCam sessions
 * (see SPLITTER_STATUS). Same series in -> byte-identical output.
 */
import { MISSINGNESS_REASONS, type MissingnessReason } from "@/lib/biomech/metrics/missingness";

export const SPLITTER_VERSION = "delaycam-rep-splitter@1.0.0";
/** Rep counts stay staff-only until thresholds are validated on real sessions. */
export const SPLITTER_STATUS: "staff_validation" | "released" = "staff_validation";

export type SessionModule = "hitting" | "pitching" | "throwing";

export interface SampledFrame {
  readonly t_ms: number;
  /** 33 x {x,y,z}; empty when the locked athlete was not observed. */
  readonly normalized: readonly number[];
  readonly visibility: readonly number[];
}

export interface RepWindow {
  readonly rep_index: number;
  readonly start_ms: number;
  readonly end_ms: number;
  /** Time of peak movement — a candidate anchor (contact / release), never labelled as the event. */
  readonly peak_ms: number;
  readonly peak_speed: number;
  readonly coverage: number;
  /** 0..1 measurement quality of the boundary, not athlete quality. */
  readonly boundary_confidence: number;
}

export interface UncertainWindow {
  readonly start_ms: number;
  readonly end_ms: number;
  readonly reason: MissingnessReason;
  readonly detail: string;
}

export interface SplitResult {
  readonly splitter_version: string;
  readonly state: "confident" | "partial" | "uncertain";
  readonly state_reason: MissingnessReason | null;
  readonly reps: readonly RepWindow[];
  readonly uncertain: readonly UncertainWindow[];
  readonly sample_fps: number;
  readonly coverage: number;
}

export const REST_SPEED = 0.25; // body heights / second
export const MIN_REST_MS = 300;
export const MIN_COVERAGE = 0.8;
export const MIN_SAMPLE_FPS = 10;
const SMOOTH = 3;

const BURST: Record<SessionModule, number> = { hitting: 1.5, pitching: 1.2, throwing: 1.2 };
const DURATION_MS: Record<SessionModule, [number, number]> = {
  hitting: [400, 4000],
  pitching: [800, 6000],
  throwing: [500, 5000],
};

const WRISTS_ANKLES = [15, 16, 27, 28] as const;
const SHOULDERS = [11, 12] as const;
const ANKLES = [27, 28] as const;
const VIS_FLOOR = 0.5;

function r6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function pt(f: SampledFrame, i: number): [number, number] | null {
  if ((f.visibility[i] ?? 0) < VIS_FLOOR) return null;
  const x = f.normalized[i * 3];
  const y = f.normalized[i * 3 + 1];
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
}

function bodyHeight(f: SampledFrame): number | null {
  const s = SHOULDERS.map((i) => pt(f, i));
  const a = ANKLES.map((i) => pt(f, i));
  if (s.some((p) => !p) || a.some((p) => !p)) return null;
  const sy = (s[0]![1] + s[1]![1]) / 2;
  const ay = (a[0]![1] + a[1]![1]) / 2;
  const h = Math.abs(ay - sy);
  return h > 0.05 ? h : null;
}

/** Per-interval speed; null where either end is unobserved. */
export function motionSignal(frames: readonly SampledFrame[]): (number | null)[] {
  const raw: (number | null)[] = [null];
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1];
    const b = frames[i];
    const dt = (b.t_ms - a.t_ms) / 1000;
    const h = bodyHeight(b) ?? bodyHeight(a);
    if (dt <= 0 || h == null) {
      raw.push(null);
      continue;
    }
    let sum = 0;
    let n = 0;
    for (const j of WRISTS_ANKLES) {
      const p = pt(a, j);
      const q = pt(b, j);
      if (!p || !q) continue;
      sum += Math.hypot(q[0] - p[0], q[1] - p[1]);
      n++;
    }
    raw.push(n >= 2 ? r6(sum / n / h / dt) : null);
  }
  // centred moving mean over observed samples
  const half = Math.floor(SMOOTH / 2);
  return raw.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let k = i - half; k <= i + half; k++) {
      const v = raw[k];
      if (v != null) {
        s += v;
        n++;
      }
    }
    return raw[i] == null ? null : r6(s / n);
  });
}

export function splitReps(frames: readonly SampledFrame[], module: SessionModule): SplitResult {
  const n = frames.length;
  const durSec = n > 1 ? (frames[n - 1].t_ms - frames[0].t_ms) / 1000 : 0;
  const sampleFps = durSec > 0 ? r6((n - 1) / durSec) : 0;
  const observed = frames.filter((f) => f.visibility.length > 0).length;
  const coverage = n > 0 ? r6(observed / n) : 0;
  const base = { splitter_version: SPLITTER_VERSION, sample_fps: sampleFps, coverage };

  if (n < 2 || sampleFps < MIN_SAMPLE_FPS) {
    return {
      ...base,
      state: "uncertain",
      state_reason: MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
      reps: [],
      uncertain: [],
    };
  }
  if (observed === 0) {
    return { ...base, state: "uncertain", state_reason: MISSINGNESS_REASONS.POSE_NOT_DETECTED, reps: [], uncertain: [] };
  }

  const speed = motionSignal(frames);
  const restSamples = Math.max(1, Math.ceil((MIN_REST_MS / 1000) * sampleFps));
  // Classify each sample: rest (observed & slow), move (observed & fast), gap (unobserved).
  const cls = speed.map((v) => (v == null ? "gap" : v < REST_SPEED ? "rest" : "move"));

  // Find contiguous non-rest regions.
  const regions: [number, number][] = [];
  let i = 0;
  while (i < n) {
    if (cls[i] === "rest") {
      i++;
      continue;
    }
    const s = i;
    while (i < n && cls[i] !== "rest") i++;
    regions.push([s, i - 1]);
  }

  const reps: RepWindow[] = [];
  const uncertain: UncertainWindow[] = [];
  const [minDur, maxDur] = DURATION_MS[module];

  const restRun = (from: number, dir: 1 | -1): number => {
    let c = 0;
    for (let k = from; k >= 0 && k < n && cls[k] === "rest"; k += dir) c++;
    return c;
  };

  for (const [s, e] of regions) {
    let peak = 0;
    let peakIdx = s;
    let moveCount = 0;
    let obs = 0;
    for (let k = s; k <= e; k++) {
      const v = speed[k];
      if (v != null) {
        obs++;
        if (cls[k] === "move") moveCount++;
        if (v > peak) {
          peak = v;
          peakIdx = k;
        }
      }
    }
    if (moveCount === 0) continue; // pure gap region between rests — not movement
    // Movement that was partly hidden: the peak may have happened while the
    // athlete was out of view, so we can't call it "small" — log it as uncertain.
    const covEarly = obs / (e - s + 1);
    if (peak < BURST[module] && covEarly >= MIN_COVERAGE) continue; // small movement (adjusting stance), not a rep

    const startMs = frames[s].t_ms;
    const endMs = frames[e].t_ms;
    const dur = endMs - startMs;
    const cov = r6(obs / (e - s + 1));
    const restBefore = restRun(s - 1, -1);
    const restAfter = restRun(e + 1, 1);

    let reason: MissingnessReason | null = null;
    let detail = "";
    if (cov < MIN_COVERAGE) {
      reason = obs === 0 ? MISSINGNESS_REASONS.OUT_OF_FRAME : MISSINGNESS_REASONS.LANDMARK_OCCLUDED;
      detail = `athlete observed on ${Math.round(cov * 100)}% of samples (needs ${MIN_COVERAGE * 100}%)`;
    } else if (restBefore < restSamples || restAfter < restSamples) {
      reason = MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED;
      detail = s === 0 || e === n - 1 ? "movement touches the start or end of the recording" : "no clear stillness before or after the movement";
    } else if (dur < minDur) {
      reason = MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED;
      detail = `movement too short for a ${module} rep (${dur}ms)`;
    } else if (dur > maxDur) {
      reason = MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED;
      detail = `movement too long to be one rep (${dur}ms) — reps may run together`;
    }

    if (reason) {
      uncertain.push({ start_ms: startMs, end_ms: endMs, reason, detail });
      continue;
    }
    const restQuality = Math.min(1, Math.min(restBefore, restAfter) / (restSamples * 2));
    reps.push({
      rep_index: reps.length,
      start_ms: startMs,
      end_ms: endMs,
      peak_ms: frames[peakIdx].t_ms,
      peak_speed: r6(peak),
      coverage: cov,
      boundary_confidence: r6(Math.min(cov, 0.5 + 0.5 * restQuality)),
    });
  }

  const state = reps.length > 0 && uncertain.length === 0 ? "confident" : reps.length > 0 ? "partial" : "uncertain";
  const state_reason =
    state === "confident" ? null : reps.length === 0 && uncertain.length === 0 ? MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED : uncertain[0]?.reason ?? null;
  return { ...base, state, state_reason, reps, uncertain };
}
