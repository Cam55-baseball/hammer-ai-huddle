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

    const { subModule, parentModule, sport, experienceLevel } = await req.json();

    // Get the first block program for this sub-module
    const { data: program, error: programError } = await supabase
      .from('workout_programs')
      .select('*')
      .eq('parent_module', parentModule)
      .eq('sub_module', subModule)
      .eq('sport', sport)
      .eq('block_number', 1)
      .single();

    if (programError || !program) {
      return new Response(JSON.stringify({ error: 'Workout program not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already has progress for this program
    const { data: existingProgress } = await supabase
      .from('user_workout_progress')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('parent_module', parentModule)
      .eq('sub_module', subModule)
      .eq('sport', sport)
      .single();

    if (existingProgress) {
      return new Response(JSON.stringify({ 
        message: 'Program already initialized',
        progress: existingProgress 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user workout progress
    const { data: progress, error: progressError } = await supabase
      .from('user_workout_progress')
      .insert({
        user_id: userData.user.id,
        program_id: program.id,
        parent_module: parentModule,
        sub_module: subModule,
        sport,
        current_block: 1,
        block_start_date: new Date().toISOString().split('T')[0],
        experience_level: experienceLevel || 'beginner',
      })
      .select()
      .single();

    if (progressError) {
      console.error('Error creating progress:', progressError);
      return new Response(JSON.stringify({ error: 'Failed to initialize program' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get workout templates for this program
    const { data: templates } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('program_id', program.id)
      .order('day_in_cycle');

    // Create scheduled workouts
    if (templates && templates.length > 0) {
      const blockStartDate = new Date();
      const scheduledWorkouts = templates.map(template => ({
        user_id: userData.user.id,
        progress_id: progress.id,
        template_id: template.id,
        scheduled_date: new Date(blockStartDate.getTime() + (template.day_in_cycle - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'scheduled',
      }));

      await supabase.from('workout_completions').insert(scheduledWorkouts);
    }

    return new Response(JSON.stringify({ 
      message: 'Workout program initialized successfully',
      progress 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in initialize-workout-program:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});