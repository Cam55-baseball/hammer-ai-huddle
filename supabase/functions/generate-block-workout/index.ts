import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PersonalizationGoals {
  bodyGoal?: { type: string; targetWeightLbs?: number };
  trainingIntent?: string[];
  painAreas?: string[];
  performanceGoals: string[];
  position?: string;
  sport?: string;
}

interface GeneratedExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  rest?: number;
  tempo?: string;
  velocity_intent?: 'slow' | 'moderate' | 'fast' | 'ballistic';
  cns_demand?: 'low' | 'medium' | 'high';
  coaching_cues?: string[];
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Block type descriptions for AI context
const BLOCK_DESCRIPTIONS: Record<string, string> = {
  activation: 'Wake up muscles and nervous system - low intensity prep exercises to increase blood flow and neural readiness',
  elastic_prep: 'Prepare tendons and fascia for bouncy work - progressive elastic loading to prime the stretch-shortening cycle',
  cns_primer: 'Short explosive bursts to wake up fast-twitch fibers - high velocity, low volume neural activation',
  strength_output: 'Main lifting work - primary strength exercises with appropriate loading and volume',
  power_speed: 'Maximum velocity and power output - explosive movements emphasizing rate of force development',
  capacity: 'Work capacity and conditioning - sustained effort to build metabolic and muscular endurance',
  skill_transfer: 'Sport-specific movement patterns - exercises that directly transfer to game performance',
  decompression: 'Restore tissue glide and length - mobility and release work to reduce accumulated tension',
  recovery: 'Cool down and restore - parasympathetic activation and gentle movement to aid recovery',
  custom: 'Custom training block - exercises based on specified goals',
};

