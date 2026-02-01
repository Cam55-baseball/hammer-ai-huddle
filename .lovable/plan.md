
# Elite E2E System Integration: Complete User Data Unification

## Executive Summary

This plan transforms the app into a fully interconnected elite athlete development platform where every module feeds into and influences every other module. The 6-week recap becomes the synthesis point for all user data, providing unprecedented depth of personalized insights.

---

## Current State Analysis

### Already Integrated into Recap
| Data Source | Status | Notes |
|-------------|--------|-------|
| Vault Workout Notes | ✅ Full | Weight lifted, increases |
| Focus Quizzes (3 types) | ✅ Full | Mental, emotional, physical, pain, sleep |
| Nutrition Logs | ✅ Full | Calories, macros, energy |
| Performance Tests | ✅ Full | 6-week testing |
| Scout Grades | ✅ Full | 20-80 scale progression |
| Custom Activities | ✅ Full | Exercises, meals, supplements |
| Wellness Goals | ✅ Full | Weekly targets |
| Body Connection/Fascia | ✅ Full | Pain patterns by body line |
| Weight Tracking | ✅ Full | Body composition trends |

### NOT Currently Integrated (Critical Gaps)
| Data Source | Table | User Data |
|-------------|-------|-----------|
| Tex Vision | `tex_vision_drill_results`, `tex_vision_metrics` | 146 drill results |
| Video Analysis | `videos`, `video_annotations` | 357 videos |
| Mind Fuel Sessions | `mindfulness_sessions`, `emotion_tracking`, `mental_health_journal` | Active usage |
| Health Tips | `user_viewed_tips`, `nutrition_streaks` | 102 tips viewed |
| Daily Lessons | `user_viewed_lessons` | 76 lessons viewed |
| Hydration | `hydration_logs`, `hydration_settings` | 6 logs |
| Stress Assessments | `stress_assessments` | Available |
| Iron Bambino/Heat Factory | `sub_module_progress` | Program progression |

---

## Phase 1: Integrate Missing Data Sources into 6-Week Recap

### 1.1 Tex Vision Integration
**File: `supabase/functions/generate-vault-recap/index.ts`**

Add new data fetch (after line 122):
```typescript
// Fetch Tex Vision data
supabase.from("tex_vision_drill_results").select("*").eq("user_id", user.id)
  .gte("completed_at", startDateStr).lte("completed_at", endDateStr),
supabase.from("tex_vision_metrics").select("*").eq("user_id", user.id)
  .eq("sport", profile?.sport || 'baseball').maybeSingle(),
supabase.from("tex_vision_progress").select("*").eq("user_id", user.id)
  .maybeSingle(),
```

New analysis section:
```typescript
// ========== TEX VISION ANALYSIS ==========
const texDrillResults = texVisionData || [];
const totalTexSessions = texDrillResults.length;
const avgTexAccuracy = texDrillResults.filter(d => d.accuracy_percent !== null)
  .reduce((sum, d) => sum + d.accuracy_percent, 0) / (texDrillResults.length || 1);
const avgReactionTime = texDrillResults.filter(d => d.reaction_time_ms !== null)
  .reduce((sum, d) => sum + d.reaction_time_ms, 0) / (texDrillResults.filter(d => d.reaction_time_ms).length || 1);

// Drill type distribution
const drillTypeBreakdown: Record<string, { count: number; avgAccuracy: number }> = {};
texDrillResults.forEach(d => {
  if (!drillTypeBreakdown[d.drill_type]) {
    drillTypeBreakdown[d.drill_type] = { count: 0, avgAccuracy: 0 };
  }
  drillTypeBreakdown[d.drill_type].count++;
  drillTypeBreakdown[d.drill_type].avgAccuracy += d.accuracy_percent || 0;
});

// Calculate tier progression
const tierCounts = { beginner: 0, advanced: 0, chaos: 0 };
texDrillResults.forEach(d => tierCounts[d.tier as keyof typeof tierCounts]++);
```

### 1.2 Video Analysis Integration

Add to data fetch:
```typescript
// Fetch video analysis data
supabase.from("videos").select("id, module, sport, efficiency_score, created_at, analysis_result")
  .eq("user_id", user.id)
  .gte("created_at", startDateStr).lte("created_at", endDateStr),
supabase.from("user_progress").select("*").eq("user_id", user.id),
```

