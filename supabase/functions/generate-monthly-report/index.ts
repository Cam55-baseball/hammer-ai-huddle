import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoData {
  id: string;
  sport: string;
  module: string;
  efficiency_score: number | null;
  ai_analysis: any;
  created_at: string;
  session_date: string;
}

interface NutritionStreak {
  current_streak: number;
  longest_streak: number;
  total_visits: number;
  tips_collected: number;
  badges_earned: string[];
}

interface AnnotationData {
  id: string;
  scout_id: string;
  video_id: string;
  created_at: string;
  notes: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { forceGenerate } = await req.json().catch(() => ({}));

    console.log('[generate-monthly-report] Starting for user:', user.id);

    // Get or create user report cycle
    let { data: cycle, error: cycleError } = await supabase
      .from('user_report_cycles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (cycleError && cycleError.code === 'PGRST116') {
      // No cycle exists, create one starting from account creation
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', user.id)
        .single();

      const cycleStartDate = profile?.created_at || new Date().toISOString();
      const nextReportDate = new Date(cycleStartDate);
      nextReportDate.setDate(nextReportDate.getDate() + 30);

      const { data: newCycle, error: insertError } = await supabase
        .from('user_report_cycles')
        .insert({
          user_id: user.id,
          cycle_start_date: cycleStartDate,
          next_report_date: nextReportDate.toISOString(),
          reports_generated: 0
        })
        .select()
        .single();

      if (insertError) {
        console.error('[generate-monthly-report] Error creating cycle:', insertError);
        throw new Error('Failed to create report cycle');
      }

      cycle = newCycle;
    }

    // Check if report is due
    const now = new Date();
    const nextReportDate = new Date(cycle.next_report_date);
    
