import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, module, sport, language = 'en' } = await req.json();
    
    console.log('Analyzing real-time playback:', { videoId, module, sport, language });
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const languageMap: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'de': 'German',
      'fr': 'French',
      'ja': 'Japanese',
      'ko': 'Korean',
      'nl': 'Dutch',
      'zh': 'Chinese'
    };
    
    const languageName = languageMap[language] || 'English';
    
    const prompt = `You are a ${sport} ${module} coach providing brief, encouraging feedback on a player's form.

Generate a VERY BRIEF analysis focusing on positives. The player just recorded themselves and wants quick feedback.

CRITICAL: Respond in ${languageName} language.

Return a JSON object with this exact structure:
{
  "positives": ["2-3 specific things the player is doing well - BE ENCOURAGING"],
  "tips": ["1-2 short, actionable improvements - keep these brief and constructive"],
  "overallNote": "One encouraging sentence about their progress"
}

Focus on:
- For ${module === 'hitting' ? 'hitting: stance, bat path, hip rotation, balance, follow-through' : ''}
- For ${module === 'pitching' ? 'pitching: arm slot, leg drive, release point, follow-through' : ''}
- For ${module === 'throwing' ? 'throwing: arm path, hip rotation, stride, release, accuracy' : ''}

Be POSITIVE and ENCOURAGING. Emphasize what they're doing RIGHT. Keep tips short and actionable.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an encouraging sports coach. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return a default response
      analysis = {
        positives: [
          language === 'en' ? 'Good effort on your form' : 'Great effort shown',
          language === 'en' ? 'Solid foundation to build on' : 'Strong base technique'
        ],
        tips: [
          language === 'en' ? 'Continue practicing with slow-motion review' : 'Keep practicing consistently'
        ],
        overallNote: language === 'en' 
          ? 'Keep up the great work! Review the slow-motion playback to fine-tune your mechanics.'
          : 'Excellent progress! Keep practicing.'
      };
    }

    console.log('Analysis generated successfully');
    
    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-realtime-playback:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      positives: ['Good effort on your form', 'Keep practicing'],
      tips: ['Review your slow-motion footage'],
      overallNote: 'Keep up the great work!'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
