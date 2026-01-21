import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating vault recap for user: ${user.id}`);

    // Parse optional periodEnd from request body (for missed recaps)
    let periodEndDate: Date | null = null;
    try {
      const body = await req.json();
      if (body?.periodEnd) {
        periodEndDate = new Date(body.periodEnd);
        console.log(`Using custom period end: ${periodEndDate.toISOString()}`);
      }
    } catch {
      // No body or invalid JSON, use current date
    }

    // Calculate 6-week period (use custom end date if provided for missed recaps)
    const endDate = periodEndDate || new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 42);
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    
    console.log(`Recap period: ${startDateStr} to ${endDateStr}`);

    // Fetch all vault data for the period
    const [
      { data: workouts },
      { data: quizzes },
      { data: nutrition },
      { data: perfTests },
      { data: grades },
      { data: profile }
    ] = await Promise.all([
      supabase.from("vault_workout_notes").select("*").eq("user_id", user.id)
        .gte("entry_date", startDateStr).lte("entry_date", endDateStr),
      supabase.from("vault_focus_quizzes").select("*").eq("user_id", user.id)
        .gte("entry_date", startDateStr).lte("entry_date", endDateStr),
      supabase.from("vault_nutrition_logs").select("*").eq("user_id", user.id)
        .gte("entry_date", startDateStr).lte("entry_date", endDateStr),
      supabase.from("vault_performance_tests").select("*").eq("user_id", user.id)
        .gte("test_date", startDateStr).lte("test_date", endDateStr),
      supabase.from("vault_scout_grades").select("*").eq("user_id", user.id)
        .gte("graded_at", startDateStr).order("graded_at", { ascending: false }).limit(2),
      supabase.from("profiles").select("first_name, position, sport").eq("id", user.id).maybeSingle()
    ]);

    // Calculate aggregated stats
    const totalWorkouts = workouts?.length || 0;
    const totalWeightLifted = workouts?.reduce((sum, w) => sum + (w.total_weight_lifted || 0), 0) || 0;
    
    const weightIncreases = workouts?.flatMap(w => w.weight_increases || []) || [];
    const totalWeightIncreases = weightIncreases.length;
    
    const avgMental = quizzes?.length ? quizzes.reduce((sum, q) => sum + (q.mental_readiness || 0), 0) / quizzes.length : 0;
    const avgEmotional = quizzes?.length ? quizzes.reduce((sum, q) => sum + (q.emotional_state || 0), 0) / quizzes.length : 0;
    const avgPhysical = quizzes?.length ? quizzes.reduce((sum, q) => sum + (q.physical_readiness || 0), 0) / quizzes.length : 0;
    
    const avgCalories = nutrition?.filter(n => n.calories).reduce((sum, n, _, arr) => sum + (n.calories || 0) / arr.length, 0) || 0;
    const avgProtein = nutrition?.filter(n => n.protein_g).reduce((sum, n, _, arr) => sum + (n.protein_g || 0) / arr.length, 0) || 0;
    const avgEnergy = nutrition?.filter(n => n.energy_level).reduce((sum, n, _, arr) => sum + (n.energy_level || 0) / arr.length, 0) || 0;
    
    // Calculate strength progression from first week to last week
    const firstWeekWorkouts = workouts?.filter(w => {
      const d = new Date(w.entry_date);
      return d <= new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }) || [];
    const lastWeekWorkouts = workouts?.filter(w => {
      const d = new Date(w.entry_date);
      return d >= new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }) || [];
    
    const firstWeekAvgWeight = firstWeekWorkouts.length 
      ? firstWeekWorkouts.reduce((sum, w) => sum + (w.total_weight_lifted || 0), 0) / firstWeekWorkouts.length 
      : 0;
    const lastWeekAvgWeight = lastWeekWorkouts.length 
      ? lastWeekWorkouts.reduce((sum, w) => sum + (w.total_weight_lifted || 0), 0) / lastWeekWorkouts.length 
      : 0;
    
    const strengthChangePercent = firstWeekAvgWeight > 0 
      ? Math.round(((lastWeekAvgWeight - firstWeekAvgWeight) / firstWeekAvgWeight) * 100) 
      : 0;

    // Build data summary for AI
    const dataSummary = {
      athleteName: profile?.first_name || "Athlete",
      position: profile?.position || "Unknown",
      period: `${startDateStr} to ${endDateStr}`,
      workouts: {
        total: totalWorkouts,
        totalWeightLifted,
        weightIncreaseCount: totalWeightIncreases,
        firstWeekAvg: Math.round(firstWeekAvgWeight),
        lastWeekAvg: Math.round(lastWeekAvgWeight),
        strengthChange: strengthChangePercent,
      },
      mentalReadiness: {
        avgMental: avgMental.toFixed(1),
        avgEmotional: avgEmotional.toFixed(1),
        avgPhysical: avgPhysical.toFixed(1),
        quizCount: quizzes?.length || 0,
      },
      nutrition: {
        avgCalories: Math.round(avgCalories),
        avgProtein: Math.round(avgProtein),
        avgEnergy: avgEnergy.toFixed(1),
        logsCount: nutrition?.length || 0,
      },
      performanceTests: perfTests?.map(t => ({
        type: t.test_type,
        date: t.test_date,
        results: t.results,
      })) || [],
      scoutGrades: grades?.length ? {
        latest: grades[0],
        previous: grades[1] || null,
      } : null,
    };

    console.log("Data summary for AI:", JSON.stringify(dataSummary, null, 2));

    // Call Lovable AI for personalized insights
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    let aiContent = {
      summary: `You completed ${totalWorkouts} workouts over the past 6 weeks, lifting a total of ${totalWeightLifted.toLocaleString()} lbs.`,
      highlights: [] as string[],
      improvements: [] as string[],
      focus_areas: [] as string[],
      recommendations: [] as string[],
    };

    if (LOVABLE_API_KEY && totalWorkouts > 0) {
      try {
        const aiPrompt = `You are an elite sports performance analyst creating a personalized 6-week training recap for an athlete. Be specific, motivating, and actionable.

