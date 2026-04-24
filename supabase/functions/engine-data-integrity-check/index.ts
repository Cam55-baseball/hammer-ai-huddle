// Phase 7 — Data Integrity Check
// Daily safe sweep: only NULLs orphaned FK refs and logs counts. No deletes on user data.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FN = "engine-data-integrity-check";

async function logRun(supabase: any, status: "success" | "fail" | "timeout", startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from("engine_function_logs").insert({
      function_name: FN, status,
      duration_ms: Date.now() - startMs,
      error_message: error ?? null,
      metadata: metadata ?? {},
    });
  } catch { /* silent */ }
}

serve(async (req) => {
  const startMs = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary: any = {
    orphan_predictions_repaired: 0,
    orphan_interventions_found: 0,
    null_states_count: 0,
    orphan_explanations_count: 0,
  };

  try {
    // 1. Orphan predictions — null out base_snapshot_id where snapshot doesn't exist
    const { data: orphanPreds } = await supabase
      .from("engine_state_predictions")
      .select("id,base_snapshot_id")
      .not("base_snapshot_id", "is", null)
      .limit(500);

    if (orphanPreds && orphanPreds.length > 0) {
      const snapIds = Array.from(new Set(orphanPreds.map((p: any) => p.base_snapshot_id)));
      const { data: existingSnaps } = await supabase
        .from("hammer_state_snapshots")
        .select("id")
        .in("id", snapIds);
      const existingSet = new Set((existingSnaps ?? []).map((s: any) => s.id));
      const orphanIds = orphanPreds.filter((p: any) => !existingSet.has(p.base_snapshot_id)).map((p: any) => p.id);

      if (orphanIds.length > 0) {
        await supabase
          .from("engine_state_predictions")
          .update({ base_snapshot_id: null })
          .in("id", orphanIds);
        summary.orphan_predictions_repaired = orphanIds.length;
      }
    }

    // 2. Orphan interventions (FK should cascade — log if any found)
    const { data: orphanInts } = await supabase
      .from("engine_interventions")
      .select("id,prediction_id")
      .not("prediction_id", "is", null)
      .limit(500);

    if (orphanInts && orphanInts.length > 0) {
      const predIds = Array.from(new Set(orphanInts.map((i: any) => i.prediction_id)));
      const { data: existingPreds } = await supabase
        .from("engine_state_predictions")
        .select("id")
        .in("id", predIds);
      const existingSet = new Set((existingPreds ?? []).map((p: any) => p.id));
      summary.orphan_interventions_found = orphanInts.filter((i: any) => !existingSet.has(i.prediction_id)).length;
    }

    // 3. Invalid states
    const { count: nullCount } = await supabase
      .from("hammer_state_snapshots")
      .select("id", { count: "exact", head: true })
      .or("overall_state.is.null,overall_state.not.in.(prime,ready,caution,recover)");
    summary.null_states_count = nullCount ?? 0;

    // 4. Orphan explanations (no snapshot anywhere for that user)
    const { data: explUsers } = await supabase
      .from("hammer_state_explanations_v2")
      .select("user_id")
      .limit(1000);
    if (explUsers && explUsers.length > 0) {
      const uniqUserIds = Array.from(new Set(explUsers.map((e: any) => e.user_id)));
      const { data: usersWithSnaps } = await supabase
        .from("hammer_state_snapshots")
        .select("user_id")
        .in("user_id", uniqUserIds);
      const haveSnap = new Set((usersWithSnaps ?? []).map((s: any) => s.user_id));
      summary.orphan_explanations_count = uniqUserIds.filter(uid => !haveSnap.has(uid)).length;
    }

    summary.run_duration_ms = Date.now() - startMs;

    await supabase.from("audit_log").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      action: "data_integrity_check",
      table_name: "engine_data_integrity",
      metadata: summary,
    });

    await logRun(supabase, "success", startMs, undefined, summary);
    return new Response(JSON.stringify({ status: "ok", ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[engine-data-integrity-check]", err);
    await logRun(supabase, "fail", startMs, String(err));
    return new Response(JSON.stringify({ error: String(err), fallback: true }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
