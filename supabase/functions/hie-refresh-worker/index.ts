// HIE Refresh Worker — pulls oldest dirty users and refreshes their HIE snapshots.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Pull oldest dirty users not currently being processed
    const { data: dirty, error } = await supabase
      .from("hie_dirty_users")
      .select("user_id, dirtied_at, attempt_count")
      .or("processing_started_at.is.null,processing_started_at.lt." +
          new Date(Date.now() - 5 * 60_000).toISOString())
      .lt("attempt_count", MAX_ATTEMPTS)
      .order("dirtied_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!dirty || dirty.length === 0) {
      return new Response(JSON.stringify({ status: "idle", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let failed = 0;

    for (const row of dirty) {
      // Mark processing
      await supabase
        .from("hie_dirty_users")
        .update({ processing_started_at: new Date().toISOString(), attempt_count: row.attempt_count + 1 })
        .eq("user_id", row.user_id);

      try {
        // Sport lookup
        const { data: settings } = await supabase
          .from("athlete_mpi_settings").select("sport").eq("user_id", row.user_id).maybeSingle();

        const acquired = await supabase.rpc("try_acquire_hie_lock", {
          p_user_id: row.user_id, p_stale_seconds: 120,
        });
        if (!acquired.data) continue;

        const { error: invokeErr } = await supabase.functions.invoke("hie-analyze", {
          body: { user_id: row.user_id, sport: settings?.sport ?? "baseball", trigger: "dirty_refresh" },
        });
        if (invokeErr) throw invokeErr;

        // Also kick hammer-state recompute opportunistically
        supabase.functions.invoke("compute-hammer-state", {
          body: { user_id: row.user_id },
        }).catch(() => {});

        // Success — remove from queue
        await supabase.from("hie_dirty_users").delete().eq("user_id", row.user_id);
        await supabase.from("hie_execution_locks").delete().eq("user_id", row.user_id);
        processed++;
      } catch (err) {
        failed++;
        console.error(`[hie-refresh] user ${row.user_id} failed:`, err);
        await supabase.from("hie_execution_locks").delete().eq("user_id", row.user_id);
      }
    }

    return new Response(
      JSON.stringify({ status: "ok", processed, failed, queue_size: dirty.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[hie-refresh] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
