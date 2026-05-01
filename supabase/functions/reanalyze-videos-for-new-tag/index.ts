// Owner-triggered: when a new tag is added to the taxonomy, Hammer reviews
// existing library videos and proposes the new tag (and other vocab tags)
// where the description / existing tags support it. Proposals land in
// video_tag_suggestions with source='taxonomy_expansion' for owner review.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_VIDEOS_PER_RUN = 25;
const MODEL = 'google/gemini-2.5-flash';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Owner gate
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const tagId: string | undefined = body?.tagId;
    if (!tagId) {
      return new Response(JSON.stringify({ error: 'tagId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load the new tag
    const { data: newTag, error: tagErr } = await admin
      .from('video_tag_taxonomy')
      .select('id, layer, key, label, skill_domain, description')
      .eq('id', tagId)
      .single();
    if (tagErr || !newTag) {
      return new Response(JSON.stringify({ error: 'Tag not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Full active vocabulary for context
    const { data: taxonomy } = await admin
      .from('video_tag_taxonomy')
      .select('id, layer, key, label, skill_domain')
      .eq('active', true);

    const vocabByLayer: Record<string, { key: string; label: string }[]> = {
      movement_pattern: [], result: [], context: [], correction: [],
    };
    (taxonomy || []).forEach((t: any) => {
      if (t.skill_domain === newTag.skill_domain && vocabByLayer[t.layer]) {
        vocabByLayer[t.layer].push({ key: t.key, label: t.label });
      }
    });

    // Candidate videos: same skill domain, not blocked, with usable description
    const { data: videos } = await admin
      .from('library_videos')
      .select('id, title, description, ai_description, skill_domains, distribution_tier')
      .contains('skill_domains', [newTag.skill_domain])
      .neq('distribution_tier', 'blocked')
      .order('created_at', { ascending: false })
      .limit(MAX_VIDEOS_PER_RUN);

    const candidates = (videos || []).filter((v: any) =>
      (v.ai_description && v.ai_description.trim().length > 0) ||
      (v.description && v.description.trim().length > 0) ||
      (v.title && v.title.trim().length > 0)
    );

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ ok: true, analyzed: 0, proposals_inserted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Existing tag assignments per video (so Hammer sees the full picture)
    const videoIds = candidates.map((v: any) => v.id);
    const { data: existingAssignments } = await admin
      .from('video_tag_assignments')
      .select('video_id, tag_id')
      .in('video_id', videoIds);

    const tagById = new Map<string, any>();
    (taxonomy || []).forEach((t: any) => tagById.set(t.id, t));
    const assignmentsByVideo = new Map<string, { layer: string; key: string; label: string }[]>();
    (existingAssignments || []).forEach((a: any) => {
      const t = tagById.get(a.tag_id);
      if (!t) return;
      const list = assignmentsByVideo.get(a.video_id) || [];
      list.push({ layer: t.layer, key: t.key, label: t.label });
      assignmentsByVideo.set(a.video_id, list);
    });

    // Skip videos that already have this tag assigned or already have a pending suggestion
    const { data: pendingForTag } = await admin
      .from('video_tag_suggestions')
      .select('video_id')
      .eq('layer', newTag.layer)
      .eq('suggested_key', newTag.key)
      .eq('status', 'pending');
    const pendingSet = new Set((pendingForTag || []).map((r: any) => r.video_id));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not set');

    const layerDescriptions: Record<string, string> = {
      movement_pattern: 'What the body is doing — a mechanical/biomechanical pattern (e.g. early extension, hands forward).',
      result: 'What happened on the play — the outcome (e.g. roll-over, pop-up, barrel).',
      context: 'The situation around the rep (e.g. two-strike, RISP, inside pitch).',
      correction: 'The coaching intent or fix being demonstrated (e.g. stay connected, load back side).',
    };

    let totalInserted = 0;
    let analyzed = 0;
    const rowsToInsert: any[] = [];

    for (const v of candidates) {
      // Skip if this exact tag is already assigned
      const existing = assignmentsByVideo.get(v.id) || [];
      if (existing.some(t => t.layer === newTag.layer && t.key === newTag.key)) continue;
      if (pendingSet.has(v.id)) continue;

      analyzed++;

      const userPrompt = [
        `New tag being introduced:`,
        `  layer: ${newTag.layer}  (${layerDescriptions[newTag.layer] || ''})`,
        `  key: ${newTag.key}`,
        `  label: ${newTag.label}`,
        newTag.description ? `  description: ${newTag.description}` : '',
        ``,
        `Video being reviewed:`,
        `  title: ${v.title || ''}`,
        `  description: ${v.description || ''}`,
        `  intent (ai_description): ${v.ai_description || ''}`,
        `  existing tags: ${existing.map(e => `${e.layer}:${e.key}`).join(', ') || '(none)'}`,
        ``,
        `Full controlled vocabulary for skill_domain "${newTag.skill_domain}":`,
        `  movement_pattern: ${vocabByLayer.movement_pattern.map(t => t.key).join(', ')}`,
        `  result: ${vocabByLayer.result.map(t => t.key).join(', ')}`,
        `  context: ${vocabByLayer.context.map(t => t.key).join(', ')}`,
        `  correction: ${vocabByLayer.correction.map(t => t.key).join(', ')}`,
        ``,
        `Decide ONLY if the new tag (${newTag.layer}:${newTag.key}) is explicitly supported by the title/description/intent or coherent with the existing tags. If yes, propose it with a confidence 0–1 and a one-sentence reason. If not, return an empty array. Do not propose any other tags.`,
      ].filter(Boolean).join('\n');

      const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: 'You are an elite baseball/softball biomechanics tagger. Be conservative — only propose a tag if explicitly supported by the evidence.' },
            { role: 'user', content: userPrompt },
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'propose_tag',
              description: 'Propose the new tag for this video if supported',
              parameters: {
                type: 'object',
                properties: {
                  proposals: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        confidence: { type: 'number' },
                        reasoning: { type: 'string' },
                      },
                      required: ['confidence', 'reasoning'],
                    },
                  },
                },
                required: ['proposals'],
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'propose_tag' } },
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429 || aiResp.status === 402) {
          // Stop early on quota/rate-limit; return what we have
          break;
        }
        const t = await aiResp.text();
        console.error('AI gateway error', aiResp.status, t);
        continue;
      }

      const aiData = await aiResp.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) continue;
      let args: any;
      try { args = JSON.parse(toolCall.function.arguments); } catch { continue; }
      const proposals: Array<{ confidence: number; reasoning: string }> = args.proposals || [];
      if (proposals.length === 0) continue;
      const best = proposals[0];
      if (typeof best.confidence !== 'number' || best.confidence < 0.4) continue;

      rowsToInsert.push({
        video_id: v.id,
        layer: newTag.layer,
        suggested_key: newTag.key,
        confidence: Math.max(0, Math.min(1, best.confidence)),
        source: 'taxonomy_expansion',
        status: 'pending',
        reasoning: best.reasoning,
      });
    }

    if (rowsToInsert.length > 0) {
      const { error: insErr } = await admin.from('video_tag_suggestions').insert(rowsToInsert);
      if (insErr) {
        console.error('insert error', insErr);
        throw insErr;
      }
      totalInserted = rowsToInsert.length;
    }

    return new Response(JSON.stringify({ ok: true, analyzed, proposals_inserted: totalInserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('reanalyze-videos-for-new-tag error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
