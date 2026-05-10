// Owner-triggered: analyzes a video's ai_description + title with Lovable AI
// and inserts proposals into video_tag_suggestions for owner review.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      { global: { headers: { Authorization: authHeader } } }
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

    // Verify owner
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

    const { videoId } = await req.json();
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'videoId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: video, error: vErr } = await admin
      .from('library_videos')
      .select('id, title, description, ai_description, skill_domains, formula_phases, formula_notes')
      .eq('id', videoId)
      .single();
    if (vErr || !video) throw vErr || new Error('Video not found');

    // Pull taxonomy (controlled vocab)
    const { data: taxonomy } = await admin
      .from('video_tag_taxonomy')
      .select('layer, key, label, skill_domain')
      .eq('active', true);

    const vocab: Record<string, string[]> = {
      movement_pattern: [], result: [], context: [], correction: [],
    };
    (taxonomy || []).forEach((t: any) => {
      if (vocab[t.layer]) vocab[t.layer].push(t.key);
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not set');

    const systemPrompt = `You are an elite baseball/softball biomechanics tagger. Analyze a video's title, the coach's freeform notes, and any formula linkage notes, then propose structured tags using ONLY the provided vocabulary keys. Be conservative — only propose a tag if explicitly supported by the coach's narrative.`;

    const formulaPhases = ((video as any).formula_phases || []) as string[];
    const formulaNotes = (video as any).formula_notes || '';

    const userPrompt = `Title: ${video.title}\nDescription: ${video.description || ''}\nCoach's Notes to Hammer (primary intent): ${video.ai_description || ''}\nFormula Linkage Phases: ${formulaPhases.join(', ') || 'none'}\nFormula Linkage Notes: ${formulaNotes}\nSkill domains: ${(video.skill_domains || []).join(', ') || 'unknown'}\n\nVocabulary by layer:\nmovement_pattern: ${vocab.movement_pattern.join(', ')}\nresult: ${vocab.result.join(', ')}\ncontext: ${vocab.context.join(', ')}\ncorrection: ${vocab.correction.join(', ')}\n\nReturn proposed tags with confidence 0-1 and short reasoning per tag. Treat the coach's notes as the source of truth; the formula phases tell you which teaching checkpoints this video targets.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'propose_tags',
            description: 'Propose structured tags for the video',
            parameters: {
              type: 'object',
              properties: {
                tags: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      layer: { type: 'string', enum: ['movement_pattern', 'result', 'context', 'correction'] },
                      key: { type: 'string' },
                      confidence: { type: 'number' },
                      reasoning: { type: 'string' },
                    },
                    required: ['layer', 'key', 'confidence', 'reasoning'],
                  },
                },
              },
              required: ['tags'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'propose_tags' } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('AI gateway error', aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits required' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ ok: true, inserted: 0, note: 'no tags' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);
    const proposals: Array<{ layer: string; key: string; confidence: number; reasoning: string }> =
      args.tags || [];

    // Filter to vocabulary only
    const valid = proposals.filter(p => vocab[p.layer]?.includes(p.key));

    if (valid.length === 0) {
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = valid.map(p => ({
      video_id: videoId,
      layer: p.layer,
      suggested_key: p.key,
      confidence: Math.max(0, Math.min(1, p.confidence)),
      source: 'ai_description',
      status: 'pending',
      reasoning: p.reasoning,
    }));

    const { error: insErr } = await admin.from('video_tag_suggestions').insert(rows);
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('analyze-video-description error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
