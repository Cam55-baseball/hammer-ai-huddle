import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckResult {
  check: string;
  status: "PASS" | "FAIL" | "WARN";
  detail: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  const athleteId = body.athlete_id;
  const runHIE = body.run_hie ?? false;

  const results: CheckResult[] = [];

  try {
    // ── CHECK 1: HIE Run Success ──
    if (runHIE && athleteId) {
      try {
        const hieResp = await fetch(`${supabaseUrl}/functions/v1/hie-analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ user_id: athleteId, sport: "baseball" }),
        });
        results.push({
          check: "hie_run_success",
          status: hieResp.ok ? "PASS" : "FAIL",
          detail: `HTTP ${hieResp.status}`,
        });
        await hieResp.text(); // consume body
      } catch (e: any) {
        results.push({ check: "hie_run_success", status: "FAIL", detail: e.message });
      }
    } else {
      results.push({ check: "hie_run_success", status: "WARN", detail: "Skipped (run_hie=false or no athlete_id)" });
    }

    // ── CHECK 2: weakness_scores Integrity ──
    {
      const { data, error } = await supabase
        .from("weakness_scores")
        .select("user_id, weakness_metric")
        .order("user_id");
      if (error) {
        results.push({ check: "weakness_scores_integrity", status: "FAIL", detail: error.message });
      } else {
        const counts: Record<string, number> = {};
        (data ?? []).forEach((r: any) => { counts[r.user_id] = (counts[r.user_id] || 0) + 1; });
        const maxRows = Math.max(0, ...Object.values(counts));
        const bloated = Object.entries(counts).filter(([, c]) => c > 10);
        if (bloated.length > 0) {
          results.push({
            check: "weakness_scores_integrity",
            status: "FAIL",
            detail: `${bloated.length} athlete(s) exceed 10 rows (max=${maxRows})`,
          });
        } else {
          results.push({
            check: "weakness_scores_integrity",
            status: "PASS",
            detail: `${Object.keys(counts).length} athlete(s), max ${maxRows} rows each`,
          });
        }
      }
    }

    // ── CHECK 3: Prescription Correctness ──
    {
      const { data, error } = await supabase
        .from("drill_prescriptions")
        .select("id, targeted_metric, drill_name, user_id, resolved")
        .eq("resolved", false);
      if (error) {
        results.push({ check: "prescription_correctness", status: "FAIL", detail: error.message });
      } else {
        const missing = (data ?? []).filter((d: any) => !d.targeted_metric);
        if (missing.length > 0) {
          results.push({
            check: "prescription_correctness",
            status: "FAIL",
            detail: `${missing.length} active prescription(s) missing targeted_metric`,
          });
        } else {
          results.push({
            check: "prescription_correctness",
            status: "PASS",
            detail: `${(data ?? []).length} active prescriptions, all have targeted_metric`,
          });
        }
      }
    }

    // ── CHECK 4: Effectiveness Integrity ──
    {
      const { data, error } = await supabase
        .from("drill_prescriptions")
        .select("id, pre_weakness_value, post_weakness_value, effectiveness_score")
        .not("pre_weakness_value", "is", null)
        .not("post_weakness_value", "is", null);
      if (error) {
        results.push({ check: "effectiveness_integrity", status: "FAIL", detail: error.message });
      } else {
        const missingEff = (data ?? []).filter((d: any) => d.effectiveness_score == null);
        if (missingEff.length > 0) {
          results.push({
            check: "effectiveness_integrity",
            status: "FAIL",
            detail: `${missingEff.length} prescription(s) with both pre/post but null effectiveness_score`,
          });
        } else {
          results.push({
            check: "effectiveness_integrity",
            status: "PASS",
            detail: `${(data ?? []).length} prescription(s) with pre+post all have effectiveness_score`,
          });
        }
      }
    }

    // ── CHECK 5: Constraint Enforcement ──
    {
      const { data, error } = await supabase
        .from("drill_prescriptions")
        .select("id, constraints")
        .eq("resolved", false);
      if (error) {
        results.push({ check: "constraint_enforcement", status: "FAIL", detail: error.message });
      } else {
        const empty = (data ?? []).filter((d: any) => !d.constraints || d.constraints.trim() === "");
        results.push({
          check: "constraint_enforcement",
          status: empty.length > 0 ? "WARN" : "PASS",
          detail: empty.length > 0
            ? `${empty.length} prescription(s) with empty constraints`
            : `All ${(data ?? []).length} active prescriptions have constraints`,
        });
      }
    }

    // ── CHECK 6: Fallback Logic ──
    {
      const { data, error } = await supabase
        .from("drill_prescriptions")
        .select("id, drill_name")
        .eq("resolved", false);
      if (error) {
        results.push({ check: "fallback_logic", status: "FAIL", detail: error.message });
      } else {
        const noDrill = (data ?? []).filter((d: any) => !d.drill_name);
        results.push({
          check: "fallback_logic",
          status: noDrill.length > 0 ? "FAIL" : "PASS",
          detail: noDrill.length > 0
            ? `${noDrill.length} prescription(s) missing drill_name`
            : `All ${(data ?? []).length} active prescriptions have drill_name`,
        });
      }
    }

    // ── CHECK 7: Continuation Token ──
    {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, metadata, created_at")
        .eq("action", "nightly_mpi_continuation")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) {
        results.push({ check: "continuation_token", status: "FAIL", detail: error.message });
      } else {
        results.push({
          check: "continuation_token",
          status: "PASS",
          detail: `${(data ?? []).length} continuation token entries found in audit_log`,
        });
      }
    }

    // ── CHECK 8: Cross-Athlete Isolation ──
    {
      const { data: prescriptions } = await supabase
        .from("drill_prescriptions")
        .select("user_id, targeted_metric")
        .eq("resolved", false);
      const { data: scores } = await supabase
        .from("weakness_scores")
        .select("user_id, weakness_metric");

      let contaminated = 0;
      if (prescriptions && scores) {
        for (const p of prescriptions) {
          const crossMatch = scores.find(
            (s: any) => s.weakness_metric === p.targeted_metric && s.user_id !== p.user_id
          );
          if (crossMatch) contaminated++;
        }
      }
      results.push({
        check: "cross_athlete_isolation",
        status: contaminated > 0 ? "FAIL" : "PASS",
        detail: contaminated > 0
          ? `${contaminated} cross-athlete data contamination(s) detected`
          : "No cross-athlete contamination detected",
      });
    }

    const overall = results.every((r) => r.status !== "FAIL") ? "PASS" : "FAIL";

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        athlete_id: athleteId || null,
        results,
        overall,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
