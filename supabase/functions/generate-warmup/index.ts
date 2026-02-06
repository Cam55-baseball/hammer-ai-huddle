import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Exercise {
  id: string;
  name: string;
  type: string;
  sets?: number;
  reps?: number;
  duration?: number;
  rest?: number;
}

interface WarmupExercise {
  id: string;
  name: string;
  type: 'flexibility' | 'cardio' | 'baseball';
  duration?: number;
  sets?: number;
  reps?: number;
  rest?: number;
  category: 'general' | 'dynamic' | 'movement-prep' | 'arm-care';
}

interface PersonalizationGoals {
  bodyGoal?: { type: string; targetWeightLbs?: number };
  trainingIntent?: string[];
  painAreas?: string[];
  performanceGoals: string[];
  position?: string;
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exercises, sport = 'baseball', personalize = false, goals } = await req.json() as { 
      exercises: Exercise[]; 
      sport?: string;
      personalize?: boolean;
      goals?: PersonalizationGoals;
    };

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Analyze the workout to determine warmup needs
    const analysis = {
      hasUpperBody: false,
      hasLowerBody: false,
      hasCore: false,
      hasThrowing: false,
      hasHitting: false,
      hasPlyometrics: false,
      exerciseTypes: new Set<string>(),
    };

    exercises.forEach(ex => {
      const name = ex.name.toLowerCase();
      const type = ex.type?.toLowerCase() || 'strength';
      
      analysis.exerciseTypes.add(type);
      
      // Upper body detection
      if (['press', 'curl', 'row', 'pull', 'push', 'shoulder', 'chest', 'back', 'arm'].some(k => name.includes(k))) {
        analysis.hasUpperBody = true;
      }
      // Lower body detection
      if (['squat', 'lunge', 'deadlift', 'leg', 'hip', 'glute', 'calf'].some(k => name.includes(k))) {
        analysis.hasLowerBody = true;
      }
      // Core detection
      if (['plank', 'core', 'ab', 'rotation', 'twist', 'pallof'].some(k => name.includes(k)) || type === 'core') {
        analysis.hasCore = true;
      }
      // Throwing detection
      if (['throw', 'toss', 'pitch', 'band', 'j-band', 'arm care', 'external', 'internal'].some(k => name.includes(k)) || type === 'baseball') {
        analysis.hasThrowing = true;
      }
      // Hitting detection
      if (['swing', 'bat', 'tee', 'soft toss', 'med ball rotational'].some(k => name.includes(k))) {
        analysis.hasHitting = true;
      }
      // Plyometrics detection
      if (['jump', 'bound', 'plyo', 'explosive', 'box'].some(k => name.includes(k)) || type === 'plyometric') {
        analysis.hasPlyometrics = true;
      }
    });

    console.log("Workout analysis:", analysis);
    console.log("Personalization enabled:", personalize);
    if (personalize && goals) {
      console.log("Athlete goals:", goals);
    }

    // Build personalization context for the AI
    let personalizedContext = '';
    if (personalize && goals) {
      personalizedContext = `

ATHLETE PERSONALIZATION (IMPORTANT - Customize warmup based on this):
- Body Goal: ${goals.bodyGoal?.type || 'general performance'}
- Training Focus Today: ${goals.trainingIntent?.join(', ') || 'general training'}
- Position: ${goals.position || 'athlete'}
- Performance Goals: ${goals.performanceGoals?.join(', ') || 'overall athletic development'}
${goals.painAreas?.length ? `- AVOID stressing these areas (athlete reported discomfort): ${goals.painAreas.join(', ')}` : ''}

Customize the warmup to:
1. ${goals.bodyGoal?.type === 'cut' ? 'Include slightly more cardio activation to support fat loss while preserving strength' : 'Optimize for maximum performance output'}
2. Prepare specifically for their stated training intent (${goals.trainingIntent?.[0] || 'general'})
3. ${goals.painAreas?.length ? `AVOID or modify exercises that stress: ${goals.painAreas.join(', ')} - provide alternatives` : 'Include full-body preparation'}
4. Target movements that support their performance goals: ${goals.performanceGoals?.slice(0, 3).join(', ')}
5. Consider their position-specific needs (${goals.position || 'general athlete'})`;
    }

    // Call Lovable AI for warmup generation
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
            content: `You are a ${sport} training specialist creating sport-specific warmup routines.
Create warmups that prepare athletes for their specific workout by targeting the relevant muscle groups and movement patterns.

Warmup structure:
1. General Activation (2-3 exercises) - Get blood flowing, raise heart rate
2. Dynamic Stretches (2-3 exercises) - Movement-based stretching for mobility
3. Movement Prep (2-3 exercises) - Sport-specific movements that mirror the workout

For ${sport} athletes, always consider:
- Rotational mobility for hitting and throwing
- Shoulder/arm activation if throwing is involved
- Hip mobility for athletic movements
- Core activation for power transfer
${personalizedContext}

Always respond using the generate_warmup function.`
          },
          {
            role: "user",
            content: `Create a warmup routine for a ${sport} athlete based on this workout analysis:

Workout contains:
- Upper body exercises: ${analysis.hasUpperBody ? 'Yes' : 'No'}
- Lower body exercises: ${analysis.hasLowerBody ? 'Yes' : 'No'}  
- Core exercises: ${analysis.hasCore ? 'Yes' : 'No'}
- Throwing/arm care: ${analysis.hasThrowing ? 'Yes' : 'No'}
- Hitting drills: ${analysis.hasHitting ? 'Yes' : 'No'}
- Plyometrics: ${analysis.hasPlyometrics ? 'Yes' : 'No'}
- Exercise types: ${Array.from(analysis.exerciseTypes).join(', ')}

Exercises in workout: ${exercises.map(e => e.name).join(', ')}
${personalize ? `\nIMPORTANT: This is a PERSONALIZED request. Include reasoning that mentions the athlete's specific goals and any modifications made for their needs.` : ''}

Generate a 5-8 exercise warmup that prepares them specifically for this workout.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_warmup",
              description: "Generate a sport-specific warmup routine",
              parameters: {
                type: "object",
                properties: {
                  warmupExercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique ID for the exercise" },
                        name: { type: "string", description: "Exercise name" },
                        type: { type: "string", enum: ["flexibility", "cardio", "baseball"] },
                        category: { 
                          type: "string", 
                          enum: ["general", "dynamic", "movement-prep", "arm-care"],
                          description: "Warmup phase category"
                        },
                        duration: { type: "number", description: "Duration in seconds (for timed exercises)" },
                        sets: { type: "number", description: "Number of sets" },
                        reps: { type: "number", description: "Number of reps" },
                        rest: { type: "number", description: "Rest time in seconds" }
                      },
                      required: ["id", "name", "type", "category"]
                    }
                  },
                  reasoning: { type: "string", description: "Brief explanation of why this warmup was chosen, mentioning personalization if applicable" },
                  estimatedDuration: { type: "number", description: "Total warmup duration in minutes" }
                },
                required: ["warmupExercises", "reasoning", "estimatedDuration"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_warmup" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limits exceeded, please try again later.",
          warmupExercises: [] 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Payment required, please add funds to your Lovable AI workspace.",
          warmupExercises: [] 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

    // Extract warmup from tool call
    interface WarmupResult {
      warmupExercises: WarmupExercise[];
      reasoning: string;
      estimatedDuration: number;
    }
    
    let result: WarmupResult = { warmupExercises: [], reasoning: '', estimatedDuration: 8 };
    
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Fallback warmup if AI doesn't return any
    if (!result.warmupExercises || result.warmupExercises.length === 0) {
      const fallbackExercises: WarmupExercise[] = [
        { id: 'warmup-1', name: 'Jumping Jacks', type: 'cardio', category: 'general', duration: 60, rest: 0 },
        { id: 'warmup-2', name: 'High Knees', type: 'cardio', category: 'general', duration: 30, rest: 0 },
        { id: 'warmup-3', name: 'Hip Circles', type: 'flexibility', category: 'dynamic', duration: 30, rest: 0 },
        { id: 'warmup-4', name: 'Arm Circles', type: 'flexibility', category: 'dynamic', sets: 2, reps: 15, rest: 0 },
        { id: 'warmup-5', name: 'Leg Swings', type: 'flexibility', category: 'dynamic', duration: 30, rest: 0 },
        { id: 'warmup-6', name: 'Band Pull-Aparts', type: 'baseball', category: 'arm-care', sets: 2, reps: 10, rest: 0 },
      ];
      result = {
        warmupExercises: fallbackExercises,
        reasoning: `Default warmup routine for ${sport} athletes covering general activation, dynamic mobility, and arm care.`,
        estimatedDuration: 8,
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-warmup function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      warmupExercises: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
