// Predict Hammer State — forward 24/48/72h trajectory forecast.
// Schedule: every 2h at :17. Reads snapshots + activity logs, writes one row per user.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type State = "prime" | "ready" | "caution" | "recover";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Phase 7 — Observability wrapper
async function logRun(supabase: any, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: 'predict-hammer-state',
      status,
      duration_ms: Date.now() - startMs,
      error_message: error ?? null,
      metadata: metadata ?? {},
    });
  } catch { /* silent */ }
}

function computeLoadSlope24h(logs: any[]): number {
  // bucket into 4 × 6h windows; linear regression slope on (count + duration) per bucket
  const now = Date.now();
  const buckets = [0, 0, 0, 0];
  for (const l of logs) {
    const t = new Date(l.created_at).getTime();
    const ageH = (now - t) / 3_600_000;
    if (ageH > 24) continue;
    const idx = Math.min(3, Math.floor(ageH / 6));
    buckets[3 - idx] += 1 + Number(l.actual_duration_minutes ?? 0) / 30;
  }
  // simple slope: (last - first) / 3
  return (buckets[3] - buckets[0]) / 3;
}

function computeVolatility(snaps: any[]): number {
  let transitions = 0;
  for (let i = 1; i < snaps.length; i++) {
    if (snaps[i].overall_state !== snaps[i - 1].overall_state) transitions++;
  }
  return clamp(transitions / 30, 0, 1);
}

function modalState(snaps: any[]): State {
  const counts: Record<string, number> = {};
  for (const s of snaps) counts[s.overall_state] = (counts[s.overall_state] ?? 0) + 1;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ready") as State;
}

serve(async (req) => {
  const startMs = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Find users with ≥3 snapshots in last 7d
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: recentSnaps } = await supabase
      .from("hammer_state_snapshots")
      .select("user_id")
      .gte("computed_at", since7d);

    const userCounts: Record<string, number> = {};
    for (const r of recentSnaps ?? []) userCounts[r.user_id] = (userCounts[r.user_id] ?? 0) + 1;
    const eligibleUsers = Object.entries(userCounts).filter(([, c]) => c >= 3).map(([u]) => u);

    let processed = 0;
    for (const userId of eligibleUsers) {
      const { data: snaps } = await supabase
        .from("hammer_state_snapshots")
        .select("id,overall_state,arousal_score,recovery_score,cognitive_load,dopamine_load,computed_at")
        .eq("user_id", userId)
        .order("computed_at", { ascending: false })
        .limit(10);
      if (!snaps || snaps.length < 3) continue;

      const since72h = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
      const { data: logs } = await supabase
        .from("custom_activity_logs")
        .select("id,created_at,actual_duration_minutes,performance_data,notes")
        .eq("user_id", userId)
        .gte("created_at", since72h);

      const cleanLogs = (logs ?? []).filter(l =>
        !((l as any).notes ?? "").startsWith("heartbeat") &&
        !((l as any).notes ?? "").startsWith("adversarial:")
      );

      const { data: profile } = await supabase
        .from("user_engine_profile")
        .select("sample_size,sensitivity_to_load,recovery_speed,volatility_index")
        .eq("user_id", userId)
        .maybeSingle();

      const current = snaps[0].overall_state as State;
      const loadSlope24h = computeLoadSlope24h(cleanLogs);
      const recoveryDelta = Number(snaps[0].recovery_score ?? 0) - Number(snaps[Math.min(3, snaps.length - 1)].recovery_score ?? 0);
      const arousalDelta = Number(snaps[0].arousal_score ?? 0) - Number(snaps[Math.min(3, snaps.length - 1)].arousal_score ?? 0);
      const volatility = computeVolatility(snaps);
      const lastLogAgeH = cleanLogs.length > 0
        ? (Date.now() - new Date(cleanLogs[0].created_at).getTime()) / 3_600_000
        : 999;
      const freshness6h = lastLogAgeH > 6;

      const LOAD_THRESHOLD = 1.5;

      // 24h prediction
      let pred24: State;
      if (loadSlope24h > LOAD_THRESHOLD && recoveryDelta < -10) pred24 = "recover";
      else if (loadSlope24h > LOAD_THRESHOLD) pred24 = "caution";
      else if (current === "prime" && volatility < 0.3) pred24 = "prime";
      else if (current === "recover" && loadSlope24h < LOAD_THRESHOLD) pred24 = "ready";
      else pred24 = current;

      // 48h: dampen trend by 0.6
      const dampedSlope48 = loadSlope24h * 0.6;
      let pred48: State;
      if (dampedSlope48 > LOAD_THRESHOLD && recoveryDelta < -10) pred48 = "recover";
      else if (dampedSlope48 > LOAD_THRESHOLD) pred48 = "caution";
      else pred48 = pred24;

      // 72h: further dampen, fall back to modal
      const modal = modalState(snaps);
      const pred72: State = volatility > 0.4 ? modal : pred48;

      // Confidence
      const sampleSize = snaps.length;
      let conf24 = clamp(Math.round(60 + sampleSize * 4 - volatility * 50), 30, 95);
      if (profile && profile.sample_size >= 10) conf24 = Math.min(95, conf24 + 10);
      const conf48 = Math.round(conf24 * 0.75);
      const conf72 = Math.round(conf24 * 0.5);

      // Risk flags
      const risk_flags: string[] = [];
      if (loadSlope24h > LOAD_THRESHOLD && recoveryDelta < -10) risk_flags.push("overload_risk");
      if (loadSlope24h <= 0 && lastLogAgeH > 48 && (current === "ready" || current === "prime")) risk_flags.push("underload");
      if (volatility > 0.5) risk_flags.push("instability");

      const { data: inserted } = await supabase
        .from("engine_state_predictions")
        .insert({
          user_id: userId,
          base_snapshot_id: snaps[0].id,
          predicted_state_24h: pred24,
          predicted_state_48h: pred48,
          predicted_state_72h: pred72,
          confidence_24h: conf24,
          confidence_48h: conf48,
          confidence_72h: conf72,
          risk_flags,
          input_vector: {
            current,
            loadSlope24h,
            recoveryDelta,
            arousalDelta,
            volatility,
            freshness6h,
            sampleSize,
          },
        })
        .select("id")
        .maybeSingle();

      processed++;

      // Fire-and-forget intervention generation
      if (inserted?.id) {
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-interventions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ prediction_id: inserted.id, user_id: userId }),
        }).catch(() => {});
      }
    }

    await logRun(supabase, 'success', startMs, undefined, { processed });
    return new Response(JSON.stringify({ status: "ok", processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[predict-hammer-state]", err);
    await logRun(supabase, 'fail', startMs, String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
