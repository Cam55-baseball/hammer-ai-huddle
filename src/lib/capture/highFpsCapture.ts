/**
 * High-frame-rate in-app capture support.
 *
 * Why this exists: ball tracking (ball_tracking_v4) locates the ball reliably
 * in the pitcher's hand but loses it during flight on 30fps footage — motion
 * blur destroys the object between frames. Competitors capture in-app and ask
 * the camera for a high frame rate directly. This module is that ask, plus an
 * honest measurement of what the device actually delivered.
 *
 * Nothing here fabricates a number: `requested` is what we asked for,
 * `settingsFps` is what the track reports, and `measuredFps` is counted from
 * real painted frames. Downstream analysis is told the truth.
 */

export const FPS_TARGET = 120;
export const FPS_ACCEPTABLE = 60;
/**
 * Single source of truth for the ball-tracking frame-rate floor. Below this,
 * tracking-grade analysis is not honest to attempt. Mirrored verbatim by the
 * server gate in `supabase/functions/_shared/ballTrackingGate.ts`
 * (`BALL_TRACKING_FLOOR_FPS`) — the two must never drift apart.
 */
export const FPS_TRACKING_FLOOR = 58;


export type FpsTier = "elite" | "good" | "limited" | "unusable";

export interface CameraFpsCapability {
  /** Highest fps the device advertises for this camera, if it says. */
  maxAdvertisedFps: number | null;
  /** fps the negotiated track reports in getSettings(). */
  settingsFps: number | null;
  /** fps counted from real painted frames over the probe window. */
  measuredFps: number | null;
  /** Best honest estimate: measured wins, then settings, then advertised. */
  effectiveFps: number | null;
  tier: FpsTier;
  /** True when the browser exposes frameRate as a constrainable property. */
  supportsFrameRateConstraint: boolean;
  /** Plain-language line the athlete reads before they record. */
  message: string;
}

export function classifyFps(fps: number | null | undefined): FpsTier {
  if (!fps || !Number.isFinite(fps)) return "unusable";
  if (fps >= 100) return "elite";
  if (fps >= FPS_ACCEPTABLE - 2) return "good";
  if (fps >= 24) return "limited";
  return "unusable";
}

export function fpsMessage(tier: FpsTier, fps: number | null): string {
  const n = fps ? Math.round(fps) : null;
  switch (tier) {
    case "elite":
      return `Your camera is recording at ${n} frames per second. That's plenty to track the ball in flight.`;
    case "good":
      return `Your camera is recording at ${n} frames per second. Good enough for full mechanics and ball tracking.`;
    case "limited":
      return `Your camera can only record at ${n} frames per second. Mechanics will still be analyzed, but the ball blurs between frames at this speed, so pitch speed and ball flight can't be measured honestly. If your phone has a slow-motion mode, record there and upload the file instead.`;
    default:
      return "We couldn't confirm how fast this camera records. Analysis may be limited.";
  }
}

/** The constraint set we ask every device for. Ideal 120, floor 60 as a hint —
 * never `exact`, which would fail outright on capable-but-slower cameras. */
export function highFpsVideoConstraints(
  facing: "user" | "environment",
): MediaTrackConstraints {
  return {
    facingMode: { ideal: facing },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: FPS_TARGET, min: 24 },
  };
}

export function supportsFrameRateConstraint(): boolean {
  try {
    return Boolean(navigator.mediaDevices?.getSupportedConstraints?.().frameRate);
  } catch {
    return false;
  }
}

/**
 * Count real painted frames from a live video element for `windowMs`.
 * Uses requestVideoFrameCallback where available — that fires once per
 * decoded frame, so it reports what the camera truly delivered rather than
 * the display refresh rate. Returns null when it can't be measured.
 */
