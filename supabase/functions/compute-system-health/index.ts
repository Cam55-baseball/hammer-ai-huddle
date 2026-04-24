// Phase 6 — System Health Score (single truth metric)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function clamp(v: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const since24h = new Date(Date.now() - 86400000).toISOString();
    const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

    const [hbRes, sentRes, advRes, regRes, predRes, advisRes] = await Promise.all([
      supabase.from("engine_heartbeat_logs").select("status").gte("run_at", since24h),
      supabase.from("engine_sentinel_logs").select("drift_flag").gte("run_at", since24h),
      supabase.from("engine_adversarial_logs").select("pass").gte("run_at", since7d),
      supabase.from("engine_regression_results").select("pass").gte("run_at", since24h),
      supabase.from("prediction_outcomes").select("accuracy_score").gte("created_at", since24h),
      supabase.from("advisory_feedback_logs").select("effectiveness_score").gte("created_at", since7d).not("effectiveness_score", "is", null),
    ]);

    // Heartbeat: % success of expected runs (96/day at :00,:15,:30,:45 — 4/hr × 24h)
    const hbRows = hbRes.data ?? [];
    const hbSuccess = hbRows.filter((r: any) => r.status === "ok" || r.status === "success").length;
    const hbExpected = 96;
    const heartbeat_success_rate = hbRows.length > 0 ? clamp(hbSuccess / Math.max(hbExpected, hbRows.length)) : null;

    // Sentinel: 1 - drift_rate
    const sentRows = sentRes.data ?? [];
    const drifts = sentRows.filter((r: any) => r.drift_flag === true).length;
    const sentinel_drift_rate = sentRows.length > 0 ? clamp(1 - drifts / sentRows.length) : null;

    // Adversarial pass rate
    const advRows = advRes.data ?? [];
    const advPass = advRows.filter((r: any) => r.pass === true).length;
    const adversarial_pass_rate = advRows.length > 0 ? clamp(advPass / advRows.length) : null;

    // Regression: last 24h, fall back to 7d if <2 runs
    let regRows = regRes.data ?? [];
    if (regRows.length < 2) {
      const { data: reg7 } = await supabase
        .from("engine_regression_results").select("pass").gte("run_at", since7d);
      regRows = reg7 ?? [];
    }
    const regPass = regRows.filter((r: any) => r.pass === true).length;
    const regression_pass_rate = regRows.length > 0 ? clamp(regPass / regRows.length) : null;

    // Prediction accuracy
    const predRows = predRes.data ?? [];
    const prediction_accuracy_avg = predRows.length > 0
      ? predRows.reduce((s: number, r: any) => s + Number(r.accuracy_score ?? 0), 0) / predRows.length
      : null;

    // Advisory effectiveness
    const advisRows = advisRes.data ?? [];
    const advRaw = advisRows.length > 0
      ? advisRows.reduce((s: number, r: any) => s + Number(r.effectiveness_score ?? 0), 0) / advisRows.length
      : null;
    const advisory_effectiveness_avg = advRaw === null ? null : Math.max(0, Math.min(100, advRaw));

    // Score: missing inputs default to 1.0 (don't punish)
    const v = {
      hb: heartbeat_success_rate ?? 1.0,
      sd: sentinel_drift_rate ?? 1.0,
      ap: adversarial_pass_rate ?? 1.0,
      rp: regression_pass_rate ?? 1.0,
      pa: prediction_accuracy_avg === null ? 1.0 : prediction_accuracy_avg / 100,
      ae: advisory_effectiveness_avg === null ? 1.0 : advisory_effectiveness_avg / 100,
    };

    const score = Math.round(
      (v.hb * 0.20 + v.sd * 0.20 + v.ap * 0.20 + v.rp * 0.20 + v.pa * 0.10 + v.ae * 0.10) * 100
    );

    const breakdown = {
      heartbeat_success_rate,
      sentinel_drift_rate,
      adversarial_pass_rate,
      regression_pass_rate,
      prediction_accuracy_avg,
      advisory_effectiveness_avg,
      sample_sizes: {
        heartbeat: hbRows.length,
        sentinel: sentRows.length,
        adversarial: advRows.length,
        regression: regRows.length,
        prediction: predRows.length,
        advisory: advisRows.length,
      },
    };

    // Insert + alert if score dropped > 10pts
    const { data: prev } = await supabase
      .from("engine_system_health")
      .select("score")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase.from("engine_system_health").insert({ score, breakdown });

    if (prev && prev.score - score > 10) {
      await supabase.from("audit_log").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action: "system_health_drop",
        table_name: "engine_system_health",
        metadata: { previous: prev.score, current: score, drop: prev.score - score, breakdown },
      });
    }

    return new Response(JSON.stringify({ status: "ok", score, breakdown }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[compute-system-health]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
