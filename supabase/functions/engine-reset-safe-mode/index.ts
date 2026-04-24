// Phase 6 — Kill Switch (Safe Mode) — admin only
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
      function_name: 'engine-reset-safe-mode',
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

  // Verify owner or admin role
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
    const body = await req.json().catch(() => ({}));
    const resetProfiles = body?.reset_profiles === true;

    // Snapshot current weights for history
    const { data: prevWeights } = await admin.from("engine_dynamic_weights").select("axis,weight");

    // Delete weights
    await admin.from("engine_dynamic_weights").delete().neq("axis", "__never__");

    // Optional: delete profiles
    if (resetProfiles) {
      await admin.from("user_engine_profile").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    }

    // History rows
    if (prevWeights && prevWeights.length > 0) {
      await admin.from("engine_weight_history").insert(
        prevWeights.map((w: any) => ({
          axis: w.axis,
          weight: 1.0,
          delta: -(Number(w.weight) - 1.0),
          source: "safe_mode_reset",
          metadata: { previous_weight: Number(w.weight), triggered_by: callerId },
        }))
      );
    }

    await admin.from("audit_log").insert({
      user_id: callerId,
      action: "safe_mode_enabled",
      table_name: "engine_dynamic_weights",
      metadata: {
        caller_user_id: callerId,
        reset_profiles: resetProfiles,
        weights_cleared: (prevWeights ?? []).length,
        reset_timestamp: new Date().toISOString(),
      },
    });

    await logRun(admin, 'success', startMs, undefined, { weights_cleared: (prevWeights ?? []).length, profiles_reset: resetProfiles });
    return new Response(JSON.stringify({
      status: "ok",
      weights_cleared: (prevWeights ?? []).length,
      profiles_reset: resetProfiles,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[engine-reset-safe-mode]", err);
    await logRun(admin, 'fail', startMs, String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
