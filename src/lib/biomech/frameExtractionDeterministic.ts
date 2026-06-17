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