ATHLETE DATA:
${JSON.stringify(dataSummary, null, 2)}

Generate a comprehensive, personalized recap with:
1. SUMMARY (2-3 sentences): Overall assessment of their 6-week training block
2. HIGHLIGHTS (3-5 bullet points): Specific achievements and wins
3. IMPROVEMENTS (2-3 bullet points): Areas where they showed measurable progress
4. FOCUS_AREAS (2-3 bullet points): Areas needing attention based on data
5. RECOMMENDATIONS (3-4 bullet points): Specific actionable advice for next 6 weeks

Return ONLY valid JSON with this structure:
{
  "summary": "...",
  "highlights": ["...", "..."],
  "improvements": ["...", "..."],
  "focus_areas": ["...", "..."],
  "recommendations": ["...", "..."]
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are an elite sports performance analyst. Return ONLY valid JSON." },
              { role: "user", content: aiPrompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiText = aiData.choices?.[0]?.message?.content || "";
          console.log("AI response:", aiText);
          
          // Parse JSON from response
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiContent = {
              summary: parsed.summary || aiContent.summary,
              highlights: parsed.highlights || [],
              improvements: parsed.improvements || [],
              focus_areas: parsed.focus_areas || [],
              recommendations: parsed.recommendations || [],
            };
          }
        } else {
          console.error("AI API error:", await aiResponse.text());
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError);
      }
    } else if (totalWorkouts === 0) {
      aiContent.summary = "No workouts logged in the past 6 weeks. Start tracking your training to get personalized insights!";
      aiContent.focus_areas = ["Begin logging workouts consistently", "Complete daily focus quizzes to track mental readiness"];
    }

    // Build full recap data
    const recapData = {
      ...aiContent,
      workout_stats: {
        total_workouts: totalWorkouts,
        total_weight: totalWeightLifted,
        weight_increases: totalWeightIncreases,
        avg_session_weight: totalWorkouts > 0 ? Math.round(totalWeightLifted / totalWorkouts) : 0,
      },
      mental_stats: {
        avg_mental: parseFloat(avgMental.toFixed(1)),
        avg_emotional: parseFloat(avgEmotional.toFixed(1)),
        avg_physical: parseFloat(avgPhysical.toFixed(1)),
        quiz_count: quizzes?.length || 0,
      },
      nutrition_stats: {
        avg_calories: Math.round(avgCalories),
        avg_protein: Math.round(avgProtein),
        avg_energy: parseFloat(avgEnergy.toFixed(1)),
        logs_count: nutrition?.length || 0,
      },
      performance_tests: perfTests?.length || 0,
    };

    // Save recap to database
    const { error: insertError } = await supabase.from("vault_recaps").insert({
      user_id: user.id,
      recap_period_start: startDateStr,
      recap_period_end: endDateStr,
      recap_data: recapData,
      total_weight_lifted: totalWeightLifted,
      strength_change_percent: strengthChangePercent,
    });

    if (insertError) {
      console.error("Error saving recap:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save recap" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Recap generated successfully");

    return new Response(JSON.stringify({ success: true, recap_data: recapData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate recap error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
