// hourly-trigger-decay — Wave E.
// Decays confidence on unresolved foundation_trigger_events; auto-resolves
// when confidence drops to/below 0.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DECAY_PER_HOUR = 0.1 / 24; // matches CONFIDENCE_DECAY_PER_DAY

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('foundation_trigger_events')
    .select('id, confidence, fired_at')
    .is('resolved_at', null)
    .limit(5000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  let decayed = 0; let resolved = 0;
  for (const r of data ?? []) {
    const hoursSince = (now.getTime() - new Date(r.fired_at).getTime()) / 3_600_000;
    const newConf = Math.max(0, (r.confidence ?? 0) - DECAY_PER_HOUR * hoursSince);
    if (newConf <= 0) {
      await supabase
        .from('foundation_trigger_events')
        .update({ resolved_at: now.toISOString(), resolution_reason: 'confidence_decayed', confidence: 0 })
        .eq('id', r.id);
      resolved += 1;
    } else if (Math.abs(newConf - (r.confidence ?? 0)) > 0.05) {
      await supabase
        .from('foundation_trigger_events')
        .update({ confidence: Math.round(newConf * 1000) / 1000 })
        .eq('id', r.id);
      decayed += 1;
    }
  }

  return new Response(JSON.stringify({ ok: true, decayed, resolved }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
