/**
 * Server-side pose tiles → analysis_fault_findings (2026-09-28).
 * Reads the stored landmark series (pose-landmarks bucket, path from
 * video_landmark_runs.landmarks_storage_path), runs the SAME tile code as the
 * tests (generated bundle), and writes the root-pattern findings. Verdicts are
 * computed here from stored landmarks — never accepted from a client.
 * Called by analyze-video only for an owned hitting upload with saved landmarks.
 */
// @ts-ignore generated bundle
import { checkStoredLandmarkMovement, runHittingTilesFromText, runThrowingTilesFromText, runPitchingFromText } from "./poseTiles.bundle.js";
import { buildPoseTileFindings } from "./faultFindings.ts";

async function gunzipIfNeeded(buf: Uint8Array): Promise<string> {
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const ds = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip")));
    return await ds.text();
  }
  return new TextDecoder().decode(buf);
}

// The same movement law runs before the AI request, not merely before the
// findings writer. A still upload must not produce coaching of any kind.
// deno-lint-ignore no-explicit-any
export async function checkStoredMovement(admin: any, path: string) {
  const { data, error } = await admin.storage.from("pose-landmarks").download(path);
  if (error || !data) return { status: "refused" as const, reason: "body_not_tracked" as const };
  const text = await gunzipIfNeeded(new Uint8Array(await data.arrayBuffer()));
  return checkStoredLandmarkMovement(text);
}

// deno-lint-ignore no-explicit-any
export async function runAndWritePoseTileFindings(admin: any, a: {
  userId: string; videoId: string; runId: string | null; sport: string | null;
  landmarksPath: string; side: "L" | "R" | null; athleteHeightIn: number | null;
}) {
  const { data, error } = await admin.storage.from("pose-landmarks").download(a.landmarksPath);
  if (error || !data) return { ok: false, reason: `landmark_download_failed:${error?.message ?? "no data"}`, written: 0 };
  const text = await gunzipIfNeeded(new Uint8Array(await data.arrayBuffer()));
  const movement = checkStoredLandmarkMovement(text);
  if (movement.status === "refused") return { ok: true, written: 0, verdicts: {}, refused: movement.reason };
  const out = runHittingTilesFromText(text, a.side, a.athleteHeightIn);
  const rows = buildPoseTileFindings({ userId: a.userId, videoId: a.videoId, runId: a.runId, sport: a.sport, verdicts: out.verdicts, engineVersion: out.engine_version });
  if (rows.length) {
    const { error: e } = await admin.from("analysis_fault_findings").insert(rows);
    if (e) return { ok: false, reason: `insert_failed:${e.message}`, written: 0, verdicts: out.verdicts };
  }
  return { ok: true, written: rows.length, verdicts: out.verdicts };
}

/**
 * Throwing / baseball pitching cards from the stored series (2026-09-29, owner-approved wiring).
 * Same bundle code as the tests. Movement gate first; a refused clip stores nothing.
 */
// deno-lint-ignore no-explicit-any
export async function runStoredThrowPitchCards(admin: any, a: { module: string; landmarksPath: string; side: "L" | "R" | null; athleteHeightIn: number | null }) {
  const { data, error } = await admin.storage.from("pose-landmarks").download(a.landmarksPath);
  if (error || !data) return { ok: false as const, reason: `landmark_download_failed:${error?.message ?? "no data"}` };
  const text = await gunzipIfNeeded(new Uint8Array(await data.arrayBuffer()));
  const movement = checkStoredLandmarkMovement(text);
  if (movement.status === "refused") return { ok: true as const, refused: movement.reason, fields: {} };
  if (a.module === "throwing") return { ok: true as const, fields: { throwing_tiles_deterministic: runThrowingTilesFromText(text, a.side) } };
  const p = runPitchingFromText(text, a.side, a.athleteHeightIn);
  return { ok: true as const, fields: { pitching_tiles_deterministic: p.tiles, pitching_card_tiles_deterministic: p.card } };
}
