import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EnhancedExercise {
  id: string;
  name: string;
  type: 'strength' | 'cardio' | 'flexibility' | 'plyometric' | 'baseball' | 'core' | 'other';
  sets?: number;
  reps?: number | string;
  velocity_intent?: 'slow' | 'moderate' | 'fast' | 'ballistic';
  cns_demand?: 'low' | 'medium' | 'high';
  fascia_bias?: 'compression' | 'elastic' | 'glide';
}

interface WorkoutBlock {
  id: string;
  name: string;
  blockType: string;
  intent: string;
  exercises: EnhancedExercise[];
}

interface RunningSession {
  id: string;
  runType: string;
  intent: string;
  reps?: number;
  contacts?: number;
}

interface LoadMetrics {
  cnsLoad: number;
  fascialLoad: { compression: number; elastic: number; glide: number };
  volumeLoad: number;
}

function calculateExerciseCNS(exercise: EnhancedExercise): number {
  let cns = 0;

  // Base by type
  if (exercise.type === 'plyometric') cns += 40;
  else if (exercise.type === 'strength') cns += 30;
  else if (exercise.type === 'baseball') cns += 25;
  else if (exercise.type === 'cardio') cns += 20;
  else cns += 10;

  // Velocity modifier
  if (exercise.velocity_intent === 'ballistic') cns *= 1.5;
  else if (exercise.velocity_intent === 'fast') cns *= 1.25;
  else if (exercise.velocity_intent === 'slow') cns *= 0.75;

  // Volume modifier
  const reps = typeof exercise.reps === 'number' ? exercise.reps : 10;
  const volume = (exercise.sets || 1) * reps;
  cns += volume * 0.3;

  // CNS demand override
  if (exercise.cns_demand === 'high') cns *= 1.3;
  else if (exercise.cns_demand === 'low') cns *= 0.7;

  return Math.round(cns);
}

function calculateBlockLoad(blocks: WorkoutBlock[]): LoadMetrics {
  let totalCNS = 0;
  let totalVolume = 0;
  const fascialLoad = { compression: 0, elastic: 0, glide: 0 };

  for (const block of blocks) {
    for (const exercise of block.exercises || []) {
      totalCNS += calculateExerciseCNS(exercise);
      
      const reps = typeof exercise.reps === 'number' ? exercise.reps : 10;
      totalVolume += (exercise.sets || 1) * reps;

      // Fascial bias
      if (exercise.fascia_bias === 'compression') fascialLoad.compression += 10;
      else if (exercise.fascia_bias === 'elastic') fascialLoad.elastic += 10;
      else if (exercise.fascia_bias === 'glide') fascialLoad.glide += 10;
      else {
        // Default based on type
        if (exercise.type === 'plyometric') fascialLoad.elastic += 8;
        else if (exercise.type === 'strength') fascialLoad.compression += 8;
        else if (exercise.type === 'flexibility') fascialLoad.glide += 8;
      }
    }
  }

  return { cnsLoad: totalCNS, fascialLoad, volumeLoad: totalVolume };
}

function calculateRunningLoad(sessions: RunningSession[]): LoadMetrics {
  let totalCNS = 0;
  let totalVolume = 0;
  const fascialLoad = { compression: 0, elastic: 0, glide: 0 };

  for (const session of sessions) {
    // Base CNS by run type
    let baseCNS = 30;
    if (session.runType === 'linear_sprint') baseCNS = 50;
    else if (session.runType === 'accel_decel') baseCNS = 45;
    else if (session.runType === 'elastic') baseCNS = 40;
    else if (session.runType === 'tempo') baseCNS = 25;
    else if (session.runType === 'conditioning') baseCNS = 20;

    // Intent modifier
    if (session.intent === 'max') baseCNS *= 1.4;
    else if (session.intent === 'submax') baseCNS *= 1.0;
    else if (session.intent === 'recovery') baseCNS *= 0.5;

    // Volume from reps/contacts
    const reps = session.reps || session.contacts || 1;
    totalCNS += baseCNS * Math.min(reps, 10) / 5;
    totalVolume += reps;

    // Running is mostly elastic
    fascialLoad.elastic += 15 * reps;
    fascialLoad.compression += 5 * reps;
  }

  return { cnsLoad: Math.round(totalCNS), fascialLoad, volumeLoad: totalVolume };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const body = await req.json();
    const { workout_blocks, running_sessions, entry_date } = body;

    console.log('[calculate-load] Calculating load for user:', userId, 'date:', entry_date);

    // Calculate load from workout blocks
    const workoutLoad = workout_blocks?.length 
      ? calculateBlockLoad(workout_blocks) 
      : { cnsLoad: 0, fascialLoad: { compression: 0, elastic: 0, glide: 0 }, volumeLoad: 0 };

    // Calculate load from running sessions
    const runningLoad = running_sessions?.length 
      ? calculateRunningLoad(running_sessions) 
      : { cnsLoad: 0, fascialLoad: { compression: 0, elastic: 0, glide: 0 }, volumeLoad: 0 };

    // Combine loads
    const totalLoad: LoadMetrics = {
      cnsLoad: workoutLoad.cnsLoad + runningLoad.cnsLoad,
      fascialLoad: {
        compression: workoutLoad.fascialLoad.compression + runningLoad.fascialLoad.compression,
        elastic: workoutLoad.fascialLoad.elastic + runningLoad.fascialLoad.elastic,
        glide: workoutLoad.fascialLoad.glide + runningLoad.fascialLoad.glide,
      },
      volumeLoad: workoutLoad.volumeLoad + runningLoad.volumeLoad,
    };

    console.log('[calculate-load] Total load:', totalLoad);

    // Upsert into athlete_load_tracking
    const { data, error } = await supabase
      .from('athlete_load_tracking')
      .upsert({
        user_id: userId,
        entry_date: entry_date || new Date().toISOString().split('T')[0],
        cns_load_total: totalLoad.cnsLoad,
        fascial_load: totalLoad.fascialLoad,
        volume_load: totalLoad.volumeLoad,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,entry_date'
      })
      .select()
      .single();

    if (error) {
      console.error('[calculate-load] Error upserting:', error);
      throw error;
    }

    // Generate warnings
    const warnings: string[] = [];
    if (totalLoad.cnsLoad > 150) {
      warnings.push('High CNS load - consider reducing intensity');
    }
    if (totalLoad.fascialLoad.elastic > 100) {
      warnings.push('High elastic demand - ensure adequate warmup');
    }

    return new Response(JSON.stringify({
      success: true,
      metrics: totalLoad,
      warnings,
      record: data,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[calculate-load] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