New analysis:
```typescript
// ========== VIDEO ANALYSIS SUMMARY ==========
const videosByModule: Record<string, { count: number; avgScore: number; totalScore: number }> = {};
videos?.forEach(v => {
  if (!videosByModule[v.module]) videosByModule[v.module] = { count: 0, avgScore: 0, totalScore: 0 };
  videosByModule[v.module].count++;
  videosByModule[v.module].totalScore += v.efficiency_score || 0;
});
Object.keys(videosByModule).forEach(m => {
  videosByModule[m].avgScore = videosByModule[m].totalScore / videosByModule[m].count;
});

// Extract recurring feedback themes from analysis_result
const feedbackThemes: Record<string, number> = {};
videos?.forEach(v => {
  const analysis = v.analysis_result as any;
  analysis?.recommendations?.forEach((rec: string) => {
    const theme = rec.slice(0, 50);
    feedbackThemes[theme] = (feedbackThemes[theme] || 0) + 1;
  });
});
const topFeedbackThemes = Object.entries(feedbackThemes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);
```

### 1.3 Mind Fuel Integration

Add data fetches:
```typescript
// Mind Fuel complete picture
supabase.from("mindfulness_sessions").select("*").eq("user_id", user.id)
  .gte("session_date", startDateStr).lte("session_date", endDateStr),
supabase.from("emotion_tracking").select("*").eq("user_id", user.id)
  .gte("entry_date", startDateStr).lte("entry_date", endDateStr),
supabase.from("mental_health_journal").select("id, mood_rating, created_at").eq("user_id", user.id)
  .gte("created_at", startDateStr).lte("created_at", endDateStr),
supabase.from("mind_fuel_streaks").select("*").eq("user_id", user.id).maybeSingle(),
supabase.from("stress_assessments").select("*").eq("user_id", user.id)
  .gte("created_at", startDateStr).lte("created_at", endDateStr),
```

Analysis:
```typescript
// ========== MIND FUEL COMPREHENSIVE ==========
const mindfulnessSessions = mindfulnessData?.length || 0;
const avgMindfulnessMinutes = mindfulnessData?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / (mindfulnessData?.length || 1);

const emotionEntries = emotionData?.length || 0;
const dominantEmotions: Record<string, number> = {};
emotionData?.forEach(e => {
  dominantEmotions[e.primary_emotion] = (dominantEmotions[e.primary_emotion] || 0) + 1;
});

const journalEntries = journalData?.length || 0;
const avgJournalMood = journalData?.reduce((sum, j) => sum + (j.mood_rating || 0), 0) / (journalData?.length || 1);

const stressAssessments = stressData?.length || 0;
const avgStressScore = stressData?.reduce((sum, s) => sum + (s.stress_level || 0), 0) / (stressData?.length || 1);
```

### 1.4 Nutrition Tips & Lessons Integration

```typescript
// Health education engagement
supabase.from("user_viewed_tips").select("tip_id, viewed_at").eq("user_id", user.id)
  .gte("viewed_at", startDateStr).lte("viewed_at", endDateStr),
supabase.from("user_viewed_lessons").select("lesson_id, viewed_at").eq("user_id", user.id)
  .gte("viewed_at", startDateStr).lte("viewed_at", endDateStr),
supabase.from("nutrition_streaks").select("*").eq("user_id", user.id).maybeSingle(),
```

### 1.5 Hydration Integration

```typescript
// Hydration tracking
supabase.from("hydration_logs").select("*").eq("user_id", user.id)
  .gte("logged_at", startDateStr).lte("logged_at", endDateStr),
supabase.from("hydration_settings").select("*").eq("user_id", user.id).maybeSingle(),
```

Analysis:
```typescript
const avgDailyHydration = hydrationLogs?.reduce((sum, h) => sum + h.amount_oz, 0) / 
  (new Set(hydrationLogs?.map(h => h.logged_at.split('T')[0])).size || 1);
const hydrationGoal = hydrationSettings?.daily_goal_oz || 100;
const hydrationAdherence = Math.round((avgDailyHydration / hydrationGoal) * 100);
```

### 1.6 Program Progress (Iron Bambino/Heat Factory)

```typescript
// Training program progress
supabase.from("sub_module_progress").select("*").eq("user_id", user.id),
```

Analysis:
```typescript
const programProgress: Record<string, any> = {};
subModuleProgress?.forEach(p => {
  programProgress[`${p.module}_${p.sub_module}`] = {
    currentWeek: p.current_week,
    weeksCompleted: Object.values(p.week_progress || {}).filter((days: any) => 
      days.every((d: boolean) => d)).length,
    lastWorkoutDate: p.last_workout_date,
  };
});
```

---

## Phase 2: Enhanced AI Prompt for 6-Week Recap

### New AI Prompt Sections (add to existing prompt around line 700+)

