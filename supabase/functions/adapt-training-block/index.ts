import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { block_id } = await req.json();
    if (!block_id) {
      return new Response(JSON.stringify({ error: 'block_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify block ownership
    const { data: block } = await supabase
      .from('training_blocks')
      .select('id, user_id, status')
      .eq('id', block_id)
      .eq('user_id', user.id)
      .single();

    if (!block) {
      return new Response(JSON.stringify({ error: 'Block not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all workouts
    const { data: workouts } = await supabase
      .from('block_workouts')
      .select('id, week_number, status, scheduled_date, workout_type')
      .eq('block_id', block_id)
      .order('scheduled_date', { ascending: true });

    if (!workouts || workouts.length === 0) {
      return new Response(JSON.stringify({ adaptations: [], message: 'No workouts found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch metrics
    const workoutIds = workouts.map(w => w.id);
    const { data: metrics } = await supabase
      .from('block_workout_metrics')
      .select('workout_id, rpe, completed')
      .eq('user_id', user.id)
      .in('workout_id', workoutIds);

    const adaptations: string[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Calculate stats
    const completedWorkouts = workouts.filter(w => w.status === 'completed');
    const missedWorkouts = workouts.filter(w => w.status === 'missed');
    const futureWorkouts = workouts.filter(w => w.scheduled_date && w.scheduled_date > today && w.status === 'scheduled');
    const futureWorkoutIds = futureWorkouts.map(w => w.id);

    // RPE analysis by week
    const rpeByWeek: Record<number, number[]> = {};
    for (const m of (metrics || [])) {
      const workout = workouts.find(w => w.id === m.workout_id);
      if (workout) {
        if (!rpeByWeek[workout.week_number]) rpeByWeek[workout.week_number] = [];
        rpeByWeek[workout.week_number].push(m.rpe);
      }
    }

    // Rule 1: Average RPE > 8 for 2+ weeks → reduce volume via batch RPC
    const highRPEWeeks = Object.entries(rpeByWeek).filter(
      ([_, rpes]) => rpes.length >= 2 && rpes.reduce((a, b) => a + b, 0) / rpes.length > 8
    );

    if (highRPEWeeks.length >= 2 && futureWorkoutIds.length > 0) {
      const { data: decremented } = await supabase.rpc('batch_decrement_sets', {
        p_workout_ids: futureWorkoutIds,
      });
      if (decremented && decremented > 0) {
        adaptations.push(`Reduced volume (sets -1) for ${decremented} exercises due to sustained high RPE`);
      }
    }

    // Rule 2: Average RPE < 5 for 2+ weeks → increase volume via batch RPC
    const lowRPEWeeks = Object.entries(rpeByWeek).filter(
      ([_, rpes]) => rpes.length >= 2 && rpes.reduce((a, b) => a + b, 0) / rpes.length < 5
    );

    if (lowRPEWeeks.length >= 2 && futureWorkoutIds.length > 0) {
      const { data: incremented } = await supabase.rpc('batch_increment_sets', {
        p_workout_ids: futureWorkoutIds,
      });
      if (incremented && incremented > 0) {
        adaptations.push(`Increased volume (sets +1) for ${incremented} exercises — athlete can handle more`);
      }
    }

    // Rule 3: 3+ missed workouts → deload next week via batch RPC
    if (missedWorkouts.length >= 3 && futureWorkoutIds.length > 0) {
      const nextWeekIds = futureWorkoutIds.slice(0, Math.min(5, futureWorkoutIds.length));
      const { data: deloaded } = await supabase.rpc('batch_deload_exercises', {
        p_workout_ids: nextWeekIds,
      });
      if (deloaded && deloaded > 0) {
        adaptations.push(`Applied deload protocol — reduced volume for ${deloaded} exercises due to 3+ missed workouts`);
      }
    }

    // Rule 4: Missed workout type 2+ times → flag for swap
    const missedByType: Record<string, number> = {};
    for (const w of missedWorkouts) {
      missedByType[w.workout_type] = (missedByType[w.workout_type] || 0) + 1;
    }
    const typesToSwap = Object.entries(missedByType)
      .filter(([_, count]) => count >= 2)
      .map(([type]) => type);
    if (typesToSwap.length > 0) {
      adaptations.push(`Workout types skipped 2+ times: ${typesToSwap.join(', ')} — consider exercise swaps`);
    }

    // Rule 5: No activity for 7+ days → flag
    const lastCompletedDate = completedWorkouts
      .map(w => w.scheduled_date)
      .filter(Boolean)
      .sort()
      .pop();

    if (lastCompletedDate) {
      const daysSince = Math.floor(
        (new Date(today).getTime() - new Date(lastCompletedDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince >= 7) {
        adaptations.push(`No activity for ${daysSince} days — re-engagement recommended`);
      }
    }

    // Rule 6: Missed workout shifting (1 missed → shift forward) — batch via Promise.all
    const recentMissed = missedWorkouts.filter(w =>
      w.scheduled_date && w.scheduled_date >= today
    );

    if (recentMissed.length === 1 && futureWorkouts.length > 0) {
      await Promise.all(
        futureWorkouts.map(fw => {
          if (fw.scheduled_date) {
            const newDate = new Date(fw.scheduled_date);
            newDate.setDate(newDate.getDate() + 1);
            return supabase
              .from('block_workouts')
              .update({ scheduled_date: newDate.toISOString().split('T')[0] })
              .eq('id', fw.id);
          }
          return Promise.resolve();
        })
      );
      adaptations.push('Shifted remaining workouts forward 1 day due to missed session');
    }

    // Update block status via RPC
    await supabase.rpc('update_block_status', { p_block_id: block_id });

    return new Response(JSON.stringify({
      adaptations,
      stats: {
        totalWorkouts: workouts.length,
        completed: completedWorkouts.length,
        missed: missedWorkouts.length,
        remaining: futureWorkouts.length,
        averageRPE: metrics && metrics.length > 0
          ? Math.round(metrics.reduce((a, m) => a + m.rpe, 0) / metrics.length * 10) / 10
          : null,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in adapt-training-block:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
