// Nightly HIE batch processor — invokes hie-analyze for every active athlete.
// Mirrors continuation-token pattern from nightly-mpi-process.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 25;
const TIMEOUT_MS = 50_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let resumeFrom: string | null = null;
    try {
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      resumeFrom = body?.resume_from ?? null;
    } catch { /* noop */ }

    if (!resumeFrom) {
      const { data: cont } = await supabase
        .from("audit_log")
        .select("metadata")
        .eq("action", "nightly_hie_continuation")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      resumeFrom = (cont?.metadata as any)?.resume_from ?? null;
    }

    let query = supabase
      .from("athlete_mpi_settings")
      .select("user_id, sport")
      .order("user_id", { ascending: true })
      .limit(BATCH_SIZE);
    if (resumeFrom) query = query.gt("user_id", resumeFrom);

    const { data: athletes, error } = await query;
    if (error) throw error;

    if (!athletes || athletes.length === 0) {
      await supabase.from("audit_log").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action: "nightly_hie_complete",
        table_name: "hie_snapshots",
        metadata: { duration_ms: Date.now() - startedAt },
      });
      return new Response(JSON.stringify({ status: "complete" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let failed = 0;
    let lastUserId: string | null = null;

    for (const athlete of athletes) {
      if (Date.now() - startedAt > TIMEOUT_MS) break;
      lastUserId = athlete.user_id;
      try {
        const acquired = await supabase.rpc("try_acquire_hie_lock", {
          p_user_id: athlete.user_id,
          p_stale_seconds: 120,
        });
        if (!acquired.data) continue;

        const { error: invokeErr } = await supabase.functions.invoke("hie-analyze", {
          body: { user_id: athlete.user_id, sport: athlete.sport ?? "baseball", trigger: "nightly_batch" },
        });
        if (invokeErr) throw invokeErr;
        processed++;
      } catch (err) {
        failed++;
        console.error(`[nightly-hie] user ${athlete.user_id} failed:`, err);
      } finally {
        await supabase.from("hie_execution_locks").delete().eq("user_id", athlete.user_id);
      }
    }

    if (lastUserId) {
      await supabase.from("audit_log").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action: "nightly_hie_continuation",
        table_name: "hie_snapshots",
        metadata: { resume_from: lastUserId, processed, failed, batch_duration_ms: Date.now() - startedAt },
      });

      // Self-invoke for next batch
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/nightly-hie-process`;
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ resume_from: lastUserId }),
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ status: "batch_complete", processed, failed, last_user_id: lastUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[nightly-hie] fatal:", err);
    await supabase.from("audit_log").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      action: "nightly_hie_failure",
      table_name: "hie_snapshots",
      metadata: { error: String(err) },
    });
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
