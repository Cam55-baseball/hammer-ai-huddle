// Phase 6 — Regression Test Engine
// Re-runs the engine math against 50 historical inputs using CURRENT weights.
// Pure read; never writes to engine tables.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type State = "prime" | "ready" | "caution" | "recover";
const STATE_DISTANCE: Record<string, number> = {
  "prime|prime": 0, "ready|ready": 0, "caution|caution": 0, "recover|recover": 0,
  "prime|ready": 10, "ready|prime": 10,
  "ready|caution": 20, "caution|ready": 20,
  "caution|recover": 30, "recover|caution": 30,
  "prime|caution": 40, "caution|prime": 40,
  "ready|recover": 50, "recover|ready": 50,
  "prime|recover": 70, "recover|prime": 70,
};

function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

// Phase 7 — Observability wrapper
async function logRun(supabase: any, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: 'engine-regression-runner',
      status,
      duration_ms: Date.now() - startMs,
      error_message: error ?? null,
      metadata: metadata ?? {},
    });
  } catch { /* silent */ }
}

// Recompute final state from stored inputs + CURRENT weights — mirrors compute-hammer-state math
function recomputeState(inputs: any, weights: Record<string, number>): State {
  const arousalScore = clamp(Number(inputs?.arousal_inputs?.energy_self_report ?? 0) * 20 || inputs?.recovery_score_used || 50);
  const recoveryScore = clamp(Number(inputs?.recovery_score_used ?? 50));
  const cognitiveLoad = clamp(Number(inputs?.load_24h ?? 0));
  const dopamineLoad = clamp(Number(inputs?.freshness_6h ?? 0) * 20);

  const blended =
    arousalScore * 0.3 * (weights.arousal ?? 1) +
    recoveryScore * 0.4 * (weights.recovery ?? 1) +
    (100 - cognitiveLoad) * 0.2 * (weights.cognitive ?? 1) +
    (100 - dopamineLoad) * 0.1 * (weights.dopamine ?? 1);

  if (blended >= 80 && recoveryScore >= 70) return "prime";
  if (blended >= 60) return "ready";
  if (blended >= 40) return "caution";
  return "recover";
}

serve(async (req) => {
  const startMs = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Load current weights
    const { data: weightRows } = await supabase
      .from("engine_dynamic_weights").select("axis,weight");
    const weights: Record<string, number> = Object.fromEntries(
      (weightRows ?? []).map((r: any) => [r.axis, Number(r.weight)])
    );

    // Sample 50 historical snapshot_versions across 5 buckets (10 each)
    const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
    const buckets: Array<{ name: string; rows: any[] }> = [];

    // 1. high-load (10)
    const { data: highLoad } = await supabase
      .from("engine_snapshot_versions")
      .select("snapshot_id,user_id,inputs,output")
      .gte("created_at", since30d)
      .order("created_at", { ascending: false })
      .limit(200);
    const highLoadFiltered = (highLoad ?? [])
      .filter((r: any) => Number(r.inputs?.load_24h ?? 0) >= 60)
      .slice(0, 10);
    buckets.push({ name: "high_load", rows: highLoadFiltered });

    // 2. recovery state (10)
    const recoveryFiltered = (highLoad ?? [])
      .filter((r: any) => r.output?.overall_state === "recover")
      .slice(0, 10);
    buckets.push({ name: "recovery", rows: recoveryFiltered });

    // 3. volatility — pick users with most snapshots last 7d
    const { data: volSamples } = await supabase
      .from("engine_snapshot_versions")
      .select("snapshot_id,user_id,inputs,output")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(200);
    buckets.push({ name: "volatility", rows: (volSamples ?? []).slice(0, 10) });

    // 4. sentinel-flagged drifts
    const { data: sentinelFlags } = await supabase
      .from("engine_sentinel_logs")
      .select("snapshot_id")
      .eq("drift_flag", true)
      .gte("run_at", since30d)
      .limit(20);
    const sentSnapIds = (sentinelFlags ?? []).map((s: any) => s.snapshot_id).filter(Boolean);
    let sentinelRows: any[] = [];
    if (sentSnapIds.length) {
      const { data } = await supabase
        .from("engine_snapshot_versions")
        .select("snapshot_id,user_id,inputs,output")
        .in("snapshot_id", sentSnapIds)
        .limit(10);
      sentinelRows = data ?? [];
    }
    buckets.push({ name: "edge_sentinel", rows: sentinelRows });

    // 5. adversarial fails — sample any recent versions (no direct snapshot link)
    buckets.push({ name: "edge_adversarial", rows: (highLoad ?? []).slice(-10) });

    // Run regression
    const results: any[] = [];
    let total = 0, fails = 0;
    for (const bucket of buckets) {
      for (const row of bucket.rows) {
        const baselineState = String(row.output?.overall_state ?? "ready") as State;
        const newState = recomputeState(row.inputs, weights);
        const drift = STATE_DISTANCE[`${baselineState}|${newState}`] ?? 70;
        const pass = drift <= 25;
        total++;
        if (!pass) fails++;
        results.push({
          test_case: bucket.name,
          baseline_snapshot_id: row.snapshot_id,
          baseline_state: baselineState,
          new_state: newState,
          drift_score: drift,
          pass,
          metadata: { weights_used: weights },
          user_id: row.user_id,
        });
      }
    }

    if (results.length > 0) {
      await supabase.from("engine_regression_results").insert(results);
    }

    const failRate = total > 0 ? fails / total : 0;
    if (failRate > 0.10) {
      await supabase.from("audit_log").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action: "engine_regression_detected",
        table_name: "engine_regression_results",
        metadata: { total, fails, fail_rate: +failRate.toFixed(3) },
      });
    }

    await logRun(supabase, 'success', startMs, undefined, { total, fails, fail_rate: +failRate.toFixed(3) });
    return new Response(JSON.stringify({
      status: "ok", total, fails, fail_rate: +failRate.toFixed(3),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[engine-regression-runner]", err);
    await logRun(supabase, 'fail', startMs, String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
