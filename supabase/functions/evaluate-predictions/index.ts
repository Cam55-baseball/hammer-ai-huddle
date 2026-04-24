// Phase 6 — Prediction Accuracy Tracker
// Compares 24-30h-old predictions against actual snapshots taken at +24h.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATE_ORDER = ["recover", "caution", "ready", "prime"];

function scoreAccuracy(predicted: string, actual: string): number {
  if (predicted === actual) return 100;
  const pi = STATE_ORDER.indexOf(predicted);
  const ai = STATE_ORDER.indexOf(actual);
  if (pi < 0 || ai < 0) return 0;
  const dist = Math.abs(pi - ai);
  if (dist === 1) return 70;
  if (dist === 2) return 40;
  return 0; // opposite extremes
}

// Phase 7 — Observability wrapper
async function logRun(supabase: any, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: 'evaluate-predictions',
      status,
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

  try {
    const start = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
    const end = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    // Pull predictions in the 24-30h window without outcomes yet
    const { data: candidates } = await supabase
      .from("engine_state_predictions")
      .select("id,user_id,predicted_state_24h,created_at")
      .gte("created_at", start)
      .lte("created_at", end);

    let evaluated = 0;
    const scores: number[] = [];

    for (const pred of candidates ?? []) {
      // Skip if outcome exists
      const { data: existing } = await supabase
        .from("prediction_outcomes")
        .select("id")
        .eq("prediction_id", pred.id)
        .maybeSingle();
      if (existing) continue;

      // Find a snapshot ±2h around prediction.created_at + 24h
      const targetMs = new Date(pred.created_at).getTime() + 24 * 3600 * 1000;
      const winLo = new Date(targetMs - 2 * 3600 * 1000).toISOString();
      const winHi = new Date(targetMs + 2 * 3600 * 1000).toISOString();

      const { data: snaps } = await supabase
        .from("hammer_state_snapshots")
        .select("id,overall_state,created_at")
        .eq("user_id", pred.user_id)
        .gte("created_at", winLo)
        .lte("created_at", winHi)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!snaps || snaps.length === 0) continue;
      const actual = snaps[0];

      const score = scoreAccuracy(pred.predicted_state_24h, actual.overall_state);
      await supabase.from("prediction_outcomes").insert({
        prediction_id: pred.id,
        actual_state_24h: actual.overall_state,
        actual_snapshot_id: actual.id,
        accuracy_score: score,
      });
      scores.push(score);
      evaluated++;
    }

    // If rolling 24h avg accuracy < 50 over ≥ 5 samples → flag optimizer
    if (scores.length >= 5) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 50) {
        await supabase.from("engine_weight_adjustments").insert({
          source: "prediction_error",
          axis: "cognitive",
          delta: -0.005,
          applied: false,
          metadata: {
            avg_accuracy: +avg.toFixed(1),
            sample_size: scores.length,
            note: "Avg prediction accuracy < 50 — optimizer signal raised",
          },
        });
      }
    }

    const sampledAvg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    await logRun(supabase, 'success', startMs, undefined, { evaluated, sampled_avg: sampledAvg });
    return new Response(JSON.stringify({
      status: "ok", evaluated, sampled_avg: sampledAvg,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[evaluate-predictions]", err);
    await logRun(supabase, 'fail', startMs, String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
