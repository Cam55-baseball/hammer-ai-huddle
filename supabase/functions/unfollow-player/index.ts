import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { playerId } = await req.json();

    if (!playerId) {
      return new Response(
        JSON.stringify({ error: 'Player ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[unfollow-player] Scout ${user.id} unfollowing player ${playerId}`);

    // Check if the player is an owner - scouts cannot unfollow owners
    const { data: ownerCheck, error: ownerCheckError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('user_id', playerId)
      .eq('role', 'owner')
      .maybeSingle();

    if (ownerCheckError) {
      console.error('[unfollow-player] Error checking owner status:', ownerCheckError);
    }

    if (ownerCheck) {
      console.log('[unfollow-player] Cannot unfollow owner');
      return new Response(
        JSON.stringify({ error: 'Cannot unfollow the owner' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the scout has a follow relationship with this player
    const { data: existingFollow, error: checkError } = await supabase
      .from('scout_follows')
      .select('id, status')
      .eq('scout_id', user.id)
      .eq('player_id', playerId)
      .maybeSingle();

    if (checkError) {
      console.error('[unfollow-player] Error checking follow:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify follow relationship' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingFollow) {
      return new Response(
        JSON.stringify({ error: 'Follow relationship not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the follow relationship
    const { error: deleteError } = await supabase
      .from('scout_follows')
      .delete()
      .eq('id', existingFollow.id);

    if (deleteError) {
      console.error('[unfollow-player] Error deleting follow:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to unfollow player' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[unfollow-player] Successfully unfollowed player ${playerId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[unfollow-player] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});