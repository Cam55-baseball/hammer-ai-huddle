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
      return new Response(JSON.stringify({ players: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    // Batch queries
    const [profilesRes, plansRes, completionsRes, alertsRes] = await Promise.all([
      serviceClient
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", playerIds),
      serviceClient
        .from("udl_daily_plans")
        .select("id, user_id, plan_date, constraints_detected, prescribed_drills, readiness_adjustments, player_state, feedback_applied")
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
        .select("*")
        .in("target_user_id", playerIds)
        .is("dismissed_by", null)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const profiles = profilesRes.data ?? [];
    const plans = plansRes.data ?? [];
    const completions = completionsRes.data ?? [];
    const alerts = alertsRes.data ?? [];

    // Build player overviews
    const playerOverviews = playerIds.map((pid: string) => {
      const profile = profiles.find((p: any) => p.id === pid);
      const playerPlans = plans.filter((p: any) => p.user_id === pid);
      const latestPlan = playerPlans[0] ?? null;
      const playerCompletions = completions.filter((c: any) => c.user_id === pid);
      const playerAlerts = alerts.filter((a: any) => a.target_user_id === pid);

      // Compliance: completed / prescribed over 7 days
      let totalPrescribed = 0;
      let totalCompleted = 0;
      const completionSet = new Set(
        playerCompletions.filter((c: any) => c.completed_at).map((c: any) => `${c.plan_id}:${c.drill_key}`),
      );
      for (const plan of playerPlans) {
        const drills = (plan.prescribed_drills as any[]) ?? [];
        totalPrescribed += drills.length;
        totalCompleted += drills.filter((d: any) => completionSet.has(`${plan.id}:${d.drill_key}`)).length;
      }
      const compliancePct = totalPrescribed > 0 ? Math.round((totalCompleted / totalPrescribed) * 100) : 0;

      // Trend: compare latest plan scores to older plan scores
      let trend: "improving" | "declining" | "stable" = "stable";
      if (playerPlans.length >= 2) {
        const latestState = (playerPlans[0]?.player_state as any) ?? {};
        const olderState = (playerPlans[playerPlans.length - 1]?.player_state as any) ?? {};
        const keys = ["timing_score", "decision_score", "execution_score"];
        let delta = 0;
        let count = 0;
        for (const k of keys) {
          if (typeof latestState[k] === "number" && typeof olderState[k] === "number") {
            delta += latestState[k] - olderState[k];
            count++;
          }
        }
        if (count > 0) {
          const avgDelta = delta / count;
          if (avgDelta > 5) trend = "improving";
          else if (avgDelta < -5) trend = "declining";
        }
      }

      // Status light
      const constraints = (latestPlan?.constraints_detected as any[]) ?? [];
      const maxSeverity = constraints.reduce((max: number, c: any) => Math.max(max, c.severity ?? 0), 0);
      let statusLight: "green" | "yellow" | "red" = "green";
      if (maxSeverity > 6 || playerAlerts.some((a: any) => a.severity === "high")) statusLight = "red";
      else if (maxSeverity > 3 || playerAlerts.length > 0) statusLight = "yellow";

      return {
        id: pid,
        full_name: profile?.full_name ?? "Unknown",
        avatar_url: profile?.avatar_url ?? null,
        latest_plan: latestPlan,
        compliance_pct: compliancePct,
        trend,
        status_light: statusLight,
        alerts: playerAlerts,
        constraints,
      };
    });

    // Sort: red first, then yellow, then green
    const order = { red: 0, yellow: 1, green: 2 };
    playerOverviews.sort((a: any, b: any) => (order[a.status_light as keyof typeof order] ?? 2) - (order[b.status_light as keyof typeof order] ?? 2));

    return new Response(
      JSON.stringify({ players: playerOverviews, alerts: alerts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Coach overview error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
