/**
 * DelayCam session gathering pipeline.
 *
 * DISPLAY-INDEPENDENCE GUARANTEE: this module's only inputs are the saved
 * recording and its capture metadata (`SessionPipelineInput`). The on-screen
 * "show live metrics" preference is deliberately NOT a field here, so nothing
 * in the gathering path can read it. `src/test/delaycamSession.test.ts`
 * asserts the input type has no display field and that this file never
 * mentions it.
 *
 * Runs over the SAVED FILE after Stop — never the live stream — so the same
 * file always yields the same reps and values.
 *
 *   Pass 1: sample the whole session at SAMPLE_FPS with the subject lock
 *           -> rep splitter (pure).
 *   Pass 2: for each confident rep, decode every frame at the recording's own
 *           frame rate -> per-rep metrics via the registry (tier-gated).
 */
import {
  classifyDensityTier,
  INFERENCE_MAX_EDGE,
  type FrameDensityTier,
} from "@/lib/biomech/pose/denseLandmarkCapture";
import {
  detectDensePoseCandidates,
  getPoseLandmarkerForDenseCapture,
  densePoseRowToPoseFrameRow,
  type PoseFrameRow,
} from "@/lib/biomech/pose/poseRunner";
import { SubjectTracker } from "@/lib/biomech/pose/subjectLock";
import { splitReps, type SampledFrame, type SessionModule, type SplitResult, type RepWindow } from "./repSplitter";
import { computeRepMetrics, type RepMetricValue } from "./metricRegistry";

export const SESSION_ENGINE_VERSION = "delaycam-session@1.0.0";
export const SAMPLE_FPS = 15;
export const MAX_SAMPLES = 9000;
export const MAX_DENSE_FRAMES_PER_REP = 1500;

export interface SessionPipelineInput {
  readonly file: Blob;
  /** Measured capture frame rate for this session — never assumed. */
  readonly fps: number;
  readonly duration_sec: number;
  readonly module: SessionModule;
  readonly sport: "baseball" | "softball";
  readonly onProgress?: (stage: "sampling" | "reps", done: number, total: number) => void;
}

export interface GatheredRep {
  readonly window: RepWindow;
  readonly fps: number;
  readonly tier: FrameDensityTier;
  readonly frames_decoded: number;
  readonly metrics: Record<string, RepMetricValue>;
}

export interface SessionPipelineResult {
  readonly engine_version: string;
  readonly session_tier: FrameDensityTier;
  readonly split: SplitResult;
  readonly reps: readonly GatheredRep[];
  readonly timings_ms: { sampling: number; reps: number };
}

function r6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      video.removeEventListener("seeked", done);
      reject(new Error("seek timeout"));
    }, 8000);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    video.addEventListener("seeked", done, { once: true });
    video.currentTime = t;
  });
}

/** Keep a phone cool: yield to the UI thread between frames. */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

export async function runSessionPipeline(input: SessionPipelineInput): Promise<SessionPipelineResult> {
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  const url = URL.createObjectURL(input.file);
  video.src = url;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas unavailable");

  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("the recording could not be decoded")), { once: true });
    });
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) throw new Error("recording has no picture dimensions");
    const scale = Math.max(w, h) > INFERENCE_MAX_EDGE ? INFERENCE_MAX_EDGE / Math.max(w, h) : 1;
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const landmarker = await getPoseLandmarkerForDenseCapture();
    const detectAt = async (t: number, tracker: SubjectTracker) => {
      try {
        await seek(video, t);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const cands = detectDensePoseCandidates(landmarker, canvas);
        const step = tracker.step(cands);
        return step.candidate_index == null ? null : cands[step.candidate_index];
      } catch {
        tracker.step([]);
        return null;
      }
    };

    /* Pass 1 — whole-session sampling */
    const t0 = performance.now();
    const dur = Math.max(0, input.duration_sec);
    const sampleFps = Math.min(SAMPLE_FPS, input.fps > 0 ? input.fps : SAMPLE_FPS);
    const count = Math.min(MAX_SAMPLES, Math.floor(dur * sampleFps) + 1);
    const step = count > 1 ? dur / (count - 1) : 0;
    const scoutTracker = new SubjectTracker(sampleFps);
    const samples: SampledFrame[] = [];
    for (let i = 0; i < count; i++) {
      const t = r6(i * step);
      const d = await detectAt(Math.min(t, Math.max(0, dur - 0.001)), scoutTracker);
      samples.push({ t_ms: Math.round(t * 1000), normalized: d ? d.normalized : [], visibility: d ? d.visibility : [] });
      input.onProgress?.("sampling", i + 1, count);
      if (i % 8 === 0) await breathe();
    }
    const split = splitReps(samples, input.module);
    const t1 = performance.now();

    /* Pass 2 — native-rate decode inside each confident rep only */
    const fps = input.fps;
    const tier = classifyDensityTier(fps);
    const reps: GatheredRep[] = [];
    for (let r = 0; r < split.reps.length; r++) {
      const win = split.reps[r];
      const startF = Math.floor((win.start_ms / 1000) * fps);
      const endF = Math.min(startF + MAX_DENSE_FRAMES_PER_REP - 1, Math.ceil((win.end_ms / 1000) * fps));
      const tracker = new SubjectTracker(fps);
      const rows: PoseFrameRow[] = [];
      for (let f = startF; f <= endF; f++) {
        const t = r6(f / fps);
        const d = await detectAt(t, tracker);
        rows.push(
          densePoseRowToPoseFrameRow(f, t, d ? { pose_detected: true, normalized: d.normalized, visibility: d.visibility } : { pose_detected: false, normalized: [], visibility: [] }),
        );
        if (f % 8 === 0) await breathe();
      }
      reps.push({
        window: win,
        fps,
        tier,
        frames_decoded: rows.length,
        metrics: computeRepMetrics(input.module, input.sport, { rows, fps, tier }),
      });
      input.onProgress?.("reps", r + 1, split.reps.length);
    }
    const t2 = performance.now();
    console.info("[DelayCam session] timings", {
      sampling_ms: Math.round(t1 - t0),
      reps_ms: Math.round(t2 - t1),
      samples: count,
      reps: reps.length,
      uncertain: split.uncertain.length,
    });

    return {
      engine_version: SESSION_ENGINE_VERSION,
      session_tier: tier,
      split,
      reps,
      timings_ms: { sampling: Math.round(t1 - t0), reps: Math.round(t2 - t1) },
    };
  } finally {
    try {
      video.removeAttribute("src");
      video.load();
    } catch {
      /* ignore */
    }
    URL.revokeObjectURL(url);
  }
}
