import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORY_NAMES: Record<string, string> = {
  blood_type: 'Blood Type Health',
  hydration: 'Hydration',
  minerals: 'Minerals',
  recovery: 'Recovery',
  blood_flow: 'Blood Flow',
  lymphatic: 'Lymphatic Health',
  vitamins: 'Vitamins',
  daily_nutrition: 'Daily Nutrition',
  longevity: 'Longevity',
  weight: 'Weight Management',
  vegan: 'Vegan Guidance',
  restrictive: 'Restrictive Diets',
  offseason: 'Off-Season Body Priming',
  inseason: 'In-Season Body Priming',
  performance: 'Performance Priming',
  ingame_hydration: 'In-Game Hydration',
  supplements: 'NSF-Approved Supplements',
  holistic: 'Holistic Health'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // User client for auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Service client for admin operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sport = 'baseball', category } = await req.json().catch(() => ({}));

    // Get user's viewed tips count
    const { count: viewedCount } = await serviceClient
      .from('user_viewed_tips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get total tips available for this sport
    const { count: totalCount } = await serviceClient
      .from('nutrition_daily_tips')
      .select('*', { count: 'exact', head: true })
      .or(`sport.eq.both,sport.eq.${sport}`);

    const viewedPercentage = totalCount ? ((viewedCount || 0) / totalCount) * 100 : 0;
    const shouldGenerateAI = viewedPercentage >= 80;

    // Build query for unseen tips
    let query = serviceClient
      .from('nutrition_daily_tips')
      .select('id, category, tip_text, sport, is_ai_generated')
      .or(`sport.eq.both,sport.eq.${sport}`);

    if (category) {
      query = query.eq('category', category);
    }

    // Get tips not yet viewed by user
    const { data: viewedTipIds } = await serviceClient
      .from('user_viewed_tips')
      .select('tip_id')
      .eq('user_id', user.id);

    const viewedIds = viewedTipIds?.map(v => v.tip_id) || [];

    if (viewedIds.length > 0) {
      query = query.not('id', 'in', `(${viewedIds.join(',')})`);
    }

    const { data: unseenTips, error: tipsError } = await query;

    if (tipsError) {
      console.error('Error fetching tips:', tipsError);
      throw tipsError;
    }

    let selectedTip = null;

    if (unseenTips && unseenTips.length > 0) {
      // Select random unseen tip
      const randomIndex = Math.floor(Math.random() * unseenTips.length);
      selectedTip = unseenTips[randomIndex];
    } else if (shouldGenerateAI) {
      // Generate new tip with AI
      console.log('Generating AI tip for category:', category || 'random');
      
      const targetCategory = category || Object.keys(CATEGORY_NAMES)[Math.floor(Math.random() * Object.keys(CATEGORY_NAMES).length)];
      const categoryName = CATEGORY_NAMES[targetCategory];

      // Get some recent tips to avoid
      const { data: recentTips } = await serviceClient
        .from('nutrition_daily_tips')
        .select('tip_text')
        .eq('category', targetCategory)
        .order('created_at', { ascending: false })
        .limit(10);

      const excludedTips = recentTips?.map(t => t.tip_text).join('\n- ') || '';

      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        console.error('LOVABLE_API_KEY not configured');
        // Return a random viewed tip as fallback
        const { data: fallbackTip } = await serviceClient
          .from('nutrition_daily_tips')
          .select('id, category, tip_text, sport, is_ai_generated')
          .or(`sport.eq.both,sport.eq.${sport}`)
          .limit(1)
          .single();
        selectedTip = fallbackTip;
      } else {
        const prompt = `You are a sports nutrition expert for ${sport} athletes. Generate ONE actionable, specific nutrition or health tip for the category "${categoryName}".

Requirements:
- Must be safe and practical for athletes
- Specific to ${sport} training and performance where relevant
- 1-3 sentences maximum
- Actionable (athlete can implement today)
- No medical diagnoses or treatment claims
- Avoid these recently used tips:
- ${excludedTips}

Generate only the tip text, nothing else.`;

        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'user', content: prompt }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const generatedTip = aiData.choices?.[0]?.message?.content?.trim();

            if (generatedTip && generatedTip.length > 10) {
              // Save the AI-generated tip to database
              const { data: newTip, error: insertError } = await serviceClient
                .from('nutrition_daily_tips')
                .insert({
                  category: targetCategory,
                  tip_text: generatedTip,
                  sport: sport,
                  is_ai_generated: true,
                  generated_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (!insertError && newTip) {
                selectedTip = newTip;
                console.log('AI tip generated and saved:', newTip.id);
              }
            }
          } else {
            console.error('AI API error:', await aiResponse.text());
          }
        } catch (aiError) {
          console.error('AI generation error:', aiError);
        }
      }
    }

    // If still no tip, get a random one (even if viewed)
    if (!selectedTip) {
      const { data: randomTip } = await serviceClient
        .from('nutrition_daily_tips')
        .select('id, category, tip_text, sport, is_ai_generated')
        .or(`sport.eq.both,sport.eq.${sport}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      selectedTip = randomTip;
    }

    if (selectedTip) {
      // Record this tip as viewed
      await serviceClient
        .from('user_viewed_tips')
        .upsert({
          user_id: user.id,
          tip_id: selectedTip.id,
          viewed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,tip_id' });
    }

    return new Response(JSON.stringify({
      tip: selectedTip,
      categoryName: selectedTip ? CATEGORY_NAMES[selectedTip.category] : null,
      viewedPercentage: Math.round(viewedPercentage),
      totalTips: totalCount || 0,
      viewedTips: viewedCount || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-daily-tip:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
