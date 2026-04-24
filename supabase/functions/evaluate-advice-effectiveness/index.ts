// Evaluate Advice Effectiveness — measures whether users complied with engine advice.
// Schedule: every 4h at :31. Pulls explanations 24-30h old, scores against logs.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    return new Response(JSON.stringify({ status: "ok", evaluated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[evaluate-advice-effectiveness]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
