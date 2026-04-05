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

    // Step 4: Check post-state — look for processing logs
    // The nightly function logs "nightly_mpi_batch" entries in audit_log
    const { data: batchLogs } = await supabase
      .from("audit_log")
      .select("id, action, metadata, created_at")
      .in("action", ["nightly_mpi_batch", "nightly_mpi_complete", "nightly_mpi_timeout", "nightly_mpi_continuation"])
      .order("created_at", { ascending: false })
      .limit(10);
    results.post_audit_logs = batchLogs;

    // Step 5: Check which athletes were processed (from nightly response)
    // The nightly function returns processed count and details
    if (nightlyResult && typeof nightlyResult === "object") {
      const nr = nightlyResult as Record<string, unknown>;
      results.resume_proof = {
        expected_start_index: 2,
        nightly_reported_processed: nr.processed ?? nr.athletes_processed ?? "unknown",
        nightly_reported_skipped: nr.skipped ?? "unknown",
      };
    }

    // Step 6: Cleanup — delete the fake token we inserted
    // We can identify it by the specific metadata
    const { data: fakeTokens } = await supabase
      .from("audit_log")
      .select("id")
      .eq("action", "nightly_mpi_continuation")
      .eq("user_id", "00000000-0000-0000-0000-000000000000");
    
    if (fakeTokens && fakeTokens.length > 0) {
      // We cannot delete from audit_log via client (immutable by design)
      // Just note it for transparency
      results.cleanup = `${fakeTokens.length} test token(s) remain in audit_log (immutable table)`;
    }

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
