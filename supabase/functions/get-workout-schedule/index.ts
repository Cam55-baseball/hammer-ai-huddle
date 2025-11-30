import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const decodeJwt = (token: string) => {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) base64 += '=';
        const json = atob(base64);
        return JSON.parse(json);
      } catch (_) {
        return null;
      }
    };

    const bearer = authHeader.replace(/^Bearer\s+/i, '');
    const claims = decodeJwt(bearer);

    if (!claims || !claims.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the user ID from the verified JWT claims
    const userId = claims.sub as string;

    const { subModule, parentModule, sport } = await req.json();

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Get user's workout progress
    const { data: progress, error: progressError } = await supabase
      .from('user_workout_progress')
      .select('*, workout_programs(*)')
      .eq('user_id', userId)
      .eq('parent_module', parentModule)
      .eq('sub_module', subModule)
      .eq('sport', sport)
      .maybeSingle();

    if (progressError) {
      console.error('Error fetching workout progress:', progressError);
      return new Response(JSON.stringify({ error: 'Failed to fetch workout progress' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get equipment for this sub-module (available even if no progress yet)
    const { data: equipment, error: equipmentError } = await supabase
      .from('workout_equipment')
      .select('*')
      .eq('sub_module', subModule)
      .eq('sport', sport);

    if (equipmentError) {
      console.error('Error fetching equipment:', equipmentError);
    }

    // If user has no workout progress yet, return an empty schedule instead of 404
    if (!progress) {
      return new Response(JSON.stringify({
        progress: null,
        workouts: [],
        today,
        equipment: equipment || [],
        status: 'no_progress',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get scheduled workouts for this progress record
    const { data: workouts, error: workoutsError } = await supabase
      .from('workout_completions')
      .select('*, workout_templates(*)')
      .eq('progress_id', progress.id)
      .order('scheduled_date');

    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch workouts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Aggregate previous exercise logs from completed workouts
    const previousExerciseLogs: Record<string, number> = {};
    const completedWorkouts = workouts?.filter(w => w.status === 'completed' && w.exercise_logs) || [];
    
    for (const workout of completedWorkouts) {
      const logs = workout.exercise_logs as Record<number, { name: string; sets: { weight: number | null }[] }>;
      if (logs) {
        for (const exerciseLog of Object.values(logs)) {
          if (exerciseLog.name && exerciseLog.sets?.length > 0) {
            const weights = exerciseLog.sets
              .map(s => s.weight)
              .filter(w => w !== null && w > 0) as number[];
            
            if (weights.length > 0) {
              const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
              previousExerciseLogs[exerciseLog.name] = Math.round(avgWeight);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      progress,
      workouts,
      today,
      equipment: equipment || [],
      previousExerciseLogs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-workout-schedule:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});