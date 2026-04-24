// Update User Engine Profile — weekly pass to compute personalization modifiers.
// Schedule: Sunday 05:13 UTC.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: users } = await supabase.from("athlete_mpi_settings").select("user_id").limit(1000);

    let processed = 0;
    for (const u of users ?? []) {
      const { data: snaps } = await supabase
        .from("hammer_state_snapshots")
        .select("recovery_score,cognitive_load,overall_state,created_at")
        .eq("user_id", u.user_id).gte("created_at", since)
        .order("created_at", { ascending: true });

      if (!snaps || snaps.length < 10) continue;

      // sensitivity_to_load = correlation between cognitive_load(t) and -ΔrecoveryScore(t→t+1)
      let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, n = 0;
      for (let i = 0; i < snaps.length - 1; i++) {
        const x = Number(snaps[i].cognitive_load ?? 0);
        const y = Number(snaps[i].recovery_score ?? 0) - Number(snaps[i + 1].recovery_score ?? 0);
        sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y; n++;
      }
      const corr = n > 0 && (n * sumX2 - sumX * sumX) > 0 && (n * sumY2 - sumY * sumY) > 0
        ? (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
        : 0;
      const sensitivity = clamp(1 + corr * 0.5, 0.5, 1.5);

      // recovery_speed = inverse of average hours from 'recover' → 'ready'
      const recoveryEpisodes: number[] = [];
      let recStart: number | null = null;
      for (const s of snaps) {
        const t = new Date(s.created_at).getTime();
        if (s.overall_state === "recover" && recStart === null) recStart = t;
        else if (recStart !== null && (s.overall_state === "ready" || s.overall_state === "prime")) {
          recoveryEpisodes.push((t - recStart) / (60 * 60 * 1000));
          recStart = null;
        }
      }
      const avgRecoveryH = recoveryEpisodes.length > 0
        ? recoveryEpisodes.reduce((a, b) => a + b, 0) / recoveryEpisodes.length
        : 24;
      // Faster recovery (smaller hours) → higher recovery_speed
      const recoverySpeed = clamp(24 / Math.max(4, avgRecoveryH), 0.5, 1.5);

      // volatility_index = stddev of state transitions / 30d
      const stateNum: Record<string, number> = { recover: 0, caution: 1, ready: 2, prime: 3 };
      const series = snaps.map(s => stateNum[s.overall_state] ?? 1);
      const volatility = clamp(stddev(series) / 1.5, 0, 1);

      await supabase.from("user_engine_profile").upsert({
        user_id: u.user_id,
        sensitivity_to_load: +sensitivity.toFixed(3),
        recovery_speed: +recoverySpeed.toFixed(3),
        volatility_index: +volatility.toFixed(3),
        sample_size: snaps.length,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      processed++;
    }

    return new Response(JSON.stringify({ status: "ok", profiles_updated: processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[update-user-engine-profile]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
