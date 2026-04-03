import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { weakness_patterns, team_size, sport } = await req.json();

    if (!weakness_patterns || !Array.isArray(weakness_patterns) || weakness_patterns.length === 0) {
      return new Response(JSON.stringify({ error: 'weakness_patterns required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are an elite ${sport || 'baseball'} development coach. A team of ${team_size || 'unknown'} players has the following common weakness patterns:

${weakness_patterns.map((w: any, i: number) => `${i + 1}. "${w.issue}" — affects ${w.count} of ${team_size} players (${w.pct}%)`).join('\n')}

Generate a team practice plan with 3-5 drill blocks that address these weaknesses. Each drill block should target one or more of the weaknesses above.

Return ONLY valid JSON array with this structure:
[
  {
    "name": "drill name",
    "duration_minutes": 15,
    "focus": "which weakness this targets",
    "description": "brief description of the drill and setup",
    "intensity": "moderate",
    "player_count": "full team or small group",
    "equipment": "what's needed"
  }
]

Be specific to ${sport || 'baseball'}. Use real drill names and techniques. Keep descriptions actionable.`;

    const response = await fetch('https://ai.lovable.dev/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a professional baseball/softball development coach. Return ONLY valid JSON, no markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[hie-team-plan] AI error:', errText);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content ?? '[]';
    
    // Parse the JSON from the AI response
    let drillBlocks = [];
    try {
      // Handle markdown code blocks
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      drillBlocks = JSON.parse(cleaned);
    } catch {
      console.error('[hie-team-plan] Failed to parse AI response:', content);
      drillBlocks = [];
    }

    return new Response(JSON.stringify({ drill_blocks: drillBlocks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[hie-team-plan] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
