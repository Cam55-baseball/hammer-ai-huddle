import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import { hasActiveRole, hasActiveSubscription, forbidden } from '../_shared/authGuards.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const { sessionId } = await req.json();

    console.log('[download-session-video] Request:', { sessionId, userId: user.id });

    const { data: session, error: sessionError } = await supabase
      .from('videos')
      .select('user_id, video_url, shared_with_scouts')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Check permissions
    const isPlatformOwner = await hasActiveRole(supabase, user.id, 'owner');
    const isPlayer = session.user_id === user.id;

    let hasAccess = isPlatformOwner || isPlayer;

    if (!hasAccess) {
      // Scout with an accepted follow may download a video the athlete
      // explicitly shared with scouts.
      const isScout = await hasActiveRole(supabase, user.id, 'scout');

      if (isScout) {
        const { data: followData } = await supabase
          .from('scout_follows')
          .select('status')
          .eq('scout_id', user.id)
          .eq('player_id', session.user_id)
          .eq('status', 'accepted')
          .maybeSingle();

        hasAccess = !!followData && session.shared_with_scouts;
      }
    }

    if (!hasAccess) {
      return forbidden('Unauthorized to download this video', corsHeaders);
    }

    // Paid feature: an active subscription is required (owner exempt).
    if (!isPlatformOwner && !(await hasActiveSubscription(supabase, user.id))) {
      return forbidden('An active subscription is required', corsHeaders);
    }


    // Extract file path from URL
    const urlParts = session.video_url.split('/videos/');
    if (urlParts.length < 2) {
      throw new Error('Invalid video URL');
    }
    
    const filePath = urlParts[1].split('?')[0];
    console.log('[download-session-video] Generating signed URL for:', filePath);

    // Generate signed URL for download (60 second expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('videos')
      .createSignedUrl(filePath, 300); // 5 minutes

    if (signedUrlError) {
      console.error('[download-session-video] Signed URL error:', signedUrlError);
      throw signedUrlError;
    }

    console.log('[download-session-video] Success');

    return new Response(
      JSON.stringify({ downloadUrl: signedUrlData.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[download-session-video] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});