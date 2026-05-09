// Foundation Alert Retention — Phase I.
// Daily cron: deletes resolved foundation_health_alerts older than the
// retention window. UNRESOLVED alerts can NEVER be touched (hard guard
// via .not('resolved_at','is',null) AND .lt('resolved_at', cutoff)).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { ALERT_RETENTION_DAYS } from '../_shared/foundationThresholds.ts';

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

  try {
    const cutoff = new Date(Date.now() - ALERT_RETENTION_DAYS * 86_400_000).toISOString();

    const { data, error } = await supabase
      .from('foundation_health_alerts')
      .delete()
      .not('resolved_at', 'is', null)   // HARD GUARD: never touch open alerts
      .lt('resolved_at', cutoff)        // age window
      .select('id');

    if (error) throw error;
    const deleted = (data ?? []).length;

    await supabase.from('foundation_cron_heartbeats').insert({
      function_name: 'foundation-alert-retention',
      duration_ms: Date.now() - t0,
      status: 'ok',
      metadata: { deleted, cutoff, retention_days: ALERT_RETENTION_DAYS },
    });

    return new Response(JSON.stringify({ ok: true, deleted, cutoff }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    await supabase.from('foundation_cron_heartbeats').insert({
      function_name: 'foundation-alert-retention',
      duration_ms: Date.now() - t0,
      status: 'error',
      error: String((e as Error).message ?? e),
    });
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
