import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[get-scout-pending-reviews] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scoutId = user.id;
    console.log('[get-scout-pending-reviews] Scout ID:', scoutId);

    // Check if user is a scout or coach
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', scoutId)
      .eq('role', 'scout')
      .maybeSingle();

    if (roleError) {
      console.error('[get-scout-pending-reviews] Role check error:', roleError);
    }

    // Get all followed players (accepted follows only)
    const { data: follows, error: followsError } = await supabase
      .from('scout_follows')
      .select('player_id')
      .eq('scout_id', scoutId)
      .eq('status', 'accepted');

    if (followsError) {
      console.error('[get-scout-pending-reviews] Follows error:', followsError);
      return new Response(
        JSON.stringify({ error: 'Failed to get follows' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!follows || follows.length === 0) {
      console.log('[get-scout-pending-reviews] No followed players');
      return new Response(
        JSON.stringify({ players: [], totalUnreviewed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const playerIds = follows.map(f => f.player_id);
    console.log('[get-scout-pending-reviews] Player IDs:', playerIds);

    // Get all videos shared with scouts from followed players
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, user_id, created_at, library_title')
      .in('user_id', playerIds)
      .eq('shared_with_scouts', true)
      .eq('saved_to_library', true);

    if (videosError) {
      console.error('[get-scout-pending-reviews] Videos error:', videosError);
      return new Response(
        JSON.stringify({ error: 'Failed to get videos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!videos || videos.length === 0) {
      console.log('[get-scout-pending-reviews] No shared videos');
      return new Response(
        JSON.stringify({ players: [], totalUnreviewed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get already reviewed videos by this scout
    const videoIds = videos.map(v => v.id);
    const { data: reviewed, error: reviewedError } = await supabase
      .from('scout_video_reviews')
      .select('video_id')
      .eq('scout_id', scoutId)
      .in('video_id', videoIds);

    if (reviewedError) {
      console.error('[get-scout-pending-reviews] Reviewed error:', reviewedError);
    }

    const reviewedVideoIds = new Set((reviewed || []).map(r => r.video_id));

    // Count unreviewed videos per player
    const playerVideoCount: Record<string, { count: number; latestVideo: string }> = {};
    
    for (const video of videos) {
      if (!reviewedVideoIds.has(video.id)) {
        if (!playerVideoCount[video.user_id]) {
          playerVideoCount[video.user_id] = { count: 0, latestVideo: video.created_at };
        }
        playerVideoCount[video.user_id].count++;
        if (video.created_at > playerVideoCount[video.user_id].latestVideo) {
          playerVideoCount[video.user_id].latestVideo = video.created_at;
        }
      }
    }

    // Get player profiles for those with unreviewed videos
    const playersWithVideos = Object.keys(playerVideoCount);
    
    if (playersWithVideos.length === 0) {
      console.log('[get-scout-pending-reviews] No unreviewed videos');
      return new Response(
        JSON.stringify({ players: [], totalUnreviewed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', playersWithVideos);

    if (profilesError) {
      console.error('[get-scout-pending-reviews] Profiles error:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to get profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build response with player info and video counts
    const players = (profiles || []).map(profile => ({
      id: profile.id,
      name: profile.full_name || 'Unknown Player',
      avatarUrl: profile.avatar_url,
      unreviewedCount: playerVideoCount[profile.id]?.count || 0,
      latestVideoDate: playerVideoCount[profile.id]?.latestVideo || null,
    })).sort((a, b) => {
      // Sort by latest video date (most recent first)
      if (!a.latestVideoDate) return 1;
      if (!b.latestVideoDate) return -1;
      return new Date(b.latestVideoDate).getTime() - new Date(a.latestVideoDate).getTime();
    });

    const totalUnreviewed = players.reduce((sum, p) => sum + p.unreviewedCount, 0);

    console.log('[get-scout-pending-reviews] Returning players:', players.length, 'total unreviewed:', totalUnreviewed);

    return new Response(
      JSON.stringify({ players, totalUnreviewed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-scout-pending-reviews] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
