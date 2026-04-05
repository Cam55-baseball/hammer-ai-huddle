import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const results: Record<string, unknown> = {};

  try {
    // Step 1: Record pre-state — count existing continuation tokens
    const { data: preTokens } = await supabase
      .from("audit_log")
      .select("id, metadata, created_at")
      .eq("action", "nightly_mpi_continuation")
      .order("created_at", { ascending: false })
      .limit(5);
    results.pre_tokens = preTokens?.length ?? 0;

    // Step 2: Insert a fake continuation token with resume_from: 2
    const { error: insertErr } = await supabase.from("audit_log").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      action: "nightly_mpi_continuation",
      table_name: "mpi_scores",
      metadata: { sport: "baseball", resume_from: 2, total_athletes: 5 },
    });
    if (insertErr) {
      results.token_insert = { error: insertErr.message };
    } else {
      results.token_insert = "OK — resume_from: 2 injected";
    }

    // Step 3: Call nightly-mpi-process and capture response
    let nightlyResult: unknown = null;
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/nightly-mpi-process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ sport: "baseball" }),
      });
      nightlyResult = await resp.json().catch(() => resp.statusText);
      results.nightly_response = { status: resp.status, body: nightlyResult };
    } catch (e: any) {
      results.nightly_response = { error: e.message };
    }

    // Step 4: Check nightly_mpi_batch_start — the NEW audit log proving resume index
    const { data: batchStartLogs } = await supabase
      .from("audit_log")
      .select("id, action, metadata, created_at")
      .eq("action", "nightly_mpi_batch_start")
      .order("created_at", { ascending: false })
      .limit(3);

    results.batch_start_logs = batchStartLogs;

    // Verify the batch_start matches injected resume_from
    if (batchStartLogs && batchStartLogs.length > 0) {
      const latestMeta = batchStartLogs[0].metadata as any;
      const actualBatchStart = latestMeta?.batch_start;
      results.resume_verification = {
        injected_resume_from: 2,
        actual_batch_start: actualBatchStart,
        match: actualBatchStart === 2,
        verdict: actualBatchStart === 2
          ? "PASS — nightly resumed at correct index"
          : `FAIL — expected batch_start=2, got ${actualBatchStart}`,
      };
    } else {
      results.resume_verification = {
        verdict: "FAIL — no nightly_mpi_batch_start log found",
      };
    }

    // Step 5: Check completion log for resumed_from field
    const { data: completionLogs } = await supabase
      .from("audit_log")
      .select("id, action, metadata, created_at")
      .eq("action", "nightly_mpi_complete")
      .order("created_at", { ascending: false })
      .limit(3);
    results.completion_logs = completionLogs;

    if (completionLogs && completionLogs.length > 0) {
      const completionMeta = completionLogs[0].metadata as any;
      results.completion_resumed_from = {
        resumed_from_in_completion: completionMeta?.resumed_from,
        match: completionMeta?.resumed_from === 2,
      };
    }

    // Step 6: Check nightly response for resumed_from
    if (nightlyResult && typeof nightlyResult === "object") {
      const nr = nightlyResult as Record<string, unknown>;
      results.response_proof = {
        resumed_from_in_response: nr.resumed_from,
        athletes_processed: nr.athletes_processed,
        match: nr.resumed_from === 2,
      };
    }

    // Step 7: Cleanup note
    results.cleanup = "Test tokens remain in audit_log (immutable table)";

    return new Response(
      JSON.stringify({ timestamp: new Date().toISOString(), results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