```typescript
14. TEX VISION - VISUAL TRAINING ANALYSIS
═══════════════════════════════════════════════════════════════
    • Total Visual Training Sessions: ${totalTexSessions}
    • Average Accuracy: ${avgTexAccuracy.toFixed(1)}%
    • Average Reaction Time: ${avgReactionTime.toFixed(0)}ms
    • Tier Distribution: Beginner=${tierCounts.beginner}, Advanced=${tierCounts.advanced}, Chaos=${tierCounts.chaos}
    • Current Tier: ${texProgress?.current_tier || 'beginner'}
    • Visual Processing Speed: ${texMetrics?.visual_processing_speed?.toFixed(1) || 'N/A'}
    • Neuro Reaction Index: ${texMetrics?.neuro_reaction_index?.toFixed(1) || 'N/A'}
    • Stress Resilience Score: ${texMetrics?.stress_resilience_score?.toFixed(1) || 'N/A'}

CORRELATION NOTE: Compare reaction time trends with sleep quality and mental readiness scores.
Low sleep + declining reaction time = CNS fatigue indicator.

15. VIDEO ANALYSIS - MECHANICAL PROGRESSION
═══════════════════════════════════════════════════════════════
    • Total Videos Analyzed: ${Object.values(videosByModule).reduce((sum, m) => sum + m.count, 0)}
    ${Object.entries(videosByModule).map(([mod, data]) => 
      `• ${mod.charAt(0).toUpperCase() + mod.slice(1)}: ${data.count} videos, avg efficiency ${data.avgScore.toFixed(1)}%`).join('\n    ')}
    • Top Recurring Feedback: ${topFeedbackThemes.map(([theme, count]) => `"${theme}..." (${count}x)`).join(', ') || 'None'}

CORRELATION NOTE: Compare video efficiency scores with physical readiness from check-ins.
Higher physical readiness should correlate with better mechanics.

16. MIND FUEL - MENTAL WELLNESS ENGAGEMENT
═══════════════════════════════════════════════════════════════
    • Mindfulness Sessions: ${mindfulnessSessions} (avg ${avgMindfulnessMinutes.toFixed(0)} min)
    • Emotion Check-Ins: ${emotionEntries}
    • Dominant Emotions: ${Object.entries(dominantEmotions).sort((a,b) => b[1]-a[1]).slice(0,3).map(([e,c]) => `${e} (${c}x)`).join(', ') || 'None tracked'}
    • Journal Entries: ${journalEntries}
    • Average Journal Mood: ${avgJournalMood.toFixed(1)}/5
    • Stress Assessments: ${stressAssessments}
    • Average Stress Level: ${avgStressScore.toFixed(1)}/10

CORRELATION NOTE: Cross-reference dominant emotions with pain patterns and training performance.
Anxiety spikes often precede muscle tension.

17. HEALTH EDUCATION ENGAGEMENT
═══════════════════════════════════════════════════════════════
    • Daily Tips Viewed: ${viewedTips?.length || 0}
    • Lessons Completed: ${viewedLessons?.length || 0}
    • Nutrition Streak: ${nutritionStreak?.current_streak || 0} days
    • Badges Earned: ${nutritionStreak?.badges_earned?.join(', ') || 'None'}

18. HYDRATION CONSISTENCY
═══════════════════════════════════════════════════════════════
    • Average Daily Intake: ${avgDailyHydration.toFixed(0)} oz
    • Daily Goal: ${hydrationGoal} oz
    • Adherence: ${hydrationAdherence}%

CORRELATION NOTE: Compare hydration with energy levels and physical readiness.
Dehydration directly impacts CNS function and recovery.

19. PROGRAM PROGRESS (Structured Training)
═══════════════════════════════════════════════════════════════
    ${Object.entries(programProgress).map(([prog, data]: [string, any]) => 
      `• ${prog}: Week ${data.currentWeek}, ${data.weeksCompleted} weeks completed`).join('\n    ') || 'No program progress tracked'}
```

---

## Phase 3: Cross-System Correlation Engine

### New Required AI Analysis Section

Add to AI prompt requirements:
```typescript
11. cross_system_correlations (REQUIRED - the key differentiator):
    Object containing discovered correlations between systems:
    {
      "sleep_performance_link": "Correlation description between sleep quality and training performance",
      "pain_emotion_connection": "Link between emotional state and pain patterns",
      "nutrition_energy_impact": "How nutrition correlates with energy levels in check-ins",
      "visual_training_mechanics": "Connection between Tex Vision scores and video analysis efficiency",
      "recovery_training_volume": "Balance between training load and recovery indicators",
      "hydration_cognitive": "Link between hydration and reaction time/visual processing",
      "mindfulness_stress": "Effect of mindfulness practice on stress levels",
      "key_insight": "The single most important cross-system correlation discovered"
    }
```

