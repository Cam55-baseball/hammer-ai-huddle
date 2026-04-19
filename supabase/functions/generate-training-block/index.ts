import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WorkoutExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  tempo?: string;
  rest_seconds?: number;
  velocity_intent?: string;
  cns_demand?: string;
  coaching_cues?: string[];
}

interface WeekWorkout {
  day: string;
  type: string;
  estimated_duration: number;
  exercises: WorkoutExercise[];
}

interface GeneratedBlock {
  goal: string;
  weeks: Array<{
    week: number;
    focus: string;
    workouts: WeekWorkout[];
  }>;
}

// ─── Fix #3: Strict AI response validation ───
function validateGeneratedBlock(block: GeneratedBlock, workoutsPerWeek: number): void {
  if (!block.weeks || block.weeks.length !== 6) {
    throw new Error(`AI returned ${block.weeks?.length ?? 0} weeks — exactly 6 required`);
  }

  for (const week of block.weeks) {
    if (!week.workouts || week.workouts.length !== workoutsPerWeek) {
      throw new Error(`Week ${week.week} has ${week.workouts?.length ?? 0} workouts — expected ${workoutsPerWeek}`);
    }

    for (const workout of week.workouts) {
      if (!workout.exercises || workout.exercises.length < 3 || workout.exercises.length > 6) {
        throw new Error(`Workout "${workout.type}" in week ${week.week} has ${workout.exercises?.length ?? 0} exercises — must be 3-6`);
      }

      for (const ex of workout.exercises) {
        if (!ex.name || typeof ex.sets !== 'number' || typeof ex.reps !== 'number' || ex.sets < 1 || ex.reps < 1) {
          throw new Error(`Invalid exercise in week ${week.week}: ${ex.name || 'unnamed'} — sets and reps required and must be > 0`);
        }
      }
    }
  }
}

// ─── Season-aware default schedules (JS getDay format: 0=Sun..6=Sat) ───
const SEASON_DEFAULT_DAYS: Record<string, number[]> = {
  preseason: [1, 2, 3, 4, 5],   // 5 day/wk strength accumulation
  in_season: [1, 3, 5],          // 3 day/wk maintenance, lower CNS
  post_season: [1, 2, 4, 6],     // 4 day/wk recovery + rebuild
};

/**
 * Pick the optimal weekly schedule:
 *   1. Start from the user's stated availability OR a season-phase default.
 *   2. Subtract days that already contain conflicting calendar events
 *      (games, practices, high-CNS custom activities) for the 6-week window.
 *   3. Guarantee at least 2 training days/week so generation never fails.
 */
function pickOptimalSchedule(
  baseDays: number[],
  seasonPhase: string,
  conflictDates: Set<string>,
  startDate: Date
): number[] {
  // Use season default when user hasn't set explicit availability
  const candidate = baseDays.length > 0 ? baseDays : (SEASON_DEFAULT_DAYS[seasonPhase] || [1, 3, 5]);

  // Score each weekday by how many of the 6 weeks it would conflict
  const conflictsByDay = new Map<number, number>();
  for (const day of candidate) {
    let count = 0;
    for (let w = 0; w < 6; w++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + w * 7);
      const offset = (day - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + offset);
      if (conflictDates.has(d.toISOString().split('T')[0])) count++;
    }
    conflictsByDay.set(day, count);
  }

  // Drop a day only if it conflicts ≥4/6 weeks AND we still have ≥2 days left
  const sorted = [...candidate].sort((a, b) => (conflictsByDay.get(a) ?? 0) - (conflictsByDay.get(b) ?? 0));
  const filtered = sorted.filter(d => (conflictsByDay.get(d) ?? 0) < 4);
  return filtered.length >= 2 ? filtered.sort((a, b) => a - b) : candidate.sort((a, b) => a - b);
}

