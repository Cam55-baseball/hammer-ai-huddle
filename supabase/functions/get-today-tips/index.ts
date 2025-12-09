import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    console.log(`[get-today-tips] User: ${user.id}, Date range: ${startOfDay} to ${endOfDay}`);

    // Get tips viewed today with full tip details
    const { data: viewedTips, error: viewError } = await supabaseClient
      .from('user_viewed_tips')
      .select(`
        id,
        viewed_at,
        tip_id,
        nutrition_daily_tips (
          id,
          tip_text,
          category,
          is_ai_generated,
          sport
        )
      `)
      .eq('user_id', user.id)
      .gte('viewed_at', startOfDay)
      .lt('viewed_at', endOfDay)
      .order('viewed_at', { ascending: true });

    if (viewError) {
      console.error('[get-today-tips] Error fetching viewed tips:', viewError);
      return new Response(
        JSON.stringify({ error: viewError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform data to include category name
    const categoryNames: Record<string, string> = {
      'blood_type': 'Blood Type Health',
      'hydration': 'Hydration',
      'mineralization': 'Mineralization',
      'recovery': 'Recovery',
      'blood_flow': 'Blood Flow',
      'lymphatic': 'Lymphatic Health',
      'vitamins': 'Vitamins',
      'daily_tip': 'Daily Tip',
      'longevity': 'Longevity',
      'weight_management': 'Weight Management',
      'vegan': 'Vegan Guidance',
      'restrictive_diets': 'Restrictive Diets',
      'body_priming': 'Body Priming',
      'performance_priming': 'Performance Priming',
      'in_game_hydration': 'In-Game Hydration',
      'supplements': 'NSF Supplements',
      'holistic': 'Holistic Health',
      'general': 'General Nutrition',
    };

    const tips = viewedTips?.map(vt => {
      const tip = vt.nutrition_daily_tips as any;
      return {
        id: vt.tip_id,
        tip_text: tip?.tip_text || '',
        category: tip?.category || 'general',
        categoryName: categoryNames[tip?.category] || 'General Nutrition',
        is_ai_generated: tip?.is_ai_generated || false,
        sport: tip?.sport,
        viewed_at: vt.viewed_at,
      };
    }) || [];

    console.log(`[get-today-tips] Found ${tips.length} tips for today`);

    return new Response(
      JSON.stringify({ tips }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-today-tips] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
