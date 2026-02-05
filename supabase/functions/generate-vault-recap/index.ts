import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // DUPLICATE CHECK: Prevent generating multiple recaps for the same period
    const { data: existingRecap } = await supabase
      .from('vault_recaps')
      .select('id, recap_period_start, recap_period_end')
      .eq('user_id', user.id)
      .gte('recap_period_start', startDateStr)
      .lte('recap_period_end', endDateStr)
      .maybeSingle();

    if (existingRecap) {
      console.log(`Duplicate detected: existing recap ${existingRecap.id} for period ${existingRecap.recap_period_start} to ${existingRecap.recap_period_end}`);
      return new Response(JSON.stringify({ 
        error: 'Recap already generated for this 6-week period',
        existing_recap_id: existingRecap.id 
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch ALL vault data for comprehensive analysis (E2E Integration)
    const [
      { data: workouts },
      { data: quizzes },
      { data: nutrition },
      { data: perfTests },
      { data: grades },
      { data: profile },
      { data: savedDrills },
      { data: wellnessGoals },
      { data: freeNotes },
      { data: weightEntries },
      { data: customActivityLogs },
      // NEW E2E INTEGRATIONS
      { data: texVisionDrills },
      { data: texVisionMetrics },
      { data: texVisionProgress },
      { data: videoAnalysisData },
      { data: mindfulnessData },
      { data: emotionData },
      { data: journalData },
      { data: mindFuelStreak },
      { data: stressData },
      { data: hydrationLogs },
      { data: hydrationSettings },
      { data: viewedTips },
      { data: viewedLessons },
      { data: nutritionStreak },
      { data: subModuleProgress },
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
        .gte("graded_at", startDateStr).order("graded_at", { ascending: true }),
      supabase.from("profiles").select("first_name, position, sport").eq("id", user.id).maybeSingle(),
      supabase.from("vault_saved_drills").select("*").eq("user_id", user.id),
      supabase.from("vault_wellness_goals").select("*").eq("user_id", user.id)
        .gte("week_start_date", startDateStr).lte("week_start_date", endDateStr),
      supabase.from("vault_free_notes").select("*").eq("user_id", user.id)
        .gte("entry_date", startDateStr).lte("entry_date", endDateStr),
      supabase.from("weight_entries").select("*").eq("user_id", user.id)
        .gte("entry_date", startDateStr).lte("entry_date", endDateStr).order("entry_date", { ascending: true }),
      // Fetch custom activities with FULL template details
      supabase.from("custom_activity_logs").select(`
        id, entry_date, completed, completed_at, 
        actual_duration_minutes, notes, performance_data,
        custom_activity_templates!inner (
          id, title, activity_type, duration_minutes, 
          intensity, sport, description,
          exercises, meals, custom_fields
        )
      `).eq("user_id", user.id).eq("completed", true)
        .gte("entry_date", startDateStr).lte("entry_date", endDateStr),
      // TEX VISION DATA
      supabase.from("tex_vision_drill_results").select("*").eq("user_id", user.id)
        .gte("completed_at", startDateStr).lte("completed_at", endDateStr),
      supabase.from("tex_vision_metrics").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("tex_vision_progress").select("*").eq("user_id", user.id).maybeSingle(),
      // VIDEO ANALYSIS DATA
      supabase.from("videos").select("id, module, sport, efficiency_score, created_at, analysis_result")
        .eq("user_id", user.id)
        .gte("created_at", startDateStr).lte("created_at", endDateStr),
      // MIND FUEL DATA
      supabase.from("mindfulness_sessions").select("*").eq("user_id", user.id)
        .gte("session_date", startDateStr).lte("session_date", endDateStr),
      supabase.from("emotion_tracking").select("*").eq("user_id", user.id)
        .gte("entry_date", startDateStr).lte("entry_date", endDateStr),
      supabase.from("mental_health_journal").select("id, mood_level, created_at, entry_type").eq("user_id", user.id)
        .gte("created_at", startDateStr).lte("created_at", endDateStr),
      supabase.from("mind_fuel_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("stress_assessments").select("*").eq("user_id", user.id)
        .gte("assessment_date", startDateStr).lte("assessment_date", endDateStr),
      // HYDRATION DATA
      supabase.from("hydration_logs").select("*").eq("user_id", user.id)
        .gte("log_date", startDateStr).lte("log_date", endDateStr),
      supabase.from("hydration_settings").select("*").eq("user_id", user.id).maybeSingle(),
      // EDUCATION ENGAGEMENT
      supabase.from("user_viewed_tips").select("tip_id, viewed_at").eq("user_id", user.id)
        .gte("viewed_at", startDateStr).lte("viewed_at", endDateStr),
      supabase.from("user_viewed_lessons").select("lesson_id, viewed_at").eq("user_id", user.id)
        .gte("viewed_at", startDateStr).lte("viewed_at", endDateStr),
      supabase.from("nutrition_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      // PROGRAM PROGRESS
      supabase.from("sub_module_progress").select("*").eq("user_id", user.id),
    ]);

    // ========== WORKOUT ANALYSIS ==========
    const totalWorkouts = workouts?.length || 0;
    const totalWeightLifted = workouts?.reduce((sum, w) => sum + (w.total_weight_lifted || 0), 0) || 0;
    const weightIncreases = workouts?.flatMap(w => w.weight_increases || []) || [];
    const totalWeightIncreases = weightIncreases.length;
    
    // First vs Last week comparison
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

    // ========== SLEEP ANALYSIS ==========
    const sleepData = quizzes?.filter(q => q.hours_slept).map(q => ({
      date: q.entry_date,
      hours: parseFloat(q.hours_slept) || 0,
      quality: q.sleep_quality || 0,
    })) || [];
    
    const avgHoursSlept = sleepData.length 
      ? sleepData.reduce((sum, s) => sum + s.hours, 0) / sleepData.length 
      : 0;
    const avgSleepQuality = sleepData.filter(s => s.quality > 0).length
      ? sleepData.filter(s => s.quality > 0).reduce((sum, s) => sum + s.quality, 0) / sleepData.filter(s => s.quality > 0).length
      : 0;
    
    // Sleep consistency (standard deviation of hours)
    const sleepStdDev = sleepData.length > 1 
      ? Math.sqrt(sleepData.reduce((sum, s) => sum + Math.pow(s.hours - avgHoursSlept, 2), 0) / sleepData.length)
      : 0;
    const sleepConsistency = sleepStdDev < 0.5 ? 'Excellent' : sleepStdDev < 1 ? 'Good' : sleepStdDev < 1.5 ? 'Fair' : 'Inconsistent';
    
    // First half vs second half sleep comparison
    const midpoint = Math.floor(sleepData.length / 2);
    const firstHalfSleep = sleepData.slice(0, midpoint);
    const secondHalfSleep = sleepData.slice(midpoint);
    const firstHalfAvgSleep = firstHalfSleep.length ? firstHalfSleep.reduce((sum, s) => sum + s.hours, 0) / firstHalfSleep.length : 0;
    const secondHalfAvgSleep = secondHalfSleep.length ? secondHalfSleep.reduce((sum, s) => sum + s.hours, 0) / secondHalfSleep.length : 0;
    const sleepTrend = secondHalfAvgSleep > firstHalfAvgSleep + 0.25 ? 'Improving' : secondHalfAvgSleep < firstHalfAvgSleep - 0.25 ? 'Declining' : 'Stable';

    // ========== PAIN PATTERN ANALYSIS (with per-area severity) ==========
    const painEntries = quizzes?.filter(q => q.pain_location && q.pain_location.length > 0) || [];
    const painPatterns: Record<string, { count: number; totalLevel: number }> = {};
    
    painEntries.forEach(q => {
      const locations = q.pain_location as string[];
      const painScales = (q as any).pain_scales as Record<string, number> | null;
      const globalPainScale = q.pain_scale || 5;
      
      locations.forEach((loc: string) => {
        if (!painPatterns[loc]) {
          painPatterns[loc] = { count: 0, totalLevel: 0 };
        }
        painPatterns[loc].count++;
        // Use per-area level if available, else fall back to global
        painPatterns[loc].totalLevel += painScales?.[loc] || globalPainScale;
      });
    });
    
    const chronicPainAreas = Object.entries(painPatterns)
      .filter(([_, data]) => data.count >= 3)
      .map(([area, data]) => ({ 
        area, 
        occurrences: data.count,
        avgLevel: Math.round(data.totalLevel / data.count)
      }))
      .sort((a, b) => b.occurrences - a.occurrences);

    // ========== BODY CONNECTION (FASCIA) ANALYSIS ==========
    // Mapping body areas to fascia lines for AI analysis
    const BODY_LINE_AREAS: Record<string, string[]> = {
      'Back Track (SBL)': ['neck_back', 'left_upper_back', 'right_upper_back', 
        'lower_back_center', 'lower_back_left', 'lower_back_right', 
        'left_glute', 'right_glute', 'left_hamstring_inner', 'left_hamstring_outer',
        'right_hamstring_inner', 'right_hamstring_outer', 'left_calf_inner', 
        'left_calf_outer', 'right_calf_inner', 'right_calf_outer', 
        'left_achilles', 'right_achilles', 'left_heel', 'right_heel'],
      'Front Track (SFL)': ['head_front', 'neck_front', 'sternum', 
        'left_chest', 'right_chest', 'upper_abs', 'lower_abs',
        'left_quad_inner', 'left_quad_outer', 'right_quad_inner', 'right_quad_outer',
        'left_shin', 'right_shin', 'left_foot_top', 'right_foot_top'],
      'Side Track (LL)': ['left_temple', 'right_temple', 'left_neck_side', 'right_neck_side',
        'left_oblique', 'right_oblique', 'left_it_band', 'right_it_band',
        'left_knee_side', 'right_knee_side'],
      'Arm Tracks': ['left_shoulder_front', 'right_shoulder_front', 
        'left_shoulder_back', 'right_shoulder_back', 'left_bicep', 'right_bicep',
        'left_tricep', 'right_tricep', 'left_forearm_front', 'right_forearm_front',
        'left_forearm_back', 'right_forearm_back', 'left_wrist', 'right_wrist',
        'left_hand', 'right_hand'],
      'Core Track (DFL)': ['neck_front', 'sternum', 'upper_abs', 'lower_abs',
        'left_hip_flexor', 'right_hip_flexor', 'left_groin', 'right_groin'],
      'Twist Track (SPL)': ['left_oblique', 'right_oblique', 'left_lat', 'right_lat',
        'left_serratus', 'right_serratus'],
    };

    function getDominantBodyLine(areas: { area: string }[]): string {
      const lineFrequency: Record<string, number> = {};
      areas.forEach(({ area }) => {
        for (const [line, lineAreas] of Object.entries(BODY_LINE_AREAS)) {
          if (lineAreas.includes(area)) {
            lineFrequency[line] = (lineFrequency[line] || 0) + 1;
          }
        }
      });
      const sorted = Object.entries(lineFrequency).sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] || 'Multiple lines';
    }

    function getConnectedAreasFromLine(areas: { area: string }[]): string[] {
      const affectedAreas = new Set(areas.map(a => a.area));
      const connectedAreas: Set<string> = new Set();
      
      for (const [line, lineAreas] of Object.entries(BODY_LINE_AREAS)) {
        const hasAffectedArea = lineAreas.some(a => affectedAreas.has(a));
        if (hasAffectedArea) {
          lineAreas.forEach(a => {
            if (!affectedAreas.has(a)) connectedAreas.add(a);
          });
        }
      }
      return Array.from(connectedAreas).slice(0, 6);
    }

    function generateBodyLinePainSummary(areas: { area: string; occurrences: number; avgLevel: number }[]): string {
      const lineGroups: Record<string, { area: string; occurrences: number; avgLevel: number }[]> = {};
      
      areas.forEach(areaData => {
        for (const [line, lineAreas] of Object.entries(BODY_LINE_AREAS)) {
          if (lineAreas.includes(areaData.area)) {
            if (!lineGroups[line]) lineGroups[line] = [];
            lineGroups[line].push(areaData);
          }
        }
      });

      return Object.entries(lineGroups)
        .map(([line, groupAreas]) => 
          `${line}: ${groupAreas.map(a => `${a.area} (${a.occurrences}x, avg ${a.avgLevel}/10)`).join(', ')}`
        ).join('\n    ') || 'No patterns detected';
    }

    const dominantBodyLine = chronicPainAreas.length > 0 ? getDominantBodyLine(chronicPainAreas) : 'None';
    const connectedAreasToCheck = chronicPainAreas.length > 0 ? getConnectedAreasFromLine(chronicPainAreas) : [];
    const bodyLinePainSummary = generateBodyLinePainSummary(chronicPainAreas);
    
    // Calculate weighted average pain (considers per-area severity)
    let totalPainScore = 0;
    let totalPainEntries = 0;
    painEntries.forEach(p => {
      const painScales = (p as any).pain_scales as Record<string, number> | null;
      if (painScales && Object.keys(painScales).length > 0) {
        Object.values(painScales).forEach(level => {
          totalPainScore += level;
          totalPainEntries++;
        });
      } else if (p.pain_scale) {
        totalPainScore += p.pain_scale;
        totalPainEntries++;
      }
    });
    const avgPainScale = totalPainEntries > 0 ? totalPainScore / totalPainEntries : 0;

    // ========== BODY WEIGHT ANALYSIS ==========
    const weights = weightEntries?.map(w => ({ 
      date: w.entry_date, 
      lbs: parseFloat(w.weight_lbs) || 0 
    })).filter(w => w.lbs > 0) || [];
    const startWeightEntries = weights.slice(0, 7);
    const endWeightEntries = weights.slice(-7);
    const startWeight = startWeightEntries.length 
      ? startWeightEntries.reduce((sum, w) => sum + w.lbs, 0) / startWeightEntries.length 
      : 0;
    const endWeight = endWeightEntries.length 
      ? endWeightEntries.reduce((sum, w) => sum + w.lbs, 0) / endWeightEntries.length 
      : 0;
    const bodyWeightChange = endWeight - startWeight;
    const weightTrend = bodyWeightChange > 1 ? 'Gaining' : bodyWeightChange < -1 ? 'Losing' : 'Maintaining';

    // ========== MENTAL READINESS ANALYSIS ==========
    const avgMental = quizzes?.length ? quizzes.reduce((sum, q) => sum + (q.mental_readiness || 0), 0) / quizzes.length : 0;
    const avgEmotional = quizzes?.length ? quizzes.reduce((sum, q) => sum + (q.emotional_state || 0), 0) / quizzes.length : 0;
    const avgPhysical = quizzes?.length ? quizzes.reduce((sum, q) => sum + (q.physical_readiness || 0), 0) / quizzes.length : 0;
    const avgDiscipline = quizzes?.filter(q => q.discipline_level).length 
      ? quizzes.filter(q => q.discipline_level).reduce((sum, q) => sum + (q.discipline_level || 0), 0) / quizzes.filter(q => q.discipline_level).length 
      : 0;
    const avgStress = quizzes?.filter(q => q.stress_level).length
      ? quizzes.filter(q => q.stress_level).reduce((sum, q) => sum + (q.stress_level || 0), 0) / quizzes.filter(q => q.stress_level).length
      : 0;
    const avgMood = quizzes?.filter(q => q.mood_level).length
      ? quizzes.filter(q => q.mood_level).reduce((sum, q) => sum + (q.mood_level || 0), 0) / quizzes.filter(q => q.mood_level).length
      : 0;

    // ========== NUTRITION ANALYSIS ==========
    const avgCalories = nutrition?.filter(n => n.calories).length
      ? nutrition.filter(n => n.calories).reduce((sum, n) => sum + (n.calories || 0), 0) / nutrition.filter(n => n.calories).length
      : 0;
    const avgProtein = nutrition?.filter(n => n.protein_g).length
      ? nutrition.filter(n => n.protein_g).reduce((sum, n) => sum + (parseFloat(n.protein_g) || 0), 0) / nutrition.filter(n => n.protein_g).length
      : 0;
    const avgCarbs = nutrition?.filter(n => n.carbs_g).length
      ? nutrition.filter(n => n.carbs_g).reduce((sum, n) => sum + (parseFloat(n.carbs_g) || 0), 0) / nutrition.filter(n => n.carbs_g).length
      : 0;
    const avgFats = nutrition?.filter(n => n.fats_g).length
      ? nutrition.filter(n => n.fats_g).reduce((sum, n) => sum + (parseFloat(n.fats_g) || 0), 0) / nutrition.filter(n => n.fats_g).length
      : 0;
    const avgEnergy = nutrition?.filter(n => n.energy_level).length
      ? nutrition.filter(n => n.energy_level).reduce((sum, n) => sum + (n.energy_level || 0), 0) / nutrition.filter(n => n.energy_level).length
      : 0;

    // ========== SCOUT GRADE ANALYSIS ==========
    let scoutAnalysis: any = null;
    if (grades && grades.length >= 1) {
      const firstGrade = grades[0]; // Oldest in period
      const latestGrade = grades[grades.length - 1]; // Most recent
      
      const gradeFields = ['hitting_grade', 'speed_grade', 'power_grade', 'throwing_grade', 'defense_grade', 'self_efficacy_grade', 'leadership_grade', 'fastball_grade', 'offspeed_grade', 'breaking_ball_grade', 'control_grade', 'delivery_grade', 'rise_ball_grade'];
      
      const improvements: { field: string; change: number }[] = [];
      const regressions: { field: string; change: number }[] = [];
      const latestScores: { field: string; grade: number }[] = [];
      
      gradeFields.forEach(field => {
        const firstVal = (firstGrade as any)[field] || 0;
        const latestVal = (latestGrade as any)[field] || 0;
        if (latestVal > 0) {
          latestScores.push({ field, grade: latestVal });
          if (grades.length >= 2) {
            const diff = latestVal - firstVal;
            if (diff >= 5) improvements.push({ field: field.replace('_grade', '').replace(/_/g, ' '), change: diff });
            if (diff <= -5) regressions.push({ field: field.replace('_grade', '').replace(/_/g, ' '), change: diff });
          }
        }
      });
      
      const sortedTools = latestScores.sort((a, b) => b.grade - a.grade);
      
      scoutAnalysis = {
        totalGrades: grades.length,
        firstGradeDate: firstGrade.graded_at,
        latestGradeDate: latestGrade.graded_at,
        improvements: improvements.slice(0, 3),
        regressions: regressions.slice(0, 3),
        strongestTools: sortedTools.slice(0, 3).map(t => ({ 
          tool: t.field.replace('_grade', '').replace(/_/g, ' '), 
          grade: t.grade 
        })),
        weakestTools: sortedTools.filter(t => t.grade > 0).slice(-3).reverse().map(t => ({ 
          tool: t.field.replace('_grade', '').replace(/_/g, ' '), 
          grade: t.grade 
        })),
      };
    }

    // ========== TRAINING FOCUS FROM DRILLS ==========
    const trainingFocus: Record<string, number> = {};
    savedDrills?.forEach(drill => {
      const origin = drill.module_origin || 'general';
      trainingFocus[origin] = (trainingFocus[origin] || 0) + 1;
    });

    // ========== WELLNESS GOALS ANALYSIS ==========
    const goalsAnalysis = wellnessGoals?.map(g => ({
      week: g.week_start_date,
      targetMood: g.target_mood_level,
      targetStress: g.target_stress_level,
      targetDiscipline: g.target_discipline_level,
    })) || [];
    const avgTargetMood = goalsAnalysis.length ? goalsAnalysis.reduce((sum, g) => sum + (g.targetMood || 0), 0) / goalsAnalysis.length : 0;

    // ========== REFLECTIONS ANALYSIS ==========
    const didWellReflections = quizzes?.filter(q => q.reflection_did_well).map(q => q.reflection_did_well).slice(0, 10) || [];
    const improveReflections = quizzes?.filter(q => q.reflection_improve).map(q => q.reflection_improve).slice(0, 10) || [];
    const learnedReflections = quizzes?.filter(q => q.reflection_learned).map(q => q.reflection_learned).slice(0, 10) || [];
    const motivationReflections = quizzes?.filter(q => q.reflection_motivation).map(q => q.reflection_motivation).slice(0, 5) || [];

    // ========== PERFORMANCE TESTS SUMMARY ==========
    const perfTestSummary = perfTests?.map(t => ({
      type: t.test_type,
      date: t.test_date,
      results: t.results,
      previousResults: t.previous_results,
    })) || [];

    // ========== ELITE CUSTOM ACTIVITY ANALYSIS ==========
    const customActivities = customActivityLogs || [];
    const totalCustomActivities = customActivities.length;

    // Group by activity type with time tracking
    const activityByType: Record<string, { count: number; minutes: number }> = {};
    customActivities.forEach((log: any) => {
      const type = log.custom_activity_templates?.activity_type || 'other';
      const mins = log.actual_duration_minutes || log.custom_activity_templates?.duration_minutes || 0;
      if (!activityByType[type]) activityByType[type] = { count: 0, minutes: 0 };
      activityByType[type].count += 1;
      activityByType[type].minutes += mins;
    });

    // Calculate total custom training time
    const totalCustomMinutes = customActivities.reduce((sum: number, log: any) => {
      return sum + (log.actual_duration_minutes || 
        log.custom_activity_templates?.duration_minutes || 0);
    }, 0);

    // Group by intensity
    const customIntensityDistribution: Record<string, number> = {};
    customActivities.forEach((log: any) => {
      const intensity = log.custom_activity_templates?.intensity || 'moderate';
      customIntensityDistribution[intensity] = (customIntensityDistribution[intensity] || 0) + 1;
    });

    // Get unique activity titles for variety analysis
    const uniqueActivities = new Set(
      customActivities.map((log: any) => log.custom_activity_templates?.title)
    );

    // Weekly consistency (days with at least one custom activity)
    const customActiveDates = new Set(customActivities.map((log: any) => log.entry_date));
    const customActivityDays = customActiveDates.size;

    // ========== DEEP EXERCISE ANALYSIS (from workout/practice activities) ==========
    let totalSets = 0;
    let totalReps = 0;
    let exerciseTypeDistribution: Record<string, number> = {};
    let exerciseFrequency: Record<string, number> = {};
    
    customActivities.forEach((log: any) => {
      const exercises = log.custom_activity_templates?.exercises || [];
      if (Array.isArray(exercises)) {
        exercises.forEach((ex: any) => {
          const sets = ex.sets || 1;
          const reps = typeof ex.reps === 'number' ? ex.reps : parseInt(ex.reps) || 0;
          totalSets += sets;
          totalReps += sets * reps;
          
          // Track exercise types
          const exType = ex.type || 'other';
          exerciseTypeDistribution[exType] = (exerciseTypeDistribution[exType] || 0) + 1;
          
          // Track exercise frequency
          const exName = ex.name || 'Unknown';
          exerciseFrequency[exName] = (exerciseFrequency[exName] || 0) + 1;
        });
      }
    });
    
    // Get top 5 most performed exercises
    const topExercises = Object.entries(exerciseFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    // Training variety score (unique exercises / total workout sessions)
    const workoutTypeActivities = customActivities.filter((log: any) => 
      ['workout', 'practice', 'short_practice'].includes(log.custom_activity_templates?.activity_type)
    );
    const trainingVarietyScore = workoutTypeActivities.length > 0 
      ? Math.min(10, Math.round((Object.keys(exerciseFrequency).length / workoutTypeActivities.length) * 2))
      : 0;

    // ========== NUTRITION/SUPPLEMENT ANALYSIS (from meal activities) ==========
    let supplementsTracked: Record<string, number> = {};
    let vitaminsTracked: Record<string, number> = {};
    let mealItemsCount = 0;
    let hydrationEntries = 0;
    
    customActivities.forEach((log: any) => {
      const meals = log.custom_activity_templates?.meals;
      if (meals && typeof meals === 'object') {
        // Count supplements
        const supplements = meals.supplements || [];
        if (Array.isArray(supplements)) {
          supplements.forEach((sup: any) => {
            const name = sup.name || 'Unknown';
            supplementsTracked[name] = (supplementsTracked[name] || 0) + 1;
          });
        }
        
        // Count vitamins
        const vitamins = meals.vitamins || [];
        if (Array.isArray(vitamins)) {
          vitamins.forEach((vit: any) => {
            const name = vit.name || 'Unknown';
            vitaminsTracked[name] = (vitaminsTracked[name] || 0) + 1;
          });
        }
        
        // Count meal items
        const items = meals.items || [];
        if (Array.isArray(items)) {
          mealItemsCount += items.length;
        }
        
        // Count hydration
        if (meals.hydration?.entries?.length) {
          hydrationEntries += meals.hydration.entries.length;
        }
      }
    });
    
    // Format supplement/vitamin tracking for prompt
    const topSupplements = Object.entries(supplementsTracked)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count}x)`);
    
    const topVitamins = Object.entries(vitaminsTracked)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count}x)`);

    // ========== CUSTOM FIELD ANALYSIS ==========
    let customFieldsLogged: Record<string, { total: number; completed: number }> = {};
    
    customActivities.forEach((log: any) => {
      const customFields = log.custom_activity_templates?.custom_fields || [];
      const performanceData = log.performance_data || {};
      
      if (Array.isArray(customFields)) {
        customFields.forEach((field: any) => {
          const label = field.label || 'Unknown';
          if (!customFieldsLogged[label]) {
            customFieldsLogged[label] = { total: 0, completed: 0 };
          }
          customFieldsLogged[label].total += 1;
          
          // Check if checkbox was checked or field had value
          const fieldKey = `field_${field.id}`;
          if (performanceData[fieldKey] || performanceData[field.id]) {
            customFieldsLogged[label].completed += 1;
          }
        });
      }
    });
    
    const customFieldsCount = Object.keys(customFieldsLogged).length;

    // ========== STREAK ANALYSIS ==========
    const sortedDates = [...customActiveDates].sort();
    let longestStreak = 0;
    let currentStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    if (sortedDates.length === 0) longestStreak = 0;

    // ========== ACTIVITY FREQUENCY (Top 3 by count) ==========
    const activityFrequency: Record<string, number> = {};
    customActivities.forEach((log: any) => {
      const title = log.custom_activity_templates?.title || 'Unknown';
      activityFrequency[title] = (activityFrequency[title] || 0) + 1;
    });
    
    const topRoutines = Object.entries(activityFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([name, count]) => `${name} (${count}x)`);

    // Extract notes for AI analysis (limit to prevent token overflow)
    const activityNotes = customActivities
      .filter((log: any) => log.notes && log.notes.trim())
      .map((log: any) => `${log.custom_activity_templates?.title}: ${log.notes}`)
      .slice(0, 8);

    // Average activities per active day
    const avgActivitiesPerActiveDay = customActivityDays > 0 
      ? (totalCustomActivities / customActivityDays).toFixed(1) 
      : '0';

    // Custom activities adherence percentage
    const customAdherencePercent = Math.round((customActivityDays / 42) * 100);

    // Detect if custom activities are the PRIMARY training source
    const customActivityIsPrimary = totalWorkouts < 3 && totalCustomActivities >= 5;

    console.log(`Custom activities: ${totalCustomActivities} completed, ${customActivityDays} active days, ${Math.floor(totalCustomMinutes / 60)}h ${totalCustomMinutes % 60}m total time`);
    console.log(`Exercise analysis: ${totalSets} sets, ${totalReps} total reps, variety score ${trainingVarietyScore}/10`);
    console.log(`Supplements: ${Object.keys(supplementsTracked).length} types, Vitamins: ${Object.keys(vitaminsTracked).length} types`);
    console.log(`Custom activity is primary training source: ${customActivityIsPrimary}`);

    // ========== TEX VISION ANALYSIS (E2E Integration) ==========
    const texDrillResults = texVisionDrills || [];
    const totalTexSessions = texDrillResults.length;
    const texWithAccuracy = texDrillResults.filter((d: any) => d.accuracy_percent !== null);
    const avgTexAccuracy = texWithAccuracy.length > 0
      ? texWithAccuracy.reduce((sum: number, d: any) => sum + (d.accuracy_percent || 0), 0) / texWithAccuracy.length
      : 0;
    const texWithReaction = texDrillResults.filter((d: any) => d.reaction_time_ms !== null);
    const avgReactionTime = texWithReaction.length > 0
      ? texWithReaction.reduce((sum: number, d: any) => sum + (d.reaction_time_ms || 0), 0) / texWithReaction.length
      : 0;

    // Drill type distribution
    const drillTypeBreakdown: Record<string, { count: number; totalAccuracy: number }> = {};
    texDrillResults.forEach((d: any) => {
      const drillType = d.drill_type || 'Unknown';
      if (!drillTypeBreakdown[drillType]) {
        drillTypeBreakdown[drillType] = { count: 0, totalAccuracy: 0 };
      }
      drillTypeBreakdown[drillType].count++;
      drillTypeBreakdown[drillType].totalAccuracy += d.accuracy_percent || 0;
    });

    // Calculate tier progression
    const tierCounts = { beginner: 0, advanced: 0, chaos: 0 };
    texDrillResults.forEach((d: any) => {
      const tier = d.tier as keyof typeof tierCounts;
      if (tier && tierCounts[tier] !== undefined) {
        tierCounts[tier]++;
      }
    });

    console.log(`Tex Vision: ${totalTexSessions} sessions, avg accuracy ${avgTexAccuracy.toFixed(1)}%, avg reaction ${avgReactionTime.toFixed(0)}ms`);

    // ========== VIDEO ANALYSIS SUMMARY (E2E Integration) ==========
    const videos = videoAnalysisData || [];
    const videosByModule: Record<string, { count: number; avgScore: number; totalScore: number }> = {};
    videos.forEach((v: any) => {
      const mod = v.module || 'unknown';
      if (!videosByModule[mod]) {
        videosByModule[mod] = { count: 0, avgScore: 0, totalScore: 0 };
      }
      videosByModule[mod].count++;
      videosByModule[mod].totalScore += v.efficiency_score || 0;
    });
    Object.keys(videosByModule).forEach(m => {
      videosByModule[m].avgScore = videosByModule[m].count > 0 
        ? videosByModule[m].totalScore / videosByModule[m].count 
        : 0;
    });

    // Extract recurring feedback themes from analysis_result
    const feedbackThemes: Record<string, number> = {};
    videos.forEach((v: any) => {
      const analysis = v.analysis_result as any;
      if (analysis?.recommendations && Array.isArray(analysis.recommendations)) {
        analysis.recommendations.forEach((rec: string) => {
          const theme = rec.slice(0, 50);
          feedbackThemes[theme] = (feedbackThemes[theme] || 0) + 1;
        });
      }
    });
    const topFeedbackThemes = Object.entries(feedbackThemes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const totalVideosAnalyzed = Object.values(videosByModule).reduce((sum, m) => sum + m.count, 0);
    console.log(`Video Analysis: ${totalVideosAnalyzed} videos across ${Object.keys(videosByModule).length} modules`);

    // ========== MIND FUEL COMPREHENSIVE (E2E Integration) ==========
    const mindfulnessSessions = mindfulnessData?.length || 0;
    const avgMindfulnessMinutes = mindfulnessData && mindfulnessData.length > 0
      ? mindfulnessData.reduce((sum: number, s: any) => sum + ((s.duration_seconds || 0) / 60), 0) / mindfulnessData.length
      : 0;

    const emotionEntries = emotionData?.length || 0;
    const dominantEmotions: Record<string, number> = {};
    emotionData?.forEach((e: any) => {
      const emotion = e.emotion || 'Unknown';
      dominantEmotions[emotion] = (dominantEmotions[emotion] || 0) + 1;
    });

    const journalEntries = journalData?.length || 0;
    const journalWithMood = journalData?.filter((j: any) => j.mood_level) || [];
    const avgJournalMood = journalWithMood.length > 0
      ? journalWithMood.reduce((sum: number, j: any) => sum + (j.mood_level || 0), 0) / journalWithMood.length
      : 0;

    const stressAssessments = stressData?.length || 0;
    const avgStressScore = stressData && stressData.length > 0
      ? stressData.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / stressData.length
      : 0;

    console.log(`Mind Fuel: ${mindfulnessSessions} mindfulness sessions, ${emotionEntries} emotion entries, ${journalEntries} journal entries`);

    // ========== HYDRATION ANALYSIS (E2E Integration) ==========
    const hydrationDays = new Set(hydrationLogs?.map((h: any) => h.log_date?.split('T')[0]) || []);
    const totalHydrationOz = hydrationLogs?.reduce((sum: number, h: any) => sum + (h.amount_oz || 0), 0) || 0;
    const avgDailyHydration = hydrationDays.size > 0 ? totalHydrationOz / hydrationDays.size : 0;
    const hydrationGoal = hydrationSettings?.daily_goal_oz || 100;
    const hydrationAdherence = Math.round((avgDailyHydration / hydrationGoal) * 100);

    console.log(`Hydration: ${hydrationDays.size} days tracked, avg ${avgDailyHydration.toFixed(0)}oz/day, ${hydrationAdherence}% of goal`);

    // ========== EDUCATION ENGAGEMENT (E2E Integration) ==========
    const tipsViewed = viewedTips?.length || 0;
    const lessonsCompleted = viewedLessons?.length || 0;
    const nutritionStreakDays = nutritionStreak?.current_streak || 0;
    const nutritionBadges = nutritionStreak?.badges_earned || [];

    console.log(`Education: ${tipsViewed} tips viewed, ${lessonsCompleted} lessons completed, ${nutritionStreakDays} day nutrition streak`);

    // ========== PROGRAM PROGRESS (E2E Integration) ==========
    const programProgress: Record<string, any> = {};
    subModuleProgress?.forEach((p: any) => {
      const key = `${p.module}_${p.sub_module}`;
      const weekProgress = p.week_progress || {};
      const weeksCompleted = Object.values(weekProgress).filter((days: any) => 
        Array.isArray(days) && days.every((d: boolean) => d)
      ).length;
      
      programProgress[key] = {
        currentWeek: p.current_week || 1,
        weeksCompleted,
        lastWorkoutDate: p.last_workout_date,
        totalCycles: p.current_cycle || 1,
      };
    });

    console.log(`Program Progress: ${Object.keys(programProgress).length} active programs`);
    console.log("Comprehensive E2E data collected for AI analysis");


    // ========== ELITE AI PROMPT ==========
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    let aiContent: any = {
      executive_summary: `You completed ${totalWorkouts} workouts over the past 6 weeks, lifting a total of ${totalWeightLifted.toLocaleString()} lbs.`,
      training_analysis: [],
      recovery_assessment: [],
      mental_performance: [],
      scout_grade_analysis: [],
      nutrition_impact: [],
      critical_focus_areas: [],
      strategic_recommendations: [],
      elite_insight: '',
      // Legacy fields for backward compatibility
      summary: '',
      highlights: [],
      improvements: [],
      focus_areas: [],
      recommendations: [],
    };

    // ========== RECOVERY PHASE DETECTION ==========
    // Detect if athlete is in recovery/rehabilitation phase (post-surgery, injury, etc.)
    const scoutNotes = grades?.[grades.length - 1]?.notes || '';
    const hasInjuryIndicators = scoutNotes.toLowerCase().includes('surgery') || 
                                scoutNotes.toLowerCase().includes('injury') ||
                                scoutNotes.toLowerCase().includes('cleared') ||
                                scoutNotes.toLowerCase().includes('rehab') ||
                                chronicPainAreas.length > 0;
    // Modified training detection: custom activities during recovery = rehabilitation
    const isModifiedTraining = totalWorkouts <= 2 && totalCustomActivities >= 5 && hasInjuryIndicators;
    const isRecoveryPhase = totalWorkouts === 0 && totalCustomActivities < 5 && (quizzes?.length || 0) >= 5 && hasInjuryIndicators;
    
    console.log(`Recovery phase detected: ${isRecoveryPhase} (workouts: ${totalWorkouts}, customActivities: ${totalCustomActivities}, quizzes: ${quizzes?.length}, injury indicators: ${hasInjuryIndicators})`);
    console.log(`Modified training (rehab + custom): ${isModifiedTraining}`);

    // UPDATED: Include custom activities as valid training data for AI analysis
    const hasTrainingData = totalWorkouts > 0 || totalCustomActivities > 0 || (quizzes?.length || 0) > 0;
    
    if (LOVABLE_API_KEY && hasTrainingData) {
      try {
        // Dynamic context prefix for recovery phase athletes
        const recoveryContext = isRecoveryPhase ? `
═══════════════════════════════════════════════════════════════
⚠️ CRITICAL CONTEXT: RECOVERY/REHABILITATION PHASE DETECTED
═══════════════════════════════════════════════════════════════

This athlete appears to be in a RECOVERY PHASE post-injury or surgery. Your analysis must adapt:

- DO NOT focus on training volume or strength progression (they are recovering)
- FOCUS INSTEAD on: mental resilience, psychological readiness, sleep quality during rehab, pain management patterns, emotional stability, and return-to-play indicators
- Their Scout Grades may show artificially low scores (e.g., Speed grade) due to physical limitations - contextualize this
- Recognize their commitment to daily check-ins as a positive indicator of discipline and recovery mindset
- Look for patterns in their mental/emotional data that indicate healthy recovery psychology

SCOUT NOTES (from athlete): "${scoutNotes}"

` : '';

        const elitePrompt = `You are an elite sports performance analyst with 20+ years of experience working with professional and Olympic athletes. You are creating a comprehensive 6-week training recap that demonstrates deep expertise in athlete development. This analysis should be at the level of a .001% professional in this field.
${recoveryContext}
ATHLETE PROFILE:
- Name: ${profile?.first_name || 'Athlete'}
- Position: ${profile?.position || 'Not specified'}
- Sport: ${profile?.sport || 'Baseball/Softball'}
- Analysis Period: ${startDateStr} to ${endDateStr}
- Phase: ${isRecoveryPhase ? '🔄 REHABILITATION/RECOVERY' : '📈 ACTIVE TRAINING'}

═══════════════════════════════════════════════════════════════
COMPREHENSIVE DATA ANALYSIS
═══════════════════════════════════════════════════════════════

1. TRAINING VOLUME & PROGRESSION
   • Total Workouts: ${totalWorkouts}${isRecoveryPhase ? ' (expected low - athlete recovering)' : ''}
   • Total Weight Lifted: ${totalWeightLifted.toLocaleString()} lbs
   • Weight Increases Logged: ${totalWeightIncreases}
   • Week 1 Avg Session: ${Math.round(firstWeekAvgWeight).toLocaleString()} lbs
   • Week 6 Avg Session: ${Math.round(lastWeekAvgWeight).toLocaleString()} lbs
   • Strength Change: ${strengthChangePercent > 0 ? '+' : ''}${strengthChangePercent}%

2. SLEEP & RECOVERY METRICS
   • Average Sleep Duration: ${avgHoursSlept.toFixed(1)} hours/night
   • Average Sleep Quality: ${avgSleepQuality.toFixed(1)}/5
   • Sleep Consistency: ${sleepConsistency} (std dev: ${sleepStdDev.toFixed(2)} hrs)
   • Sleep Trend (1st half vs 2nd half): ${sleepTrend}
   • Total Sleep Entries: ${sleepData.length}

3. PAIN & INJURY PATTERNS
   • Total Pain Reports: ${painEntries.length}
   • Average Pain Scale: ${avgPainScale.toFixed(1)}/10
   • Chronic Pain Areas (3+ occurrences): ${chronicPainAreas.length > 0 ? chronicPainAreas.map(p => `${p.area} (${p.occurrences}x)`).join(', ') : 'None detected'}

4. BODY COMPOSITION TREND
   • Starting Weight (Week 1 Avg): ${startWeight > 0 ? startWeight.toFixed(1) + ' lbs' : 'Not logged'}
   • Ending Weight (Week 6 Avg): ${endWeight > 0 ? endWeight.toFixed(1) + ' lbs' : 'Not logged'}
   • Net Change: ${bodyWeightChange !== 0 ? (bodyWeightChange > 0 ? '+' : '') + bodyWeightChange.toFixed(1) + ' lbs' : 'N/A'}
   • Weight Trend: ${weightTrend}
   • Total Weight Entries: ${weights.length}

5. MENTAL & EMOTIONAL READINESS ${isRecoveryPhase ? '(KEY RECOVERY METRICS)' : ''}
   • Average Mental Readiness: ${avgMental.toFixed(1)}/5
   • Average Emotional State: ${avgEmotional.toFixed(1)}/5
   • Average Physical Readiness: ${avgPhysical.toFixed(1)}/5
   • Average Discipline Level: ${avgDiscipline.toFixed(1)}/5
   • Average Stress Level: ${avgStress.toFixed(1)}/5
   • Average Mood Level: ${avgMood.toFixed(1)}/5
   • Total Quiz Entries: ${quizzes?.length || 0}

6. NUTRITION CONSISTENCY
   • Average Daily Calories: ${Math.round(avgCalories) || 'Not tracked'}
   • Average Protein: ${Math.round(avgProtein)}g
   • Average Carbs: ${Math.round(avgCarbs)}g
   • Average Fats: ${Math.round(avgFats)}g
   • Average Energy Level: ${avgEnergy.toFixed(1)}/5
   • Total Nutrition Logs: ${nutrition?.length || 0}

7. PERFORMANCE TEST RESULTS
   ${perfTestSummary.length > 0 ? perfTestSummary.map(t => `• ${t.type} (${t.date}): ${JSON.stringify(t.results)}`).join('\n   ') : '• No performance tests logged'}

8. SCOUT GRADE PROGRESSION (20-80 Scale)
   ${scoutAnalysis ? `
   • Total Grades Recorded: ${scoutAnalysis.totalGrades}
   • Strongest Tools: ${scoutAnalysis.strongestTools.map((t: any) => `${t.tool} (${t.grade})`).join(', ') || 'N/A'}
   • Weakest Tools: ${scoutAnalysis.weakestTools.map((t: any) => `${t.tool} (${t.grade})`).join(', ') || 'N/A'}${isRecoveryPhase ? ' (may be affected by recovery status)' : ''}
   • Improvements (+5 or more): ${scoutAnalysis.improvements.map((i: any) => `${i.field} (+${i.change})`).join(', ') || 'None'}
   • Regressions (-5 or more): ${scoutAnalysis.regressions.map((r: any) => `${r.field} (${r.change})`).join(', ') || 'None'}` : '• No scout grades recorded'}

9. TRAINING FOCUS AREAS (from saved drills)
   ${Object.keys(trainingFocus).length > 0 ? Object.entries(trainingFocus).map(([mod, count]) => `• ${mod}: ${count} drills saved`).join('\n   ') : '• No drills saved'}

10. WELLNESS GOAL TRENDS
    ${goalsAnalysis.length > 0 ? `• Weeks with goals set: ${goalsAnalysis.length}\n   • Average Target Mood: ${avgTargetMood.toFixed(1)}/5` : '• No wellness goals set'}

11. ATHLETE SELF-REFLECTIONS
    What they did well: ${didWellReflections.slice(0, 3).join(' | ') || 'No reflections logged'}
    What they want to improve: ${improveReflections.slice(0, 3).join(' | ') || 'No reflections logged'}
    What they learned: ${learnedReflections.slice(0, 3).join(' | ') || 'No reflections logged'}
    Motivations: ${motivationReflections.slice(0, 2).join(' | ') || 'No motivations logged'}

12. CUSTOM TRAINING ACTIVITIES (User-Designed Programs)
═══════════════════════════════════════════════════════════════
${customActivityIsPrimary ? '⭐ THIS ATHLETE PRIMARILY TRAINS VIA SELF-DESIGNED ROUTINES ⭐' : ''}
This athlete designs their own training routines. Treat these as EQUAL 
to structured program workouts. Analyze with full depth.

VOLUME & CONSISTENCY:
    • Total Activities Completed: ${totalCustomActivities}
    • Unique Activity Types Created: ${uniqueActivities.size}
    • Total Training Time: ${Math.floor(totalCustomMinutes / 60)}h ${totalCustomMinutes % 60}m
    • Days Active: ${customActivityDays} of 42 (${customAdherencePercent}% adherence)
    • Average Activities/Day (on active days): ${avgActivitiesPerActiveDay}
    • Longest Streak: ${longestStreak} consecutive days

TRAINING BREAKDOWN BY TYPE:
    ${Object.entries(activityByType).map(([type, data]) => `• ${type.charAt(0).toUpperCase() + type.slice(1)}: ${data.count} (${Math.floor(data.minutes / 60)}h ${data.minutes % 60}m total)`).join('\n    ') || '• No activities logged'}

EXERCISE ANALYSIS (from workout/practice activities):
    • Total Sets Logged: ${totalSets} across ${Object.keys(exerciseFrequency).length} exercises
    • Total Reps Logged: ${totalReps}
    • Exercise Types: ${Object.entries(exerciseTypeDistribution).map(([type, count]) => `${type}: ${count}`).join(', ') || 'None tracked'}
    • Most Trained Exercises: ${topExercises.map(e => `${e.name} (${e.count}x)`).join(', ') || 'None'}
    • Training Variety Score: ${trainingVarietyScore}/10 (unique exercises per session)

NUTRITION/SUPPLEMENT TRACKING (from meal activities):
    • Supplements Logged: ${topSupplements.join(', ') || 'None tracked'}
    • Vitamins Logged: ${topVitamins.join(', ') || 'None tracked'}
    • Meal Items Tracked: ${mealItemsCount} unique items
    • Hydration Entries: ${hydrationEntries}

CUSTOM ROUTINE INSIGHTS:
    • Top Routines by Frequency: ${topRoutines.join(', ') || 'None'}
    • Intensity Distribution: ${Object.entries(customIntensityDistribution).map(([i, count]) => `${i}: ${Math.round((count / totalCustomActivities) * 100)}%`).join(', ') || 'N/A'}
    • Custom Fields Logged: ${customFieldsCount} unique fields tracked

ATHLETE NOTES FROM ACTIVITIES:
    ${activityNotes.length > 0 ? activityNotes.join('\n    ') : 'No notes logged'}

═══════════════════════════════════════════════════════════════

13. BODY CONNECTION PATTERN ANALYSIS (Based on Elite Fascia Research)
═══════════════════════════════════════════════════════════════

Using principles from world-leading fascia researchers (Schleip, Stecco, 
Myers, Chong Xie's HFT), analyze body connection patterns:

PAIN DATA BY BODY LINE:
    ${bodyLinePainSummary}

DETECTED PATTERNS:
    • Areas affected: ${chronicPainAreas.map(p => p.area).join(', ') || 'None'}
    • Most affected Body Line: ${dominantBodyLine}
    • Connected areas to evaluate: ${connectedAreasToCheck.join(', ') || 'None identified'}

FASCIA ANALYSIS REQUIREMENTS (if pain data exists):
1. Identify if multiple pain areas fall on the SAME "Body Line" (fascia chain)
2. Suggest connected areas the athlete should stretch/mobilize
3. Frame all insights in SIMPLE LANGUAGE a 10-year-old can understand
4. Include a "Pro Insight" showing what elite athletes do differently
5. CRITICAL: Include disclaimer that this is educational only, not medical advice

KID-FRIENDLY BODY LINE NAMES (use these):
- "Back Track" = Superficial Back Line (heels to head, back of body)
- "Front Track" = Superficial Front Line (toes to head, front of body)  
- "Side Track" = Lateral Line (ankle to ear, side of body)
- "Arm Tracks" = Arm lines (shoulder to fingertips)
- "Core Track" = Deep Front Line (inner core, hip flexors)
- "Twist Track" = Spiral Line (wraps around body)

═══════════════════════════════════════════════════════════════

14. TEX VISION - VISUAL TRAINING ANALYSIS (E2E Integration)
═══════════════════════════════════════════════════════════════
    • Total Visual Training Sessions: ${totalTexSessions}
    • Average Accuracy: ${avgTexAccuracy.toFixed(1)}%
    • Average Reaction Time: ${avgReactionTime.toFixed(0)}ms
    • Tier Distribution: Beginner=${tierCounts.beginner}, Advanced=${tierCounts.advanced}, Chaos=${tierCounts.chaos}
    • Current Tier: ${texVisionProgress?.current_tier || 'beginner'}
    • Visual Processing Speed: ${(texVisionMetrics as any)?.visual_processing_speed?.toFixed(1) || 'N/A'}
    • Neuro Reaction Index: ${(texVisionMetrics as any)?.neuro_reaction_index?.toFixed(1) || 'N/A'}
    • Stress Resilience Score: ${(texVisionMetrics as any)?.stress_resilience_score?.toFixed(1) || 'N/A'}
    • Drill Types Practiced: ${Object.entries(drillTypeBreakdown).map(([type, data]) => `${type} (${data.count}x)`).join(', ') || 'None'}

CORRELATION NOTE: Compare reaction time trends with sleep quality and mental readiness scores.
Low sleep + declining reaction time = CNS fatigue indicator.

15. VIDEO ANALYSIS - MECHANICAL PROGRESSION (E2E Integration)
═══════════════════════════════════════════════════════════════
    • Total Videos Analyzed: ${totalVideosAnalyzed}
    ${Object.entries(videosByModule).map(([mod, data]) => 
      `• ${mod.charAt(0).toUpperCase() + mod.slice(1)}: ${data.count} videos, avg efficiency ${data.avgScore.toFixed(1)}%`).join('\n    ') || '• No videos analyzed'}
    • Top Recurring Feedback: ${topFeedbackThemes.map(([theme, count]) => `"${theme}..." (${count}x)`).join(', ') || 'None'}

CORRELATION NOTE: Compare video efficiency scores with physical readiness from check-ins.
Higher physical readiness should correlate with better mechanics.

16. MIND FUEL - MENTAL WELLNESS ENGAGEMENT (E2E Integration)
═══════════════════════════════════════════════════════════════
    • Mindfulness Sessions: ${mindfulnessSessions} (avg ${avgMindfulnessMinutes.toFixed(0)} min)
    • Emotion Check-Ins: ${emotionEntries}
    • Dominant Emotions: ${Object.entries(dominantEmotions).sort((a,b) => b[1]-a[1]).slice(0,3).map(([e,c]) => `${e} (${c}x)`).join(', ') || 'None tracked'}
    • Journal Entries: ${journalEntries}
    • Average Journal Mood: ${avgJournalMood.toFixed(1)}/5
    • Stress Assessments: ${stressAssessments}
    • Average Stress Score: ${avgStressScore.toFixed(1)}/10
    • Mind Fuel Streak: ${mindFuelStreak?.current_streak || 0} days

CORRELATION NOTE: Cross-reference dominant emotions with pain patterns and training performance.
Anxiety spikes often precede muscle tension.

17. HEALTH EDUCATION ENGAGEMENT (E2E Integration)
═══════════════════════════════════════════════════════════════
    • Daily Tips Viewed: ${tipsViewed}
    • Lessons Completed: ${lessonsCompleted}
    • Nutrition Streak: ${nutritionStreakDays} days
    • Badges Earned: ${nutritionBadges.join(', ') || 'None'}

18. HYDRATION CONSISTENCY (E2E Integration)
═══════════════════════════════════════════════════════════════
    • Days Tracked: ${hydrationDays.size}
    • Average Daily Intake: ${avgDailyHydration.toFixed(0)} oz
    • Daily Goal: ${hydrationGoal} oz
    • Adherence: ${hydrationAdherence}%

CORRELATION NOTE: Compare hydration with energy levels and physical readiness.
Dehydration directly impacts CNS function and recovery.

19. PROGRAM PROGRESS - Structured Training (E2E Integration)
═══════════════════════════════════════════════════════════════
    ${Object.entries(programProgress).map(([prog, data]: [string, any]) => 
      `• ${prog}: Week ${data.currentWeek}, ${data.weeksCompleted} weeks completed, Cycle ${data.totalCycles}`).join('\n    ') || '• No program progress tracked'}

20. CROSS-SYSTEM CORRELATION ANALYSIS (CRITICAL - E2E KEY INSIGHT)
═══════════════════════════════════════════════════════════════
CONTEXT-ADAPTIVE PRIORITY: Analyze correlations with highest data volume first.

Data volumes for prioritization:
- Sleep/Check-in entries: ${quizzes?.length || 0}
- Training sessions (program + custom): ${totalWorkouts + totalCustomActivities}
- Tex Vision drills: ${totalTexSessions}
- Video analyses: ${totalVideosAnalyzed}
- Mind Fuel entries: ${mindfulnessSessions + emotionEntries + journalEntries}
- Hydration logs: ${hydrationDays.size}

REQUIRED CORRELATIONS TO ANALYZE:
1. Sleep-Performance Link: How does sleep quality correlate with next-day training volume/intensity?
2. Pain-Emotion Connection: Do emotional states (stress, anxiety) precede pain reports?
3. Nutrition-Energy Impact: How do caloric intake patterns affect check-in energy levels?
4. Visual Training-Mechanics: Do Tex Vision reaction times correlate with video analysis efficiency?
5. Recovery-Training Volume: Is there a balance or imbalance between training load and recovery indicators?
6. Hydration-Cognitive: Link between hydration adherence and reaction time/visual processing?
7. Mindfulness-Stress: Effect of mindfulness practice frequency on stress levels?
8. KEY INSIGHT: Identify the single most impactful cross-system correlation discovered.

═══════════════════════════════════════════════════════════════

${isRecoveryPhase ? `
SPECIAL INSTRUCTIONS FOR RECOVERY PHASE ANALYSIS:
Generate an elite-level REHABILITATION & RECOVERY recap. Focus on:
- Mental resilience and psychological readiness for return-to-play
- Sleep quality as a recovery accelerator
- Pain pattern monitoring and management
- Emotional stability during limited activity
- Discipline in maintaining daily check-ins despite not training
- Return-to-play readiness indicators
- How Scout Grade limitations (e.g., low Speed score) are temporary due to injury

Do NOT criticize lack of training volume - the athlete is recovering. Instead, praise their commitment to tracking and mental preparation.
` : `
Generate a PROFESSIONAL, ELITE-LEVEL 6-week training recap. This should read like it was written by a top-tier performance coach working with elite athletes. Be specific with numbers, percentages, and trends. Correlate different data points to reveal insights (e.g., "Your sleep quality dropped in week 4, which correlates with the decrease in training volume").
`}

CRITICAL REQUIREMENTS:
- Use specific numbers and percentages from the data
- Make correlations between different metrics
- Provide actionable, specific recommendations
- Write with authority and expertise
- Focus on patterns and trends, not just averages
${isRecoveryPhase ? '- Frame everything through the lens of recovery optimization and return-to-play preparation' : ''}

═══════════════════════════════════════════════════════════════
CUSTOM ACTIVITY ANALYSIS REQUIREMENTS (MANDATORY):
═══════════════════════════════════════════════════════════════

${customActivityIsPrimary ? `
⭐ CRITICAL: CUSTOM ACTIVITIES ARE THIS ATHLETE'S PRIMARY TRAINING SOURCE ⭐
Program workouts: ${totalWorkouts} | Custom activities: ${totalCustomActivities}

You MUST:
- Lead the executive summary with custom activity achievements
- Frame ALL analysis through their personalized training approach
- Provide recommendations specific to optimizing THEIR routines
- NEVER suggest they "need to follow the program" - respect their autonomy
- Celebrate their self-directed training discipline
` : ''}

If the athlete has significant custom activity data (${totalCustomActivities} activities, 
${Math.floor(totalCustomMinutes / 60)}h ${totalCustomMinutes % 60}m training time), you MUST:

1. CALCULATE COMBINED TRAINING VOLUME:
   - TOTAL training hours = Program workouts + Custom activities
   - Present TOTAL volume (${totalWorkouts} workouts + ${totalCustomActivities} custom = ${totalWorkouts + totalCustomActivities} total sessions)
   - NEVER say the athlete "isn't training" if custom activities show engagement

2. ANALYZE THEIR TRAINING DESIGN:
   - Comment on exercise selection: ${topExercises.length > 0 ? topExercises.map(e => e.name).join(', ') : 'review their routine structure'}
   - Identify potential gaps (e.g., if no flexibility exercises logged, mention it)
   - Training variety score: ${trainingVarietyScore}/10 - ${trainingVarietyScore >= 7 ? 'excellent variety' : trainingVarietyScore >= 4 ? 'moderate variety, could diversify' : 'limited variety, recommend expanding'}

3. EVALUATE ROUTINE CONSISTENCY:
   - Longest streak: ${longestStreak} consecutive days
   - Adherence: ${customAdherencePercent}% of days had custom activity
   - Top routines: ${topRoutines.join(', ') || 'analyze their patterns'}
   - Identify if morning vs evening patterns exist

4. SUPPLEMENT/NUTRITION INTEGRATION:
   ${topSupplements.length > 0 ? `- Supplements tracked: ${topSupplements.join(', ')} - comment on consistency` : '- No supplements logged - recommend tracking if athlete uses them'}
   ${topVitamins.length > 0 ? `- Vitamins tracked: ${topVitamins.join(', ')} - acknowledge discipline` : ''}

5. CELEBRATE INITIATIVE:
   - Athletes who design their own training show HIGH self-direction
   - Acknowledge the discipline required to create AND follow custom routines
   - This is a sign of MATURE athletic development
   - Frame custom activities as intentional training, not "side work"

${isModifiedTraining ? `
6. MODIFIED TRAINING DETECTED (Recovery + Custom Activities):
   This athlete appears to be doing REHABILITATION exercises via custom activities 
   while recovering from injury. Their custom activities during this period should 
   be analyzed as REHABILITATION WORK, not compared to full training volume.
   Praise their proactive approach to recovery.
` : ''}

REQUIRED SECTIONS (return as JSON):

1. executive_summary (3-4 sentences): High-level assessment with the most important metrics. ${isRecoveryPhase ? 'Acknowledge the recovery phase and focus on mental/psychological readiness.' : 'Lead with the key finding.'}

2. training_analysis (4-6 bullet points): ${isRecoveryPhase ? 'Focus on what limited activity was done, saved drills for future reference, and preparation for return-to-training. Do not criticize lack of volume.' : 'Specific observations about training volume, intensity, consistency, and progression. Include percentages.'}

3. recovery_assessment (3-4 bullet points): Sleep quality analysis, pain patterns, perceived recovery. ${isRecoveryPhase ? 'This is the MOST IMPORTANT section for recovery phase athletes.' : 'Flag concerning patterns.'}

4. mental_performance (3-4 bullet points): Mental readiness trends, stress management, discipline scores. ${isRecoveryPhase ? 'Emphasize psychological resilience and commitment to daily check-ins as key recovery indicators.' : 'Correlate with physical performance.'}

5. scout_grade_analysis (3-4 bullet points): ${isRecoveryPhase ? 'Acknowledge that some grades (especially physical tools like Speed) may be artificially low due to recovery. Focus on mental/leadership grades as current strengths.' : 'Strongest/weakest tools, grade improvements/regressions, what the numbers mean competitively.'}

6. nutrition_impact (2-3 bullet points): Caloric patterns, protein consistency, energy correlation. ${isRecoveryPhase ? 'Frame nutrition as recovery fuel.' : ''}

7. critical_focus_areas (2-3 bullet points): The most important areas needing immediate attention. Be direct and specific.

8. strategic_recommendations (4-5 bullet points): ${isRecoveryPhase ? 'Focus on progressive return-to-play protocols, maintaining mental sharpness, and injury prevention for the next cycle.' : 'Specific, implementable recommendations for the next 6-week cycle.'}

9. elite_insight (1 paragraph): A deeper analysis connecting multiple data points to reveal a pattern or insight the athlete may not have noticed. ${isRecoveryPhase ? 'Connect their mental data with recovery readiness. Show how their discipline and mindset during this down period will translate to a stronger return.' : 'This demonstrates elite-level coaching.'}

10. body_connection_analysis (REQUIRED if pain data exists): Object containing kid-friendly fascia insights:
    - kid_summary: Simple 1-2 sentence explanation of body connections found (use spider web / train track analogies)
    - affected_body_line: The dominant "Body Track" name (e.g., "Back Track")
    - connected_areas_to_stretch: Array of 3-5 connected areas the athlete should check/stretch
    - pro_insight: What elite athletes do differently when this pattern appears
    - self_care_tip: One simple thing the athlete can try
    - disclaimer: "This is just for learning! Always talk to a coach, parent, or doctor about pain that doesn't go away."

Return ONLY valid JSON with this exact structure:
{
  "executive_summary": "...",
  "training_analysis": ["...", "..."],
  "recovery_assessment": ["...", "..."],
  "mental_performance": ["...", "..."],
  "scout_grade_analysis": ["...", "..."],
  "nutrition_impact": ["...", "..."],
  "critical_focus_areas": ["...", "..."],
  "strategic_recommendations": ["...", "..."],
  "elite_insight": "...",
  "body_connection_analysis": {
    "kid_summary": "Your body is connected like a spider web! Most of your tight spots are on the 'Back Track' - a line from your feet to your head.",
    "affected_body_line": "Back Track",
    "connected_areas_to_stretch": ["Calves", "Hamstrings", "Low Back"],
    "pro_insight": "Pro athletes work on the WHOLE chain, not just where it hurts.",
    "self_care_tip": "Try stretching your calves - it might help your hamstrings feel better!",
    "disclaimer": "This is just for learning! Always talk to a coach, parent, or doctor about pain that doesn't go away."
  }
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro", // Upgraded for elite analysis
            messages: [
              { role: "system", content: "You are an elite sports performance analyst with 20+ years of experience coaching professional and Olympic athletes. Provide specific, data-driven insights with authority. Return ONLY valid JSON." },
              { role: "user", content: elitePrompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiText = aiData.choices?.[0]?.message?.content || "";
          console.log("AI response received, parsing...");
          
          // Parse JSON from response
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiContent = {
              executive_summary: parsed.executive_summary || aiContent.executive_summary,
              training_analysis: parsed.training_analysis || [],
              recovery_assessment: parsed.recovery_assessment || [],
              mental_performance: parsed.mental_performance || [],
              scout_grade_analysis: parsed.scout_grade_analysis || [],
              nutrition_impact: parsed.nutrition_impact || [],
              critical_focus_areas: parsed.critical_focus_areas || [],
              strategic_recommendations: parsed.strategic_recommendations || [],
              elite_insight: parsed.elite_insight || '',
              body_connection_analysis: parsed.body_connection_analysis || null,
              // Map to legacy fields for backward compatibility
              summary: parsed.executive_summary || '',
              highlights: parsed.training_analysis?.slice(0, 3) || [],
              improvements: parsed.recovery_assessment || [],
              focus_areas: parsed.critical_focus_areas || [],
              recommendations: parsed.strategic_recommendations || [],
            };
            console.log("AI content parsed successfully");
          }
        } else {
          console.error("AI API error:", await aiResponse.text());
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError);
      }
    } else if (totalWorkouts === 0 && totalCustomActivities === 0 && (quizzes?.length || 0) === 0) {
      // UPDATED: Only show "no data" if BOTH program workouts AND custom activities are zero
      aiContent.executive_summary = "No training data logged in the past 6 weeks. Start tracking your workouts, custom activities, or complete daily check-ins to receive personalized performance insights.";
      aiContent.summary = aiContent.executive_summary;
      aiContent.critical_focus_areas = ["Begin logging workouts or custom activities consistently", "Complete daily focus quizzes to track mental readiness", "Track nutrition to optimize recovery"];
      aiContent.focus_areas = aiContent.critical_focus_areas;
    }

    // Build full recap data with all stats
    const recapData = {
      ...aiContent,
      workout_stats: {
        total_workouts: totalWorkouts,
        total_weight: totalWeightLifted,
        weight_increases: totalWeightIncreases,
        avg_session_weight: totalWorkouts > 0 ? Math.round(totalWeightLifted / totalWorkouts) : 0,
        strength_change_percent: strengthChangePercent,
      },
      sleep_stats: {
        avg_hours: parseFloat(avgHoursSlept.toFixed(1)),
        avg_quality: parseFloat(avgSleepQuality.toFixed(1)),
        consistency: sleepConsistency,
        trend: sleepTrend,
        entries_count: sleepData.length,
      },
      pain_stats: {
        total_reports: painEntries.length,
        avg_scale: parseFloat(avgPainScale.toFixed(1)),
        chronic_areas: chronicPainAreas,
      },
      weight_stats: {
        start_weight: parseFloat(startWeight.toFixed(1)),
        end_weight: parseFloat(endWeight.toFixed(1)),
        change: parseFloat(bodyWeightChange.toFixed(1)),
        trend: weightTrend,
      },
      mental_stats: {
        avg_mental: parseFloat(avgMental.toFixed(1)),
        avg_emotional: parseFloat(avgEmotional.toFixed(1)),
        avg_physical: parseFloat(avgPhysical.toFixed(1)),
        avg_discipline: parseFloat(avgDiscipline.toFixed(1)),
        avg_stress: parseFloat(avgStress.toFixed(1)),
        avg_mood: parseFloat(avgMood.toFixed(1)),
        quiz_count: quizzes?.length || 0,
      },
      nutrition_stats: {
        avg_calories: Math.round(avgCalories),
        avg_protein: Math.round(avgProtein),
        avg_carbs: Math.round(avgCarbs),
        avg_fats: Math.round(avgFats),
        avg_energy: parseFloat(avgEnergy.toFixed(1)),
        logs_count: nutrition?.length || 0,
      },
      scout_analysis: scoutAnalysis,
      performance_tests: perfTestSummary,
      training_focus: trainingFocus,
      wellness_goals_count: goalsAnalysis.length,
      custom_activity_stats: {
        total_completed: totalCustomActivities,
        unique_activities: uniqueActivities.size,
        total_minutes: totalCustomMinutes,
        days_active: customActivityDays,
        adherence_percent: customAdherencePercent,
        longest_streak: longestStreak,
        avg_per_active_day: parseFloat(avgActivitiesPerActiveDay),
        is_primary_source: customActivityIsPrimary,
        by_type: activityByType,
        by_intensity: customIntensityDistribution,
        exercise_analysis: {
          total_sets: totalSets,
          total_reps: totalReps,
          variety_score: trainingVarietyScore,
          type_distribution: exerciseTypeDistribution,
          top_exercises: topExercises,
        },
        nutrition_tracking: {
          supplements: supplementsTracked,
          vitamins: vitaminsTracked,
          meal_items_count: mealItemsCount,
          hydration_entries: hydrationEntries,
        },
        top_routines: topRoutines,
        custom_fields_count: customFieldsCount,
      },
      // NEW E2E INTEGRATION STATS
      tex_vision_stats: {
        total_sessions: totalTexSessions,
        avg_accuracy: parseFloat(avgTexAccuracy.toFixed(1)),
        avg_reaction_time: parseFloat(avgReactionTime.toFixed(0)),
        tier_distribution: tierCounts,
        current_tier: (texVisionProgress as any)?.current_tier || 'beginner',
        drill_breakdown: drillTypeBreakdown,
      },
      video_analysis_stats: {
        total_videos: totalVideosAnalyzed,
        by_module: videosByModule,
        recurring_feedback: topFeedbackThemes,
      },
      mind_fuel_stats: {
        mindfulness_sessions: mindfulnessSessions,
        avg_mindfulness_minutes: parseFloat(avgMindfulnessMinutes.toFixed(1)),
        emotion_entries: emotionEntries,
        dominant_emotions: dominantEmotions,
        journal_entries: journalEntries,
        avg_journal_mood: parseFloat(avgJournalMood.toFixed(1)),
        stress_assessments: stressAssessments,
        avg_stress_score: parseFloat(avgStressScore.toFixed(1)),
        streak: (mindFuelStreak as any)?.current_streak || 0,
      },
      hydration_stats: {
        days_tracked: hydrationDays.size,
        avg_daily_intake: parseFloat(avgDailyHydration.toFixed(0)),
        goal: hydrationGoal,
        adherence_percent: hydrationAdherence,
      },
      education_stats: {
        tips_viewed: tipsViewed,
        lessons_completed: lessonsCompleted,
        nutrition_streak: nutritionStreakDays,
        badges: nutritionBadges,
      },
      program_progress: programProgress,
    };

    // Save recap to database with unlocked_progress_reports_at set immediately
    const { error: insertError } = await supabase.from("vault_recaps").insert({
      user_id: user.id,
      recap_period_start: startDateStr,
      recap_period_end: endDateStr,
      recap_data: recapData,
      total_weight_lifted: totalWeightLifted,
      strength_change_percent: strengthChangePercent,
      unlocked_progress_reports_at: new Date().toISOString(), // Set immediately to gate countdown
    });

    if (insertError) {
      console.error("Error saving recap:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save recap" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Elite recap generated and saved successfully");

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
