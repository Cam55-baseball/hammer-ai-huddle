// Recompute video performance metrics from user outcomes.
// Runs nightly via cron. Aggregates suggestion_count, watch_count, total_watch_seconds,
// and post_view_improvement_sum/n per video.
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Pull all outcomes
    const { data: outcomes, error } = await supabase
      .from('video_user_outcomes')
      .select('video_id, watched_at, watch_seconds, post_score_delta');
    if (error) throw error;

    // Aggregate
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

    // Upsert
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

    return new Response(JSON.stringify({ ok: true, processed: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('recompute-video-metrics error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
