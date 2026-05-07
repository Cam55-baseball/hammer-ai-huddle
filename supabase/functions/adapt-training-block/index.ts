import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveSeasonPhase } from "../_shared/seasonPhase.ts";

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Service client only for auth.getUser + SECURITY DEFINER RPCs
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Anon client with user JWT — RLS enforced for all reads
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
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

    // Resolve current season phase to bias adaptation thresholds
    const { data: mpiSettings } = await supabase
      .from('athlete_mpi_settings')
      .select('season_status, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date')
      .eq('user_id', user.id)
      .maybeSingle();
    const phase = resolveSeasonPhase(mpiSettings as any).phase;
    // In-season: never push volume up, lower RPE threshold for deload.
    // Off-season: more permissive — only deload at RPE>8.5.
    const reduceRpeThreshold = phase === 'in_season' ? 7.5 : phase === 'off_season' ? 8.5 : 8;
    const allowVolumeIncrease = phase !== 'in_season' && phase !== 'post_season';

    const adaptations: string[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Calculate stats
    const completedWorkouts = workouts.filter(w => w.status === 'completed');
    const missedWorkouts = workouts.filter(w => w.status === 'missed');
    const futureWorkouts = workouts.filter(w => w.scheduled_date && w.scheduled_date > today && w.status === 'scheduled');
    const futureWorkoutIds = futureWorkouts.map(w => w.id);

    // Rolling RPE window: sort completed workouts by scheduled_date, then extract RPE in order
    const completedByDate = [...completedWorkouts].sort((a, b) =>
      (a.scheduled_date || '').localeCompare(b.scheduled_date || '')
    );
    const completedIdOrder = completedByDate.map(w => w.id);
    const metricsMap = new Map((metrics || []).map(m => [m.workout_id, m.rpe]));
    const rpeValues: number[] = [];
    for (const wid of completedIdOrder) {
      const rpe = metricsMap.get(wid);
      if (rpe !== undefined) rpeValues.push(rpe);
    }
    // Take last 8 RPE samples (most recent by date)
    const rollingWindow = rpeValues.slice(-8);

    // Rule 1: Rolling RPE > threshold (phase-tuned) with ≥4 samples → reduce volume
    if (rollingWindow.length >= 4 && futureWorkoutIds.length > 0) {
      const avgRPE = rollingWindow.reduce((a, b) => a + b, 0) / rollingWindow.length;
      if (avgRPE > reduceRpeThreshold) {
        const { data: decremented } = await serviceClient.rpc('batch_decrement_sets', {
          p_workout_ids: futureWorkoutIds,
        });
        if (decremented && decremented > 0) {
          adaptations.push(`Reduced volume (sets -1) for ${decremented} exercises — rolling RPE avg ${avgRPE.toFixed(1)} (${phase} threshold ${reduceRpeThreshold})`);
        }
      }

      // Rule 2: Rolling RPE < 5 with ≥4 samples → increase volume (only when phase allows)
      if (avgRPE < 5 && allowVolumeIncrease) {
        const { data: incremented } = await serviceClient.rpc('batch_increment_sets', {
          p_workout_ids: futureWorkoutIds,
        });
        if (incremented && incremented > 0) {
          adaptations.push(`Increased volume (sets +1) for ${incremented} exercises — rolling RPE avg ${avgRPE.toFixed(1)}`);
        }
      } else if (avgRPE < 5 && !allowVolumeIncrease) {
        adaptations.push(`Holding volume despite low RPE — ${phase} phase prioritizes recovery and game-day bandwidth.`);
      }
    }

    // Rule 3: 3+ missed workouts → deload next week via batch RPC
    if (missedWorkouts.length >= 3 && futureWorkoutIds.length > 0) {
      const nextWeekIds = futureWorkoutIds.slice(0, Math.min(5, futureWorkoutIds.length));
      const { data: deloaded } = await serviceClient.rpc('batch_deload_exercises', {
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

    // Rule 6: Missed workout shifting — atomic SQL via shift_workouts_forward RPC
    const recentMissed = missedWorkouts.filter(w =>
      w.scheduled_date && w.scheduled_date >= today
    );

    if (recentMissed.length === 1 && futureWorkouts.length > 0) {
      const missedDate = recentMissed[0].scheduled_date!;
      const { data: shifted } = await serviceClient.rpc('shift_workouts_forward', {
        p_block_id: block_id,
        p_after_date: missedDate,
        p_days: 1,
      });
      if (shifted && shifted > 0) {
        adaptations.push(`Shifted ${shifted} workouts forward 1 day due to missed session`);
      }
    }

    // Update block status via RPC (user-scoped)
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
