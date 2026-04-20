// Recompute video performance metrics from user outcomes + reinforce/deactivate
// discovered rules based on empirical effectiveness.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // ---- 1. Recompute per-video metrics ----
    const { data: outcomes, error } = await supabase
      .from('video_user_outcomes')
      .select('video_id, watched_at, watch_seconds, post_score_delta');
    if (error) throw error;

    const agg = new Map<string, {
      suggestion_count: number;
      watch_count: number;
      total_watch_seconds: number;
      post_view_improvement_sum: number;
      post_view_improvement_n: number;
    }>();

    for (const o of outcomes || []) {
      const cur = agg.get(o.video_id) || {
        suggestion_count: 0, watch_count: 0, total_watch_seconds: 0,
        post_view_improvement_sum: 0, post_view_improvement_n: 0,
      };
      cur.suggestion_count += 1;
      if (o.watched_at) cur.watch_count += 1;
      if (o.watch_seconds) cur.total_watch_seconds += o.watch_seconds;
      if (o.post_score_delta !== null && o.post_score_delta !== undefined) {
        cur.post_view_improvement_sum += Number(o.post_score_delta);
        cur.post_view_improvement_n += 1;
      }
      agg.set(o.video_id, cur);
    }

    const rows = Array.from(agg.entries()).map(([video_id, v]) => ({
      video_id,
      ...v,
      last_recomputed_at: new Date().toISOString(),
    }));

    if (rows.length) {
      const { error: upErr } = await supabase
        .from('video_performance_metrics')
        .upsert(rows, { onConflict: 'video_id' });
      if (upErr) throw upErr;
    }

    // ---- 2. Reinforce/deactivate discovered rules ----
    const { data: rules } = await supabase
      .from('video_tag_rules')
      .select('id, skill_domain, movement_key, correction_key, strength, active')
      .eq('notes', 'discovered_v1')
      .eq('active', true);

    let deactivated = 0;
    let boosted = 0;

    for (const rule of rules || []) {
      // Find videos tagged with this correction in this domain
      const { data: tagRows } = await supabase
        .from('video_tag_taxonomy')
        .select('id')
        .eq('layer', 'correction')
        .eq('key', rule.correction_key)
        .eq('skill_domain', rule.skill_domain);
      const tagIds = (tagRows || []).map((t: any) => t.id);
      if (!tagIds.length) continue;

      const { data: assigns } = await supabase
        .from('video_tag_assignments')
        .select('video_id')
        .in('tag_id', tagIds);
      const videoIds = Array.from(new Set((assigns || []).map((a: any) => a.video_id)));
      if (!videoIds.length) continue;

      const { data: ruleOutcomes } = await supabase
        .from('video_user_outcomes')
        .select('post_score_delta')
        .in('video_id', videoIds)
        .not('post_score_delta', 'is', null);

      const samples = ruleOutcomes || [];
      if (samples.length < 20) continue;
      const avg = samples.reduce((s: number, o: any) => s + Number(o.post_score_delta), 0) / samples.length;

      if (avg < 0) {
        await supabase.from('video_tag_rules').update({ active: false }).eq('id', rule.id);
        await supabase.from('audit_log').insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          action: 'rule_auto_deactivated',
          table_name: 'video_tag_rules',
          record_id: rule.id,
          metadata: { reason: 'negative_improvement', avg, samples: samples.length },
        });
        deactivated += 1;
      } else if (avg > 8 && rule.strength < 10) {
        const newStrength = Math.min(10, rule.strength + 1);
        await supabase.from('video_tag_rules').update({ strength: newStrength }).eq('id', rule.id);
        boosted += 1;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed: rows.length, deactivated, boosted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('recompute-video-metrics error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
