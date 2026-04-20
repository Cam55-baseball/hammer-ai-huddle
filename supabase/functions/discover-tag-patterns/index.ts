// Cron: scans video_user_outcomes for patterns where users with movement X
// who watched videos tagged Y showed post_score_delta > 5, and proposes
// new movement→correction rules into video_rule_suggestions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Pull outcomes with positive deltas
    const { data: outcomes, error: oErr } = await admin
      .from('video_user_outcomes')
      .select('video_id, user_id, skill_domain, post_score_delta, suggestion_reason')
      .not('post_score_delta', 'is', null)
      .gt('post_score_delta', 5);
    if (oErr) throw oErr;

    if (!outcomes?.length) {
      return new Response(JSON.stringify({ ok: true, proposed: 0, note: 'no signal' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pull video assignments + taxonomy
    const videoIds = Array.from(new Set(outcomes.map(o => o.video_id)));
    const { data: assigns } = await admin
      .from('video_tag_assignments')
      .select('video_id, tag_id')
      .in('video_id', videoIds);
    const tagIds = Array.from(new Set((assigns || []).map((a: any) => a.tag_id)));
    const { data: tags } = await admin
      .from('video_tag_taxonomy')
      .select('id, layer, key, skill_domain')
      .in('id', tagIds);

    const tagMap = new Map<string, any>();
    (tags || []).forEach((t: any) => tagMap.set(t.id, t));
    const videoToCorrections = new Map<string, string[]>();
    const videoToDomain = new Map<string, string>();
    (assigns || []).forEach((a: any) => {
      const t = tagMap.get(a.tag_id);
      if (!t) return;
      if (t.layer === 'correction') {
        const arr = videoToCorrections.get(a.video_id) || [];
        arr.push(t.key);
        videoToCorrections.set(a.video_id, arr);
      }
      videoToDomain.set(a.video_id, t.skill_domain);
    });

    // Aggregate (movement, correction, skill_domain) → samples + delta sum
    const buckets = new Map<string, { n: number; sum: number; videos: Set<string> }>();
    for (const o of outcomes) {
      const reasons = (o.suggestion_reason as any)?.reasons || [];
      const movements: string[] = reasons
        .filter((r: string) => typeof r === 'string' && r.toLowerCase().includes('movement'))
        .map((r: string) => r.toLowerCase().replace(/[^a-z_]/g, '_'));
      const corrections = videoToCorrections.get(o.video_id) || [];
      const domain = o.skill_domain || videoToDomain.get(o.video_id);
      if (!domain || !corrections.length) continue;

      for (const m of movements) {
        for (const c of corrections) {
          const k = `${domain}|${m}|${c}`;
          const cur = buckets.get(k) || { n: 0, sum: 0, videos: new Set<string>() };
          cur.n += 1;
          cur.sum += Number(o.post_score_delta);
          cur.videos.add(o.video_id);
          buckets.set(k, cur);
        }
      }
    }

    // Existing active rules: skip duplicates
    const { data: existing } = await admin
      .from('video_tag_rules')
      .select('skill_domain, movement_key, correction_key')
      .eq('active', true);
    const existingKeys = new Set(
      (existing || []).map((r: any) => `${r.skill_domain}|${r.movement_key}|${r.correction_key}`)
    );

    // Already-proposed pending: skip
    const { data: pending } = await admin
      .from('video_rule_suggestions')
      .select('skill_domain, movement_key, correction_key')
      .eq('status', 'pending');
    (pending || []).forEach((r: any) =>
      existingKeys.add(`${r.skill_domain}|${r.movement_key}|${r.correction_key}`)
    );

    const rows: any[] = [];
    for (const [k, v] of buckets.entries()) {
      if (v.n < 5) continue; // need at least 5 samples
      if (existingKeys.has(k)) continue;
      const [skill_domain, movement_key, correction_key] = k.split('|');
      const avg = v.sum / v.n;
      // Confidence: scaled by sample size and effect
      const confidence = Math.max(0, Math.min(1, (avg / 20) * Math.min(1, v.n / 20)));
      if (confidence < 0.3) continue;
      rows.push({
        skill_domain,
        movement_key,
        correction_key,
        confidence,
        reasoning: `Discovered from ${v.n} user outcomes with avg post-watch improvement of ${avg.toFixed(1)} pts.`,
        source_video_ids: Array.from(v.videos),
        sample_size: v.n,
        avg_improvement: avg,
        status: 'pending',
      });
    }

    if (rows.length) {
      const { error: insErr } = await admin.from('video_rule_suggestions').insert(rows);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ ok: true, proposed: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('discover-tag-patterns error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
