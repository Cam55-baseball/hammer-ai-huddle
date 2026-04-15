import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WeekWorkout {
  day: string;
  type: string;
  estimated_duration: number;
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    weight?: number;
    tempo?: string;
    rest_seconds?: number;
    velocity_intent?: string;
    cns_demand?: string;
    coaching_cues?: string[];
  }>;
}

interface GeneratedBlock {
  goal: string;
  weeks: Array<{
    week: number;
    focus: string;
    workouts: WeekWorkout[];
  }>;
}

// ─── Deterministic scheduling engine ───
function scheduleBlockWorkouts(
  weeks: GeneratedBlock['weeks'],
  startDate: Date,
  availableDays: number[]
): Array<{
  week_number: number;
  day_label: string;
  scheduled_date: string;
  workout_type: string;
  estimated_duration: number;
  exercises: WeekWorkout['exercises'];
}> {
  const scheduled: Array<{
    week_number: number;
    day_label: string;
    scheduled_date: string;
    workout_type: string;
    estimated_duration: number;
    exercises: WeekWorkout['exercises'];
  }> = [];

  // Sort available days for consistent ordering
  const sortedDays = [...availableDays].sort((a, b) => a - b);

  for (const week of weeks) {
    const weekOffset = (week.week - 1) * 7;
    let workoutIdx = 0;

    for (const workout of week.workouts) {
      // Map each workout to the next available day
      const targetDay = sortedDays[workoutIdx % sortedDays.length];
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + weekOffset);

      // Find the next occurrence of targetDay in this week
      const currentDay = weekStart.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget < 0) daysUntilTarget += 7;

      const scheduledDate = new Date(weekStart);
      scheduledDate.setDate(scheduledDate.getDate() + daysUntilTarget);

      // Enforce rest spacing: no 3 consecutive heavy days
      if (scheduled.length >= 2) {
        const prev1 = new Date(scheduled[scheduled.length - 1].scheduled_date);
        const prev2 = new Date(scheduled[scheduled.length - 2].scheduled_date);
        const thisDate = scheduledDate;

        const diff1 = Math.abs(thisDate.getTime() - prev1.getTime()) / (1000 * 60 * 60 * 24);
        const diff2 = Math.abs(prev1.getTime() - prev2.getTime()) / (1000 * 60 * 60 * 24);

        // If all 3 would be consecutive days AND all high CNS
        if (diff1 <= 1 && diff2 <= 1) {
          const prevHighCNS = workout.exercises.some(e => e.cns_demand === 'high');
          if (prevHighCNS) {
            // Push forward 1 day
            scheduledDate.setDate(scheduledDate.getDate() + 1);
          }
        }
      }

      const dateStr = scheduledDate.toISOString().split('T')[0];
      scheduled.push({
        week_number: week.week,
        day_label: workout.day || DAY_NAMES[scheduledDate.getDay()],
        scheduled_date: dateStr,
        workout_type: workout.type,
        estimated_duration: workout.estimated_duration || 45,
        exercises: workout.exercises,
      });

      workoutIdx++;
    }
  }

  return scheduled;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Entitlement check
    const { data: ownerRole } = await supabase
      .from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'owner').eq('status', 'active')
      .maybeSingle();

    if (!ownerRole) {
      const { data: subscription } = await supabase
        .from('subscriptions').select('status, subscribed_modules')
        .eq('user_id', user.id).maybeSingle();
      const hasActiveModule = subscription?.status === 'active' && (subscription?.subscribed_modules?.length ?? 0) > 0;
      if (!hasActiveModule) {
        return new Response(JSON.stringify({ error: 'Subscription required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch training preferences
    const { data: prefs } = await supabase
      .from('training_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const goal = prefs?.goal || 'general strength';
    const availability = (prefs?.availability as { days?: number[] })?.days || [1, 3, 5];
    const equipment = prefs?.equipment || [];
    const injuries = prefs?.injuries || [];
    const experienceLevel = prefs?.experience_level || 'intermediate';

    // Fetch athlete context
    const { data: bodyGoal } = await supabase
      .from('athlete_body_goals').select('goal_type, target_weight_lbs')
      .eq('user_id', user.id).eq('is_active', true).maybeSingle();

    const { data: mpiSettings } = await supabase
      .from('athlete_mpi_settings').select('primary_position, sport')
      .eq('user_id', user.id).maybeSingle();

    const sport = mpiSettings?.sport || 'baseball';
    const position = mpiSettings?.primary_position || 'athlete';

    const { sport: requestSport } = await req.json().catch(() => ({ sport: undefined }));

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const workoutsPerWeek = Math.min(availability.length, 5);

    // Call Lovable AI with tool calling for strict JSON
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
            content: `You are an elite ${sport} strength and conditioning specialist creating a complete 6-week training block.

ATHLETE CONTEXT:
- Goal: ${goal}
- Experience: ${experienceLevel}
- Position: ${position}
- Body Goal: ${bodyGoal?.goal_type || 'performance'}
- Available days per week: ${workoutsPerWeek}
- Equipment: ${JSON.stringify(equipment)}
${(injuries as string[]).length ? `- INJURIES/AVOID: ${(injuries as string[]).join(', ')}` : ''}

PROGRAMMING RULES:
1. Generate exactly 6 weeks of training
2. Each week has exactly ${workoutsPerWeek} workouts
3. Weeks 1-2: Volume accumulation (higher reps, moderate weight)
4. Weeks 3-4: Intensification (moderate reps, heavier weight)
5. Week 5: Peak/overreach (highest intensity)
6. Week 6: Deload (reduced volume and intensity by 40-50%)
7. Each workout needs 3-6 exercises with sets, reps, and coaching cues
8. Assign cns_demand (low/medium/high) to each exercise
9. Avoid scheduling consecutive high-CNS exercises without medium/low buffer
10. For ${sport} athletes, prioritize rotational power, arm health, and posterior chain

Always respond using the generate_training_block function.`
          },
          {
            role: "user",
            content: `Generate a complete 6-week ${goal} training block for a ${experienceLevel} ${sport} ${position}. ${workoutsPerWeek} workouts per week.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_training_block",
              description: "Generate a complete 6-week periodized training block",
              parameters: {
                type: "object",
                properties: {
                  goal: { type: "string" },
                  weeks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        week: { type: "number" },
                        focus: { type: "string" },
                        workouts: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              day: { type: "string" },
                              type: { type: "string" },
                              estimated_duration: { type: "number" },
                              exercises: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    name: { type: "string" },
                                    sets: { type: "number" },
                                    reps: { type: "number" },
                                    weight: { type: "number" },
                                    tempo: { type: "string" },
                                    rest_seconds: { type: "number" },
                                    velocity_intent: { type: "string", enum: ["slow", "moderate", "fast", "ballistic"] },
                                    cns_demand: { type: "string", enum: ["low", "medium", "high"] },
                                    coaching_cues: { type: "array", items: { type: "string" } }
                                  },
                                  required: ["name", "sets", "reps"],
                                  additionalProperties: false
                                }
                              }
                            },
                            required: ["day", "type", "exercises"],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ["week", "focus", "workouts"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["goal", "weeks"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_training_block" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('Invalid AI response — no tool call returned');
    }

    const generated: GeneratedBlock = JSON.parse(toolCall.function.arguments);

    if (!generated.weeks || generated.weeks.length === 0) {
      throw new Error('AI returned empty training block');
    }

    // Deterministic scheduling
    const startDate = new Date();
    // Start on next Monday
    const dayOfWeek = startDate.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
    startDate.setDate(startDate.getDate() + daysUntilMonday);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 41); // 6 weeks

    const scheduledWorkouts = scheduleBlockWorkouts(generated.weeks, startDate, availability);

    // Insert training_block
    const { data: block, error: blockErr } = await supabase
      .from('training_blocks')
      .insert({
        user_id: user.id,
        goal: generated.goal || goal,
        sport: requestSport || sport,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
        generation_metadata: {
          model: 'google/gemini-2.5-flash',
          preferences: { goal, experienceLevel, equipment, injuries, position },
          generated_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (blockErr || !block) {
      console.error("Failed to insert training block:", blockErr);
      throw new Error('Failed to create training block');
    }

    // Insert workouts + exercises
    for (const sw of scheduledWorkouts) {
      const { data: workout, error: workoutErr } = await supabase
        .from('block_workouts')
        .insert({
          block_id: block.id,
          week_number: sw.week_number,
          day_label: sw.day_label,
          scheduled_date: sw.scheduled_date,
          status: 'scheduled',
          workout_type: sw.workout_type,
          estimated_duration: sw.estimated_duration,
        })
        .select('id')
        .single();

      if (workoutErr || !workout) {
        console.error("Failed to insert workout:", workoutErr);
        continue;
      }

      // Insert exercises
      const exerciseRows = sw.exercises.map((ex, idx) => ({
        workout_id: workout.id,
        ordinal: idx,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight || null,
        tempo: ex.tempo || null,
        rest_seconds: ex.rest_seconds || null,
        velocity_intent: ex.velocity_intent || null,
        cns_demand: ex.cns_demand || null,
        coaching_cues: ex.coaching_cues || null,
      }));

      if (exerciseRows.length > 0) {
        const { error: exErr } = await supabase
          .from('block_exercises')
          .insert(exerciseRows);
        if (exErr) console.error("Failed to insert exercises:", exErr);
      }

      // Create calendar event
      await supabase.from('calendar_events').insert({
        user_id: user.id,
        event_date: sw.scheduled_date,
        event_type: 'training_block',
        title: `${sw.workout_type.replace(/_/g, ' ')} — Week ${sw.week_number}`,
        description: `${sw.exercises.length} exercises · ~${sw.estimated_duration} min`,
        sport: requestSport || sport,
        related_id: workout.id,
        color: '#6366f1',
      });
    }

    // Archive any other active blocks for this user
    await supabase
      .from('training_blocks')
      .update({ status: 'archived' })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .neq('id', block.id);

    return new Response(JSON.stringify({
      blockId: block.id,
      totalWorkouts: scheduledWorkouts.length,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in generate-training-block:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
