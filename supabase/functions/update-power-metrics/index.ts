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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { exitVelocity, distance, progressId } = await req.json();

    console.log('Updating power metrics for user:', user.id, {
      exitVelocity,
      distance,
      progressId,
    });

    // Validate inputs
    if (!exitVelocity || !distance || !progressId) {
      return new Response(
        JSON.stringify({ error: 'Exit velocity, distance, and progress ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current progress data
    const { data: currentProgress, error: fetchError } = await supabase
      .from('user_workout_progress')
      .select('exit_velocity, exit_velocity_last_updated, distance, distance_last_updated')
      .eq('id', progressId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching progress:', fetchError);
      throw new Error('Failed to fetch current progress');
    }

    // Check if 2 months (60 days) have passed since last update
    const canUpdateExitVelocity = !currentProgress.exit_velocity_last_updated || 
      new Date(currentProgress.exit_velocity_last_updated) <= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    
    const canUpdateDistance = !currentProgress.distance_last_updated || 
      new Date(currentProgress.distance_last_updated) <= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    if (!canUpdateExitVelocity || !canUpdateDistance) {
      const daysUntilExitVelocity = currentProgress.exit_velocity_last_updated 
        ? Math.ceil((new Date(currentProgress.exit_velocity_last_updated).getTime() + 60 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000))
        : 0;
      const daysUntilDistance = currentProgress.distance_last_updated 
        ? Math.ceil((new Date(currentProgress.distance_last_updated).getTime() + 60 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000))
        : 0;

      return new Response(
        JSON.stringify({ 
          error: 'Cannot update metrics yet',
          daysRemaining: Math.max(daysUntilExitVelocity, daysUntilDistance)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update metrics: store current as previous, update current, set last_updated timestamp
    const { data: updatedProgress, error: updateError } = await supabase
      .from('user_workout_progress')
      .update({
        exit_velocity_previous: currentProgress.exit_velocity,
        exit_velocity: exitVelocity,
        exit_velocity_last_updated: new Date().toISOString(),
        distance_previous: currentProgress.distance,
        distance: distance,
        distance_last_updated: new Date().toISOString(),
      })
      .eq('id', progressId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating metrics:', updateError);
      throw new Error('Failed to update metrics');
    }

    console.log('Successfully updated power metrics:', updatedProgress);

    return new Response(
      JSON.stringify({ 
        success: true,
        data: updatedProgress
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-power-metrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