export function measureLiveFps(
  video: HTMLVideoElement,
  windowMs = 1200,
): Promise<number | null> {
  const anyEl = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: (now: number) => void) => number;
    cancelVideoFrameCallback?: (id: number) => void;
  };
  if (typeof anyEl.requestVideoFrameCallback !== "function") {
    return Promise.resolve(null);
  }
  return new Promise<number | null>((resolve) => {
    let frames = 0;
    let first: number | null = null;
    let id = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { anyEl.cancelVideoFrameCallback?.(id); } catch { /* noop */ }
      if (first == null || frames < 2) return resolve(null);
      const elapsed = performance.now() - first;
      resolve(elapsed > 0 ? (frames - 1) / (elapsed / 1000) : null);
    };
    const tick = (now: number) => {
      if (first == null) first = now;
      frames += 1;
      if (now - first >= windowMs) return finish();
      id = anyEl.requestVideoFrameCallback!(tick);
    };
    id = anyEl.requestVideoFrameCallback!(tick);
    setTimeout(finish, windowMs + 1500);
  });
}

/** Read whatever the negotiated track will tell us about frame rate. */
export function readTrackFps(stream: MediaStream): {
  settingsFps: number | null;
  maxAdvertisedFps: number | null;
} {
  const track = stream.getVideoTracks()[0];
  if (!track) return { settingsFps: null, maxAdvertisedFps: null };
  let settingsFps: number | null = null;
  let maxAdvertisedFps: number | null = null;
  try {
    const s = track.getSettings?.();
    if (s && typeof s.frameRate === "number") settingsFps = s.frameRate;
  } catch { /* noop */ }
  try {
    const caps = track.getCapabilities?.() as MediaTrackCapabilities | undefined;
    const fr = caps?.frameRate as { max?: number } | undefined;
    if (fr && typeof fr.max === "number") maxAdvertisedFps = fr.max;
  } catch { /* noop */ }
  return { settingsFps, maxAdvertisedFps };
}

/**
 * Try to push an already-running track to a higher frame rate. Some Android
 * cameras negotiate 30fps first and only honour 60/120 on re-application.
 * Best-effort: failure is silent and the existing track keeps working.
 */
export async function tryRaiseTrackFps(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track?.applyConstraints) return;
  const caps = (() => {
    try { return track.getCapabilities?.() as MediaTrackCapabilities | undefined; }
    catch { return undefined; }
  })();
  const max = (caps?.frameRate as { max?: number } | undefined)?.max;
  const targets = [FPS_TARGET, 90, FPS_ACCEPTABLE].filter((t) => !max || t <= max);
  for (const target of targets) {
    try {
      await track.applyConstraints({ frameRate: { ideal: target, min: FPS_ACCEPTABLE } });
      const s = track.getSettings?.();
      if (s && typeof s.frameRate === "number" && s.frameRate >= FPS_ACCEPTABLE) return;
    } catch { /* try the next rung */ }
  }
}

/**
 * Summarize a running stream + live element into an honest capability report.
 * Caller owns the stream lifetime.
 */
export async function describeCaptureFps(
  stream: MediaStream,
  video: HTMLVideoElement | null,
): Promise<CameraFpsCapability> {
  const { settingsFps, maxAdvertisedFps } = readTrackFps(stream);
  const measuredFps = video ? await measureLiveFps(video) : null;
  const effectiveFps = measuredFps ?? settingsFps ?? maxAdvertisedFps ?? null;
  const tier = classifyFps(effectiveFps);
  return {
    maxAdvertisedFps,
    settingsFps,
    measuredFps,
    effectiveFps,
    tier,
    supportsFrameRateConstraint: supportsFrameRateConstraint(),
    message: fpsMessage(tier, effectiveFps),
  };
}

/** What downstream analysis is allowed to claim from this footage. */
export function analysisScopeForFps(fps: number | null | undefined): {
  ballTracking: boolean;
  mechanics: boolean;
  note: string;
} {
  const f = fps ?? 0;
  if (f >= FPS_TRACKING_FLOOR) {
    return { ballTracking: true, mechanics: true, note: `Captured at ${Math.round(f)}fps — full analysis available.` };
  }
  if (f >= 24) {
    return {
      ballTracking: false,
      mechanics: true,
      note: `Captured at ${Math.round(f)}fps — mechanics only. Ball speed and flight need 60fps or faster.`,
    };
  }
  return { ballTracking: false, mechanics: false, note: "Frame rate too low to analyze reliably." };
}
