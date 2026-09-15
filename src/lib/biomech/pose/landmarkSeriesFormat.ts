/**
 * STEP 1 — Landmark series serialization format.
 *
 * FORMAT CHOICE: gzip-compressed NDJSON (newline-delimited JSON), file
 * extension `.ndjson.gz`.
 *
 *   line 0      → header object (video identity, model pins, capture facts)
 *   line 1..N   → one compact array per analysed frame
 *
 * Why NDJSON over a single JSON document or a binary buffer:
 *   - Streamable: a reader can parse frame-by-frame without holding the whole
 *     series in memory, and a writer can append as frames are produced. A long
 *     clip never requires one giant in-memory string of objects.
 *   - Append-safe and truncation-tolerant: a partial file still yields every
 *     complete line, so a dropped connection loses the tail, not the series.
 *   - Human-inspectable during the rebuild. A binary packing would be ~40%
 *     smaller but unverifiable by eye, and premature while the schema is young.
 *   - Compact in practice: per-frame rows are positional arrays (no repeated
 *     keys), and gzip removes the remaining digit redundancy. Measured ratios
 *     land around 5-6x.
 *
 * DETERMINISM: every number is rounded with a fixed decimal count before
 * serialization, key order is fixed, and no timestamps or random ids appear in
 * the payload. Same landmark series in → byte-identical NDJSON out. (The gzip
 * container itself is produced by the platform `CompressionStream`; the
 * uncompressed bytes are the determinism contract, and it is those bytes that
 * are hashed.)
 */

export const LANDMARK_SERIES_FORMAT = "ndjson.gz@1" as const;

/** Decimal places. Fixed so the encoding is byte-stable. */
const DP_NORMALIZED = 5; // [0,1] image coords — 1e-5 ≈ 0.02 px at 1080p
const DP_WORLD = 5; // metres, hip-centred — 1e-5 = 0.01 mm
const DP_VISIBILITY = 4;
const DP_TIME = 6;

export interface LandmarkSeriesHeader {
  readonly format: typeof LANDMARK_SERIES_FORMAT;
  readonly video_sha256_hex: string;
  readonly landmark_model_id: string;
  readonly landmark_model_version: string;
  readonly fps_true: number;
  /** How fps_true was established. Never "container" — containers lie. */
  readonly fps_source: "measured_rvfc" | "measured_rvfc_fallback";
  readonly width: number;
  readonly height: number;
  readonly orientation: "portrait" | "landscape" | "square";
  /** Frames actually present in the series (rows after the header). */
  readonly frame_count: number;
  /** Inclusive frame-index bounds of the analysed window. */
  readonly window_start_frame: number;
  readonly window_end_frame: number;
  readonly window_start_sec: number;
  readonly window_end_sec: number;
  /** Window rule applied — see denseLandmarkCapture.ts. */
  readonly window_rule: string;
  /** Resolution the frames were decoded at for pose inference. */
  readonly inference_width: number;
  readonly inference_height: number;
  readonly landmark_count: number;

  /* ---------------- STEP 3 — subject lock provenance ----------------
   * Optional so series written before subject locking still decode. A reader
   * MUST treat their absence as "single-subject capture, trustworthiness
   * unknown" rather than as a clean track.
   */
  /** People detected per frame across the window. */
  readonly subjects_detected_min?: number;
  readonly subjects_detected_median?: number;
  readonly subjects_detected_max?: number;
  /** Identity of the selection rule that chose the athlete. */
  readonly subject_selection_rule?: string;
  /** Ordinal within the window at which the lock was taken (0-based). */
  readonly subject_locked_on_ordinal?: number | null;
  /** Which candidate index was locked on that frame. */
  readonly subject_locked_candidate_index?: number | null;
  /** Frames where the locked subject was matched. */
  readonly subject_frames_locked?: number;
  /** Frames where no candidate satisfied the gate — recorded as unobserved. */
  readonly subject_frames_lost?: number;
  /** Times the lock was regained after being lost. */
  readonly subject_reacquisitions?: number;
  /** False when the track is too broken to be trusted downstream. */
  readonly subject_track_reliable?: boolean;
}

