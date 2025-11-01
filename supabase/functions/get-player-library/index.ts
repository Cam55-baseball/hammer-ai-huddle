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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { playerId } = await req.json();

    console.log('[get-player-library] Request:', { userId: user.id, playerId });

    // Check if requester is owner
    const { data: ownerRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle();

    const isOwner = !!ownerRole;

    // Check if requester is scout
    const { data: scoutRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'scout')
      .maybeSingle();

    const isScout = !!scoutRole;

    let query = supabase
      .from('videos')
      .select('*')
      .eq('saved_to_library', true)
      .order('session_date', { ascending: false });

    if (playerId) {
      // Viewing another player's library
      query = query.eq('user_id', playerId);
      
      if (!isOwner) {
        // Scouts can only see shared sessions from accepted follows
        const { data: followData } = await supabase
          .from('scout_follows')
          .select('status')
          .eq('scout_id', user.id)
          .eq('player_id', playerId)
          .eq('status', 'accepted')
          .maybeSingle();
        
        if (!followData) {
          return new Response(
            JSON.stringify({ error: 'You must have an accepted follow relationship to view this library' }), 
            { status: 403, headers: corsHeaders }
          );
        }
        
        query = query.eq('shared_with_scouts', true);
      }
    } else {
      // Viewing own library
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[get-player-library] Error:', error);
      throw error;
    }

    // For scouts viewing other players, filter out efficiency_score
    let responseData = data;
    if (isScout && !isOwner && playerId && playerId !== user.id) {
      responseData = data.map(session => {
        const { efficiency_score, ...rest } = session;
        return rest;
      });
    }

    console.log('[get-player-library] Success:', { count: responseData?.length });

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[get-player-library] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});