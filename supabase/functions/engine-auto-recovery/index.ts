// Phase 7 — Auto-Recovery Layer
// Runs every 10 min. Triggers existing recovery functions when system health is low,
// detects function instability, and recovers from stuck-state.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FN = "engine-auto-recovery";

async function logRun(supabase: any, status: "success" | "fail" | "timeout", startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from("engine_function_logs").insert({
      function_name: FN,
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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const summary: any = { recovery_triggered: false, instability: [], stuck_recovery: 0 };

  try {
    // 1. Read latest system health
    const { data: latestHealth } = await supabase
      .from("engine_system_health")
      .select("score,created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const score = latestHealth?.score ?? null;
    summary.last_health_score = score;

    // 2. If health < 70 → kick recovery chain
    if (score !== null && score < 70) {
      summary.recovery_triggered = true;
      // Fire-and-forget invocations (don't block the loop on slow optimizers)
      const invokeFn = async (name: string) => {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({ source: "auto-recovery" }),
          });
        } catch { /* silent */ }
      };
      await invokeFn("engine-weight-optimizer");
      await new Promise(r => setTimeout(r, 5000));
      await invokeFn("compute-system-health");
      await invokeFn("evaluate-predictions");

      await supabase.from("audit_log").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action: "auto_recovery_triggered",
        table_name: "engine_system_health",
        metadata: { trigger_score: score, chain: ["engine-weight-optimizer","compute-system-health","evaluate-predictions"] },
      });
    }

    // 3. Function instability check (last hour)
    const since1h = new Date(Date.now() - 3600000).toISOString();
    const { data: logs } = await supabase
      .from("engine_function_logs")
      .select("function_name,status")
      .gte("created_at", since1h);

    const byFn = new Map<string, { total: number; fails: number }>();
    for (const r of logs ?? []) {
      const cur = byFn.get(r.function_name) ?? { total: 0, fails: 0 };
      cur.total += 1;
      if (r.status === "fail" || r.status === "timeout") cur.fails += 1;
      byFn.set(r.function_name, cur);
    }
    for (const [name, agg] of byFn.entries()) {
      if (agg.total >= 5 && (agg.fails / agg.total) > 0.20) {
        const failureRate = +(agg.fails / agg.total).toFixed(3);
        summary.instability.push({ function_name: name, failure_rate: failureRate, total: agg.total });
        await supabase.from("audit_log").insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          action: "function_instability_detected",
          table_name: "engine_function_logs",
          metadata: { function_name: name, failure_rate: failureRate, total: agg.total, fails: agg.fails },
        });
      }
    }

    // 4. Stuck-state check
    const { data: lastSnap } = await supabase
      .from("hammer_state_snapshots")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastSnapMs = lastSnap?.created_at ? new Date(lastSnap.created_at).getTime() : 0;
    const stuckMs = Date.now() - lastSnapMs;
    summary.minutes_since_last_snapshot = lastSnapMs ? Math.round(stuckMs / 60000) : null;

    if (lastSnapMs && stuckMs > 30 * 60 * 1000) {
      const { data: activeUsers } = await supabase
        .from("custom_activity_logs")
        .select("user_id")
        .gte("created_at", new Date(Date.now() - 86400000).toISOString())
        .limit(50);

      const uniqUsers = Array.from(new Set((activeUsers ?? []).map((r: any) => r.user_id))).slice(0, 10);
      if (uniqUsers.length > 0) {
        for (const uid of uniqUsers) {
          try {
            fetch(`${SUPABASE_URL}/functions/v1/compute-hammer-state`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
              body: JSON.stringify({ user_id: uid, source: "auto-recovery-stuck" }),
            }).catch(() => {});
          } catch { /* silent */ }
        }
        summary.stuck_recovery = uniqUsers.length;
        await supabase.from("audit_log").insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          action: "stuck_state_recovery",
          table_name: "hammer_state_snapshots",
          metadata: { user_count: uniqUsers.length, minutes_stale: Math.round(stuckMs / 60000) },
        });
      }
    }

    await logRun(supabase, "success", startMs, undefined, summary);
    return new Response(JSON.stringify({ status: "ok", ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[engine-auto-recovery]", err);
    await logRun(supabase, "fail", startMs, String(err));
    return new Response(JSON.stringify({ error: String(err), fallback: true }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
