// recompute-foundation-effectiveness — Wave C nightly aggregator.
// Walks foundation_video_outcomes from the last 90d, aggregates per
// (video_id, trigger) pair, and writes a bounded byTrigger map onto
// library_videos.foundation_effectiveness.
//
// Idempotent (always overwrites with current 90d truth).
// Resumable via continuation token (cursor on video_id).
//
// Standards followed: Deno.serve, persistSession=false, dual-auth,
// system user 00000000-0000-0000-0000-000000000001 excluded.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_USER = '00000000-0000-0000-0000-000000000001';
const LOOKBACK_DAYS = 90;
const MIN_SAMPLE = 5;          // emit a stat only after at least 5 outcomes
const SCORER_TRUST_SAMPLE = 20; // scorer ignores until n>=20 (separate gate)
const PAGE_SIZE = 25;          // videos processed per invocation

interface OutcomeRow {
  video_id: string;
  trigger_keys: string[] | null;
  clicked_at: string | null;
  watched_seconds: number | null;
  helped_flag: boolean | null;
  rewatched: boolean | null;
  helpful_vote: number | null;
  trigger_resolved_within_7d: boolean | null;
  shown_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  let cursor: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    cursor = typeof body?.cursor === 'string' ? body.cursor : null;
  } catch { /* ignore */ }

  // Page through foundation videos
  const videoQuery = supabase
    .from('library_videos')
    .select('id')
    .eq('video_class', 'foundation')
    .order('id', { ascending: true })
    .limit(PAGE_SIZE);
  if (cursor) videoQuery.gt('id', cursor);

  const { data: videos, error: vErr } = await videoQuery;
  if (vErr) {
    return new Response(JSON.stringify({ error: vErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!videos || videos.length === 0) {
    return new Response(JSON.stringify({ done: true, processed: 0, nextCursor: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const ids = videos.map(v => v.id);
  const { data: outcomes, error: oErr } = await supabase
    .from('foundation_video_outcomes')
    .select('video_id, trigger_keys, clicked_at, watched_seconds, helped_flag, rewatched, helpful_vote, trigger_resolved_within_7d, shown_at')
    .in('video_id', ids)
    .neq('user_id', SYSTEM_USER)
    .gte('shown_at', since)
    .limit(20_000);

  if (oErr) {
    return new Response(JSON.stringify({ error: oErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Aggregate per (video_id, trigger).
  const agg = new Map<string, Map<string, {
    n: number; resolved: number; rewatch: number; helpful: number; helpedFlag: number;
  }>>();

  for (const r of (outcomes ?? []) as OutcomeRow[]) {
    if (!r.clicked_at) continue; // only count actual engagements
    const triggers = (r.trigger_keys && r.trigger_keys.length > 0) ? r.trigger_keys : ['__none__'];
    let perVideo = agg.get(r.video_id);
    if (!perVideo) { perVideo = new Map(); agg.set(r.video_id, perVideo); }
    for (const t of triggers) {
      let s = perVideo.get(t);
      if (!s) { s = { n: 0, resolved: 0, rewatch: 0, helpful: 0, helpedFlag: 0 }; perVideo.set(t, s); }
      s.n += 1;
      if (r.trigger_resolved_within_7d) s.resolved += 1;
      if (r.rewatched) s.rewatch += 1;
      if ((r.helpful_vote ?? 0) > 0) s.helpful += 1;
      if (r.helped_flag) s.helpedFlag += 1;
    }
  }

  // Build byTrigger payload + write back per video.
  let processed = 0;
  for (const id of ids) {
    const perVideo = agg.get(id);
    const byTrigger: Record<string, {
      resolveRate: number; rewatchRate: number; helpRate: number; sample_n: number;
    }> = {};
    if (perVideo) {
      for (const [t, s] of perVideo.entries()) {
        if (s.n < MIN_SAMPLE) continue;
        byTrigger[t] = {
          resolveRate: round3(s.resolved / s.n),
          rewatchRate: round3(s.rewatch / s.n),
          helpRate: round3((s.helpful + s.helpedFlag) / (2 * s.n)),
          sample_n: s.n,
        };
      }
    }
    const payload = {
      version: 1,
      computedAt: new Date().toISOString(),
      lookbackDays: LOOKBACK_DAYS,
      scorerTrustSample: SCORER_TRUST_SAMPLE,
      byTrigger,
    };
    const { error: uErr } = await supabase
      .from('library_videos')
      .update({ foundation_effectiveness: payload })
      .eq('id', id);
    if (uErr) console.warn('foundation_effectiveness write failed', id, uErr.message);
    processed += 1;
  }

  const nextCursor = videos.length === PAGE_SIZE ? videos[videos.length - 1].id : null;
  return new Response(JSON.stringify({
    done: nextCursor === null,
    processed,
    nextCursor,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
