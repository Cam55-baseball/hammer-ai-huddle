// Owner P0 (Oct 28): analysis uploads that were never saved to Players Club
// are cleaned up 24 hours after upload. Scoped strictly to rows the analysis
// screen marked temporary (temporary_until set) and never saved; every removal
// is snapshotted to temporary_upload_cleanup_log before anything is deleted.
// Called only by the owner-scheduled job (x-job-token), never by athletes.
import { createClient } from "npm:@supabase/supabase-js@2";
import { validAnalysisJobToken } from "../_shared/analysisCanaryAuth.ts";
import { videoStoragePath } from "../_shared/classicAnalysis.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function thumbnailPath(url: string | null): { bucket: string; path: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?#]+)/);
  if (!m) return null;
  try { return { bucket: m[1], path: decodeURIComponent(m[2]) }; } catch { return { bucket: m[1], path: m[2] }; }
}

Deno.serve(async (req) => {
  if (!(await validAnalysisJobToken(req.headers.get("x-job-token")))) return json({ error: "forbidden" }, 403);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: rows, error } = await db.from("videos")
    .select("id,user_id,video_url,thumbnail_url,created_at,temporary_until,saved_to_library")
    .not("temporary_until", "is", null)
    .lt("temporary_until", new Date().toISOString())
    .order("temporary_until", { ascending: true })
    .limit(100);
  if (error) return json({ error: error.message }, 500);

  const results: Array<{ video_id: string; outcome: string }> = [];
  for (const row of rows ?? []) {
    if (row.saved_to_library === true) { results.push({ video_id: row.id, outcome: "skipped_saved" }); continue; }
    const files: Array<{ bucket: string; path: string }> = [];
    const clip = videoStoragePath(row.video_url);
    if (clip) files.push({ bucket: "videos", path: clip });
    const thumb = thumbnailPath(row.thumbnail_url);
    if (thumb) files.push(thumb);

    // Snapshot first; if the snapshot can't be written, nothing is removed.
    const { data: logRow, error: logError } = await db.from("temporary_upload_cleanup_log").insert({
      video_id: row.id, user_id: row.user_id, video_url: row.video_url, thumbnail_url: row.thumbnail_url,
      created_at_original: row.created_at, temporary_until: row.temporary_until,
      removed_files: files.map((f) => `${f.bucket}/${f.path}`), outcome: "pending",
    }).select("id").single();
    if (logError || !logRow) { results.push({ video_id: row.id, outcome: "snapshot_failed" }); continue; }

    let outcome = "removed";
    for (const bucket of new Set(files.map((f) => f.bucket))) {
      const { error: rmError } = await db.storage.from(bucket).remove(files.filter((f) => f.bucket === bucket).map((f) => f.path));
      if (rmError) outcome = `file_remove_failed:${rmError.message}`.slice(0, 200);
    }
    if (outcome === "removed") {
      // Re-checked in the delete itself: a clip saved meanwhile is never removed.
      const { error: delError } = await db.from("videos").delete()
        .eq("id", row.id).not("temporary_until", "is", null).neq("saved_to_library", true);
      if (delError) outcome = `row_delete_failed:${delError.message}`.slice(0, 200);
    }
    await db.from("temporary_upload_cleanup_log").update({ outcome }).eq("id", logRow.id);
    results.push({ video_id: row.id, outcome });
  }
  return json({ checked: rows?.length ?? 0, results });
});