    if (!forceGenerate && now < nextReportDate) {
      return new Response(
        JSON.stringify({ 
          reportReady: false, 
          nextReportDate: cycle.next_report_date,
          daysRemaining: Math.ceil((nextReportDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if report already exists for this period
    const { data: existingReport } = await supabase
      .from('monthly_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('report_period_start', cycle.cycle_start_date)
      .single();

    if (existingReport && !forceGenerate) {
      return new Response(
        JSON.stringify({ 
          reportReady: true, 
          reportId: existingReport.id,
          alreadyGenerated: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Define report period
    const periodStart = new Date(cycle.cycle_start_date);
    const periodEnd = new Date(cycle.next_report_date);

    console.log('[generate-monthly-report] Generating report for period:', periodStart.toISOString(), 'to', periodEnd.toISOString());

    // ========================================
    // SECTION 1: OVERVIEW DATA
    // ========================================
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString())
      .order('created_at', { ascending: true });

    if (videosError) {
      console.error('[generate-monthly-report] Error fetching videos:', videosError);
    }

    const videoList: VideoData[] = videos || [];
    
    // Calculate overview metrics
    const totalUploads = videoList.length;
    const moduleUploads: Record<string, number> = {};
    const sportUploads: Record<string, number> = {};
    const efficiencyScores: number[] = [];
    
    videoList.forEach(video => {
      moduleUploads[video.module] = (moduleUploads[video.module] || 0) + 1;
      sportUploads[video.sport] = (sportUploads[video.sport] || 0) + 1;
      if (video.efficiency_score !== null) {
        efficiencyScores.push(video.efficiency_score);
      }
    });

    const mostUsedModule = Object.entries(moduleUploads).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const leastUsedModule = Object.entries(moduleUploads).sort((a, b) => a[1] - b[1])[0]?.[0] || null;
    const averageScore = efficiencyScores.length > 0 
      ? Math.round(efficiencyScores.reduce((a, b) => a + b, 0) / efficiencyScores.length)
      : null;
    const bestScore = efficiencyScores.length > 0 ? Math.max(...efficiencyScores) : null;

    // Get previous period data for comparison
    const prevPeriodStart = new Date(periodStart);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - 30);
    
    const { data: prevVideos } = await supabase
      .from('videos')
      .select('efficiency_score, module')
      .eq('user_id', user.id)
      .gte('created_at', prevPeriodStart.toISOString())
      .lt('created_at', periodStart.toISOString());

    const prevScores = (prevVideos || [])
      .filter(v => v.efficiency_score !== null)
      .map(v => v.efficiency_score as number);
    const prevAverageScore = prevScores.length > 0
      ? Math.round(prevScores.reduce((a, b) => a + b, 0) / prevScores.length)
      : null;

    const overviewSection = {
      totalUploads,
      moduleUploads,
      sportUploads,
      mostUsedModule,
      leastUsedModule,
      averageScore,
      bestScore,
      previousPeriodAverage: prevAverageScore,
      scoreChange: averageScore !== null && prevAverageScore !== null 
        ? averageScore - prevAverageScore 
        : null,
      totalScoresRecorded: efficiencyScores.length
    };

    // ========================================
    // SECTION 2: USER BEHAVIOR ANALYTICS
    // ========================================
    const uploadDays: Record<string, number> = {};
    const uploadHours: Record<number, number> = {};
    
    videoList.forEach(video => {
      const date = new Date(video.created_at);
      const dayKey = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      
      uploadDays[dayKey] = (uploadDays[dayKey] || 0) + 1;
      uploadHours[hour] = (uploadHours[hour] || 0) + 1;
    });

    const totalDaysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysActive = Object.keys(uploadDays).length;
    const consistencyScore = Math.round((daysActive / totalDaysInPeriod) * 100);

    // Get user's subscribed modules to identify under-utilized ones
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('subscribed_modules')
      .eq('user_id', user.id)
      .single();

    const subscribedModules = subscription?.subscribed_modules || [];
    const usedModules = Object.keys(moduleUploads);
    const underUtilizedModules = subscribedModules.filter((m: string) => !usedModules.includes(m.split('_')[1]));

    // Peak activity hour
    const peakHour = Object.entries(uploadHours).sort((a, b) => b[1] - a[1])[0];

    const behaviorSection = {
      daysActive,
      totalDaysInPeriod,
      consistencyScore,
      uploadFrequencyByDay: uploadDays,
      uploadFrequencyByHour: uploadHours,
      peakActivityHour: peakHour ? parseInt(peakHour[0]) : null,
      subscribedModules,
      usedModules,
      underUtilizedModules,
      averageUploadsPerActiveDay: daysActive > 0 ? Math.round((totalUploads / daysActive) * 10) / 10 : 0,
      recommendations: generateBehaviorRecommendations(consistencyScore, underUtilizedModules, moduleUploads)
    };

    // ========================================
    // SECTION 3: FULL ANALYSIS SUMMARY
    // ========================================
    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];
    const allDrills: string[] = [];
    const scoreTrend: { date: string; score: number; module: string }[] = [];

    videoList.forEach(video => {
      if (video.ai_analysis) {
        const analysis = video.ai_analysis;
        if (analysis.positives && Array.isArray(analysis.positives)) {
          allStrengths.push(...analysis.positives);
        }
        if (analysis.summary) {
          // Extract key issues from summary
          const summaryLower = analysis.summary.toLowerCase();
          if (summaryLower.includes('needs work') || summaryLower.includes('improve') || summaryLower.includes('focus on')) {
            allWeaknesses.push(analysis.summary);
          }
        }
        if (analysis.drills && Array.isArray(analysis.drills)) {
          allDrills.push(...analysis.drills);
        }
      }
      if (video.efficiency_score !== null) {
        scoreTrend.push({
          date: video.created_at,
          score: video.efficiency_score,
          module: video.module
        });
      }
    });

    // Count frequency of strengths and weaknesses
    const strengthFrequency = countFrequency(allStrengths);
    const drillFrequency = countFrequency(allDrills);

    // Determine overall trend
    let overallTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (scoreTrend.length >= 3) {
      const firstHalf = scoreTrend.slice(0, Math.floor(scoreTrend.length / 2));
      const secondHalf = scoreTrend.slice(Math.floor(scoreTrend.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b.score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b.score, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg + 3) overallTrend = 'improving';
      else if (secondAvg < firstAvg - 3) overallTrend = 'declining';
    }

    const analysisSection = {
      totalVideosAnalyzed: videoList.filter(v => v.ai_analysis).length,
      topStrengths: Object.entries(strengthFrequency).sort((a, b) => b[1] - a[1]).slice(0, 5),
      commonWeaknesses: allWeaknesses.slice(0, 5),
      mostRecommendedDrills: Object.entries(drillFrequency).sort((a, b) => b[1] - a[1]).slice(0, 5),
      scoreTrend,
      overallTrend
    };

    // ========================================
    // SECTION 4: MODULE DEVELOPMENT REPORTS
    // ========================================
    const modules = ['hitting', 'pitching', 'throwing'];
    const moduleReports: Record<string, any> = {};

    for (const module of modules) {
      const moduleVideos = videoList.filter(v => v.module === module);
      const moduleScores = moduleVideos
        .filter(v => v.efficiency_score !== null)
        .map(v => v.efficiency_score as number);

      const prevModuleVideos = (prevVideos || []).filter(v => v.module === module);
      const prevModuleScores = prevModuleVideos
        .filter(v => v.efficiency_score !== null)
        .map(v => v.efficiency_score as number);

      const currentAvg = moduleScores.length > 0 
        ? Math.round(moduleScores.reduce((a, b) => a + b, 0) / moduleScores.length)
        : null;
      const prevAvg = prevModuleScores.length > 0
        ? Math.round(prevModuleScores.reduce((a, b) => a + b, 0) / prevModuleScores.length)
        : null;

      // Extract module-specific insights
      const moduleStrengths: string[] = [];
      const moduleIssues: string[] = [];
      const moduleDrills: string[] = [];

      moduleVideos.forEach(video => {
        if (video.ai_analysis) {
          if (video.ai_analysis.positives) moduleStrengths.push(...video.ai_analysis.positives);
          if (video.ai_analysis.drills) moduleDrills.push(...video.ai_analysis.drills);
          if (video.ai_analysis.scorecard?.regressions) {
            moduleIssues.push(...video.ai_analysis.scorecard.regressions);
          }
        }
      });

      moduleReports[module] = {
        uploadsThisMonth: moduleVideos.length,
        currentAverageScore: currentAvg,
        previousAverageScore: prevAvg,
        scoreChange: currentAvg !== null && prevAvg !== null ? currentAvg - prevAvg : null,
        bestScore: moduleScores.length > 0 ? Math.max(...moduleScores) : null,
        worstScore: moduleScores.length > 0 ? Math.min(...moduleScores) : null,
        trend: determineTrend(currentAvg, prevAvg),
        topStrengths: Object.entries(countFrequency(moduleStrengths)).sort((a, b) => b[1] - a[1]).slice(0, 3),
        commonIssues: Object.entries(countFrequency(moduleIssues)).sort((a, b) => b[1] - a[1]).slice(0, 3),
        recommendedDrills: Object.entries(countFrequency(moduleDrills)).sort((a, b) => b[1] - a[1]).slice(0, 3)
      };
    }

    // ========================================
    // SECTION 5: NUTRITION MODULE SUMMARY
    // ========================================
    const { data: nutritionStreak } = await supabase
      .from('nutrition_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: viewedTips } = await supabase
      .from('user_viewed_tips')
      .select('tip_id, viewed_at')
      .eq('user_id', user.id)
      .gte('viewed_at', periodStart.toISOString())
      .lt('viewed_at', periodEnd.toISOString());

    const { count: totalTipsAvailable } = await supabase
      .from('nutrition_daily_tips')
      .select('*', { count: 'exact', head: true });

    const nutritionSection = {
      tipsViewedThisMonth: viewedTips?.length || 0,
      totalTipsAvailable: totalTipsAvailable || 515,
      currentStreak: nutritionStreak?.current_streak || 0,
      longestStreak: nutritionStreak?.longest_streak || 0,
      totalVisits: nutritionStreak?.total_visits || 0,
      badgesEarned: nutritionStreak?.badges_earned || [],
      tipsCollected: nutritionStreak?.tips_collected || 0,
      engagementScore: calculateNutritionEngagement(nutritionStreak, viewedTips?.length || 0, totalDaysInPeriod)
    };

    // ========================================
    // SECTION 6: PERFORMANCE METRICS SUMMARY
    // ========================================
    const allTimeScores = await supabase
      .from('videos')
      .select('efficiency_score, module, created_at')
      .eq('user_id', user.id)
      .not('efficiency_score', 'is', null)
      .order('created_at', { ascending: true });

    const allScores = (allTimeScores.data || []).map(v => v.efficiency_score as number);
    const allTimeAverage = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null;

    const performanceSection = {
      thisMonthBest: bestScore,
      thisMonthAverage: averageScore,
      allTimeBest: allScores.length > 0 ? Math.max(...allScores) : null,
      allTimeAverage,
      monthVsAllTime: averageScore !== null && allTimeAverage !== null 
        ? averageScore - allTimeAverage 
        : null,
      totalVideosAllTime: allScores.length,
      moduleBreakdown: Object.entries(moduleReports).reduce((acc, [module, data]) => {
        acc[module] = {
          average: data.currentAverageScore,
          best: data.bestScore,
          trend: data.trend
        };
        return acc;
      }, {} as Record<string, any>)
    };

    // ========================================
    // SECTION 7: COACH FEEDBACK SUMMARY
    // ========================================
    const { data: annotations } = await supabase
      .from('video_annotations')
      .select('*')
      .eq('player_id', user.id)
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString());

    const scoutAnnotations = (annotations || []).filter(a => a.annotator_type === 'scout');
    const uniqueScouts = [...new Set(scoutAnnotations.map(a => a.scout_id))];

    const coachFeedbackSection = {
      totalAnnotationsReceived: scoutAnnotations.length,
      uniqueCoachesReviewing: uniqueScouts.length,
      playerSelfAnnotations: (annotations || []).filter(a => a.annotator_type === 'player').length,
      feedbackBreakdown: groupAnnotationsByVideo(scoutAnnotations)
    };

    // ========================================
    // SECTION 8: AI COACHING SUMMARY (Generated)
    // ========================================
    const coachingSummary = generateCoachingSummary({
      overview: overviewSection,
      behavior: behaviorSection,
      analysis: analysisSection,
      modules: moduleReports,
      nutrition: nutritionSection,
      performance: performanceSection
    });

    // ========================================
    // SECTION 9: NEXT MONTH ACTION PLAN
    // ========================================
    const actionPlan = generateActionPlan({
      overview: overviewSection,
      behavior: behaviorSection,
      analysis: analysisSection,
      modules: moduleReports,
      nutrition: nutritionSection
    });

    // ========================================
    // COMPILE FULL REPORT
    // ========================================
    const reportData = {
      generatedAt: new Date().toISOString(),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      sections: {
        overview: overviewSection,
        behavior: behaviorSection,
        analysis: analysisSection,
        moduleReports,
        nutrition: nutritionSection,
        performance: performanceSection,
        coachFeedback: coachFeedbackSection,
        coachingSummary,
        actionPlan
      }
    };

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from('monthly_reports')
      .insert({
        user_id: user.id,
        report_period_start: periodStart.toISOString(),
        report_period_end: periodEnd.toISOString(),
        report_data: reportData,
        status: 'generated'
      })
      .select()
      .single();

    if (saveError) {
      console.error('[generate-monthly-report] Error saving report:', saveError);
      throw new Error('Failed to save report');
    }

    // Update cycle for next period
    const newCycleStart = periodEnd;
    const newNextReport = new Date(newCycleStart);
    newNextReport.setDate(newNextReport.getDate() + 30);

    await supabase
      .from('user_report_cycles')
      .update({
        cycle_start_date: newCycleStart.toISOString(),
        next_report_date: newNextReport.toISOString(),
        reports_generated: (cycle.reports_generated || 0) + 1
      })
      .eq('user_id', user.id);

    console.log('[generate-monthly-report] Report generated successfully:', savedReport.id);

    return new Response(
      JSON.stringify({ 
        reportReady: true, 
        reportId: savedReport.id,
        report: reportData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-monthly-report] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function countFrequency(items: string[]): Record<string, number> {
  const freq: Record<string, number> = {};
  items.forEach(item => {
    const normalized = item.trim().toLowerCase();
    if (normalized) {
      freq[normalized] = (freq[normalized] || 0) + 1;
    }
  });
  return freq;
}

function determineTrend(current: number | null, previous: number | null): 'improving' | 'stable' | 'declining' | 'insufficient_data' {
  if (current === null || previous === null) return 'insufficient_data';
  if (current > previous + 3) return 'improving';
  if (current < previous - 3) return 'declining';
  return 'stable';
}

function calculateNutritionEngagement(
  streak: NutritionStreak | null, 
  tipsThisMonth: number, 
  daysInPeriod: number
): number {
  if (!streak) return 0;
  
  // Weight factors
  const streakWeight = 0.3;
  const tipsWeight = 0.4;
  const badgesWeight = 0.3;
  
  const streakScore = Math.min(streak.current_streak / 30, 1) * 100;
  const tipsScore = Math.min(tipsThisMonth / (daysInPeriod * 2), 1) * 100; // Expect 2 tips/day max
  const badgesScore = Math.min(streak.badges_earned.length / 5, 1) * 100;
  
  return Math.round(
    streakScore * streakWeight + 
    tipsScore * tipsWeight + 
    badgesScore * badgesWeight
  );
}

function generateBehaviorRecommendations(
  consistencyScore: number,
  underUtilized: string[],
  moduleUploads: Record<string, number>
): string[] {
  const recommendations: string[] = [];
  
  if (consistencyScore < 30) {
    recommendations.push('Try to train more consistently - aim for at least 3-4 uploads per week to see improvement.');
  } else if (consistencyScore < 60) {
    recommendations.push('Good consistency! Push for 4-5 uploads per week to accelerate your progress.');
  } else {
    recommendations.push('Excellent training consistency! Keep up the great work.');
  }
  
  if (underUtilized.length > 0) {
    recommendations.push(`You have access to ${underUtilized.join(', ')} but haven't used them much. Consider exploring these modules.`);
  }
  
  const moduleCounts = Object.values(moduleUploads);
  if (moduleCounts.length > 1) {
    const max = Math.max(...moduleCounts);
    const min = Math.min(...moduleCounts);
    if (max > min * 3) {
      recommendations.push('Your training is heavily focused on one module. Consider balancing your practice across modules.');
    }
  }
  
  return recommendations;
}

function groupAnnotationsByVideo(annotations: AnnotationData[]): Record<string, number> {
  const byVideo: Record<string, number> = {};
  annotations.forEach(a => {
    byVideo[a.video_id] = (byVideo[a.video_id] || 0) + 1;
  });
  return byVideo;
}

function generateCoachingSummary(data: any): {
  personalizedMessage: string;
  keyHighlights: string[];
  areasForImprovement: string[];
} {
  const { overview, behavior, analysis, modules, nutrition, performance } = data;
  
  const highlights: string[] = [];
  const improvements: string[] = [];
  
  // Generate highlights
  if (overview.bestScore && overview.bestScore >= 85) {
    highlights.push(`You achieved an impressive best score of ${overview.bestScore}/100 this month!`);
  }
  if (overview.scoreChange && overview.scoreChange > 0) {
    highlights.push(`Your average score improved by ${overview.scoreChange} points from last month.`);
  }
  if (behavior.consistencyScore >= 60) {
    highlights.push(`Outstanding training consistency at ${behavior.consistencyScore}%!`);
  }
  if (nutrition.currentStreak >= 7) {
    highlights.push(`Maintained a ${nutrition.currentStreak}-day nutrition streak!`);
  }
  if (analysis.overallTrend === 'improving') {
    highlights.push('Your overall performance trend is on an upward trajectory!');
  }
  
  // Generate improvement areas
  if (behavior.consistencyScore < 40) {
    improvements.push('Focus on training more consistently throughout the month.');
  }
  if (behavior.underUtilizedModules.length > 0) {
    improvements.push(`Explore your ${behavior.underUtilizedModules[0]} subscription for well-rounded development.`);
  }
  if (overview.scoreChange && overview.scoreChange < 0) {
    improvements.push('Work on recovering from last month\'s dip with focused practice.');
  }
  if (analysis.overallTrend === 'declining') {
    improvements.push('Address the declining trend by reviewing your recent analysis feedback.');
  }
  
  // Generate personalized message
  let message = '';
  if (overview.totalUploads === 0) {
    message = 'This month saw limited activity. Remember, consistent practice is key to improvement. Set a goal to upload at least 2-3 videos next month to start tracking your progress!';
  } else if (analysis.overallTrend === 'improving') {
    message = `Great month! You uploaded ${overview.totalUploads} videos and showed clear improvement. Your dedication to ${overview.mostUsedModule || 'training'} is paying off. Keep building on this momentum!`;
  } else if (analysis.overallTrend === 'declining') {
    message = `You stayed active with ${overview.totalUploads} uploads, but scores dipped slightly. This is normal - focus on the fundamentals and the scores will follow. Review your analysis feedback for specific areas to work on.`;
  } else {
    message = `Solid month with ${overview.totalUploads} uploads! Your performance is stable, which is a good foundation. To break through to the next level, focus on consistency and addressing the specific feedback in your analyses.`;
  }
  
  return {
    personalizedMessage: message,
    keyHighlights: highlights.length > 0 ? highlights : ['Keep pushing - your best performances are ahead!'],
    areasForImprovement: improvements.length > 0 ? improvements : ['Maintain your current approach and stay consistent.']
  };
}

function generateActionPlan(data: any): {
  majorFocusAreas: string[];
  smallAdjustments: string[];
  suggestedUploadFrequency: string;
  modulePriorities: string[];
  nutritionEmphasis: string;
} {
  const { overview, behavior, analysis, modules, nutrition } = data;
  
  const majorFocus: string[] = [];
  const smallAdjustments: string[] = [];
  const modulePriorities: string[] = [];
  
  // Determine major focus areas based on weaknesses
  if (analysis.commonWeaknesses.length > 0) {
    majorFocus.push(`Address: ${analysis.commonWeaknesses[0].substring(0, 100)}...`);
  }
  
  if (behavior.consistencyScore < 50) {
    majorFocus.push('Establish a consistent training schedule - aim for every other day.');
  }
  
  // Module-specific priorities
  Object.entries(modules).forEach(([module, data]: [string, any]) => {
    if (data.trend === 'declining') {
      majorFocus.push(`Focus on ${module} - scores have been declining.`);
      modulePriorities.push(module);
    } else if (data.uploadsThisMonth === 0 && behavior.subscribedModules.includes(`baseball_${module}`) || behavior.subscribedModules.includes(`softball_${module}`)) {
      smallAdjustments.push(`Start using your ${module} subscription.`);
    }
  });
  
  // Small adjustments
  if (behavior.peakActivityHour !== null) {
    const hour = behavior.peakActivityHour;
    const timeStr = hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
    smallAdjustments.push(`Your peak training time is around ${timeStr} - schedule practices then for best focus.`);
  }
  
  if (analysis.mostRecommendedDrills.length > 0) {
    smallAdjustments.push(`Prioritize drill: ${analysis.mostRecommendedDrills[0][0]}`);
  }
  
  // Upload frequency suggestion
  let uploadSuggestion = '3-4 videos per week';
  if (behavior.consistencyScore >= 70) {
    uploadSuggestion = 'Maintain current pace (4-5 videos per week)';
  } else if (behavior.consistencyScore < 30) {
    uploadSuggestion = 'Start with 2 videos per week, build to 3-4';
  }
  
  // Nutrition emphasis
  let nutritionEmphasis = 'Visit the nutrition module daily to maintain your streak.';
  if (nutrition.currentStreak === 0) {
    nutritionEmphasis = 'Start building a nutrition streak - daily tips help optimize performance.';
  } else if (nutrition.currentStreak >= 14) {
    nutritionEmphasis = 'Excellent nutrition habits! Explore new tip categories.';
  }
  
  // Ensure we have content
  if (majorFocus.length === 0) {
    majorFocus.push('Maintain your current training approach.');
    majorFocus.push('Focus on video quality over quantity.');
  }
  if (smallAdjustments.length === 0) {
    smallAdjustments.push('Review previous analyses before each practice.');
    smallAdjustments.push('Set specific goals for each training session.');
  }
  if (modulePriorities.length === 0) {
    modulePriorities.push(overview.mostUsedModule || 'hitting');
  }
  
  return {
    majorFocusAreas: majorFocus.slice(0, 5),
    smallAdjustments: smallAdjustments.slice(0, 5),
    suggestedUploadFrequency: uploadSuggestion,
    modulePriorities: modulePriorities.slice(0, 3),
    nutritionEmphasis
  };
}
