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

const BADGE_MILESTONES = [
  { days: 3, id: 'starter', name: 'Getting Started', emoji: '🌱' },
  { days: 7, id: 'week_warrior', name: 'Week Warrior', emoji: '⚡' },
  { days: 14, id: 'iron_will', name: 'Iron Will', emoji: '💪' },
  { days: 30, id: 'iron_horse', name: 'Iron Horse', emoji: '🏇' },
  { days: 60, id: 'elite', name: 'Elite Performer', emoji: '🏆' },
  { days: 100, id: 'legendary', name: 'Legendary', emoji: '👑' },
];

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
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sport = 'baseball', category } = await req.json().catch(() => ({}));

    // ========== STREAK TRACKING ==========
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create streak record
    let { data: streakData } = await serviceClient
      .from('nutrition_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!streakData) {
      // Create new streak record
      const { data: newStreak } = await serviceClient
        .from('nutrition_streaks')
        .insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_visit_date: today,
          total_visits: 1,
          tips_collected: 1,
          badges_earned: ['starter'],
        })
        .select()
        .single();
      streakData = newStreak;
    } else {
      const lastVisit = streakData.last_visit_date;
      const lastVisitDate = new Date(lastVisit);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));

      let newStreak = streakData.current_streak;
      let newLongest = streakData.longest_streak;
      let newTipsCollected = streakData.tips_collected;

      if (diffDays === 0) {
        // Same day visit - just increment tips
        newTipsCollected += 1;
      } else if (diffDays === 1) {
        // Consecutive day - increment streak
        newStreak += 1;
        newTipsCollected += 1;
        if (newStreak > newLongest) {
          newLongest = newStreak;
        }
      } else {
        // Streak broken - reset
        newStreak = 1;
        newTipsCollected += 1;
      }

      // Check for new badges
      const currentBadges = streakData.badges_earned || [];
      const newBadges = [...currentBadges];
      
      for (const milestone of BADGE_MILESTONES) {
        if (newStreak >= milestone.days && !currentBadges.includes(milestone.id)) {
          newBadges.push(milestone.id);
        }
      }

      // Update streak record
      const { data: updatedStreak } = await serviceClient
        .from('nutrition_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_visit_date: today,
          total_visits: streakData.total_visits + 1,
          tips_collected: newTipsCollected,
          badges_earned: newBadges,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();
      
      streakData = updatedStreak || streakData;
    }

    // ========== TIP FETCHING ==========
    const { count: viewedCount } = await serviceClient
      .from('user_viewed_tips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: totalCount } = await serviceClient
      .from('nutrition_daily_tips')
      .select('*', { count: 'exact', head: true })
      .or(`sport.eq.both,sport.eq.${sport}`);

    const viewedPercentage = totalCount ? ((viewedCount || 0) / totalCount) * 100 : 0;
    const shouldGenerateAI = viewedPercentage >= 80;

    let query = serviceClient
      .from('nutrition_daily_tips')
      .select('id, category, tip_text, sport, is_ai_generated')
      .or(`sport.eq.both,sport.eq.${sport}`);

    if (category) {
      query = query.eq('category', category);
    }

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
      const randomIndex = Math.floor(Math.random() * unseenTips.length);
      selectedTip = unseenTips[randomIndex];
    } else if (shouldGenerateAI) {
      console.log('Generating AI tip for category:', category || 'random');
      
      const targetCategory = category || Object.keys(CATEGORY_NAMES)[Math.floor(Math.random() * Object.keys(CATEGORY_NAMES).length)];
      const categoryName = CATEGORY_NAMES[targetCategory];

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
      streak: streakData ? {
        currentStreak: streakData.current_streak,
        longestStreak: streakData.longest_streak,
        totalVisits: streakData.total_visits,
        tipsCollected: streakData.tips_collected,
        badgesEarned: streakData.badges_earned || [],
      } : null,
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
