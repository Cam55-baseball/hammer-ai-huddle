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

    const { videoId, playerId, annotationData, originalFrameData, notes, frameTimestamp, isSelfAnnotation } = await req.json();

    console.log('[save-video-annotation] Request:', { userId: user.id, videoId, playerId, isSelfAnnotation });

    // Check if this is a self-annotation (player annotating their own video)
    const isSelf = isSelfAnnotation || user.id === playerId;

    if (isSelf) {
      // Verify user owns the video
      const { data: videoData } = await supabase
        .from('videos')
        .select('user_id')
        .eq('id', videoId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (!videoData) {
        return new Response(
          JSON.stringify({ error: 'Video not found or not owned by you' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Insert self-annotation (scout_id is null, annotator_type is 'player')
      const { data: annotation, error: insertError } = await supabase
        .from('video_annotations')
        .insert({
          video_id: videoId,
          scout_id: null,
          player_id: user.id,
          annotation_data: annotationData,
          original_frame_data: originalFrameData,
          notes,
          frame_timestamp: frameTimestamp,
          annotator_type: 'player'
        })
        .select()
        .single();

      if (insertError) {
        console.error('[save-video-annotation] Error:', insertError);
        throw insertError;
      }

      console.log('[save-video-annotation] Self-annotation success:', annotation.id);

      return new Response(
        JSON.stringify(annotation),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Scout annotation - verify follow relationship
      const { data: followData } = await supabase
        .from('scout_follows')
        .select('status')
        .eq('scout_id', user.id)
        .eq('player_id', playerId)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!followData) {
        return new Response(
          JSON.stringify({ error: 'You must have an accepted follow relationship with this player' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify video belongs to player
      const { data: videoData } = await supabase
        .from('videos')
        .select('user_id')
        .eq('id', videoId)
        .maybeSingle();

      if (!videoData || videoData.user_id !== playerId) {
        return new Response(
          JSON.stringify({ error: 'Video not found or does not belong to this player' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert scout annotation
      const { data: annotation, error: insertError } = await supabase
        .from('video_annotations')
        .insert({
          video_id: videoId,
          scout_id: user.id,
          player_id: playerId,
          annotation_data: annotationData,
          original_frame_data: originalFrameData,
          notes,
          frame_timestamp: frameTimestamp,
          annotator_type: 'scout'
        })
        .select()
        .single();

      if (insertError) {
        console.error('[save-video-annotation] Error:', insertError);
        throw insertError;
      }

      console.log('[save-video-annotation] Scout annotation success:', annotation.id);

      return new Response(
        JSON.stringify(annotation),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[save-video-annotation] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
