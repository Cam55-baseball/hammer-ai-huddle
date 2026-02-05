import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

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

    const { sessionId, deleteFromStorage } = await req.json();

    console.log('[delete-library-session] Request:', { sessionId, userId: user.id, deleteFromStorage });

    // Verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('videos')
      .select('user_id, video_url')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    const { data: ownerRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle();

    const isOwner = !!ownerRole;
    const isSessionOwner = session.user_id === user.id;

    if (!isSessionOwner && !isOwner) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to delete this session' }), 
        { status: 403, headers: corsHeaders }
      );
    }

    if (deleteFromStorage) {
      // Hard delete: remove from storage and database
      try {
        const urlParts = session.video_url.split('/videos/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0];
          console.log('[delete-library-session] Deleting from storage:', filePath);
          
          const { error: storageError } = await supabase.storage
            .from('videos')
            .remove([filePath]);
          
          if (storageError) {
            console.error('[delete-library-session] Storage delete error:', storageError);
          }
        }
      } catch (storageError) {
        console.error('[delete-library-session] Storage delete failed:', storageError);
      }
      
      const { error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('id', sessionId);
      
      if (deleteError) {
        console.error('[delete-library-session] Database delete error:', deleteError);
        throw deleteError;
      }
    } else {
      // Soft delete: just remove from library
      const { error: updateError } = await supabase
        .from('videos')
        .update({ saved_to_library: false })
        .eq('id', sessionId);
      
      if (updateError) {
        console.error('[delete-library-session] Update error:', updateError);
        throw updateError;
      }
    }

    console.log('[delete-library-session] Success');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[delete-library-session] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});