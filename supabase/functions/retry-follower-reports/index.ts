import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Pull failed + retryable logs older than 5 minutes (limit 50)
    const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: failed, error } = await supabase
      .from('follower_report_logs')
      .select('follower_id, player_id, report_type, created_at')
      .eq('status', 'failed')
      .eq('retryable', true)
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw error;

    if (!failed || failed.length === 0) {
      return new Response(JSON.stringify({ ok: true, retried: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Dedupe by (follower_id, player_id, report_type)
    const seen = new Set<string>();
    const targets: Array<{ follower_id: string; player_id: string; report_type: string }> = [];
    for (const f of failed) {
      const k = `${f.follower_id}|${f.player_id}|${f.report_type}`;
      if (seen.has(k)) continue;
      seen.add(k);
      targets.push({ follower_id: f.follower_id, player_id: f.player_id, report_type: f.report_type });
    }

    // Fire generator with retry_targets
    const r = await fetch(`${SUPABASE_URL}/functions/v1/generate-follower-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({ retry_targets: targets }),
    });
    const result = await r.json().catch(() => ({}));

    return new Response(JSON.stringify({ ok: true, retried: targets.length, generator: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[retry-follower-reports]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
