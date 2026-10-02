/**
 * Phase 1 — Deterministic Video Processing Layer
 *
 * Pure, integer-arithmetic frame selection. Same inputs → identical
 * `frame_index` array → identical `timestamp_seconds` array across every
 * invocation, browser, and run. No Date, no Math.random, no float drift.
 *
 * Selection policy (matches existing extractor semantics):
 *   - landingTime == null  → 7 frames at fixed percentages of the clip,
 *                            rounded to integer frame indices.
 *   - landingTime != null  → 7 frames at fixed second-offsets around landing,
 *                            converted to integer frame indices.
 *
 * Timestamps are reconstructed as `index / fps_true` and rounded to 6
 * decimals so SQL `numeric(12,6)` storage round-trips byte-identically.
 */

export const AUTO_PERCENTAGES: readonly number[] = [0.10, 0.25, 0.40, 0.50, 0.60, 0.75, 0.90];
export const LANDING_OFFSETS_SEC: readonly number[] = [-0.4, -0.2, -0.1, 0, 0.1, 0.2, 0.3];

export interface FrameSelection {
  frame_index: number;
  timestamp_seconds: number;
}

function roundToSixDecimals(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Deterministic integer frame-index selection.
 *
 * @param fps_true     Probed true frame rate (must be > 0).
 * @param duration_sec Probed duration in seconds (must be > 0).
 * @param landingTime  Optional landing time in seconds. null/<=0 = auto.
 */
export function selectFrameIndices(
  fps_true: number,
  duration_sec: number,
  landingTime: number | null,
): number[] {
  if (!Number.isFinite(fps_true) || fps_true <= 0) return [];
  if (!Number.isFinite(duration_sec) || duration_sec <= 0) return [];

  const totalFrames = Math.max(1, Math.floor(duration_sec * fps_true));
  const maxIndex = totalFrames - 1;

  const raw: number[] = [];
  if (landingTime != null && landingTime > 0 && landingTime < duration_sec) {
    const landingIdx = Math.round(landingTime * fps_true);
    for (const off of LANDING_OFFSETS_SEC) {
      raw.push(landingIdx + Math.round(off * fps_true));
    }
  } else {
    for (const pct of AUTO_PERCENTAGES) {
      raw.push(Math.round(pct * maxIndex));
    }
  }

  // Clamp to [0, maxIndex], drop dupes, stable-sort.
  const seen = new Set<number>();
  const out: number[] = [];
  for (const idx of raw) {
    const clamped = Math.min(maxIndex, Math.max(0, idx));
    if (!seen.has(clamped)) {
      seen.add(clamped);
      out.push(clamped);
    }
  }
  out.sort((a, b) => a - b);
  return out;
}

export function framesToTimestamps(indices: number[], fps_true: number): number[] {
  return indices.map((i) => roundToSixDecimals(i / fps_true));
}

export function buildFrameSelection(
  fps_true: number,
  duration_sec: number,
  landingTime: number | null,
): FrameSelection[] {
  const indices = selectFrameIndices(fps_true, duration_sec, landingTime);
  return indices.map((frame_index) => ({
    frame_index,
    timestamp_seconds: roundToSixDecimals(frame_index / fps_true),
  }));
}

/**
 * Dense uniform sampling for measurement work (e.g. pitch velocity), where a
 * ball in flight must appear in as many consecutive samples as possible.
 *
 * Targets `targetFps` samples per second of footage, but never exceeds
 * `maxFrames` total — longer clips automatically thin out so the whole clip
 * is always covered. Pure integer math: same probe → identical indices.
 */
export function selectDenseFrameIndices(
  fps_true: number,
  duration_sec: number,
  targetFps = 12,
  maxFrames = 48,
): number[] {
  if (!Number.isFinite(fps_true) || fps_true <= 0) return [];
  if (!Number.isFinite(duration_sec) || duration_sec <= 0) return [];

  const totalFrames = Math.max(1, Math.floor(duration_sec * fps_true));
  const maxIndex = totalFrames - 1;

  // Integer stride between sampled frames.
  let stride = Math.max(1, Math.round(fps_true / targetFps));
  const wouldProduce = Math.floor(maxIndex / stride) + 1;
  if (wouldProduce > maxFrames) {
    stride = Math.ceil(maxIndex / (maxFrames - 1));
  }

  const out: number[] = [];
  for (let idx = 0; idx <= maxIndex; idx += stride) {
    out.push(idx);
  }
  if (out[out.length - 1] !== maxIndex) out.push(maxIndex);
  return out;
}

export function buildDenseFrameSelection(
  fps_true: number,
  duration_sec: number,
  targetFps = 12,
  maxFrames = 48,
): FrameSelection[] {
  const indices = selectDenseFrameIndices(fps_true, duration_sec, targetFps, maxFrames);
  return indices.map((frame_index) => ({
    frame_index,
    timestamp_seconds: roundToSixDecimals(frame_index / fps_true),
  }));
}

/**
 * Movement-centred AI frame placement (owner ruling 2026-10-02).
 *
 * Evenly spread frames across a long clip can fall entirely either side of a
 * swing (a swing lasts well under the gap between samples), and the model then
 * invents an explanation for the gap. When the scout pass has located the
 * movement, the SAME budget is placed around it instead: one context frame
 * before, a dense core across the movement, one context frame after.
 * Pure integer math: same probe + same centre → identical indices.
 */
export const MOVEMENT_CORE_HALF_SEC = 0.6;
export const MOVEMENT_CONTEXT_SEC = 1.5;

export function selectMovementFrameIndices(
  fps_true: number,
  duration_sec: number,
  motionCentreSec: number,
  budget = AUTO_PERCENTAGES.length,
): number[] {
  if (!Number.isFinite(fps_true) || fps_true <= 0) return [];
  if (!Number.isFinite(duration_sec) || duration_sec <= 0) return [];
  if (!Number.isFinite(motionCentreSec) || motionCentreSec < 0 || motionCentreSec > duration_sec) return [];
  const totalFrames = Math.max(1, Math.floor(duration_sec * fps_true));
  const maxIndex = totalFrames - 1;
  const coreCount = Math.max(1, budget - 2);
  const times: number[] = [motionCentreSec - MOVEMENT_CONTEXT_SEC];
  for (let i = 0; i < coreCount; i++) {
    const f = coreCount === 1 ? 0.5 : i / (coreCount - 1);
    times.push(motionCentreSec - MOVEMENT_CORE_HALF_SEC + f * 2 * MOVEMENT_CORE_HALF_SEC);
  }
  times.push(motionCentreSec + MOVEMENT_CONTEXT_SEC);
  const seen = new Set<number>();
  const out: number[] = [];
  for (const t of times) {
    const idx = Math.min(maxIndex, Math.max(0, Math.round(t * fps_true)));
    if (!seen.has(idx)) { seen.add(idx); out.push(idx); }
  }
  return out.sort((a, b) => a - b);
}

export function buildMovementFrameSelection(
  fps_true: number,
  duration_sec: number,
  motionCentreSec: number,
): FrameSelection[] {
  return selectMovementFrameIndices(fps_true, duration_sec, motionCentreSec).map((frame_index) => ({
    frame_index,
    timestamp_seconds: roundToSixDecimals(frame_index / fps_true),
  }));
}
