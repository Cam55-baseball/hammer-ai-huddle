import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No auth');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) throw new Error('Unauthorized');

    const url = new URL(req.url);
    const reportId = url.searchParams.get('id');

    if (reportId) {
      const { data, error } = await supabase
        .from('follower_reports')
        .select('*')
        .eq('id', reportId)
        .eq('follower_id', user.id)
        .maybeSingle();
      if (error) throw error;

      // Hydrate player profile
      let player = null;
      if (data?.player_id) {
        const { data: p } = await supabase.from('profiles')
          .select('id, full_name, avatar_url, sport, primary_position, position, hs_grad_year')
          .eq('id', data.player_id).maybeSingle();
        player = p;
      }
      return new Response(JSON.stringify({ report: data, player }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List inbox
    const { data: reports, error } = await supabase
      .from('follower_reports')
      .select('id, player_id, follower_role, report_type, period_start, period_end, headline, status, viewed_at, created_at')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    const playerIds = [...new Set((reports ?? []).map((r: any) => r.player_id))];
    const { data: players } = playerIds.length
      ? await supabase.from('profiles').select('id, full_name, avatar_url, sport, primary_position, position').in('id', playerIds)
      : { data: [] as any[] };
    const playerMap = new Map((players ?? []).map((p: any) => [p.id, p]));

    return new Response(JSON.stringify({
      reports: (reports ?? []).map((r: any) => ({ ...r, player: playerMap.get(r.player_id) ?? null })),
      unread_count: (reports ?? []).filter((r: any) => !r.viewed_at).length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
