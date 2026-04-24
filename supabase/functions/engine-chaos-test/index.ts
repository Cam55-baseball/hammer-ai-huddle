// Phase 6 — Chaos Test (admin only) — temporary perturbation, auto-restored
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// Phase 7 — Observability wrapper
async function logRun(supabase: any, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: 'engine-chaos-test',
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const callerId = userData.user.id;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: roles } = await admin
    .from("user_roles").select("role")
    .eq("user_id", callerId).eq("status", "active");
  const isAdmin = (roles ?? []).some((r: any) => r.role === "owner" || r.role === "admin");
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Snapshot baseline
    const { data: baseline } = await admin.from("engine_dynamic_weights").select("axis,weight,metadata");
    const baselineMap: Record<string, number> = Object.fromEntries(
      (baseline ?? []).map((r: any) => [r.axis, Number(r.weight)])
    );

    // Perturb
    const axes = ["arousal", "recovery", "motor", "cognitive", "dopamine"];
    const chaosMap: Record<string, number> = {};
    for (const axis of axes) {
      const cur = baselineMap[axis] ?? 1.0;
      const delta = (Math.random() * 0.20) - 0.10;
      chaosMap[axis] = +clamp(cur + delta, 0.5, 1.5).toFixed(3);
      await admin.from("engine_dynamic_weights").upsert({
        axis, weight: chaosMap[axis], updated_at: new Date().toISOString(),
        metadata: { chaos_test: true, baseline: cur },
      }, { onConflict: "axis" });
    }

    // Fire sentinel + adversarial
    const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    };
    await Promise.allSettled([
      fetch(`${base}/engine-sentinel`, { method: "POST", headers }),
      fetch(`${base}/engine-adversarial`, { method: "POST", headers }),
    ]);

    // Wait 30s
    await new Promise((r) => setTimeout(r, 30000));

    // Read results
    const since = new Date(Date.now() - 60000).toISOString();
    const [sentRes, advRes] = await Promise.all([
      admin.from("engine_sentinel_logs").select("drift_flag").gte("run_at", since),
      admin.from("engine_adversarial_logs").select("pass").gte("run_at", since),
    ]);
    const sentinel_drifts = (sentRes.data ?? []).filter((r: any) => r.drift_flag).length;
    const adversarial_fails = (advRes.data ?? []).filter((r: any) => r.pass === false).length;

    // Restore
    for (const axis of axes) {
      const orig = baselineMap[axis];
      if (orig !== undefined) {
        await admin.from("engine_dynamic_weights").upsert({
          axis, weight: orig, updated_at: new Date().toISOString(),
          metadata: { restored_from_chaos: true },
        }, { onConflict: "axis" });
      } else {
        await admin.from("engine_dynamic_weights").delete().eq("axis", axis);
      }
    }

    await admin.from("audit_log").insert({
      user_id: callerId,
      action: "chaos_test_completed",
      table_name: "engine_dynamic_weights",
      metadata: { baseline_weights: baselineMap, chaos_weights: chaosMap, sentinel_drifts, adversarial_fails, restored: true },
    });

    await logRun(admin, 'success', startMs, undefined, { sentinel_drifts, adversarial_fails });
    return new Response(JSON.stringify({
      status: "ok", baseline_weights: baselineMap, chaos_weights: chaosMap,
      sentinel_drifts, adversarial_fails, restored: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[engine-chaos-test]", err);
    await logRun(admin, 'fail', startMs, String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
