/**
 * Phase 0 — Determinism Foundation (v2: encoded frame rate)
 *
 * Deterministic client-side probe for a video File/Blob:
 *   - sha256_hex of the entire byte stream
 *   - fps_true: the ENCODED frame rate read from the container
 *     (see containerFps.ts), or null when it cannot be established
 *   - duration_sec, width, height, orientation
 *
 * The old probe timed frames as the browser PAINTED them. That is the render
 * rate, not the file's rate: mobile Safari throttles it (off-screen element,
 * iframe, Low Power Mode, autoplay blocked) and good 59.94 fps clips read
 * under 24. There was also a silent 30 fps fallback recorded as if measured.
 * Both are gone:
 *   - fps_true comes only from the container. Unknown stays null.
 *   - Playback timing still runs, ON the page, visible, muted and playing,
 *     but only as a recorded cross-check. It can never decide fps_true and can
 *     never reject a clip.
 */

import { sha256HexOfBlob } from "./fingerprint";
import { blobSource, readContainerFps, readMatroskaDefaultDurationFps, type ContainerFpsResult, type MatroskaFpsResult } from "./containerFps";
import { fpsFloorVerdict } from "./videoAcceptance";

export type PlaybackFpsResult =
  | {
      readonly status: "ok";
      readonly fps: number;
      readonly frames_captured: number;
      readonly autoplay_blocked: boolean;
    }
  | {
      readonly status: "unavailable";
      readonly reason: "rvfc_unsupported" | "autoplay_blocked" | "too_few_frames" | "not_in_browser";
      readonly frames_captured: number;
      readonly autoplay_blocked: boolean;
    };

export interface ProbedVideoMetadata {
  sha256_hex: string;
  /** Encoded frame rate from the container, or null = unknown. Never assumed. */
  fps_true: number | null;
  fps_source: "container" | "unknown";
  fps_encoded: ContainerFpsResult;
  /** Secondary in-file route (WebM/MKV declared frame duration). Tried only when the MP4/MOV route fails. */
  fps_matroska: MatroskaFpsResult | null;
  /** Every route tried, in order, and why each failed — kept for diagnostics. */
  fps_routes: ReadonlyArray<{ route: string; status: "ok" | "unavailable" | "evidence_only" | "not_tried"; reason?: string; fps?: number }>;
  /** Render-rate cross-check. Recorded, never decisive. */
  fps_playback: PlaybackFpsResult;
  /** Playback fps / encoded fps when both exist; < 0.85 means the browser under-rendered. */
  fps_playback_ratio: number | null;
  duration_sec: number;
  duration_source: "container" | "element" | "unknown";
  width: number;
  height: number;
  orientation: "portrait" | "landscape" | "square";
}

const PLAYBACK_SAMPLE_FRAMES = 60;
const PLAYBACK_TIMEOUT_MS = 4_000;

function computeFpsFromMediaTimes(mediaTimes: number[]): number | null {
  if (mediaTimes.length < 4) return null;
  const deltas: number[] = [];
  for (let i = 1; i < mediaTimes.length; i++) {
    const d = mediaTimes[i] - mediaTimes[i - 1];
    if (d > 0 && d < 1) deltas.push(d);
  }
  if (deltas.length === 0) return null;
  deltas.sort((a, b) => a - b);
  const mid = Math.floor(deltas.length / 2);
  const median = deltas.length % 2 === 0 ? (deltas[mid - 1] + deltas[mid]) / 2 : deltas[mid];
  if (!Number.isFinite(median) || median <= 0) return null;
  return Math.round((1 / median) * 1000) / 1000;
}

/**
 * Render-rate cross-check. The element is attached to the page, on-screen and
 * visible (small, bottom corner), muted and playing, so Safari has no
 * off-screen excuse to skip painting. Its answer is still a browser artefact.
 */
async function measurePlaybackFps(url: string): Promise<PlaybackFpsResult> {
  if (typeof document === "undefined") {
    return { status: "unavailable", reason: "not_in_browser", frames_captured: 0, autoplay_blocked: false };
  }
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.setAttribute("aria-hidden", "true");
  Object.assign(v.style, {
    position: "fixed", right: "8px", bottom: "8px", width: "96px", height: "72px",
    zIndex: "2147483646", pointerEvents: "none", opacity: "1", borderRadius: "6px",
  } as CSSStyleDeclaration);
  const anyEl = v as HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  };
  document.body.appendChild(v);
  try {
    if (typeof anyEl.requestVideoFrameCallback !== "function") {
      return { status: "unavailable", reason: "rvfc_unsupported", frames_captured: 0, autoplay_blocked: false };
    }
    v.src = url;
    const mediaTimes: number[] = [];
    let autoplayBlocked = false;
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
      const timer = setTimeout(finish, PLAYBACK_TIMEOUT_MS);
      const tick = (_n: number, meta: { mediaTime: number }) => {
        mediaTimes.push(meta.mediaTime);
        if (mediaTimes.length >= PLAYBACK_SAMPLE_FRAMES) return finish();
        anyEl.requestVideoFrameCallback!(tick);
      };
      anyEl.requestVideoFrameCallback!(tick);
      v.play().catch(() => { autoplayBlocked = true; finish(); });
    });
    const fps = computeFpsFromMediaTimes(mediaTimes);
    if (fps == null) {
      return {
        status: "unavailable",
        reason: autoplayBlocked ? "autoplay_blocked" : "too_few_frames",
        frames_captured: mediaTimes.length,
        autoplay_blocked: autoplayBlocked,
      };
    }
    return { status: "ok", fps, frames_captured: mediaTimes.length, autoplay_blocked: autoplayBlocked };
  } finally {
    try { v.pause(); v.removeAttribute("src"); v.load(); } catch { /* noop */ }
    v.remove();
  }
}

