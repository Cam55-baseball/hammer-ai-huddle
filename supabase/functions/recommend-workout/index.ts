import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivityLog {
  id: string;
  entry_date: string;
  completed: boolean;
  actual_duration_minutes?: number;
  performance_data?: any;
  template_id?: string;
  custom_activity_templates?: {
    id: string;
    title: string;
    activity_type: string;
    exercises?: any[];
    intensity?: string;
    duration_minutes?: number;
  };
}

interface RecoveryContext {
  sleepQuality: number | null;
  stressLevel: number | null;
  physicalReadiness: number | null;
  perceivedRecovery: number | null;
  painAreas: string[];
  painScales: Record<string, number> | null;
  suggestRecovery: boolean;
  recoveryReason: string | null;
}

interface Exercise {
  id: string;
  name: string;
  type: string;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds?: number;
  supersetGroupId?: string;
  supersetOrder?: number;
}

interface WorkoutRecommendation {
  id: string;
  name: string;
  focus: 'strength' | 'cardio' | 'recovery' | 'balanced';
  exercises: Exercise[];
  reasoning: string;
  estimatedDuration: number;
  confidence: number;
  isLighterAlternative?: boolean;
  originalRecommendationId?: string;
}

interface RecoveryWarning {
  show: boolean;
  severity: 'moderate' | 'high';
  reason: string;
  suggestions: string[];
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

/**
 * Normalize exercises field from templates that may use flat arrays or block-based format
 */
function extractExercisesFromTemplate(exercisesField: any): any[] {
  if (!exercisesField) return [];
  if (Array.isArray(exercisesField)) return exercisesField;
  if (exercisesField._useBlocks && Array.isArray(exercisesField.blocks)) {
    return exercisesField.blocks.flatMap(
      (block: any) => Array.isArray(block.exercises) ? block.exercises : []
    );
  }
  return [];
}

/**
 * Analyze recovery context and determine warning level
 */
function analyzeRecoveryStatus(context: RecoveryContext | undefined): RecoveryWarning | null {
  if (!context) return null;

  const { sleepQuality, stressLevel, physicalReadiness, perceivedRecovery, painAreas, painScales } = context;
  
  // Calculate average pain if scales exist
  let avgPainLevel = 0;
  if (painScales && Object.keys(painScales).length > 0) {
    avgPainLevel = Object.values(painScales).reduce((sum, v) => sum + v, 0) / Object.keys(painScales).length;
  }

  const issues: string[] = [];
  const suggestions: string[] = [];
  let severity: 'moderate' | 'high' = 'moderate';

  // Check sleep quality (1-5 scale, lower is worse)
  if (sleepQuality !== null && sleepQuality <= 2) {
    issues.push('poor sleep quality');
    suggestions.push('Consider lighter volume or active recovery');
    if (sleepQuality === 1) severity = 'high';
  }

  // Check stress level (1-5 scale, higher is worse)
  if (stressLevel !== null && stressLevel >= 4) {
    issues.push('elevated stress levels');
    suggestions.push('Focus on low-intensity movements to avoid overtraining');
    if (stressLevel === 5) severity = 'high';
  }

  // Check physical readiness (1-5 scale, lower is worse)
  if (physicalReadiness !== null && physicalReadiness <= 2) {
    issues.push('low physical readiness');
    suggestions.push('Prioritize mobility work and dynamic stretching');
    if (physicalReadiness === 1) severity = 'high';
  }

  // Check perceived recovery (1-5 scale, lower is worse)
  if (perceivedRecovery !== null && perceivedRecovery <= 2) {
    issues.push('incomplete recovery from previous training');
    suggestions.push('Allow additional rest between sets');
  }

  // Check pain areas
  if (painAreas.length >= 3) {
    issues.push(`multiple pain areas detected (${painAreas.length} areas)`);
    suggestions.push('Consider a recovery-focused session or targeted mobility work');
    severity = 'high';
  } else if (painAreas.length > 0) {
    issues.push(`${painAreas.length} pain area(s) reported`);
    suggestions.push('Avoid exercises that stress painful areas');
  }

  // Check pain intensity
  if (avgPainLevel >= 7) {
    issues.push('high pain intensity detected');
    suggestions.push('Strongly recommend rest or gentle recovery work only');
    severity = 'high';
  }

  if (issues.length === 0) return null;

  return {
    show: true,
    severity,
    reason: `Based on your check-in: ${issues.join(', ')}.`,
    suggestions: [...new Set(suggestions)], // Remove duplicates
  };
}

/**
 * Format pain areas for AI prompt
 */
function formatPainAreasForPrompt(painAreas: string[], painScales: Record<string, number> | null): string {
  if (!painAreas.length) return 'None reported';
  
  return painAreas.map(area => {
    const formattedName = area.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const intensity = painScales?.[area];
    return intensity ? `${formattedName} (${intensity}/10)` : formattedName;
  }).join(', ');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { activityLogs, recoveryContext } = await req.json() as { 
      activityLogs: ActivityLog[];
      recoveryContext?: RecoveryContext;
    };

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('[recommend-workout] Processing request with recovery context:', 
      recoveryContext ? 'present' : 'not provided');

    // Analyze recovery status for warnings
    const recoveryWarning = analyzeRecoveryStatus(recoveryContext);
    
    // Analyze activity patterns
    const workoutLogs = activityLogs.filter(log => 
      log.custom_activity_templates?.activity_type === 'workout' && log.completed
    );

    const exerciseFrequency: Record<string, { count: number; lastDate: string }> = {};
    const muscleGroups: Record<string, number> = {
      upper: 0,
      lower: 0,
      core: 0,
      cardio: 0,
    };

    workoutLogs.forEach(log => {
      const exercises = extractExercisesFromTemplate(log.custom_activity_templates?.exercises);
      exercises.forEach((ex: any) => {
        if (!exerciseFrequency[ex.name]) {
          exerciseFrequency[ex.name] = { count: 0, lastDate: '' };
        }
        exerciseFrequency[ex.name].count++;
        exerciseFrequency[ex.name].lastDate = log.entry_date;

        const type = ex.type?.toLowerCase() || 'strength';
        if (type === 'cardio') muscleGroups.cardio++;
        else if (['squats', 'lunges', 'deadlifts', 'leg'].some(k => ex.name?.toLowerCase().includes(k))) muscleGroups.lower++;
        else if (['press', 'curl', 'row', 'pull'].some(k => ex.name?.toLowerCase().includes(k))) muscleGroups.upper++;
        else muscleGroups.core++;
      });
    });

    const daysSinceLastWorkout = workoutLogs.length > 0 
      ? Math.floor((Date.now() - new Date(workoutLogs[0].entry_date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Build recovery-aware system prompt
    const systemPrompt = `You are an elite fitness coach AI that creates personalized, recovery-aware workout recommendations for baseball/softball athletes.

CRITICAL CONTEXT - RECOVERY STATUS:
${recoveryContext ? `
- Sleep Quality: ${recoveryContext.sleepQuality ?? 'Unknown'}/5 ${(recoveryContext.sleepQuality ?? 5) <= 2 ? '⚠️ LOW' : ''}
- Stress Level: ${recoveryContext.stressLevel ?? 'Unknown'}/5 ${(recoveryContext.stressLevel ?? 1) >= 4 ? '⚠️ HIGH' : ''}
- Physical Readiness: ${recoveryContext.physicalReadiness ?? 'Unknown'}/5 ${(recoveryContext.physicalReadiness ?? 5) <= 2 ? '⚠️ LOW' : ''}
- Perceived Recovery: ${recoveryContext.perceivedRecovery ?? 'Unknown'}/5 ${(recoveryContext.perceivedRecovery ?? 5) <= 2 ? '⚠️ LOW' : ''}
- Pain Areas: ${formatPainAreasForPrompt(recoveryContext.painAreas || [], recoveryContext.painScales)}
- System Recovery Recommendation: ${recoveryContext.suggestRecovery ? `YES - ${recoveryContext.recoveryReason}` : 'No immediate concerns'}
` : 'No check-in data available - provide balanced recommendations.'}

YOUR RESPONSE STRATEGY:
${recoveryWarning?.severity === 'high' ? `
⚠️ HIGH RECOVERY CONCERN DETECTED
1. Lead with a recovery-focused workout as the FIRST recommendation
2. Provide ONE lighter alternative to standard training
3. Explicitly avoid exercises that stress reported pain areas
4. Reduce overall volume and intensity in all recommendations
` : recoveryWarning?.severity === 'moderate' ? `
⚡ MODERATE RECOVERY CONCERN
1. Include at least ONE recovery/mobility option
2. Reduce intensity by 20-30% in strength recommendations
3. Add extra rest between exercises
4. Note pain areas in reasoning and avoid aggravating exercises
` : `
✅ RECOVERY STATUS OK
Provide standard progressive recommendations based on training history.
`}

SUPERSET GUIDANCE:
When appropriate AND recovery status allows, group 2-3 complementary exercises into supersets.
Good superset pairings:
- Push/Pull (e.g., Bench Press + Rows)
- Upper/Lower (e.g., Shoulder Press + Lunges)
- Strength/Core (e.g., Deadlifts + Planks)
DO NOT use supersets if recovery is compromised or pain areas are involved.

PAIN AREA EXERCISE RESTRICTIONS:
${recoveryContext?.painAreas?.length ? `
The athlete has reported pain in these areas. DO NOT recommend exercises that directly stress these regions:
${recoveryContext.painAreas.map(area => `- ${area.replace(/_/g, ' ')}`).join('\n')}
` : 'No pain restrictions.'}

Always respond using the recommend_workouts function. Include 2-3 recommendations total, with recovery options if warranted.`;

    const userPrompt = `Based on my workout history and current recovery status, please recommend 2-3 workouts:

TRAINING HISTORY (Last 30 Days):
- Total workouts completed: ${workoutLogs.length}
- Days since last workout: ${daysSinceLastWorkout ?? 'N/A (no recent workouts)'}
- Muscle group distribution: Upper=${muscleGroups.upper}, Lower=${muscleGroups.lower}, Core=${muscleGroups.core}, Cardio=${muscleGroups.cardio}
- Most frequent exercises: ${Object.entries(exerciseFrequency).sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([name, data]) => `${name} (${data.count}x)`).join(', ') || 'None recorded'}

${recoveryWarning ? `
⚠️ RECOVERY ALERT: ${recoveryWarning.reason}
AI Suggestions: ${recoveryWarning.suggestions.join('. ')}
` : ''}

Please create personalized workout recommendations that respect my current recovery state and pain areas.`;

    // Call Lovable AI for recommendations
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_workouts",
              description: "Return 2-3 personalized, recovery-aware workout recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique ID for the recommendation" },
                        name: { type: "string", description: "Descriptive workout name" },
                        focus: { 
                          type: "string", 
                          enum: ["strength", "cardio", "recovery", "balanced"],
                          description: "Primary focus of the workout"
                        },
                        exercises: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              name: { type: "string" },
                              type: { type: "string", enum: ["strength", "cardio", "flexibility", "plyometric", "baseball", "core"] },
                              sets: { type: "number" },
                              reps: { type: "number" },
                              durationSeconds: { type: "number" },
                              restSeconds: { type: "number" },
                              supersetGroupId: { type: "string" },
                              supersetOrder: { type: "number" }
                            },
                            required: ["id", "name", "type"]
                          }
                        },
                        reasoning: { 
                          type: "string", 
                          description: "Brief explanation including recovery considerations and any pain area accommodations" 
                        },
                        estimatedDuration: { type: "number", description: "Estimated duration in minutes" },
                        confidence: { type: "number", description: "Confidence score 0-1" },
                        isLighterAlternative: { 
                          type: "boolean", 
                          description: "True if this is a lighter version for poor recovery days" 
                        }
                      },
                      required: ["id", "name", "focus", "exercises", "reasoning", "estimatedDuration", "confidence"]
                    }
                  }
                },
                required: ["recommendations"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "recommend_workouts" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[recommend-workout] AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limits exceeded, please try again later.",
          recommendations: [],
          recoveryWarning: recoveryWarning || undefined,
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Payment required, please add funds to your Lovable AI workspace.",
          recommendations: [],
          recoveryWarning: recoveryWarning || undefined,
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("[recommend-workout] AI Response received, parsing...");

    // Extract recommendations from tool call
    let recommendations: WorkoutRecommendation[] = [];
    
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        recommendations = parsed.recommendations || [];
      } catch (e) {
        console.error("[recommend-workout] Failed to parse tool call arguments:", e);
      }
    }

    // Fallback recommendations if AI doesn't return any
    if (recommendations.length === 0) {
      // Recovery-aware fallback based on context
      if (recoveryWarning?.severity === 'high') {
        recommendations = [
          {
            id: "recovery-focus-1",
            name: "Gentle Recovery Flow",
            focus: "recovery",
            exercises: [
              { id: "foam-roll-1", name: "Full Body Foam Rolling", type: "flexibility", durationSeconds: 300 },
              { id: "cat-cow-1", name: "Cat-Cow Stretches", type: "flexibility", sets: 2, reps: 10 },
              { id: "hip-circles-1", name: "Hip Circles", type: "flexibility", sets: 2, reps: 10 },
              { id: "light-walk-1", name: "Light Walking", type: "cardio", durationSeconds: 600 },
            ],
            reasoning: "Based on your check-in, your body needs recovery. This gentle session promotes blood flow without adding training stress.",
            estimatedDuration: 25,
            confidence: 0.9,
            isLighterAlternative: true,
          },
        ];
      } else {
        recommendations = [
          {
            id: "default-1",
            name: "Full Body Strength",
            focus: "strength",
            exercises: [
              { id: "squats-1", name: "Squats", type: "strength", sets: 4, reps: 8, restSeconds: 120 },
              { id: "bench-1", name: "Bench Press", type: "strength", sets: 3, reps: 10, restSeconds: 90 },
              { id: "rows-1", name: "Barbell Rows", type: "strength", sets: 3, reps: 10, restSeconds: 90 },
              { id: "lunges-1", name: "Lunges", type: "strength", sets: 3, reps: 12, restSeconds: 60 },
            ],
            reasoning: "A balanced full-body workout to build overall strength and muscle.",
            estimatedDuration: 45,
            confidence: 0.8,
          },
          {
            id: "default-2",
            name: "HIIT Cardio Blast",
            focus: "cardio",
            exercises: [
              { id: "burpees-1", name: "Burpees", type: "cardio", durationSeconds: 45, restSeconds: 15 },
              { id: "mountain-1", name: "Mountain Climbers", type: "cardio", durationSeconds: 45, restSeconds: 15 },
              { id: "jacks-1", name: "Jumping Jacks", type: "cardio", durationSeconds: 45, restSeconds: 15 },
              { id: "highknees-1", name: "High Knees", type: "cardio", durationSeconds: 45, restSeconds: 15 },
            ],
            reasoning: "High-intensity interval training to boost cardiovascular fitness and burn calories.",
            estimatedDuration: 25,
            confidence: 0.8,
          },
        ];
      }
    }

    // Separate lighter alternatives from main recommendations
    const lighterAlternatives = recommendations.filter(r => r.isLighterAlternative);
    const mainRecommendations = recommendations.filter(r => !r.isLighterAlternative);

    console.log(`[recommend-workout] Returning ${mainRecommendations.length} recommendations, ${lighterAlternatives.length} lighter alternatives`);

    return new Response(JSON.stringify({ 
      recommendations: mainRecommendations.length > 0 ? mainRecommendations : recommendations,
      lighterAlternatives: lighterAlternatives.length > 0 ? lighterAlternatives : undefined,
      recoveryWarning: recoveryWarning || undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[recommend-workout] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      recommendations: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