// ─── Fix #5: Spacing-first deterministic scheduling engine ───
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
  exercises: WorkoutExercise[];
}> {
  const sortedDays = [...availableDays].sort((a, b) => a - b);

  // Step 1: Generate ALL valid calendar dates across 6 weeks
  const allDates: Date[] = [];
  for (let weekIdx = 0; weekIdx < 6; weekIdx++) {
    for (const dayNum of sortedDays) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + weekIdx * 7);
      // Find next occurrence of dayNum in this week
      const currentDay = d.getDay();
      let offset = dayNum - currentDay;
      if (offset < 0) offset += 7;
      d.setDate(d.getDate() + offset);
      allDates.push(d);
    }
  }
  // Sort chronologically
  allDates.sort((a, b) => a.getTime() - b.getTime());

  // Step 2: Flatten all workouts in order
  const flatWorkouts: Array<{ weekNum: number; workout: WeekWorkout }> = [];
  for (const week of weeks) {
    for (const workout of week.workouts) {
      flatWorkouts.push({ weekNum: week.week, workout });
    }
  }

  // Step 3: Assign workouts to dates with CNS spacing
  const scheduled: Array<{
    week_number: number;
    day_label: string;
    scheduled_date: string;
    workout_type: string;
    estimated_duration: number;
    exercises: WorkoutExercise[];
    isHighCNS: boolean;
  }> = [];

  let dateIdx = 0;
  for (const { weekNum, workout } of flatWorkouts) {
    if (dateIdx >= allDates.length) {
      // Ran out of available dates — append to end
      const lastDate = allDates[allDates.length - 1];
      const overflow = new Date(lastDate);
      overflow.setDate(overflow.getDate() + 1);
      allDates.push(overflow);
    }

    const isHighCNS = workout.exercises.some(e => e.cns_demand === 'high');
    let assignedDate = allDates[dateIdx];

    // CNS spacing enforcement
    if (isHighCNS && scheduled.length > 0) {
      const prev = scheduled[scheduled.length - 1];
      const prevDate = new Date(prev.scheduled_date);
      const dayDiff = Math.round((assignedDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      // Rule: minimum 1 rest day after HIGH CNS workout
      if (prev.isHighCNS && dayDiff <= 1) {
        dateIdx++;
        if (dateIdx < allDates.length) {
          assignedDate = allDates[dateIdx];
        } else {
          assignedDate = new Date(prevDate);
          assignedDate.setDate(assignedDate.getDate() + 2);
        }
      }

      // Rule: no more than 2 HIGH CNS workouts in any 3-day window
      if (scheduled.length >= 2) {
        const last3Days = scheduled.filter(s => {
          const sd = new Date(s.scheduled_date);
          const diff = Math.round((assignedDate.getTime() - sd.getTime()) / (1000 * 60 * 60 * 24));
          return diff >= 0 && diff <= 2;
        });
        const highCNSIn3Days = last3Days.filter(s => s.isHighCNS).length;
        if (highCNSIn3Days >= 2) {
          dateIdx++;
          if (dateIdx < allDates.length) {
            assignedDate = allDates[dateIdx];
          } else {
            const lastAssigned = new Date(scheduled[scheduled.length - 1].scheduled_date);
            assignedDate = new Date(lastAssigned);
            assignedDate.setDate(assignedDate.getDate() + 2);
          }
        }
      }
    }

    const dateStr = assignedDate.toISOString().split('T')[0];
    scheduled.push({
      week_number: weekNum,
      day_label: workout.day || DAY_NAMES[assignedDate.getDay()],
      scheduled_date: dateStr,
      workout_type: workout.type,
      estimated_duration: workout.estimated_duration || 45,
      exercises: workout.exercises,
      isHighCNS,
    });

    dateIdx++;
  }

  return scheduled;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Anon client with user JWT — RLS enforced for all reads
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // Service client ONLY for atomic RPC (SECURITY DEFINER)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
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

    // Fix #8: Check for existing active block — user must archive first
    const { data: existingBlock } = await supabase
      .from('training_blocks')
      .select('id, status, pending_goal_change')
      .eq('user_id', user.id)
      .in('status', ['active', 'nearing_completion'])
      .maybeSingle();

    if (existingBlock) {
      return new Response(JSON.stringify({
        error: 'Active training block exists. Complete or archive it before generating a new one.',
        existing_block_id: existingBlock.id,
      }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fix #9: Check pending goal change on ready_for_regeneration blocks
    const { data: pendingBlock } = await supabase
      .from('training_blocks')
      .select('id, pending_goal_change')
      .eq('user_id', user.id)
      .eq('status', 'ready_for_regeneration')
      .eq('pending_goal_change', true)
      .maybeSingle();

    // Fetch training preferences
    const { data: prefs } = await supabase
      .from('training_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const goal = prefs?.goal || 'general strength';
    const userAvailability = (prefs?.availability as { days?: number[] })?.days || [];
    const equipment = prefs?.equipment || [];
    const injuries = prefs?.injuries || [];
    const experienceLevel = prefs?.experience_level || 'intermediate';

    // Fetch athlete context — sport, position, season phase
    const [{ data: bodyGoal }, { data: mpiSettings }] = await Promise.all([
      supabase.from('athlete_body_goals').select('goal_type, target_weight_lbs')
        .eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      supabase.from('athlete_mpi_settings').select('primary_position, sport, season_status')
        .eq('user_id', user.id).maybeSingle(),
    ]);

    const sport = mpiSettings?.sport || 'baseball';
    const position = mpiSettings?.primary_position || 'athlete';
    const seasonPhase = mpiSettings?.season_status || 'in_season';
    const { sport: requestSport } = await req.json().catch(() => ({ sport: undefined }));

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ─── Resolve schedule: season-aware + calendar-conflict-aware ───
    const planStart = new Date();
    const dayOfWeek0 = planStart.getDay();
    const daysUntilMonday0 = dayOfWeek0 === 0 ? 1 : dayOfWeek0 === 1 ? 0 : 8 - dayOfWeek0;
    planStart.setDate(planStart.getDate() + daysUntilMonday0);
    const planEnd = new Date(planStart);
    planEnd.setDate(planEnd.getDate() + 41);
    const planStartStr = planStart.toISOString().split('T')[0];
    const planEndStr = planEnd.toISOString().split('T')[0];

    // Pull conflicting calendar events in the 42-day window
    const { data: existingEvents } = await supabase
      .from('calendar_events')
      .select('event_date, event_type')
      .eq('user_id', user.id)
      .gte('event_date', planStartStr)
      .lte('event_date', planEndStr);

    const conflictDates = new Set<string>(
      (existingEvents || [])
        .filter(e => ['game', 'practice', 'custom_activity'].includes(e.event_type))
        .map(e => e.event_date)
    );

    const availability = pickOptimalSchedule(userAvailability, seasonPhase, conflictDates, planStart);
    const workoutsPerWeek = Math.min(availability.length, 5);

    console.log('Scheduling resolved:', { seasonPhase, userAvailability, finalAvailability: availability, conflicts: conflictDates.size });

    // Call Lovable AI
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
- Season Phase: ${seasonPhase.replace('_', '-')} ${seasonPhase === 'in_season' ? '(prioritize maintenance, low-CNS, recovery)' : seasonPhase === 'preseason' ? '(prioritize accumulation, strength build)' : '(prioritize rebuild + mobility)'}
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

    // Fix #3: Strict validation before any insert
    validateGeneratedBlock(generated, workoutsPerWeek);

    // Reuse pre-computed schedule window (planStart / planEnd from earlier)
    const startDate = planStart;
    const endDate = planEnd;

    const scheduledWorkouts = scheduleBlockWorkouts(generated.weeks, startDate, availability);

    // ─── Forward-shift uniqueness pass (preserves availability cadence) ───
    // Keep the spacing-aware dates from scheduleBlockWorkouts. If two workouts
    // land on the same date (collision), nudge later ones forward by +1 day
    // until unique. Satisfies uq_block_workouts_date(block_id, scheduled_date)
    // without flattening to daily training.
    const parseLocalDate = (s: string): Date => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    };
    const toISO = (d: Date): string => {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${mo}-${da}`;
    };

    // Validate scheduled_date BEFORE sort
    const safeWorkouts = scheduledWorkouts.map(w => {
      if (!w.scheduled_date || isNaN(Date.parse(w.scheduled_date))) {
        console.error("Invalid scheduled_date:", JSON.stringify(w));
        throw new Error(`Invalid scheduled_date detected: ${JSON.stringify(w)}`);
      }
      return w;
    });

    const usedDates = new Set<string>();
    const normalizedWorkouts = safeWorkouts
      .slice()
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .map(sw => {
        const d = parseLocalDate(sw.scheduled_date);
        while (usedDates.has(toISO(d))) {
          d.setDate(d.getDate() + 1);
        }
        const finalDate = toISO(d);
        usedDates.add(finalDate);
        return {
          ...sw,
          scheduled_date: finalDate,
          day_label: DAY_NAMES[d.getDay()],
        };
      });

    // ─── Pre-RPC hard validation ───
    const dateList = normalizedWorkouts.map(w => w.scheduled_date);
    const duplicates = dateList.filter((d, i) => dateList.indexOf(d) !== i);
    console.log("DATES:", dateList);
    if (duplicates.length > 0) {
      console.error("DUPLICATES detected pre-RPC:", duplicates, "full payload:", JSON.stringify(normalizedWorkouts));
      throw new Error(`Duplicate scheduled_date values: ${duplicates.join(', ')}`);
    }
    for (const w of normalizedWorkouts) {
      if (!w.exercises || w.exercises.length < 1) {
        console.error("Validation fail — workout missing exercises:", JSON.stringify(w));
        throw new Error(`Workout on ${w.scheduled_date} (${w.workout_type}) has no exercises`);
      }
      if (!Number.isInteger(w.week_number) || w.week_number < 1 || w.week_number > 6) {
        console.error("Validation fail — invalid week_number:", JSON.stringify(w));
        throw new Error(`Invalid week_number ${w.week_number} on ${w.scheduled_date}`);
      }
    }

    // Fix #4: Atomic insert via RPC — single transaction
    // Defensive clamping: prevent any rogue AI value from blowing the transaction
    const clamp = (n: number, min: number, max: number) =>
      Math.max(min, Math.min(max, Math.round(n)));

    const workoutsPayload = normalizedWorkouts.map(sw => {
      const exercises = sw.exercises
        .filter(ex => ex && typeof ex.name === 'string' && ex.name.trim().length > 0)
        .map((ex, idx) => ({
          ordinal: idx, // recomputed AFTER filtering
          name: ex.name.trim(),
          sets: clamp(Number(ex.sets) || 3, 1, 10),
          reps: clamp(Number(ex.reps) || 8, 1, 30),
          weight: ex.weight ?? null,
          tempo: ex.tempo || null,
          rest_seconds: ex.rest_seconds != null ? clamp(Number(ex.rest_seconds), 0, 600) : null,
          velocity_intent: ex.velocity_intent || null,
          cns_demand: ex.cns_demand || null,
          coaching_cues: ex.coaching_cues || null,
        }));

      // Per-workout ordinal uniqueness guard
      const ordinals = exercises.map(e => e.ordinal);
      if (new Set(ordinals).size !== ordinals.length) {
        console.error("Duplicate ordinals:", JSON.stringify({ date: sw.scheduled_date, ordinals }));
        throw new Error(`Duplicate ordinals in workout ${sw.scheduled_date}`);
      }

      // Numeric integrity guard
      for (const ex of exercises) {
        if (!Number.isFinite(ex.sets) || !Number.isFinite(ex.reps)) {
          console.error("Non-finite sets/reps:", JSON.stringify(ex));
          throw new Error(`Invalid sets/reps detected: ${JSON.stringify(ex)}`);
        }
      }

      return {
        week_number: sw.week_number,
        day_label: DAY_NAMES[parseLocalDate(sw.scheduled_date).getDay()],
        scheduled_date: sw.scheduled_date,
        status: 'scheduled',
        workout_type: sw.workout_type,
        estimated_duration: sw.estimated_duration,
        exercises,
      };
    });

    // Final payload sanity
    if (workoutsPayload.length === 0) {
      throw new Error("No workouts generated");
    }
    if (workoutsPayload.some(w => w.exercises.length === 0)) {
      console.error("Workout with zero exercises:", JSON.stringify(workoutsPayload.filter(w => w.exercises.length === 0)));
      throw new Error("Workout with zero exercises detected");
    }

    const totalExercises = workoutsPayload.reduce((s, w) => s + w.exercises.length, 0);
    console.log(`RPC payload prepared: ${workoutsPayload.length} workouts, ${totalExercises} exercises`);

    // Generate idempotency key to prevent duplicate generation from retries
    const idempotencyKey = crypto.randomUUID();

    const { data: blockId, error: rpcErr } = await serviceClient.rpc('insert_training_block_atomic', {
      p_user_id: user.id,
      p_goal: generated.goal || goal,
      p_sport: requestSport || sport,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
      p_generation_metadata: {
        model: 'google/gemini-2.5-flash',
        preferences: { goal, experienceLevel, equipment, injuries, position },
        generated_at: new Date().toISOString(),
      },
      p_workouts: workoutsPayload,
      p_pending_goal_block_id: pendingBlock?.id || null,
      p_idempotency_key: idempotencyKey,
    });

    if (rpcErr) {
      const snapshot = {
        first_workouts: workoutsPayload.slice(0, 2).map(w => ({
          ...w,
          exercises: w.exercises.slice(0, 2),
        })),
      };
      console.error("Atomic insert failed:", {
        code: (rpcErr as any).code,
        message: rpcErr.message,
        details: (rpcErr as any).details,
        hint: (rpcErr as any).hint,
        workout_count: workoutsPayload.length,
        exercise_count: totalExercises,
        payload_snapshot: JSON.stringify(snapshot).slice(0, 2000),
      });
      if (rpcErr.message?.includes('active_block_exists')) {
        return new Response(JSON.stringify({
          error: 'Active training block exists. Complete or archive it before generating a new one.',
        }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Failed to create training block: ${rpcErr.message}`);
    }

    // Create calendar events (non-critical — outside transaction)
    const calendarEvents = normalizedWorkouts.map(sw => ({
      user_id: user.id,
      event_date: sw.scheduled_date,
      event_type: 'training_block',
      title: `${sw.workout_type.replace(/_/g, ' ')} — Week ${sw.week_number}`,
      description: `${sw.exercises.length} exercises · ~${sw.estimated_duration} min`,
      sport: requestSport || sport,
      related_id: blockId,
      color: '#6366f1',
    }));

    if (calendarEvents.length > 0) {
      const { error: calErr } = await supabase.from('calendar_events').insert(calendarEvents);
      if (calErr) console.error("Calendar event insert failed (non-critical):", calErr);
    }

    return new Response(JSON.stringify({
      blockId,
      totalWorkouts: normalizedWorkouts.length,
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
