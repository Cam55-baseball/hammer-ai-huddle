// Foundations manual recompute — Phase G5.
// Admin tool. For a target user, clears their fatigue cache markers and emits
// a diagnostic trace tagged surface_origin='admin_replay'. The next time the
// hook runs in the user's session it recomputes from scratch.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role,status")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .eq("status", "active")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json().catch(() => ({}));
    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (userId === "00000000-0000-0000-0000-000000000001") {
      return new Response(JSON.stringify({ error: "system_user_excluded" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Force trigger-event resolution check (safe, idempotent).
    await admin
      .from("foundation_trigger_events")
      .update({ resolved_at: new Date().toISOString(), confidence: 0 })
      .eq("user_id", userId)
      .lt("confidence", 0.05)
      .is("resolved_at", null);

    // Emit a diagnostic trace marker so admin can find the recompute event.
    const { data: trace } = await admin
      .from("foundation_recommendation_traces")
      .insert({
        user_id: userId,
        video_id: "00000000-0000-0000-0000-000000000000",
        surface_origin: "admin_replay",
        active_triggers: [],
        matched_triggers: [],
        raw_score: 0,
        final_score: 0,
        score_breakdown: { admin_recompute: true, requested_by: caller.id },
        recommendation_version: 1,
        foundation_meta_version: 1,
        suppressed: true,
        suppression_reason: "admin_recompute_marker",
      })
      .select("trace_id")
      .maybeSingle();

    return new Response(
      JSON.stringify({ ok: true, trace_id: trace?.trace_id ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
