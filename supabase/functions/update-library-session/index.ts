import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
  title: z.string().trim().max(200, "Title must be less than 200 characters").optional(),
  notes: z.string().trim().max(5000, "Notes must be less than 5000 characters").optional(),
  sharedWithScouts: z.boolean().optional(),
  analysisPublic: z.boolean().optional(),
});

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

    // Validate input
    const body = await req.json();
    const { sessionId, title, notes, sharedWithScouts, analysisPublic } = requestSchema.parse(body);

    console.log('[update-library-session] Request:', { sessionId, userId: user.id });

    // Verify ownership or owner role
    const { data: session, error: sessionError } = await supabase
      .from('videos')
      .select('user_id')
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
        JSON.stringify({ error: 'Unauthorized to update this session' }), 
        { status: 403, headers: corsHeaders }
      );
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.library_title = title;
    if (notes !== undefined) updates.library_notes = notes;
    if (sharedWithScouts !== undefined) updates.shared_with_scouts = sharedWithScouts;
    if (analysisPublic !== undefined) updates.analysis_public = analysisPublic;

    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('[update-library-session] Error:', error);
      throw error;
    }

    console.log('[update-library-session] Success');

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[update-library-session] Error:', error);
    
    // Return validation errors with 400 status
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Validation error", details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});