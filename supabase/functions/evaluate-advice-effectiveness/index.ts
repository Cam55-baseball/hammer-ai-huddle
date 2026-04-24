// Evaluate Advice Effectiveness — measures whether users complied with engine advice.
// Schedule: every 4h at :31. Pulls explanations 24-30h old, scores against logs.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Phase 7 — Observability wrapper
async function logRun(supabase: any, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: 'evaluate-advice-effectiveness',
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
    const windowStart = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    const windowEnd   = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: explanations } = await supabase
      .from("hammer_state_explanations_v2")
      .select("id,user_id,snapshot_id,state,micro_directive,created_at")
      .gte("created_at", windowStart).lte("created_at", windowEnd)
      .limit(500);

    let evaluated = 0;
    for (const e of explanations ?? []) {
      // Skip if already evaluated
      const { data: existing } = await supabase
        .from("advisory_feedback_logs")
        .select("id").eq("explanation_id", e.id).maybeSingle();
      if (existing) continue;

      const after = e.created_at;
      const until = new Date(new Date(e.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
      const { data: logs } = await supabase
        .from("custom_activity_logs")
        .select("id,performance_data,actual_duration_minutes,created_at")
        .eq("user_id", e.user_id)
        .gte("created_at", after).lte("created_at", until);

      const rpes = (logs ?? []).map(l => Number((l.performance_data as any)?.rpe ?? 0)).filter(n => n > 0);
      const highRpe = rpes.filter(r => r >= 7).length;
      const lowRpe  = rpes.filter(r => r <= 4).length;
      const total = logs?.length ?? 0;

      let action: "complied" | "partial" | "ignored" | "opposed" = "ignored";
      let score = 0;
      if (e.state === "recover") {
        if (total === 0 || (lowRpe >= 1 && highRpe === 0)) { action = "complied"; score = 70; }
        else if (highRpe >= 2) { action = "opposed"; score = -70; }
        else { action = "partial"; score = 0; }
      } else if (e.state === "prime") {
        if (highRpe >= 2) { action = "complied"; score = 70; }
        else if (total === 0) { action = "ignored"; score = -30; }
        else { action = "partial"; score = 20; }
      } else if (e.state === "caution") {
        if (lowRpe >= 1 && highRpe === 0) { action = "complied"; score = 50; }
        else if (highRpe >= 2) { action = "opposed"; score = -50; }
        else { action = "partial"; score = 10; }
      } else {
        if (total >= 1) { action = "complied"; score = 40; }
      }

      await supabase.from("advisory_feedback_logs").insert({
        user_id: e.user_id,
        snapshot_id: e.snapshot_id,
        explanation_id: e.id,
        advice_state: e.state,
        advice_directive: e.micro_directive,
        user_action_inferred: action,
        effectiveness_score: score,
        evaluation_window_hours: 24,
        evaluated_at: new Date().toISOString(),
      });
      evaluated++;
    }

    // ===== PART 4: Intervention compliance pass =====
    let intvEvaluated = 0;
    const intvWindowStart = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    const intvWindowEnd   = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: interventions } = await supabase
      .from("engine_interventions")
      .select("id,user_id,prediction_id,intervention_type,priority,created_at,executed")
      .eq("executed", false)
      .gte("created_at", intvWindowStart).lte("created_at", intvWindowEnd)
      .limit(500);

    for (const iv of interventions ?? []) {
      const { data: existing } = await supabase
        .from("advisory_feedback_logs")
        .select("id").eq("intervention_id", iv.id).maybeSingle();
      if (existing) continue;

      const after = iv.created_at;
      const until = new Date(new Date(iv.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
      const before = new Date(new Date(iv.created_at).getTime() - 24 * 60 * 60 * 1000).toISOString();

      const [{ data: postLogs }, { data: priorLogs }] = await Promise.all([
        supabase.from("custom_activity_logs")
          .select("actual_duration_minutes,performance_data,created_at")
          .eq("user_id", iv.user_id).gte("created_at", after).lte("created_at", until),
        supabase.from("custom_activity_logs")
          .select("actual_duration_minutes,performance_data,created_at")
          .eq("user_id", iv.user_id).gte("created_at", before).lt("created_at", after),
      ]);

      const avgDur = (arr: any[]) => arr.length ? arr.reduce((s, l) => s + Number(l.actual_duration_minutes ?? 0), 0) / arr.length : 0;
      const rpes = (arr: any[]) => arr.map(l => Number((l.performance_data as any)?.rpe ?? 0)).filter(n => n > 0);
      const stddev = (arr: number[]) => {
        if (arr.length < 2) return 0;
        const m = arr.reduce((s, n) => s + n, 0) / arr.length;
        return Math.sqrt(arr.reduce((s, n) => s + (n - m) ** 2, 0) / arr.length);
      };

      const postDur = avgDur(postLogs ?? []);
      const priorDur = avgDur(priorLogs ?? []);
      const postCount = postLogs?.length ?? 0;
      const priorCount = priorLogs?.length ?? 0;
      const postRpes = rpes(postLogs ?? []);
      const priorRpes = rpes(priorLogs ?? []);

      let complied = false;
      switch (iv.intervention_type) {
        case "reduce_load":
          complied = priorDur > 0 && postDur <= priorDur * 0.8; break;
        case "recover":
          complied = priorCount > 0 && postCount <= priorCount * 0.5; break;
        case "stabilize":
          complied = stddev(postRpes) < stddev(priorRpes); break;
        case "increase_intensity":
          complied = (Math.max(0, ...postRpes)) > (Math.max(0, ...priorRpes)); break;
      }

      // Check if state worsened by comparing snapshots before/after
      const { data: snapAfter } = await supabase
        .from("hammer_state_snapshots")
        .select("overall_state")
        .eq("user_id", iv.user_id)
        .gte("computed_at", until)
        .order("computed_at", { ascending: true }).limit(1).maybeSingle();
      const { data: snapBefore } = await supabase
        .from("hammer_state_snapshots")
        .select("overall_state")
        .eq("user_id", iv.user_id)
        .lte("computed_at", after)
        .order("computed_at", { ascending: false }).limit(1).maybeSingle();

      const stateRank: Record<string, number> = { recover: 0, caution: 1, ready: 2, prime: 3 };
      const beforeRank = stateRank[snapBefore?.overall_state ?? "ready"] ?? 2;
      const afterRank = stateRank[snapAfter?.overall_state ?? "ready"] ?? 2;
      const worsened = afterRank < beforeRank;

      let score = 0;
      let action: "complied" | "ignored" = complied ? "complied" : "ignored";
      if (complied && !worsened) {
        score = 80;
        await supabase.from("engine_interventions").update({ executed: true }).eq("id", iv.id);
      } else if (complied && worsened) {
        score = 20;
      } else if (!complied && worsened) {
        score = -50;
        await supabase.from("engine_weight_adjustments").insert({
          source: "adversarial",
          scenario: `intervention_validation:${iv.intervention_type}`,
          drift_score: 50,
          affected_axis: iv.intervention_type === "recover" || iv.intervention_type === "reduce_load" ? "recovery" : "arousal",
          suggested_delta: -0.01,
          applied: false,
          metadata: { source: "intervention_validation", intervention_id: iv.id },
        });
      } else {
        score = -10;
      }

      await supabase.from("advisory_feedback_logs").insert({
        user_id: iv.user_id,
        intervention_id: iv.id,
        advice_state: iv.intervention_type,
        advice_directive: iv.intervention_type,
        user_action_inferred: action,
        effectiveness_score: score,
        evaluation_window_hours: 24,
        evaluated_at: new Date().toISOString(),
      });
      intvEvaluated++;
    }

    await logRun(supabase, 'success', startMs, undefined, { evaluated, intvEvaluated });
    return new Response(JSON.stringify({ status: "ok", evaluated, intvEvaluated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[evaluate-advice-effectiveness]", err);
    await logRun(supabase, 'fail', startMs, String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
