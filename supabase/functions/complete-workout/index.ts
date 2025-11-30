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

    const { workoutId, exerciseLogs, notes } = await req.json();

    // Get the workout completion record
    const { data: workout, error: workoutError } = await supabase
      .from('workout_completions')
      .select('*, user_workout_progress(*)')
      .eq('id', workoutId)
      .eq('user_id', userData.user.id)
      .single();

    if (workoutError || !workout) {
      return new Response(JSON.stringify({ error: 'Workout not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if workout is scheduled for today
    const today = new Date().toISOString().split('T')[0];
    if (workout.scheduled_date !== today) {
      return new Response(JSON.stringify({ 
        error: 'This workout is not scheduled for today. Workouts must be completed on their scheduled day.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already completed
    if (workout.status === 'completed') {
      return new Response(JSON.stringify({ 
        error: 'This workout has already been completed' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update workout completion
    const { error: updateError } = await supabase
      .from('workout_completions')
      .update({
        status: 'completed',
        completed_date: today,
        exercise_logs: exerciseLogs || {},
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workoutId);

    if (updateError) {
      console.error('Error updating workout:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to complete workout' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all workouts for this progress to calculate completion percentage
    const { data: allWorkouts } = await supabase
      .from('workout_completions')
      .select('status')
      .eq('progress_id', workout.progress_id);

    const completedCount = allWorkouts?.filter(w => w.status === 'completed').length || 0;
    const totalCount = allWorkouts?.length || 0;
    const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // Update user workout progress
    await supabase
      .from('user_workout_progress')
      .update({
        total_workouts_completed: completedCount,
        completion_percentage: completionPercentage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workout.progress_id);

    return new Response(JSON.stringify({ 
      message: 'Workout completed successfully',
      completionPercentage,
      completedCount,
      totalCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in complete-workout:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});