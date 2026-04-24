// Engine Heartbeat — runs every 15 min via pg_cron, validates the full Hammers pipeline.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Owner is heartbeat target — already deep-trace anchor across all prior Kill Tests.
const HEARTBEAT_USER_ID = "95de827d-7418-460b-8b79-267bf79bdca4";
const PIPELINE_TIMEOUT_MS = 150_000;
const STALE_THRESHOLD_MS = 120_000;

// Phase 7 — Observability wrapper
async function logRun(supabase: any, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: 'engine-heartbeat',
      status,
      duration_ms: Date.now() - startMs,
      error_message: error ?? null,
      metadata: metadata ?? {},
    });
  } catch { /* silent */ }
}

interface HeartbeatResult {
  success: boolean;
  latency_ms: number;
  failure_reason: string | null;
  failure_check: string | null;
  hie_snapshot_age_ms: number | null;
  hammer_snapshot_age_ms: number | null;
  completions_in_aggregation: number | null;
  metadata: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const startMs = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const T0 = Date.now();
  const T0_iso = new Date(T0).toISOString();
  const result: HeartbeatResult = {
    success: false,
    latency_ms: 0,
    failure_reason: null,
    failure_check: null,
    hie_snapshot_age_ms: null,
    hammer_snapshot_age_ms: null,
    completions_in_aggregation: null,
    metadata: {},
  };

  const fail = (check: string, reason: string, extra: Record<string, unknown> = {}) => {
    result.success = false;
    result.failure_check = check;
    result.failure_reason = reason;
    result.metadata = { ...result.metadata, ...extra };
  };

