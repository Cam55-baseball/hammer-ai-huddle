// daily-trace-prune — Wave E + Phase G heartbeat.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const t0 = Date.now();
  const { error: tracesErr } = await supabase.rpc('cleanup_old_foundation_traces');
  const { error: decisionsErr } = await supabase.rpc('cleanup_old_foundation_decisions');
  const errMsg = [tracesErr?.message, decisionsErr?.message].filter(Boolean).join(' | ') || null;
  await supabase.from('foundation_cron_heartbeats').insert({
    function_name: 'daily-trace-prune',
    duration_ms: Date.now() - t0,
    status: errMsg ? 'error' : 'ok',
    error: errMsg,
    metadata: {
      traces_cleanup: tracesErr ? 'error' : 'ok',
      decisions_cleanup: decisionsErr ? 'error' : 'ok',
    },
  });
  if (errMsg) {
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
