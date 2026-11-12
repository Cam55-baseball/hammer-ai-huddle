// Save-Streak Edge Function
// One-tap minimal completion that protects the streak by logging the
// smallest available non-negotiable activity for today.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { bearerOf, isServiceRoleBearer, streakUserId } from '../_shared/auth/callerScope.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Owner Nov 12 (security batch 1): the player's id comes from the signed-in token only.
  // A user_id in the body counts only when the caller presents the service-role key.
  // Signed-out callers are refused before any write.
  const unauthorized = () => new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const bearer = bearerOf(req.headers);
  if (!bearer) return unauthorized();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceKey,
      { auth: { persistSession: false } }
    );

    const serviceRole = await isServiceRoleBearer(req.headers, serviceKey);
    let signedInUserId: string | null = null;
    if (!serviceRole) {
      const { data: u } = await supabase.auth.getUser(bearer);
      signedInUserId = u?.user?.id ?? null;
      if (!signedInUserId) return unauthorized();
    }
    let bodyUserId: unknown = null;
    try {
      const body = await req.json();
      bodyUserId = body?.user_id ?? null;
    } catch (_) { /* no body */ }

    const who = streakUserId({ serviceRole, signedInUserId, bodyUserId });
    if (!who.ok) return unauthorized();
    const userId = who.userId!;

    const today = new Date().toISOString().split('T')[0];

    // Find smallest non-negotiable template for this user
    const { data: templates } = await supabase
      .from('custom_activity_templates')
      .select('id, title, duration_minutes')
      .eq('user_id', userId)
      .eq('is_non_negotiable', true)
      .is('deleted_at', null)
      .order('duration_minutes', { ascending: true, nullsFirst: true })
      .limit(1);

    const template = templates?.[0];
    if (!template) {
      return new Response(
        JSON.stringify({ ok: false, message: 'No non-negotiable template found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log completion
    const { error: logErr } = await supabase.from('custom_activity_logs').insert({
      user_id: userId,
      template_id: template.id,
      entry_date: today,
      completed: true,
      completed_at: new Date().toISOString(),
      completion_state: 'completed',
      completion_method: 'save_streak',
    });
    if (logErr) throw logErr;

    // Trigger recompute
    await Promise.all([
      supabase.functions.invoke('evaluate-behavioral-state', { body: { user_id: userId } }),
      supabase.functions.invoke('compute-hammer-state', { body: { user_id: userId } }),
    ]).catch(() => {});

    return new Response(
      JSON.stringify({ ok: true, template_id: template.id, message: 'Streak saved' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