// Focus option descriptions for better AI generation
const FOCUS_DESCRIPTIONS: Record<string, string> = {
  // Activation
  full_body: 'Full body activation targeting all major muscle groups',
  lower_body: 'Lower body focus - glutes, quads, hamstrings, hip flexors',
  upper_body: 'Upper body focus - shoulders, chest, back, arms',
  core_hips: 'Core and hip complex - deep stabilizers and hip mobility',
  sport_specific: 'Sport-specific activation patterns for baseball/softball',
  
  // Elastic Prep
  bouncy_reactive: 'Bouncy/reactive elasticity - quick ground contacts, pogo jumps',
  rotational: 'Rotational elasticity - med ball throws, rotational hops',
  linear: 'Linear elasticity - forward/backward jumping patterns',
  multi_directional: 'Multi-directional elasticity - lateral and diagonal patterns',
  
  // CNS Primer
  light_spark: 'Light CNS spark - gentle awakening, 60-70% effort',
  moderate_wakeup: 'Moderate wake-up - 75-85% effort, moderate volume',
  full_send: 'Full send primer - 90-100% effort, very low volume',
  
  // Strength Output
  max_strength: 'Maximum strength - heavy loads (85%+), low reps (1-5)',
  hypertrophy: 'Hypertrophy focus - moderate loads (65-80%), higher reps (8-12)',
  power: 'Power development - moderate loads (50-70%) with maximum velocity',
  strength_endurance: 'Strength endurance - lighter loads, higher reps (15-20+)',
  
  // Power/Speed
  explosive_power: 'Explosive power - maximal force production in minimal time',
  speed_strength: 'Speed-strength - lighter loads moved as fast as possible',
  reactive_power: 'Reactive power - utilizing stretch-shortening cycle',
  rotational_power: 'Rotational power - baseball/softball specific rotation patterns',
  
  // Capacity
  aerobic_base: 'Aerobic base building - sustained low-moderate intensity',
  lactate_tolerance: 'Lactate tolerance - repeated high-intensity efforts',
  work_capacity: 'General work capacity - ability to handle training volume',
  hiit: 'High-intensity interval training - short bursts with rest periods',
  
  // Skill Transfer
  throwing_mechanics: 'Throwing mechanics transfer - arm action, hip-shoulder separation',
  hitting_mechanics: 'Hitting mechanics transfer - rotational power, bat path',
  defensive_agility: 'Defensive agility - first step quickness, lateral movement',
  base_running: 'Base running - acceleration, change of direction, reads',
  
  // Decompression
  hips_spine: 'Hips and spine decompression - psoas, QL, spinal mobility',
  shoulders_thoracic: 'Shoulders and thoracic spine - rotator cuff, t-spine rotation',
  
  // Recovery
  active_recovery: 'Active recovery - light movement to promote blood flow',
  mobility_focus: 'Mobility-focused recovery - joint range of motion',
  breathwork: 'Breathwork and parasympathetic - down-regulation techniques',
  light_movement: 'Light movement patterns - gentle, restorative exercises',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      blockType, 
      blockIntent, 
      blockFocus, 
      personalize = false, 
      goals, 
      existingExercises = [],
      sport = 'baseball' 
    } = await req.json() as { 
      blockType: string;
      blockIntent: string;
      blockFocus: string;
      personalize?: boolean;
      goals?: PersonalizationGoals;
      existingExercises?: string[];
      sport?: string;
    };

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating block workout:", { blockType, blockIntent, blockFocus, personalize, sport });
    if (personalize && goals) {
      console.log("Athlete goals:", goals);
    }

    const blockDescription = BLOCK_DESCRIPTIONS[blockType] || BLOCK_DESCRIPTIONS.custom;
    const focusDescription = FOCUS_DESCRIPTIONS[blockFocus] || blockFocus;

    // Build personalization context
    let personalizedContext = '';
    if (personalize && goals) {
      personalizedContext = `

ATHLETE PERSONALIZATION (IMPORTANT - Customize exercises based on this):
- Body Goal: ${goals.bodyGoal?.type || 'general performance'}
- Training Intent Today: ${goals.trainingIntent?.join(', ') || 'general training'}
- Position: ${goals.position || 'athlete'}
- Performance Goals: ${goals.performanceGoals?.join(', ') || 'overall athletic development'}
${goals.painAreas?.length ? `- AVOID stressing these areas (athlete reported discomfort): ${goals.painAreas.join(', ')}` : ''}

Customize exercises to:
1. Support their body goal (${goals.bodyGoal?.type || 'performance'})
2. Prepare for their stated training intent
3. ${goals.painAreas?.length ? `AVOID exercises that stress: ${goals.painAreas.join(', ')}` : 'Include comprehensive movement patterns'}
4. Target movements supporting: ${goals.performanceGoals?.slice(0, 3).join(', ')}
5. Consider position-specific needs (${goals.position || 'general athlete'})`;
    }

    // Existing exercises to avoid duplicates
    const existingContext = existingExercises.length > 0 
      ? `\nEXISTING EXERCISES IN BLOCK (avoid duplicates): ${existingExercises.join(', ')}`
      : '';

    // Call Lovable AI for exercise generation
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
            content: `You are an elite ${sport} strength and conditioning specialist generating exercises for a specific training block.

BLOCK CONTEXT:
- Block Type: ${blockType.toUpperCase()} - ${blockDescription}
- Block Intent: ${blockIntent}
- Athlete's Focus: ${focusDescription}
${personalizedContext}${existingContext}

EXERCISE SELECTION GUIDELINES:
1. Generate 3-6 exercises appropriate for this specific block type and focus
2. Each exercise should have clear sets, reps, and rest periods
3. Include tempo notation for strength/power blocks (e.g., "3-1-2-0" = 3s eccentric, 1s pause, 2s concentric, 0s top)
4. Assign velocity intent: slow (controlled), moderate, fast, ballistic
5. Assign CNS demand: low, medium, high
6. Include 1-2 brief coaching cues per exercise
7. Exercises should progressively prepare athletes for the block's intent
8. For ${sport} athletes, prioritize rotational power, arm health, and athletic movement

BLOCK-SPECIFIC FOCUS:
- Activation: Light, movement-prep exercises (2 sets, 8-12 reps)
- Elastic Prep: Progressive bouncing/reactive (2-3 sets, 5-8 reps)
- CNS Primer: Short, explosive (2-3 sets, 3-5 reps, full recovery)
- Strength Output: Main lifts with appropriate loading (3-5 sets, varies by focus)
- Power/Speed: Maximum velocity movements (3-4 sets, 3-6 reps, full rest)
- Capacity: Higher volume, shorter rest (3-4 sets, 12-20 reps)
- Skill Transfer: Sport-specific patterns (2-3 sets, 8-10 reps)
- Decompression: Holds and mobility (2 sets, 30-60 seconds or 8-10 reps)
- Recovery: Gentle movement (2 sets, 10-15 reps or timed)

Always respond using the generate_block_exercises function.`
          },
          {
            role: "user",
            content: `Generate exercises for a ${blockType} block with ${blockFocus} focus for a ${sport} athlete.
${personalize ? '\nThis is a PERSONALIZED request - include reasoning that mentions the athlete\'s specific goals and any modifications made for their needs.' : ''}

Return 3-6 exercises that are optimal for this block type and focus.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_block_exercises",
              description: "Generate exercises for a specific training block",
              parameters: {
                type: "object",
                properties: {
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique ID for the exercise" },
                        name: { type: "string", description: "Exercise name" },
                        sets: { type: "number", description: "Number of sets" },
                        reps: { type: "number", description: "Number of reps (or duration in seconds for timed exercises)" },
                        rest: { type: "number", description: "Rest time in seconds" },
                        tempo: { type: "string", description: "Tempo notation (e.g., '3-1-2-0')" },
                        velocity_intent: { 
                          type: "string", 
                          enum: ["slow", "moderate", "fast", "ballistic"],
                          description: "Intended movement velocity"
                        },
                        cns_demand: { 
                          type: "string", 
                          enum: ["low", "medium", "high"],
                          description: "Central nervous system demand level"
                        },
                        coaching_cues: {
                          type: "array",
                          items: { type: "string" },
                          description: "1-2 brief coaching cues for the exercise"
                        }
                      },
                      required: ["id", "name", "sets", "reps"]
                    }
                  },
                  reasoning: { 
                    type: "string", 
                    description: "Brief explanation of exercise selection, mentioning personalization if applicable" 
                  },
                  estimatedDuration: { 
                    type: "number", 
                    description: "Estimated duration in minutes for this block" 
                  }
                },
                required: ["exercises", "reasoning", "estimatedDuration"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_block_exercises" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limits exceeded, please try again later.",
          exercises: [] 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Payment required, please add funds to your Lovable AI workspace.",
          exercises: [] 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

    // Extract exercises from tool call
    interface BlockWorkoutResult {
      exercises: GeneratedExercise[];
      reasoning: string;
      estimatedDuration: number;
    }
    
    let result: BlockWorkoutResult = { exercises: [], reasoning: '', estimatedDuration: 10 };
    
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Fallback exercises if AI doesn't return any
    if (!result.exercises || result.exercises.length === 0) {
      result = {
        exercises: [
          { 
            id: 'fallback-1', 
            name: 'Goblet Squat', 
            sets: 3, 
            reps: 10, 
            rest: 60,
            tempo: '3-1-2-0',
            velocity_intent: 'moderate',
            cns_demand: 'medium',
            coaching_cues: ['Chest up', 'Knees track over toes']
          },
          { 
            id: 'fallback-2', 
            name: 'Push-Up', 
            sets: 3, 
            reps: 12, 
            rest: 45,
            velocity_intent: 'moderate',
            cns_demand: 'low',
            coaching_cues: ['Core tight', 'Full range of motion']
          },
          { 
            id: 'fallback-3', 
            name: 'Band Pull-Apart', 
            sets: 2, 
            reps: 15, 
            rest: 30,
            velocity_intent: 'moderate',
            cns_demand: 'low',
            coaching_cues: ['Squeeze shoulder blades', 'Control the return']
          },
        ],
        reasoning: `Default exercise selection for ${blockType} block with ${blockFocus} focus.`,
        estimatedDuration: 12,
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-block-workout function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      exercises: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
