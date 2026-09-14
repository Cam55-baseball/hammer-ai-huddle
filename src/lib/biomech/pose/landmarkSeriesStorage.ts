/**
 * STEP 1 — Landmark series persistence.
 *
 * Writes the dense pose series to the private `pose-landmarks` bucket and
 * reads it back for recomputation. The path recorded on
 * `video_landmark_runs.landmarks_storage_path` is exactly the object key used
 * here, so a future engine can re-run metrics without re-filming anyone.
 *
 * Path shape: `<user_id>/<video_id>/<landmark_model_version>.ndjson.gz`
 * The model version is in the filename so a re-run under a new landmark model
 * lands beside the old series instead of destroying it — historical analyses
 * reference an exact landmark_model_version and must stay reconstructable.
 */

import { supabase } from "@/integrations/supabase/client";
import { sha256HexOfBlob } from "../fingerprint";
import {
  decodeLandmarkSeriesBlob,
  encodeLandmarkSeries,
  type LandmarkSeries,
} from "./landmarkSeriesFormat";

export const LANDMARK_BUCKET = "pose-landmarks" as const;

export function buildLandmarkSeriesPath(
  userId: string,
  videoId: string,
  landmarkModelVersion: string,
): string {
  const safeVersion = landmarkModelVersion.replace(/[^a-zA-Z0-9._@-]/g, "_");
  return `${userId}/${videoId}/${safeVersion}.ndjson.gz`;
}

export interface WrittenLandmarkSeries {
  readonly path: string;
  readonly bytes_stored: number;
  readonly bytes_uncompressed: number;
  readonly gzipped: boolean;
  /** SHA-256 of the UNCOMPRESSED NDJSON text — the determinism subject. */
  readonly series_sha256_hex: string;
}

export async function writeLandmarkSeries(
  userId: string,
  videoId: string,
  series: LandmarkSeries,
): Promise<WrittenLandmarkSeries> {
  const { blob, text, gzipped } = await encodeLandmarkSeries(series);
  const series_sha256_hex = await sha256HexOfBlob(new Blob([text]));
  const path = buildLandmarkSeriesPath(userId, videoId, series.header.landmark_model_version);

  const { error } = await supabase.storage.from(LANDMARK_BUCKET).upload(path, blob, {
    contentType: gzipped ? "application/gzip" : "application/x-ndjson",
    upsert: true,
  });
  if (error) throw new Error(`landmark series upload failed: ${error.message}`);

  return {
    path,
    bytes_stored: blob.size,
    bytes_uncompressed: new Blob([text]).size,
    gzipped,
    series_sha256_hex,
  };
}

/** Read a stored series back. This is the recomputation entry point. */
export async function readLandmarkSeries(path: string): Promise<LandmarkSeries> {
  const { data, error } = await supabase.storage.from(LANDMARK_BUCKET).download(path);
  if (error || !data) {
    throw new Error(`landmark series download failed: ${error?.message ?? "no data"}`);
  }
  return await decodeLandmarkSeriesBlob(data);
}