export async function probeVideoMetadata(file: Blob): Promise<ProbedVideoMetadata> {
  const sha256_hex = await sha256HexOfBlob(file);
  const fps_encoded = await readContainerFps(blobSource(file));

  const url = URL.createObjectURL(file);
  try {
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.src = url;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => { cleanup(); resolve(); };
      const onErr = () => { cleanup(); reject(new Error("video metadata load failed")); };
      const cleanup = () => {
        videoEl.removeEventListener("loadedmetadata", onLoaded);
        videoEl.removeEventListener("error", onErr);
      };
      videoEl.addEventListener("loadedmetadata", onLoaded);
      videoEl.addEventListener("error", onErr);
      // A codec the browser cannot decode never fires either event — fail visibly.
      setTimeout(() => reject(new Error("video metadata load timeout")), 20000);
    });

    const width = videoEl.videoWidth || 0;
    const height = videoEl.videoHeight || 0;
    const elementDuration = Number.isFinite(videoEl.duration) && videoEl.duration > 0 ? videoEl.duration : null;
    try { videoEl.removeAttribute("src"); videoEl.load(); } catch { /* noop */ }
    const orientation: ProbedVideoMetadata["orientation"] =
      width === height ? "square" : width > height ? "landscape" : "portrait";

    const fps_playback = await measurePlaybackFps(url);

    const fps_matroska = fps_encoded.status === "ok" ? null : await readMatroskaDefaultDurationFps(blobSource(file));
    const fps_true =
      fps_encoded.status === "ok" ? fps_encoded.fps
      : fps_matroska?.status === "ok" ? fps_matroska.fps
      : null;
    const fps_routes: ProbedVideoMetadata["fps_routes"] = [
      fps_encoded.status === "ok"
        ? { route: "mp4_mov_sample_table", status: "ok", fps: fps_encoded.fps }
        : { route: "mp4_mov_sample_table", status: "unavailable", reason: fps_encoded.reason + (fps_encoded.detail ? `:${fps_encoded.detail}` : "") },
      fps_matroska == null
        ? { route: "webm_default_duration", status: "not_tried", reason: "primary_route_succeeded" }
        : fps_matroska.status === "ok"
          ? { route: "webm_default_duration", status: "ok", fps: fps_matroska.fps }
          : { route: "webm_default_duration", status: "unavailable", reason: fps_matroska.reason },
      fps_playback.status === "ok"
        ? { route: "playback_cross_check", status: "evidence_only", fps: fps_playback.fps, reason: "never_decisive" }
        : { route: "playback_cross_check", status: "unavailable", reason: fps_playback.reason },
    ];
    // Duration: the container's own sample total when it has one (a
    // MediaRecorder blob can make the element report Infinity), else the
    // element's reported duration, else unknown (0).
    let duration_sec = 0;
    let duration_source: ProbedVideoMetadata["duration_source"] = "unknown";
    if (fps_encoded.status === "ok" && fps_encoded.duration_sec > 0) {
      duration_sec = fps_encoded.duration_sec;
      duration_source = "container";
    } else if (elementDuration != null) {
      duration_sec = elementDuration;
      duration_source = "element";
    }

    const probe: ProbedVideoMetadata = {
      sha256_hex,
      fps_true,
      fps_source: fps_true != null ? "container" : "unknown",
      fps_encoded,
      fps_matroska,
      fps_routes,
      fps_playback,
      fps_playback_ratio:
        fps_true != null && fps_playback.status === "ok"
          ? Math.round((fps_playback.fps / fps_true) * 1000) / 1000
          : null,
      duration_sec,
      duration_source,
      width,
      height,
      orientation,
    };
    const verdict = fpsFloorVerdict(probe);
    publishFpsProbe(probe, verdict.decision);
    console.info("[probe] frame rate", {
      fps_true, fps_encoded, fps_playback, duration_sec, duration_source, decision: verdict.decision,
    });
    return probe;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Compact audit record of how the frame rate was established. */
export function fpsProvenance(p: ProbedVideoMetadata) {
  return {
    fps_true: p.fps_true,
    fps_source: p.fps_source,
    fps_encoded: p.fps_encoded,
    fps_matroska: p.fps_matroska,
    fps_routes: p.fps_routes,
    fps_playback: p.fps_playback,
    fps_playback_ratio: p.fps_playback_ratio,
    duration_source: p.duration_source,
  };
}
