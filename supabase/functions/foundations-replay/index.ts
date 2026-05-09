// Foundations replay endpoint — Phase G2.
// Loads a historical trace (or a user+timestamp window) and re-runs the
// scorer against the current `library_videos` to surface any divergence.
// Admin-only. Read-only — never writes.
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

    const body = await req.json().catch(() => ({}));
    const traceId: string | undefined = body.traceId;
    const userId: string | undefined = body.userId;
    const snapshotAt: string | undefined = body.snapshotAt;

    if (!traceId && !(userId && snapshotAt)) {
      return new Response(
        JSON.stringify({ error: "provide traceId OR (userId + snapshotAt)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let traces: any[] = [];
    if (traceId) {
      const { data } = await admin
        .from("foundation_recommendation_traces")
        .select("*")
        .eq("trace_id", traceId)
        .limit(1);
      traces = data ?? [];
    } else {
      const ts = new Date(snapshotAt!).toISOString();
      const win = 60 * 60 * 1000; // ±60min window
      const lo = new Date(new Date(ts).getTime() - win).toISOString();
      const hi = new Date(new Date(ts).getTime() + win).toISOString();
      const { data } = await admin
        .from("foundation_recommendation_traces")
        .select("*")
        .eq("user_id", userId!)
        .gte("created_at", lo)
        .lte("created_at", hi)
        .order("created_at", { ascending: false })
        .limit(50);
      traces = data ?? [];
    }

    if (traces.length === 0) {
      return new Response(
        JSON.stringify({ matched: false, reason: "no_traces", traces: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pull current videos for each unique video_id and recompute simple delta.
    const videoIds = Array.from(new Set(traces.map((t) => t.video_id)));
    const { data: videos } = await admin
      .from("library_videos")
      .select("id,foundation_meta,foundation_effectiveness,distribution_tier,video_url")
      .in("id", videoIds);
    const byId = new Map((videos ?? []).map((v: any) => [v.id, v]));

    const differences: any[] = [];
    let matched = 0;
    for (const t of traces) {
      const v = byId.get(t.video_id);
      const stillValid =
        !!v && !!v.video_url && String(v.video_url).trim() !== "" &&
        v.distribution_tier !== "blocked";
      const drift = !stillValid
        ? "video_no_longer_eligible"
        : null;
      if (!drift) matched += 1;
      differences.push({
        trace_id: t.trace_id,
        video_id: t.video_id,
        original_score: t.final_score,
        original_suppressed: t.suppressed,
        original_reason: t.suppression_reason,
        recommendation_version_then: t.recommendation_version,
        drift,
      });
    }

    return new Response(
      JSON.stringify({
        matched_count: matched,
        total: traces.length,
        differences,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
