import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveSeasonPhase, getSeasonProfile, buildPhasePromptBlock } from "../_shared/seasonPhase.ts";

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

// ─── Soft AI response validation: log only, never throw on shape ───
function validateGeneratedBlock(block: GeneratedBlock, workoutsPerWeek: number): void {
  if (!block.weeks || block.weeks.length !== 6) {
    console.error(`AI returned ${block.weeks?.length ?? 0} weeks — expected 6`);
    return;
  }
  for (const week of block.weeks) {
    if (!week.workouts || week.workouts.length !== workoutsPerWeek) {
      console.error(`Week ${week.week} has ${week.workouts?.length ?? 0} workouts — expected ${workoutsPerWeek}`);
      continue;
    }
    for (const workout of week.workouts) {
      if (!workout.exercises || workout.exercises.length < 3 || workout.exercises.length > 6) {
        console.error(`Workout "${workout.type}" in week ${week.week} has ${workout.exercises?.length ?? 0} exercises — expected 3-6`);
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

    // Existing-active-block check moved AFTER body parse + server-side archive (below)

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
      supabase.from('athlete_mpi_settings').select('primary_position, sport, season_status, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date')
        .eq('user_id', user.id).maybeSingle(),
    ]);

    const sport = mpiSettings?.sport || 'baseball';
    const position = mpiSettings?.primary_position || 'athlete';
    const phaseResolution = resolveSeasonPhase(mpiSettings as any);
    const phaseProfile = getSeasonProfile(phaseResolution.phase);
    const seasonPhase = phaseResolution.phase;
    const phasePromptBlock = buildPhasePromptBlock(phaseResolution);
    const reqBody = await req.json().catch(() => ({}));
    const { sport: requestSport, force_new } = reqBody as {
      sport?: string;
      force_new?: boolean;
    };

    // Active-block guard removed — RPC is the single source of truth for CREATE vs ADAPT.
    console.log("MODE:", force_new ? "ADAPT" : "CREATE");

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
- Available days per week: ${workoutsPerWeek}
- Equipment: ${JSON.stringify(equipment)}
${(injuries as string[]).length ? `- INJURIES/AVOID: ${(injuries as string[]).join(', ')}` : ''}

${phasePromptBlock}

PROGRAMMING RULES (must respect SEASON PHASE above):
1. Generate exactly 6 weeks of training
2. Each week has exactly ${workoutsPerWeek} workouts
3. Volume/intensity must match the phase Volume + Intensity tags. Hard cap: max ${phaseProfile.maxSetsPerExercise} sets per exercise, max ${phaseProfile.maxHighCnsPerWeek} high-CNS sessions per week.
4. ${seasonPhase === 'in_season' ? 'In-Season: maintenance only — never propose new mechanical changes. Reps lower, weight 60-75%, prioritize recovery.' : seasonPhase === 'preseason' ? 'Pre-Season: ramp volume/intensity weekly, peak in week 5, deload week 6.' : seasonPhase === 'post_season' ? 'Post-Season: decompression — mobility, sleep, pain resolution. No max-effort lifts.' : 'Off-Season: aggressive build — strength, power, mechanics. Deload every 4th week.'}
5. Each workout needs 3-6 exercises with sets, reps, and coaching cues
6. Assign cns_demand (low/medium/high) to each exercise
7. Avoid scheduling consecutive high-CNS exercises without medium/low buffer
8. For ${sport} athletes, prioritize rotational power, arm health, and posterior chain

Always respond using the generate_training_block function.`
          },
          {
            role: "user",
            content: `Generate a complete 6-week ${goal} training block for a ${experienceLevel} ${sport} ${position}. ${workoutsPerWeek} workouts per week. Respect the SEASON PHASE constraints strictly.`
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
      return new Date(y, m - 1, d);
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

    const endDateObj: Date = typeof endDate === 'string' ? parseLocalDate(endDate as string) : endDate;
    const startDateObj: Date = startDate;
    const usedDates = new Set<string>();
    const normalizedWorkouts = safeWorkouts
      .slice()
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .map(sw => {
        const original = parseLocalDate(sw.scheduled_date);
        const d = new Date(original);
        let guard = 0;
        while (usedDates.has(toISO(d)) && d <= endDateObj) {
          d.setDate(d.getDate() + 1);
          guard++;
          if (guard > 365) {
            console.error("Forward-shift guard exceeded for", sw.scheduled_date);
            break;
          }
        }
        let finalDate = toISO(d);
        // If forward-shift overflowed end_date, walk backward from original
        if (parseLocalDate(finalDate) > endDateObj || usedDates.has(finalDate)) {
          const b = new Date(original);
          let bguard = 0;
          while ((usedDates.has(toISO(b)) || b > endDateObj) && b >= startDateObj) {
            b.setDate(b.getDate() - 1);
            bguard++;
            if (bguard > 365) break;
          }
          if (b >= startDateObj && b <= endDateObj && !usedDates.has(toISO(b))) {
            finalDate = toISO(b);
          } else {
            console.error(`Dropping workout — no slot available in block window: ${sw.scheduled_date}`);
            return null;
          }
        }
        usedDates.add(finalDate);
        const finalD = parseLocalDate(finalDate);
        return {
          ...sw,
          scheduled_date: finalDate,
          day_label: DAY_NAMES[finalD.getDay()],
        };
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);
    // Re-sort after shift to restore chronological order
    normalizedWorkouts.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

    // ─── Pre-RPC soft validation: log only, never throw on shape ───
    const dateList = normalizedWorkouts.map(w => w.scheduled_date);
    const duplicates = dateList.filter((d, i) => dateList.indexOf(d) !== i);
    console.log("DATES:", dateList);
    if (duplicates.length > 0) {
      console.error("DUPLICATES detected pre-RPC:", duplicates);
    }
    for (const w of normalizedWorkouts) {
      if (!w.exercises || w.exercises.length < 1) {
        console.error("Workout missing exercises:", JSON.stringify(w));
      }
      if (!Number.isInteger(w.week_number) || w.week_number < 1 || w.week_number > 6) {
        console.error("Invalid week_number:", JSON.stringify(w));
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
          sets: clamp(Number(ex.sets) || 3, 1, phaseProfile.maxSetsPerExercise),
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

    // Phase clamp: cap high-CNS sessions per week to phaseProfile.maxHighCnsPerWeek.
    // Surplus sessions get downgraded to medium-CNS (workout still runs, just lighter).
    const highCnsPerWeek = new Map<number, number>();
    for (const w of workoutsPayload) {
      const isHigh = w.exercises.some(e => e.cns_demand === 'high');
      if (!isHigh) continue;
      const used = highCnsPerWeek.get(w.week_number) || 0;
      if (used >= phaseProfile.maxHighCnsPerWeek) {
        // Downgrade all high cns demand to medium for this workout
        w.exercises = w.exercises.map(e => e.cns_demand === 'high' ? { ...e, cns_demand: 'medium' } : e);
        console.log(`Phase clamp [${seasonPhase}]: downgraded high-CNS workout ${w.scheduled_date} (week ${w.week_number}, cap=${phaseProfile.maxHighCnsPerWeek})`);
      } else {
        highCnsPerWeek.set(w.week_number, used + 1);
      }
    }

    // Final payload sanity — only hard-throw on empty payload
    if (workoutsPayload.length === 0) {
      throw new Error("No workouts generated");
    }

    // Soft week 1–6 continuity check
    const weeks = new Set(workoutsPayload.map(w => w.week_number));
    for (let i = 1; i <= 6; i++) {
      if (!weeks.has(i)) {
        console.error("Missing week in payload:", i, "present:", Array.from(weeks));
      }
    }
    if (weeks.size !== 6) {
      console.error("Invalid week_number distribution:", Array.from(weeks));
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
      p_replace_existing: force_new === true,
    });

    if (rpcErr) {
      console.error("ADAPT RPC ERROR FULL:", rpcErr);
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
          error: 'active_block_exists',
          message: 'Existing active block prevented adaptation',
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

    // Fetch fully nested training block (workouts + exercises) via service client
    const { data: block, error: fetchErr } = await serviceClient
      .from('training_blocks')
      .select(`
        id, goal, sport, start_date, end_date, status,
        block_workouts (
          id, week_number, day_label, scheduled_date, status, workout_type, estimated_duration,
          block_exercises (
            id, ordinal, name, sets, reps, weight, tempo, rest_seconds,
            velocity_intent, cns_demand, coaching_cues
          )
        )
      `)
      .eq('id', blockId)
      .maybeSingle();

    if (fetchErr) {
      console.error("BLOCK FETCH FAILED:", fetchErr);
      throw new Error("Failed to fetch training block after creation");
    }
    if (!block) {
      console.error("BLOCK NULL AFTER CREATION", { blockId });
      throw new Error("Training block created but not found");
    }

    console.log("BLOCK RETURN SUCCESS", { blockId });
    console.log("FINAL BLOCK RESPONSE:", JSON.stringify(block, null, 2));
    console.log("BLOCK KEYS:", Object.keys(block || {}));
    return new Response(JSON.stringify({ block }), {
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
