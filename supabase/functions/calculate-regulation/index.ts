import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const today = new Date().toISOString().split("T")[0];
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Fetch today's quizzes
    const { data: quizzes } = await supabase
      .from("vault_focus_quizzes")
      .select("*")
      .eq("user_id", userId)
      .eq("entry_date", today);

    const morningQuiz = quizzes?.find((q: any) => q.quiz_type === "morning");
    const preLiftQuiz = quizzes?.find((q: any) => q.quiz_type === "pre_lift");
    const nightQuiz = quizzes?.find((q: any) => q.quiz_type === "night");

    // Fetch CNS load data
    const { data: loadData72h } = await supabase
      .from("athlete_load_tracking")
      .select("cns_load_total, entry_date")
      .eq("user_id", userId)
      .gte("entry_date", threeDaysAgo)
      .lte("entry_date", today);

    const { data: loadData7d } = await supabase
      .from("athlete_load_tracking")
      .select("cns_load_total")
      .eq("user_id", userId)
      .gte("entry_date", sevenDaysAgo)
      .lte("entry_date", today);

    // Fetch today's nutrition
    const { data: nutritionLogs } = await supabase
      .from("vault_nutrition_logs")
      .select("calories")
      .eq("user_id", userId)
      .eq("entry_date", today);

    // Fetch TDEE target
    const { data: bodyGoal } = await supabase
      .from("athlete_body_goals")
      .select("goal_type, target_weight_lbs")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("activity_level, weight")
      .eq("id", userId)
      .maybeSingle();

    // Fetch upcoming events (3-day look-ahead)
    const { data: athleteEvents } = await supabase
      .from("athlete_events")
      .select("event_date, event_type")
      .eq("user_id", userId)
      .gte("event_date", today)
      .lte("event_date", threeDaysFromNow);

    const { data: calendarEvents } = await supabase
      .from("calendar_events")
      .select("event_date, event_type")
      .eq("user_id", userId)
      .gte("event_date", today)
      .lte("event_date", threeDaysFromNow);

    // --- Calculate component scores ---

    // 1. Sleep quality (15%) - morning quiz sleep_quality 1-5 → 0-100
    const sleepScore = morningQuiz?.sleep_quality 
      ? Math.round(((morningQuiz.sleep_quality - 1) / 4) * 100) 
      : 50; // default to neutral if no data

    // 2. Stress inverted (10%) - stress_level 1=100, 5=0
    const nightStress = nightQuiz?.stress_level || morningQuiz?.stress_level;
    const stressScore = nightStress 
      ? Math.round(((5 - nightStress) / 4) * 100) 
      : 60;

    // 3. Physical readiness (10%) - pre-lift physical_readiness 1-5 → 0-100
    const readinessScore = preLiftQuiz?.physical_readiness 
      ? Math.round(((preLiftQuiz.physical_readiness - 1) / 4) * 100) 
      : 50;

    // 4. Muscle restriction (15%) - movement_restriction JSONB
    let restrictionScore = 75; // default neutral
    const restriction = preLiftQuiz?.movement_restriction as Record<string, string> | null;
    if (restriction && Object.keys(restriction).length > 0) {
      const values = Object.values(restriction);
      const scoreMap: Record<string, number> = { full: 100, limited: 60, pain: 20 };
      const avg = values.reduce((sum, v) => sum + (scoreMap[v.toLowerCase()] || 60), 0) / values.length;
      restrictionScore = Math.round(avg);
    }

    // 5. Training load 72h (15%) - CNS load vs 7-day avg deviation
    let loadScore = 75; // default neutral
    const avg72h = loadData72h && loadData72h.length > 0
      ? loadData72h.reduce((sum: number, d: any) => sum + (d.cns_load_total || 0), 0) / loadData72h.length
      : 0;
    const avg7d = loadData7d && loadData7d.length > 0
      ? loadData7d.reduce((sum: number, d: any) => sum + (d.cns_load_total || 0), 0) / loadData7d.length
      : 0;
    if (avg7d > 0) {
      const deviation = (avg72h - avg7d) / avg7d;
      // Deviation > 0.3 (30% above avg) = high load → lower score
      if (deviation > 0.5) loadScore = 20;
      else if (deviation > 0.3) loadScore = 45;
      else if (deviation > 0.1) loadScore = 65;
      else if (deviation < -0.2) loadScore = 90; // below avg = recovering well
      else loadScore = 75;
    }

    // 6. Fuel adequacy (10%) - calories logged / TDEE × 100, capped at 100
    const totalCaloriesLogged = nutritionLogs?.reduce((sum: number, n: any) => sum + (n.calories || 0), 0) || 0;
    // Estimate TDEE from weight (rough estimate: 15 cal/lb for active athletes)
    const weightLbs = parseFloat(profile?.weight || "170");
    const estimatedTDEE = Math.round(weightLbs * 15);
    let fuelScore = 50;
    if (totalCaloriesLogged > 0 && estimatedTDEE > 0) {
      fuelScore = Math.min(100, Math.round((totalCaloriesLogged / estimatedTDEE) * 100));
    }

    // 7. Calendar buffer (25%) - Game in 1 day=40, 2 days=60, 3 days=80, none=100
    let calendarScore = 100;
    const allEvents = [...(athleteEvents || []), ...(calendarEvents || [])];
    const gameEvents = allEvents.filter((e: any) => 
      e.event_type?.toLowerCase().includes("game") || 
      e.event_type?.toLowerCase().includes("competition") ||
      e.event_type?.toLowerCase().includes("match")
    );
    if (gameEvents.length > 0) {
      const todayDate = new Date(today);
      let minDaysUntilGame = 999;
      gameEvents.forEach((event: any) => {
        const eventDate = new Date(event.event_date);
        const diffDays = Math.round((eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < minDaysUntilGame) {
          minDaysUntilGame = diffDays;
        }
      });
      if (minDaysUntilGame === 0 || minDaysUntilGame === 1) calendarScore = 40;
      else if (minDaysUntilGame === 2) calendarScore = 60;
      else if (minDaysUntilGame === 3) calendarScore = 80;
    }

    // --- Weighted regulation index ---
    const regulationScore = Math.round(
      sleepScore * 0.15 +
      stressScore * 0.10 +
      readinessScore * 0.10 +
      restrictionScore * 0.15 +
      loadScore * 0.15 +
      fuelScore * 0.10 +
      calendarScore * 0.25
    );

    // Color thresholds
    const regulationColor = regulationScore >= 72 ? "green" : regulationScore >= 50 ? "yellow" : "red";

    // --- Generate AI nightly report ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let reportHeadline = "";
    let reportSections: Record<string, any> = {};

    if (LOVABLE_API_KEY) {
      try {
        const systemPrompt = `You are a sports physio AI that generates athlete regulation reports. 
Your tone is always forward-looking, positive, and empowering. Never dwell on negatives. 
Frame every insight as an opportunity for better performance tomorrow.
Keep all text concise and actionable. No clinical jargon.`;

        const contextData = {
          regulationScore,
          regulationColor,
          sleepQuality: morningQuiz?.sleep_quality,
          stressLevel: nightStress,
          physicalReadiness: preLiftQuiz?.physical_readiness,
          movementRestriction: restriction,
          trainingLoad: { avg72h: Math.round(avg72h), avg7d: Math.round(avg7d) },
          caloriesLogged: totalCaloriesLogged,
          estimatedTDEE,
          gamesSoon: calendarScore < 80,
          daysUntilGame: calendarScore === 40 ? 1 : calendarScore === 60 ? 2 : calendarScore === 80 ? 3 : null,
        };

        const userPrompt = `Based on this athlete data: ${JSON.stringify(contextData)}

Generate a JSON response with:
1. "headline": A 2-3 sentence forward-looking summary (positive framing)
2. "sections": An object with 6 keys: "sleep", "stress", "movement", "training_load", "fuel", "game_readiness"
   Each section has: "why" (1 sentence), "what_to_do" (1-2 sentences), "how_it_helps" (1 sentence)

Regulation score: ${regulationScore}/100 (${regulationColor})
Be specific, practical, and encouraging.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            reportHeadline = parsed.headline || "";
            reportSections = parsed.sections || {};
          }
        }
      } catch (aiError) {
        console.error("AI report generation error:", aiError);
        // Fallback headline
        const colorMap: Record<string, string> = {
          green: "Your body is well-regulated today. Capitalize on this momentum with focused, high-quality work.",
          yellow: "Your regulation is solid — a few small tweaks tonight will set you up for a strong tomorrow.",
          red: "Your body is sending signals to prioritize recovery. Use today to invest in your long-term performance.",
        };
        reportHeadline = colorMap[regulationColor];
      }
    }

    // Upsert to physio_daily_reports
    const { error: upsertError } = await supabase
      .from("physio_daily_reports")
      .upsert({
        user_id: userId,
        report_date: today,
        regulation_score: regulationScore,
        regulation_color: regulationColor,
        sleep_score: sleepScore,
        stress_score: stressScore,
        readiness_score: readinessScore,
        restriction_score: restrictionScore,
        load_score: loadScore,
        fuel_score: fuelScore,
        calendar_score: calendarScore,
        report_headline: reportHeadline,
        report_sections: reportSections,
      }, { onConflict: "user_id,report_date" });

    if (upsertError) {
      console.error("Error upserting report:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to save report" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      regulation_score: regulationScore,
      regulation_color: regulationColor,
      report_headline: reportHeadline,
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("calculate-regulation error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
