// Save-Streak Edge Function
// One-tap minimal completion that protects the streak by logging the
// smallest available non-negotiable activity for today.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    let userId: string | null = null;
    try {
      const body = await req.json();
      if (body?.user_id) userId = body.user_id;
    } catch (_) { /* no body */ }

    if (!userId) {
      const auth = req.headers.get('Authorization');
      if (auth) {
        const token = auth.replace('Bearer ', '');
        const { data: u } = await supabase.auth.getUser(token);
        userId = u?.user?.id ?? null;
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'No user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