---

## Phase 4: Bidirectional Module Integration

### 4.1 Game Plan Context Awareness

**File: `src/hooks/useGamePlan.ts`**

Add recovery-based task recommendations:
```typescript
// After fetching check-in data, analyze for recommendations
const getRecoveryRecommendations = useCallback(async () => {
  // Fetch last night's check-in
  const { data: lastNight } = await supabase
    .from('vault_focus_quizzes')
    .select('sleep_quality, stress_level, pain_location')
    .eq('user_id', user.id)
    .eq('quiz_type', 'night')
    .order('entry_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If poor sleep or high stress, suggest recovery-focused activities
  if (lastNight?.sleep_quality && lastNight.sleep_quality <= 2) {
    return { suggestRecovery: true, reason: 'low_sleep' };
  }
  if (lastNight?.stress_level && lastNight.stress_level >= 4) {
    return { suggestRecovery: true, reason: 'high_stress' };
  }
  if (lastNight?.pain_location?.length > 2) {
    return { suggestRecovery: true, reason: 'multiple_pain' };
  }
  return { suggestRecovery: false };
}, [user]);
```

### 4.2 Workout Recommendations Based on Check-in Data

**File: `supabase/functions/recommend-workout/index.ts`**

Enhance with vault data:
```typescript
// Fetch user's morning check-in for today
const { data: morningCheckin } = await supabase
  .from('vault_focus_quizzes')
  .select('physical_readiness, mental_readiness, pain_location, perceived_recovery')
  .eq('user_id', userId)
  .eq('quiz_type', 'morning')
  .eq('entry_date', today)
  .maybeSingle();

// Adjust recommendations based on check-in
const recoveryScore = morningCheckin?.perceived_recovery || 5;
const physicalReadiness = morningCheckin?.physical_readiness || 3;
const painAreas = morningCheckin?.pain_location || [];

// If low recovery or physical readiness, recommend lighter workouts
if (recoveryScore <= 3 || physicalReadiness <= 2) {
  // Push toward recovery/mobility focus
}

// If pain areas include lower body, avoid leg-heavy exercises
if (painAreas.some(a => ['left_hamstring', 'right_hamstring', 'lower_back'].includes(a))) {
  // Filter out lower body strength exercises
}
```

### 4.3 Nutrition Tip Personalization

**File: `supabase/functions/get-daily-tip/index.ts`**

Add context from other systems:
```typescript
// Fetch user context for personalized tips
const { data: recentQuiz } = await supabase
  .from('vault_focus_quizzes')
  .select('sleep_quality, stress_level, physical_readiness')
  .eq('user_id', user.id)
  .order('entry_date', { ascending: false })
  .limit(1)
  .maybeSingle();

// Prioritize tip categories based on user state
let priorityCategory = category;
if (recentQuiz?.sleep_quality && recentQuiz.sleep_quality <= 2) {
  priorityCategory = 'recovery'; // Focus on recovery tips
}
if (recentQuiz?.stress_level && recentQuiz.stress_level >= 4) {
  priorityCategory = 'blood_flow'; // Stress reduction tips
}
```

---

## Phase 5: Pain-Training Influence System

### 5.1 Pain Area to Exercise Filtering

Create utility for exercise recommendations:
```typescript
// src/utils/painExerciseFilter.ts

const PAIN_EXERCISE_RESTRICTIONS: Record<string, string[]> = {
  'left_hamstring': ['Deadlifts', 'Romanian Deadlifts', 'Leg Curls', 'Sprints'],
  'right_hamstring': ['Deadlifts', 'Romanian Deadlifts', 'Leg Curls', 'Sprints'],
  'lower_back': ['Deadlifts', 'Squats', 'Bent Over Rows', 'Good Mornings'],
  'left_shoulder_front': ['Overhead Press', 'Bench Press', 'Front Raises'],
  'right_shoulder_front': ['Overhead Press', 'Bench Press', 'Front Raises'],
  'left_wrist': ['Push-ups', 'Bench Press', 'Front Squats'],
  'right_wrist': ['Push-ups', 'Bench Press', 'Front Squats'],
  // ... more mappings
};

export function filterExercisesForPain(
  exercises: string[], 
  painAreas: string[]
): { allowed: string[]; restricted: string[] } {
  const restrictedSet = new Set<string>();
  painAreas.forEach(area => {
    PAIN_EXERCISE_RESTRICTIONS[area]?.forEach(ex => restrictedSet.add(ex));
  });
  
  return {
    allowed: exercises.filter(e => !restrictedSet.has(e)),
    restricted: exercises.filter(e => restrictedSet.has(e)),
  };
}
```

