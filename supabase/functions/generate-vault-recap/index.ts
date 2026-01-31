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

    // Fetch ALL vault data for comprehensive analysis
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
      // Fetch custom activities with FULL template details (exercises, meals, custom_fields)
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
    console.log("Comprehensive data collected for AI analysis");

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
  "elite_insight": "..."
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
