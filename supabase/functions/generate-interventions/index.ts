// Generate Interventions — emits preemptive directives based on latest prediction.
// Triggered by predict-hammer-state for a single user, OR runs over all recent predictions if no body.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DIRECTIVES: Record<string, string> = {
  reduce_load: "Cut volume 30% next session — trajectory shows fatigue building.",
  recover: "Skip intensity. Restore inputs only — full recovery in 24-48h.",
  stabilize: "Hold steady. Same load, same timing — let signal settle.",
  increase_intensity: "Window opening. Stack one quality high-intensity rep block.",
};

function pickIntervention(current: string, predicted24: string, riskFlags: string[]):
  { type: string; priority: number; trigger: string } | null
{
  if (riskFlags.includes("instability")) {
    return { type: "stabilize", priority: 2, trigger: "instability_flag" };
  }
  if ((current === "prime" || current === "ready") && predicted24 === "recover") {
    return { type: "reduce_load", priority: 5, trigger: "predicted_recover_24h_from_active" };
  }
  if (current === "ready" && predicted24 === "caution") {
    return { type: "reduce_load", priority: 3, trigger: "predicted_caution_24h" };
  }
  if (current === "caution" && predicted24 === "recover") {
    return { type: "recover", priority: 4, trigger: "predicted_recover_24h" };
  }
  if (current === "recover" && predicted24 === "ready") {
    return { type: "stabilize", priority: 2, trigger: "predicted_recover_to_ready" };
  }
  if (current === "ready" && predicted24 === "prime") {
    return { type: "increase_intensity", priority: 4, trigger: "window_opening" };
  }
  return null;
}

async function processPrediction(supabase: any, predictionId: string, userId: string): Promise<boolean> {
  const { data: pred } = await supabase
    .from("engine_state_predictions")
    .select("id,user_id,predicted_state_24h,confidence_24h,risk_flags,base_snapshot_id")
    .eq("id", predictionId).maybeSingle();
  if (!pred) return false;
  if (pred.confidence_24h < 60) return false;

  const { data: snap } = await supabase
    .from("hammer_state_snapshots")
    .select("overall_state").eq("id", pred.base_snapshot_id).maybeSingle();
  const current = snap?.overall_state ?? "ready";

  const choice = pickIntervention(current, pred.predicted_state_24h, pred.risk_flags ?? []);
  if (!choice) return false;

  // Dedupe: skip if same intervention_type for this user in last 12h
  const since12h = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  const { data: dup } = await supabase
    .from("engine_interventions")
    .select("id").eq("user_id", userId)
    .eq("intervention_type", choice.type)
    .gte("created_at", since12h).maybeSingle();
  if (dup) return false;

  await supabase.from("engine_interventions").insert({
    user_id: userId,
    prediction_id: pred.id,
    trigger_reason: choice.trigger,
    intervention_type: choice.type,
    directive: DIRECTIVES[choice.type],
    priority: choice.priority,
  });
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    let created = 0;

    if (body?.prediction_id && body?.user_id) {
      if (await processPrediction(supabase, body.prediction_id, body.user_id)) created++;
    } else {
      // Sweep: process all predictions in last 2h that don't have an intervention yet
      const since2h = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      const { data: preds } = await supabase
        .from("engine_state_predictions")
        .select("id,user_id")
        .gte("created_at", since2h);
      for (const p of preds ?? []) {
        if (await processPrediction(supabase, p.id, p.user_id)) created++;
      }
    }

    return new Response(JSON.stringify({ status: "ok", created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-interventions]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
