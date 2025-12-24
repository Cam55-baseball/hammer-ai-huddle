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

interface Exercise {
  id: string;
  name: string;
  type: string;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds?: number;
}

interface WorkoutRecommendation {
  id: string;
  name: string;
  focus: 'strength' | 'cardio' | 'recovery' | 'balanced';
  exercises: Exercise[];
  reasoning: string;
  estimatedDuration: number;
  confidence: number;
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { activityLogs } = await req.json() as { activityLogs: ActivityLog[] };

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
      const exercises = log.custom_activity_templates?.exercises || [];
      exercises.forEach((ex: any) => {
        if (!exerciseFrequency[ex.name]) {
          exerciseFrequency[ex.name] = { count: 0, lastDate: '' };
        }
        exerciseFrequency[ex.name].count++;
        exerciseFrequency[ex.name].lastDate = log.entry_date;

        // Track muscle groups
        const type = ex.type?.toLowerCase() || 'strength';
        if (type === 'cardio') muscleGroups.cardio++;
        else if (['squats', 'lunges', 'deadlifts', 'leg'].some(k => ex.name?.toLowerCase().includes(k))) muscleGroups.lower++;
        else if (['press', 'curl', 'row', 'pull'].some(k => ex.name?.toLowerCase().includes(k))) muscleGroups.upper++;
        else muscleGroups.core++;
      });
    });

    // Build analysis summary for AI
    const analysisSummary = {
      totalWorkouts: workoutLogs.length,
      exerciseFrequency,
      muscleGroupBalance: muscleGroups,
      daysSinceLastWorkout: workoutLogs.length > 0 
        ? Math.floor((Date.now() - new Date(workoutLogs[0].entry_date).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    };

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
          {
            role: "system",
            content: `You are a fitness coach AI that creates personalized workout recommendations. 
Analyze the user's workout history and create 2-3 workout recommendations.
Consider:
- Muscle group balance (don't overtrain one area)
- Recovery time between similar exercises
- Progressive overload principles
- User's exercise preferences based on frequency

Always respond using the recommend_workouts function.`
          },
          {
            role: "user",
            content: `Based on my workout history analysis, please recommend 2-3 workouts:

Analysis Summary:
- Total workouts in last 30 days: ${analysisSummary.totalWorkouts}
- Days since last workout: ${analysisSummary.daysSinceLastWorkout ?? 'N/A (no recent workouts)'}
- Muscle group distribution: Upper=${muscleGroups.upper}, Lower=${muscleGroups.lower}, Core=${muscleGroups.core}, Cardio=${muscleGroups.cardio}
- Most frequent exercises: ${Object.entries(exerciseFrequency).sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([name, data]) => `${name} (${data.count}x)`).join(', ') || 'None recorded'}

Please create personalized workout recommendations based on this data. If there's limited history, provide general balanced workouts suitable for beginners.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_workouts",
              description: "Return 2-3 personalized workout recommendations based on user's activity history",
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
                              type: { type: "string", enum: ["strength", "cardio", "flexibility", "plyometric"] },
                              sets: { type: "number" },
                              reps: { type: "number" },
                              durationSeconds: { type: "number" },
                              restSeconds: { type: "number" }
                            },
                            required: ["id", "name", "type"]
                          }
                        },
                        reasoning: { type: "string", description: "Brief explanation why this workout is recommended" },
                        estimatedDuration: { type: "number", description: "Estimated duration in minutes" },
                        confidence: { type: "number", description: "Confidence score 0-1" }
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
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limits exceeded, please try again later.",
          recommendations: [] 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Payment required, please add funds to your Lovable AI workspace.",
          recommendations: [] 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

    // Extract recommendations from tool call
    let recommendations: WorkoutRecommendation[] = [];
    
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        recommendations = parsed.recommendations || [];
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Fallback recommendations if AI doesn't return any
    if (recommendations.length === 0) {
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

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in recommend-workout function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      recommendations: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
