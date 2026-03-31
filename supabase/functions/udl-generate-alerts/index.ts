import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const coachId = claimsData.claims.sub as string;

    // Get linked players
    const { data: follows } = await userClient
      .from("scout_follows")
      .select("player_id")
      .eq("scout_id", coachId)
      .eq("status", "accepted");

    const playerIds = (follows ?? []).map((f: any) => f.player_id);
    if (playerIds.length === 0) {
      return new Response(JSON.stringify({ alerts_created: 0, team_patterns: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    // Batch queries
    const [profilesRes, plansRes, completionsRes, existingAlertsRes] = await Promise.all([
      serviceClient
        .from("profiles")
        .select("id, full_name")
        .in("id", playerIds),
      serviceClient
        .from("udl_daily_plans")
        .select("id, user_id, plan_date, constraints_detected, prescribed_drills, player_state")
        .in("user_id", playerIds)
        .gte("plan_date", sevenDaysAgo)
        .order("plan_date", { ascending: false }),
      serviceClient
        .from("udl_drill_completions")
        .select("user_id, plan_id, drill_key, completed_at")
        .in("user_id", playerIds)
        .gte("started_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      serviceClient
        .from("udl_alerts")
        .select("id, alert_type, target_user_id, created_at")
        .gte("created_at", `${today}T00:00:00Z`)
        .is("dismissed_by", null),
    ]);

    const profiles = profilesRes.data ?? [];
    const plans = plansRes.data ?? [];
    const completions = completionsRes.data ?? [];
    const existingAlerts = existingAlertsRes.data ?? [];

    const alertExists = (type: string, targetId: string) =>
      existingAlerts.some((a: any) => a.alert_type === type && a.target_user_id === targetId);

    let alertsCreated = 0;
    const alertsToInsert: any[] = [];

    // Constraint aggregation for team patterns
    const constraintCounts: Record<string, string[]> = {};

    const scoreKeys = ["timing_score", "decision_score", "execution_score", "reaction_score", "explosiveness_score"];

    for (const pid of playerIds) {
      const playerPlans = plans.filter((p: any) => p.user_id === pid);
      const profile = profiles.find((p: any) => p.id === pid);
      const playerName = profile?.full_name ?? "Unknown";

      if (playerPlans.length === 0) continue;

      const latestPlan = playerPlans[0];
      const olderPlans = playerPlans.slice(1);

      // ── Performance drop detection ──
      if (olderPlans.length >= 2) {
        for (const key of scoreKeys) {
          const oldAvg =
            olderPlans.reduce((sum: number, p: any) => sum + ((p.player_state as any)?.[key] ?? 50), 0) /
            olderPlans.length;
          const current = (latestPlan.player_state as any)?.[key] ?? 50;
          if (oldAvg - current > 15 && !alertExists("performance_drop", pid)) {
            alertsToInsert.push({
              target_user_id: pid,
              alert_type: "performance_drop",
              severity: oldAvg - current > 25 ? "high" : "medium",
              message: `${playerName}: ${key.replace(/_/g, " ")} dropped ${Math.round(oldAvg - current)} pts below 7-day avg.`,
              metadata: { score_key: key, current, rolling_avg: Math.round(oldAvg), delta: Math.round(oldAvg - current), player_name: playerName },
            });
          }
        }
      }

      // ── Fatigue spike detection (2+ consecutive days) ──
      if (playerPlans.length >= 2) {
        const day1Fatigue = (playerPlans[0]?.player_state as any)?.fatigue_flag;
        const day2Fatigue = (playerPlans[1]?.player_state as any)?.fatigue_flag;
        if (day1Fatigue === true && day2Fatigue === true && !alertExists("fatigue_spike", pid)) {
          alertsToInsert.push({
            target_user_id: pid,
            alert_type: "fatigue_spike",
            severity: "high",
            message: `${playerName}: Fatigue flag active 2+ consecutive days. Consider rest.`,
            metadata: { player_name: playerName, consecutive_days: 2 },
          });
        }
      }

      // ── Low compliance detection (<30% over 7 days) ──
      const playerCompletions = completions.filter((c: any) => c.user_id === pid);
      const completionSet = new Set(
        playerCompletions.filter((c: any) => c.completed_at).map((c: any) => `${c.plan_id}:${c.drill_key}`),
      );
      let totalPrescribed = 0;
      let totalCompleted = 0;
      for (const plan of playerPlans) {
        const drills = (plan.prescribed_drills as any[]) ?? [];
        totalPrescribed += drills.length;
        totalCompleted += drills.filter((d: any) => completionSet.has(`${plan.id}:${d.drill_key}`)).length;
      }
      const compliancePct = totalPrescribed > 0 ? (totalCompleted / totalPrescribed) * 100 : 100;
      if (compliancePct < 30 && totalPrescribed > 0 && !alertExists("compliance_low", pid)) {
        alertsToInsert.push({
          target_user_id: pid,
          alert_type: "compliance_low",
          severity: "medium",
          message: `${playerName}: Only ${Math.round(compliancePct)}% drill completion over 7 days.`,
          metadata: { player_name: playerName, compliance_pct: Math.round(compliancePct), prescribed: totalPrescribed, completed: totalCompleted },
        });
      }

      // ── Aggregate constraints for team patterns ──
      const latestConstraints = (latestPlan.constraints_detected as any[]) ?? [];
      for (const c of latestConstraints) {
        const key = c.key ?? c.label ?? "unknown";
        constraintCounts[key] ??= [];
        constraintCounts[key].push(playerName);
      }
    }

    // ── Team-pattern detection (3+ players share same constraint) ──
    const teamPatterns: { constraint: string; players: string[] }[] = [];
    for (const [key, names] of Object.entries(constraintCounts)) {
      if (names.length >= 3 && !alertExists("team_pattern", coachId)) {
        teamPatterns.push({ constraint: key, players: names });
        alertsToInsert.push({
          target_user_id: coachId,
          alert_type: "team_pattern",
          severity: "medium",
          message: `Team pattern: ${names.length} players share "${key.replace(/_/g, " ")}" constraint.`,
          metadata: { constraint_key: key, player_names: names, count: names.length },
        });
      }
    }

    // Insert all alerts
    if (alertsToInsert.length > 0) {
      const { error: insertError } = await serviceClient.from("udl_alerts").insert(alertsToInsert);
      if (insertError) {
        console.error("Alert insert error:", insertError);
      } else {
        alertsCreated = alertsToInsert.length;
      }
    }

    // Audit log
    await serviceClient.from("udl_audit_log").insert({
      action: "alerts_scanned",
      user_id: coachId,
      metadata: { alerts_created: alertsCreated, team_patterns: teamPatterns, player_count: playerIds.length },
    });

    return new Response(
      JSON.stringify({ alerts_created: alertsCreated, team_patterns: teamPatterns }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Alert generation error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
