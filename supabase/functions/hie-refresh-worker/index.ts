// HIE Refresh Worker — pulls oldest dirty users and refreshes their HIE snapshots.
//
// Observability contract: this function ALWAYS emits at least one log line per
// invocation (start + summary), so an empty log stream is proof the function
// never ran — never proof that it ran and did nothing.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;
const SYSTEM_USER = "00000000-0000-0000-0000-000000000001";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  console.log("[hie-refresh] invocation start");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* cron sends {} or nothing */ }
    // Operator escape hatch: retry rows already at MAX_ATTEMPTS.
    const includeExhausted =
      body?.include_exhausted === true || url.searchParams.get("include_exhausted") === "true";

    // The system user is never a real athlete — drop it rather than burn attempts.
    await supabase.from("hie_dirty_users").delete().eq("user_id", SYSTEM_USER);

    let query = supabase
      .from("hie_dirty_users")
      .select("user_id, dirtied_at, attempt_count")
      .neq("user_id", SYSTEM_USER)
      .or("processing_started_at.is.null,processing_started_at.lt." +
        new Date(Date.now() - 5 * 60_000).toISOString())
      .order("dirtied_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (!includeExhausted) query = query.lt("attempt_count", MAX_ATTEMPTS);

    const { data: dirty, error } = await query;
    if (error) throw error;

    // Visibility on rows the normal query refuses to touch — the exact condition
    // that stranded the queue silently for months.
    const { count: exhaustedCount } = await supabase
      .from("hie_dirty_users")
      .select("user_id", { count: "exact", head: true })
      .neq("user_id", SYSTEM_USER)
      .gte("attempt_count", MAX_ATTEMPTS);

    if ((exhaustedCount ?? 0) > 0 && !includeExhausted) {
      console.warn(
        `[hie-refresh] ${exhaustedCount} user(s) parked at attempt_count>=${MAX_ATTEMPTS} and will NOT be retried. ` +
        `Re-run with {"include_exhausted":true} after fixing the underlying failure.`,
      );
    }

    if (!dirty || dirty.length === 0) {
      console.log(`[hie-refresh] idle — nothing eligible (parked=${exhaustedCount ?? 0})`);
      return new Response(
        JSON.stringify({ status: "idle", processed: 0, parked: exhaustedCount ?? 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[hie-refresh] claimed ${dirty.length} user(s) (parked=${exhaustedCount ?? 0})`);

    let processed = 0;
    let failed = 0;
    let skippedLocked = 0;
    const errors: string[] = [];

    for (const row of dirty) {
      const acquired = await supabase.rpc("try_acquire_hie_lock", {
        p_user_id: row.user_id, p_stale_seconds: 120,
      });

      // A live lock means someone else is already refreshing this user. That is
      // NOT a failed attempt — burning an attempt here is what poisoned the queue.
      if (acquired.error || !acquired.data) {
        skippedLocked++;
        console.log(`[hie-refresh] user ${row.user_id} skipped — lock held (attempt not consumed)`);
        continue;
      }

      // Only now does this become a real attempt.
      await supabase
        .from("hie_dirty_users")
        .update({
          processing_started_at: new Date().toISOString(),
          attempt_count: row.attempt_count + 1,
        })
        .eq("user_id", row.user_id);

      try {
        const { data: settings } = await supabase
          .from("athlete_mpi_settings").select("sport").eq("user_id", row.user_id).maybeSingle();

        const { data: analyzeData, error: invokeErr } = await supabase.functions.invoke("hie-analyze", {
          body: { user_id: row.user_id, sport: settings?.sport ?? "baseball", trigger: "dirty_refresh" },
        });
        if (invokeErr) throw invokeErr;
        // hie-analyze answers 200-with-error in some paths; treat that as a failure too.
        if (analyzeData && (analyzeData as any).error) throw new Error(String((analyzeData as any).error));

        supabase.functions.invoke("compute-hammer-state", {
          body: { user_id: row.user_id },
        }).catch(() => {});

        await supabase.from("hie_dirty_users").delete().eq("user_id", row.user_id);
        await supabase.from("hie_execution_locks").delete().eq("user_id", row.user_id);
        processed++;
        console.log(`[hie-refresh] user ${row.user_id} refreshed`);
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${row.user_id}: ${msg}`);
        console.error(`[hie-refresh] user ${row.user_id} failed:`, msg);
        await supabase.from("hie_execution_locks").delete().eq("user_id", row.user_id);
      }
    }

    const summary = {
      status: "ok",
      processed,
      failed,
      skipped_locked: skippedLocked,
      queue_size: dirty.length,
      parked: exhaustedCount ?? 0,
      errors: errors.slice(0, 10),
      duration_ms: Date.now() - startedAt,
    };
    console.log("[hie-refresh] summary:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[hie-refresh] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
