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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { subModule, parentModule, sport } = await req.json();

    // Get user's workout progress
    const { data: progress, error: progressError } = await supabase
      .from('user_workout_progress')
      .select('*, workout_programs(*)')
      .eq('user_id', userData.user.id)
      .eq('parent_module', parentModule)
      .eq('sub_module', subModule)
      .eq('sport', sport)
      .single();

    if (progressError || !progress) {
      return new Response(JSON.stringify({ error: 'No workout progress found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get scheduled workouts
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

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Get equipment for this sub-module
    const { data: equipment } = await supabase
      .from('workout_equipment')
      .select('*')
      .eq('sub_module', subModule)
      .eq('sport', sport);

    return new Response(JSON.stringify({ 
      progress,
      workouts,
      today,
      equipment: equipment || []
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