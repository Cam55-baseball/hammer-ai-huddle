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

    const targetUserId = playerId || user.id;

    // --- Video sessions query ---
    let videoQuery = supabase
      .from('videos')
      .select(`
        *,
        annotation_count:video_annotations(count)
      `)
      .eq('saved_to_library', true)
      .order('session_date', { ascending: false });

    if (playerId) {
      videoQuery = videoQuery.eq('user_id', playerId);
      
      if (!isOwner) {
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
        
        videoQuery = videoQuery.eq('shared_with_scouts', true);
      }
    } else {
      videoQuery = videoQuery.eq('user_id', user.id);
    }

    const { data: videoData, error: videoError } = await videoQuery;

    if (videoError) {
      console.error('[get-player-library] Video error:', videoError);
      throw videoError;
    }

    // --- Practice sessions query (Players Club is video-only going forward; only legacy entries appear) ---
    let practiceQuery = supabase
      .from('performance_sessions')
      .select('id, user_id, sport, session_type, session_date, module, drill_blocks, notes, composite_indexes, coach_grade, created_at, season_context, legacy_in_players_club')
      .eq('user_id', targetUserId)
      .eq('legacy_in_players_club', true)
      .is('deleted_at', null)
      .order('session_date', { ascending: false });

    const { data: practiceData, error: practiceError } = await practiceQuery;

    if (practiceError) {
      console.error('[get-player-library] Practice error:', practiceError);
      throw practiceError;
    }

    // --- Completed games query (Players Club is video-only going forward; only legacy entries appear) ---
    let gameQuery = supabase
      .from('games')
      .select('id, user_id, sport, team_name, opponent_name, game_type, league_level, game_date, venue, total_innings, lineup, game_summary, game_mode, is_practice_game, status, created_at, legacy_in_players_club')
      .eq('user_id', targetUserId)
      .eq('status', 'completed')
      .eq('legacy_in_players_club', true)
      .order('game_date', { ascending: false });

    const { data: gameData, error: gameError } = await gameQuery;

    if (gameError) {
      console.error('[get-player-library] Game error:', gameError);
      throw gameError;
    }

    // Tag sources
    let videoResults = (videoData || []).map(v => ({ ...v, source: 'video' }));
    const practiceResults = (practiceData || []).map(p => ({ ...p, source: 'practice' }));
    const gameResults = (gameData || []).map(g => ({ ...g, source: 'game' }));
    // For scouts viewing other players, filter out private video data
    if (isScout && !isOwner && playerId && playerId !== user.id) {
      videoResults = videoResults.map(session => {
        const { efficiency_score, ...rest } = session;
        if (!session.analysis_public) {
          const { ai_analysis, ...restWithoutAnalysis } = rest;
          return restWithoutAnalysis;
        }
        return rest;
      });
    }

    const responseData = { videos: videoResults, practices: practiceResults, games: gameResults };

    console.log('[get-player-library] Success:', { videos: videoResults.length, practices: practiceResults.length, games: gameResults.length });

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