  try {
    // --- CHECK 1: Write succeeds ---
    const today = new Date().toISOString().slice(0, 10);
    const { data: nextIdxRow } = await supabase
      .from("custom_activity_logs")
      .select("instance_index")
      .eq("user_id", HEARTBEAT_USER_ID)
      .eq("entry_date", today)
      .order("instance_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextIdx = ((nextIdxRow?.instance_index as number | undefined) ?? 0) + 1;

    const { data: insertedLog, error: insertErr } = await supabase
      .from("custom_activity_logs")
      .insert({
        user_id: HEARTBEAT_USER_ID,
        notes: "heartbeat",
        actual_duration_minutes: 1,
        completed: true,
        completion_state: "completed",
        completion_method: "done_button",
        completed_at: T0_iso,
        entry_date: today,
        instance_index: nextIdx,
        performance_data: { checkboxStates: { heartbeat: true } },
      })
      .select("id, created_at")
      .single();

    if (insertErr || !insertedLog) {
      fail("write_failed", `Insert error: ${insertErr?.message ?? "no row returned"}`);
    } else {
      const ageMs = Date.now() - new Date(insertedLog.created_at).getTime();
      if (ageMs > 120_000) {
        fail("write_failed", `Inserted row stale (${ageMs}ms old)`);
      }
      result.metadata = { ...result.metadata, log_id: insertedLog.id };
    }

    if (!result.failure_check) {
      // --- Trigger pipeline ---
      const { error: hieErr } = await supabase.functions.invoke("hie-refresh-worker", {});
      if (hieErr) result.metadata = { ...result.metadata, hie_invoke_warning: hieErr.message };

      const { error: hsErr } = await supabase.functions.invoke("compute-hammer-state", {
        body: { user_id: HEARTBEAT_USER_ID },
      });
      if (hsErr) result.metadata = { ...result.metadata, hammer_invoke_warning: hsErr.message };

      // --- CHECK 2: HIE snapshot updated (poll up to 60s — race-tolerant) ---
      let hie: { computed_at: string } | null = null;
      for (let i = 0; i < 30; i++) {
        const { data } = await supabase
          .from("hie_snapshots")
          .select("computed_at")
          .eq("user_id", HEARTBEAT_USER_ID)
          .gte("computed_at", T0_iso)
          .order("computed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) { hie = data; break; }
        await new Promise((r) => setTimeout(r, 2_000));
      }

      if (!hie) {
        fail("hie_stale", "No new HIE snapshot within 60s of heartbeat T0");
      } else {
        result.hie_snapshot_age_ms = Date.now() - new Date(hie.computed_at).getTime();
      }

      // --- CHECK 3: Hammer state snapshot (truthful probe with recovery path) ---
      let hs: { computed_at: string; dopamine_inputs: unknown } | null = null;
      for (let i = 0; i < 30; i++) {
        const { data } = await supabase
          .from("hammer_state_snapshots")
          .select("computed_at, dopamine_inputs")
          .eq("user_id", HEARTBEAT_USER_ID)
          .gte("computed_at", T0_iso)
          .order("computed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) { hs = data; break; }
        await new Promise((r) => setTimeout(r, 2_000));
      }

      // Recovery path: re-invoke compute-hammer-state and check freshest snapshot age
      if (!hs) {
        try {
          await supabase.functions.invoke("compute-hammer-state", {
            body: { user_id: HEARTBEAT_USER_ID },
          });
          await new Promise((r) => setTimeout(r, 3_000));

          const { data: latest } = await supabase
            .from("hammer_state_snapshots")
            .select("computed_at, dopamine_inputs")
            .eq("user_id", HEARTBEAT_USER_ID)
            .order("computed_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latest) {
            const ageMs = Date.now() - new Date(latest.computed_at).getTime();
            if (ageMs <= STALE_THRESHOLD_MS) {
              hs = latest;
              result.metadata = { ...result.metadata, hammer_recovered: true, recovery_age_ms: ageMs };
            }
          }
        } catch (err) {
          result.metadata = {
            ...result.metadata,
            hammer_recovery_error: err instanceof Error ? err.message : String(err),
          };
        }
      }

      if (!hs) {
        if (!result.failure_check) fail("hammer_stale", `No hammer_state_snapshot within ${STALE_THRESHOLD_MS}ms even after recovery attempt`);
      } else {
        result.hammer_snapshot_age_ms = Date.now() - new Date(hs.computed_at).getTime();

        // --- CHECK 4: Aggregation includes our heartbeat log ---
        const sixHoursAgo = new Date(Date.now() - 6 * 3600_000).toISOString();
        const { count: rawCount } = await supabase
          .from("custom_activity_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", HEARTBEAT_USER_ID)
          .gte("created_at", sixHoursAgo);

        const aggCompletions = Number(
          (hs.dopamine_inputs as Record<string, unknown>)?.completions_last_6h ?? 0,
        );
        result.completions_in_aggregation = aggCompletions;
        result.metadata = { ...result.metadata, raw_logs_last_6h: rawCount ?? 0 };

        if (rawCount != null && aggCompletions < rawCount) {
          if (!result.failure_check) {
            fail("aggregation_drift", `Snapshot agg ${aggCompletions} < raw count ${rawCount}`);
          }
        }
      }

      // --- CHECK 5: Pipeline timing ---
      const elapsed = Date.now() - T0;
      result.latency_ms = elapsed;
      if (elapsed > PIPELINE_TIMEOUT_MS && !result.failure_check) {
        fail("pipeline_slow", `Elapsed ${elapsed}ms > ${PIPELINE_TIMEOUT_MS}ms`);
      }

      if (!result.failure_check) result.success = true;
    }
  } catch (err) {
    fail("exception", err instanceof Error ? err.message : String(err));
  }

  result.latency_ms = Date.now() - T0;

  // --- Persist heartbeat result ---
  await supabase.from("engine_heartbeat_logs").insert({
    success: result.success,
    latency_ms: result.latency_ms,
    failure_reason: result.failure_reason,
    failure_check: result.failure_check,
    hie_snapshot_age_ms: result.hie_snapshot_age_ms,
    hammer_snapshot_age_ms: result.hammer_snapshot_age_ms,
    completions_in_aggregation: result.completions_in_aggregation,
    metadata: result.metadata,
  });

  // --- Surface failures into existing engine-health audit feed ---
  if (!result.success) {
    await supabase.from("audit_log").insert({
      user_id: HEARTBEAT_USER_ID,
      action: "heartbeat_failed",
      table_name: "engine_heartbeat_logs",
      metadata: {
        failure_check: result.failure_check,
        failure_reason: result.failure_reason,
        latency_ms: result.latency_ms,
      },
    });
  }

  await logRun(supabase, result.success ? 'success' : 'fail', startMs, result.failure_reason ?? undefined, {
    failure_check: result.failure_check,
    latency_ms: result.latency_ms,
    hie_age_ms: result.hie_snapshot_age_ms,
    hammer_age_ms: result.hammer_snapshot_age_ms,
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
