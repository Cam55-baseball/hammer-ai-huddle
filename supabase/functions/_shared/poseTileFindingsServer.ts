/**
 * Server-side pose tiles → analysis_fault_findings (2026-09-28).
 * Reads the stored landmark series (pose-landmarks bucket, path from
 * video_landmark_runs.landmarks_storage_path), runs the SAME tile code as the
 * tests (generated bundle), and writes the root-pattern findings. Verdicts are
 * computed here from stored landmarks — never accepted from a client.
 * Called by analyze-video only for an owned hitting upload with saved landmarks.
 */
// @ts-ignore generated bundle
import { runHittingTilesFromText } from "./poseTiles.bundle.js";
import { buildPoseTileFindings } from "./faultFindings.ts";

async function gunzipIfNeeded(buf: Uint8Array): Promise<string> {
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const ds = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip")));
    return await ds.text();
  }
  return new TextDecoder().decode(buf);
}

// deno-lint-ignore no-explicit-any
export async function runAndWritePoseTileFindings(admin: any, a: {
  userId: string; videoId: string; runId: string | null; sport: string | null;
  landmarksPath: string; side: "L" | "R" | null; athleteHeightIn: number | null;
}) {
  const { data, error } = await admin.storage.from("pose-landmarks").download(a.landmarksPath);
  if (error || !data) return { ok: false, reason: `landmark_download_failed:${error?.message ?? "no data"}`, written: 0 };
  const text = await gunzipIfNeeded(new Uint8Array(await data.arrayBuffer()));
  const out = runHittingTilesFromText(text, a.side, a.athleteHeightIn);
  const rows = buildPoseTileFindings({ userId: a.userId, videoId: a.videoId, runId: a.runId, sport: a.sport, verdicts: out.verdicts, engineVersion: out.engine_version });
  if (rows.length) {
    const { error: e } = await admin.from("analysis_fault_findings").insert(rows);
    if (e) return { ok: false, reason: `insert_failed:${e.message}`, written: 0, verdicts: out.verdicts };
  }
  return { ok: true, written: rows.length, verdicts: out.verdicts };
}