### 5.2 Fascia Chain Influence on Recommendations

```typescript
// When pain is detected on a fascia line, suggest mobility for connected areas
import { getConnectedAreas, getFasciaConnection } from './fasciaConnectionMappings';

export function getPreventiveMobilityAreas(painAreas: string[]): string[] {
  const mobilityTargets = new Set<string>();
  
  painAreas.forEach(area => {
    const connection = getFasciaConnection(area);
    if (connection) {
      getConnectedAreas(area).forEach(a => mobilityTargets.add(a));
    }
  });
  
  return Array.from(mobilityTargets);
}
```

---

## Phase 6: Real-Time Sync Improvements

### 6.1 Unified Data Refresh Hook

Create a hook that keeps all modules synchronized:
```typescript
// src/hooks/useUnifiedDataSync.ts

export function useUnifiedDataSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('unified-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        // Invalidate related queries based on table
        const table = payload.table;
        if (table === 'vault_focus_quizzes') {
          queryClient.invalidateQueries(['gamePlan']);
          queryClient.invalidateQueries(['recommendations']);
        }
        if (table === 'vault_nutrition_logs') {
          queryClient.invalidateQueries(['nutritionTargets']);
          queryClient.invalidateQueries(['dailyEnergy']);
        }
        // ... more table-to-query mappings
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
```

---

## Phase 7: Recap Data Model Update

### Store Unified Data in recap_data

Update the recap save to include all new data:
```typescript
const recapData = {
  ...aiContent,
  // Existing stats...
  
  // NEW: Tex Vision stats
  tex_vision_stats: {
    total_sessions: totalTexSessions,
    avg_accuracy: avgTexAccuracy,
    avg_reaction_time: avgReactionTime,
    tier_distribution: tierCounts,
    current_tier: texProgress?.current_tier,
    neuro_reaction_index: texMetrics?.neuro_reaction_index,
    visual_processing_speed: texMetrics?.visual_processing_speed,
    stress_resilience: texMetrics?.stress_resilience_score,
  },
  
  // NEW: Video analysis stats
  video_analysis_stats: {
    by_module: videosByModule,
    recurring_feedback: topFeedbackThemes,
    overall_efficiency_trend: calculateEfficiencyTrend(videos),
  },
  
  // NEW: Mind Fuel stats
  mind_fuel_stats: {
    mindfulness_sessions: mindfulnessSessions,
    avg_mindfulness_minutes: avgMindfulnessMinutes,
    emotion_entries: emotionEntries,
    dominant_emotions: dominantEmotions,
    journal_entries: journalEntries,
    avg_journal_mood: avgJournalMood,
    stress_assessments: stressAssessments,
    avg_stress_level: avgStressScore,
  },
  
  // NEW: Education engagement
  education_stats: {
    tips_viewed: viewedTips?.length || 0,
    lessons_completed: viewedLessons?.length || 0,
    nutrition_streak: nutritionStreak?.current_streak || 0,
  },
  
  // NEW: Hydration stats
  hydration_stats: {
    avg_daily_intake: avgDailyHydration,
    goal: hydrationGoal,
    adherence_percent: hydrationAdherence,
  },
  
  // NEW: Program progress
  program_progress: programProgress,
  
  // NEW: Cross-system correlations (from AI)
  cross_correlations: aiContent.cross_system_correlations || null,
};
```

---

## Summary: Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-vault-recap/index.ts` | Add 8 new data fetches, 6 new analysis sections, expanded AI prompt with cross-correlations |
| `supabase/functions/recommend-workout/index.ts` | Integrate check-in data for personalized recommendations |
| `supabase/functions/get-daily-tip/index.ts` | Add user state context for tip prioritization |
| `src/hooks/useGamePlan.ts` | Add recovery-based recommendations |
| `src/utils/painExerciseFilter.ts` | New file for pain-to-exercise restrictions |
| `src/hooks/useUnifiedDataSync.ts` | New file for real-time sync across modules |

---

## Expected Outcomes

1. **6-Week Recap becomes 360° view** - Every data point the user generates feeds into the recap
2. **Modules influence each other** - Poor sleep affects workout recommendations, high stress triggers recovery tips
3. **Pain patterns inform training** - Fascia connections prevent injury by suggesting mobility
4. **Cross-correlations reveal insights** - AI discovers patterns humans wouldn't notice
5. **Real-time sync** - Changes in one module immediately reflect in others

This transforms the app from a collection of features into a unified, intelligent athlete development system operating at the .001% elite level.