export interface LandmarkSeriesFrame {
  readonly frame_index: number;
  readonly timestamp_seconds: number;
  readonly pose_detected: boolean;
  /** 33 × {x,y,z} normalized image coords. Empty when pose_detected is false. */
  readonly normalized: readonly number[];
  /** 33 × {x,y,z} world coords in metres. Empty when pose_detected is false. */
  readonly world: readonly number[];
  /** 33 per-landmark visibility in [0,1]. Empty when pose_detected is false. */
  readonly visibility: readonly number[];
}

export interface LandmarkSeries {
  readonly header: LandmarkSeriesHeader;
  readonly frames: readonly LandmarkSeriesFrame[];
}

function round(n: number, dp: number): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function roundAll(arr: readonly number[], dp: number): number[] {
  return arr.map((n) => round(n, dp));
}

/** Serialize to the uncompressed NDJSON text. This text is the hash subject. */
export function encodeLandmarkSeriesText(series: LandmarkSeries): string {
  const lines: string[] = [JSON.stringify(series.header)];
  for (const f of series.frames) {
    // Positional row: [frame_index, t, detected(0|1), normalized[], world[], visibility[]]
    lines.push(
      JSON.stringify([
        f.frame_index,
        round(f.timestamp_seconds, DP_TIME),
        f.pose_detected ? 1 : 0,
        roundAll(f.normalized, DP_NORMALIZED),
        roundAll(f.world, DP_WORLD),
        roundAll(f.visibility, DP_VISIBILITY),
      ]),
    );
  }
  return lines.join("\n") + "\n";
}

export function decodeLandmarkSeriesText(text: string): LandmarkSeries {
  const lines = text.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error("empty landmark series");
  const header = JSON.parse(lines[0]) as LandmarkSeriesHeader;
  const frames: LandmarkSeriesFrame[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = JSON.parse(lines[i]) as [number, number, number, number[], number[], number[]];
    frames.push({
      frame_index: row[0],
      timestamp_seconds: row[1],
      pose_detected: row[2] === 1,
      normalized: row[3],
      world: row[4],
      visibility: row[5],
    });
  }
  return { header, frames };
}

const hasCompression = () =>
  typeof globalThis !== "undefined" && typeof (globalThis as { CompressionStream?: unknown }).CompressionStream === "function";

/**
 * Gzip when the platform supports it, otherwise emit plain NDJSON. The caller
 * records which happened so a reader never has to guess.
 */
export async function encodeLandmarkSeries(
  series: LandmarkSeries,
): Promise<{ blob: Blob; text: string; gzipped: boolean }> {
  const text = encodeLandmarkSeriesText(series);
  const raw = new Blob([text], { type: "application/x-ndjson" });
  if (!hasCompression()) return { blob: raw, text, gzipped: false };
  const stream = raw.stream().pipeThrough(new (globalThis as unknown as { CompressionStream: new (f: string) => GenericTransformStream }).CompressionStream("gzip"));
  const blob = await new Response(stream).blob();
  return { blob: new Blob([blob], { type: "application/gzip" }), text, gzipped: true };
}

/** Inverse of encodeLandmarkSeries — handles both gzipped and plain payloads. */
export async function decodeLandmarkSeriesBlob(blob: Blob): Promise<LandmarkSeries> {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  const isGzip = head[0] === 0x1f && head[1] === 0x8b;
  if (!isGzip) return decodeLandmarkSeriesText(await blob.text());
  const ds = (globalThis as unknown as { DecompressionStream?: new (f: string) => GenericTransformStream }).DecompressionStream;
  if (typeof ds !== "function") throw new Error("gzip payload but no DecompressionStream available");
  const text = await new Response(blob.stream().pipeThrough(new ds("gzip"))).text();
  return decodeLandmarkSeriesText(text);
}
