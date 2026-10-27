import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import { hasActiveSubscription, isPlatformStaff, forbidden } from '../_shared/authGuards.ts';
import { recruitingGate } from '../_shared/recruitingGate.ts';
import { hasReadableReport } from '../_shared/analysisReliability.ts';
import { isAnalysisType } from '../_shared/analysisTypes.ts';

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
  saveToLibrary: z.boolean().optional(),
  requireAnalysis: z.boolean().optional(),
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
    const { sessionId, title, notes, sharedWithScouts, analysisPublic, saveToLibrary, requireAnalysis } = requestSchema.parse(body);

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

    const isPlatformOwner = await isPlatformStaff(supabase, user.id);
    const isSessionOwner = session.user_id === user.id;

    // Own data only. Platform owner retains an administrative override.
    if (!isSessionOwner && !isPlatformOwner) {
      return forbidden('Unauthorized to update this session', corsHeaders);
    }
    if (!isSessionOwner) {
      const scope = await recruitingGate(supabase, user.id, [session.user_id], 'video');
      if (scope.get(session.user_id) !== 'visible') return forbidden('This video is not shared with you', corsHeaders);
    }

    // Paid feature: an active subscription is required (owner exempt).
    if (!isPlatformOwner && !(await hasActiveSubscription(supabase, user.id))) {
      return forbidden('An active subscription is required', corsHeaders);
    }


    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    if (saveToLibrary) {
      const { data: clip, error: clipError } = await supabase.from('videos')
        .select('video_url,module,ai_analysis').eq('id', sessionId).eq('user_id', session.user_id).single();
      if (clipError || !clip?.video_url || (requireAnalysis && (!isAnalysisType(clip.module) || !hasReadableReport(clip.ai_analysis)))) {
        return new Response(JSON.stringify({ error: 'Your video and report could not both be confirmed. Nothing was added to Players Club.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      updates.saved_to_library = true;
      updates.session_date = new Date().toISOString();
    }

    if (title !== undefined) updates.library_title = title;
    if (notes !== undefined) updates.library_notes = notes;
    if (sharedWithScouts !== undefined) updates.shared_with_scouts = sharedWithScouts;
    if (analysisPublic !== undefined) updates.analysis_public = analysisPublic;

    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', session.user_id)

      .select('id,saved_to_library')
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