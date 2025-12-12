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

    const { videoId, playerId } = await req.json();

    if (!videoId || !playerId) {
      return new Response(
        JSON.stringify({ error: 'Missing videoId or playerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[mark-video-reviewed] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scoutId = user.id;
    console.log('[mark-video-reviewed] Scout ID:', scoutId, 'Video ID:', videoId);

    // Verify scout follows this player with accepted status
    const { data: follow, error: followError } = await supabase
      .from('scout_follows')
      .select('id')
      .eq('scout_id', scoutId)
      .eq('player_id', playerId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (followError || !follow) {
      console.error('[mark-video-reviewed] Not following player:', followError);
      return new Response(
        JSON.stringify({ error: 'Not authorized to review this player\'s videos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the review record (upsert to avoid duplicates)
    const { error: insertError } = await supabase
      .from('scout_video_reviews')
      .upsert({
        scout_id: scoutId,
        video_id: videoId,
        player_id: playerId,
        reviewed_at: new Date().toISOString(),
      }, {
        onConflict: 'scout_id,video_id',
      });

    if (insertError) {
      console.error('[mark-video-reviewed] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to mark video as reviewed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[mark-video-reviewed] Successfully marked video as reviewed');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mark-video-reviewed] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
