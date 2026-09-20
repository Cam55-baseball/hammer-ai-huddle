// Owner Control Center backend (Step 9 §D).
//
// Two actions, both owner/admin only:
//   matrix_check  — run the card matrix over the live active catalog, record it
//   approve_batch — activate at most 20 inactive catalog rows, run the matrix,
//                   and roll the batch straight back if the matrix fails
//
// Nothing here touches an athlete's card.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  MATRIX_CATALOG_COLUMNS,
  type MatrixCatalogRow,
  runGenerationMatrix,
} from "../_shared/wic/matrix/generationMatrix.ts";

const MAX_BATCH = 20;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function loadActiveCatalog(db: ReturnType<typeof createClient>): Promise<MatrixCatalogRow[]> {
  const out: MatrixCatalogRow[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from("wk_movement_catalog")
      .select(MATRIX_CATALOG_COLUMNS)
      .eq("is_active", true)
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as unknown as MatrixCatalogRow[]));
    if (!data || data.length < page) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, serviceKey);

  // --- caller must be signed in and be an owner or an admin
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return json({ error: "not signed in" }, 401);
  const { data: userRes, error: userErr } = await db.auth.getUser(token);
  const userId = userRes?.user?.id;
  if (userErr || !userId) return json({ error: "not signed in" }, 401);
  const { data: allowed } = await db.rpc("is_training_intel_owner", { _user_id: userId });
  if (allowed !== true) return json({ error: "not allowed" }, 403);

  let body: { action?: string; ids?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad request body" }, 400);
  }
  const action = body.action;

  try {
    if (action === "matrix_check") {
      const catalog = await loadActiveCatalog(db);
      const m = runGenerationMatrix(catalog);
      const { data: row } = await db
        .from("wk_card_matrix_runs")
        .insert({
          source: "control_center",
          cells: m.cells,
          empty_cells: m.empty_cells,
          active_rows: catalog.length,
          fingerprint: m.fingerprint,
          status: m.passed ? "passed" : "failed",
          notes: { tiers: m.tiers },
        })
        .select("id")
        .single();
      return json({
        ok: m.passed,
        run_id: row?.id ?? null,
        cells: m.cells,
        empty_cells: m.empty_cells,
        fingerprint: m.fingerprint,
        active_rows: catalog.length,
      });
    }

    if (action === "approve_batch") {
      const ids = Array.isArray(body.ids) ? body.ids.filter((i) => typeof i === "string") : [];
      if (ids.length === 0) return json({ error: "no rows selected" }, 400);
      if (ids.length > MAX_BATCH) return json({ error: `at most ${MAX_BATCH} rows per batch` }, 400);

      const { data: before, error: readErr } = await db
        .from("wk_movement_catalog")
        .select("id, slug, is_active")
        .in("id", ids);
      if (readErr) return json({ error: readErr.message }, 400);
      const toActivate = (before ?? []).filter((r) => r.is_active !== true).map((r) => r.id);
      if (toActivate.length === 0) return json({ error: "those rows are already active" }, 400);

      const { error: upErr } = await db
        .from("wk_movement_catalog")
        .update({ is_active: true })
        .in("id", toActivate);
      if (upErr) return json({ error: upErr.message }, 400);

      let m;
      try {
        m = runGenerationMatrix(await loadActiveCatalog(db));
      } catch (e) {
        await db.from("wk_movement_catalog").update({ is_active: false }).in("id", toActivate);
        return json({ ok: false, rolled_back: true, error: e instanceof Error ? e.message : String(e) }, 200);
      }

      const { data: row } = await db
        .from("wk_card_matrix_runs")
        .insert({
          source: "approve_batch",
          cells: m.cells,
          empty_cells: m.empty_cells,
          active_rows: m.cells > 0 ? (await loadActiveCatalog(db)).length : 0,
          fingerprint: m.fingerprint,
          status: m.passed ? "passed" : "failed",
          notes: { approved_ids: toActivate, tiers: m.tiers },
        })
        .select("id")
        .single();

      if (!m.passed) {
        await db.from("wk_movement_catalog").update({ is_active: false }).in("id", toActivate);
        return json({
          ok: false,
          rolled_back: true,
          run_id: row?.id ?? null,
          cells: m.cells,
          empty_cells: m.empty_cells,
        });
      }

      return json({
        ok: true,
        rolled_back: false,
        activated: toActivate.length,
        run_id: row?.id ?? null,
        cells: m.cells,
        empty_cells: m.empty_cells,
        fingerprint: m.fingerprint,
      });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
