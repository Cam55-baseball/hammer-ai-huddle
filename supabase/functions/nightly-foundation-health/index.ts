// nightly-foundation-health — Wave D content health scoring.
// Scans foundation videos in pages, scores 0–100, writes flags.
// Idempotent + resumable via {cursor: lastVideoId}.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAGE_SIZE = 25;
const ZERO_ENGAGEMENT_DAYS = 30;

interface HealthInput {
  id: string;
  title: string | null;
  video_url: string | null;
  foundation_meta: any;
  foundation_effectiveness: any;
  shownCount: number;
  clickCount: number;
  avgCompletion: number | null;
}

function scoreHealth(v: HealthInput): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 100;

  // Broken / missing URL
  if (!v.video_url || !String(v.video_url).trim()) {
    flags.push('missing_url');
    score -= 50;
  }

  // Malformed meta (required fields)
  const meta = v.foundation_meta;
  const metaOk = meta
    && typeof meta === 'object'
    && typeof meta.domain === 'string'
    && typeof meta.scope === 'string'
    && Array.isArray(meta.audience_levels) && meta.audience_levels.length > 0
    && Array.isArray(meta.refresher_triggers) && meta.refresher_triggers.length > 0;
  if (!metaOk) {
    flags.push('malformed_meta');
    score -= 35;
  }

  // Zero engagement in 30d (only meaningful if we've shown it)
  if (v.shownCount === 0) {
    flags.push('never_surfaced_30d');
    score -= 10;
  } else if (v.clickCount === 0) {
    flags.push('zero_engagement_30d');
    score -= 20;
  }

  // Ultra-low completion
  if (v.avgCompletion !== null && v.avgCompletion < 0.15 && v.clickCount >= 5) {
    flags.push('ultra_low_completion');
    score -= 15;
  }

  // Missing effectiveness data after enough engagement
  const eff = v.foundation_effectiveness;
  const hasByTrigger = eff && typeof eff === 'object' && eff.byTrigger && Object.keys(eff.byTrigger).length > 0;
  if (v.clickCount >= 20 && !hasByTrigger) {
    flags.push('effectiveness_stale');
    score -= 5;
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), flags };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const t0 = Date.now();

  let cursor: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    cursor = typeof body?.cursor === 'string' ? body.cursor : null;
  } catch { /* ignore */ }

  let q = supabase
    .from('library_videos')
    .select('id, title, video_url, foundation_meta, foundation_effectiveness')
    .eq('video_class', 'foundation')
    .order('id', { ascending: true })
    .limit(PAGE_SIZE);
  if (cursor) q = q.gt('id', cursor);

  const { data: videos, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!videos || videos.length === 0) {
    return new Response(JSON.stringify({ done: true, processed: 0, nextCursor: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const since = new Date(Date.now() - ZERO_ENGAGEMENT_DAYS * 86_400_000).toISOString();
  const ids = videos.map(v => v.id);

  const { data: outcomes } = await supabase
    .from('foundation_video_outcomes')
    .select('video_id, clicked_at, watched_seconds, completion_pct')
    .in('video_id', ids)
    .gte('shown_at', since)
    .limit(20_000);

  const stats = new Map<string, { shown: number; clicks: number; comp: number; compN: number }>();
  for (const id of ids) stats.set(id, { shown: 0, clicks: 0, comp: 0, compN: 0 });
  for (const o of outcomes ?? []) {
    const s = stats.get(o.video_id);
    if (!s) continue;
    s.shown += 1;
    if (o.clicked_at) s.clicks += 1;
    if (typeof o.completion_pct === 'number') {
      s.comp += o.completion_pct / 100;
      s.compN += 1;
    }
  }

  let processed = 0;
  for (const v of videos) {
    const s = stats.get(v.id)!;
    const avgCompletion = s.compN > 0 ? s.comp / s.compN : null;
    const { score, flags } = scoreHealth({
      id: v.id,
      title: v.title,
      video_url: v.video_url,
      foundation_meta: v.foundation_meta,
      foundation_effectiveness: v.foundation_effectiveness,
      shownCount: s.shown,
      clickCount: s.clicks,
      avgCompletion,
    });
    const { error: uErr } = await supabase
      .from('library_videos')
      .update({
        foundation_health_score: score,
        foundation_health_flags: flags,
        foundation_health_checked_at: new Date().toISOString(),
      })
      .eq('id', v.id);
    if (uErr) console.warn('health write failed', v.id, uErr.message);
    processed += 1;
  }

  const nextCursor = videos.length === PAGE_SIZE ? videos[videos.length - 1].id : null;
  await supabase.from('foundation_cron_heartbeats').insert({
    function_name: 'nightly-foundation-health',
    duration_ms: Date.now() - t0,
    status: 'ok',
    metadata: { processed, done: nextCursor === null },
  });
  return new Response(JSON.stringify({ done: nextCursor === null, processed, nextCursor }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
