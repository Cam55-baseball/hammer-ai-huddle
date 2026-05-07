import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveSeasonPhase, getSeasonProfile, type SeasonPhase } from "../_shared/seasonPhase.ts";

// Phase macro tilts: percentage shifts applied to remaining macro targets.
const PHASE_MACRO_TILTS: Record<SeasonPhase, { carbs: number; protein: number; fats: number; note: string }> = {
  preseason:  { carbs: 1.08, protein: 1.05, fats: 1.00, note: "Pre-season ramp — extra carbs to support volume." },
  in_season:  { carbs: 1.05, protein: 1.00, fats: 0.95, note: "In-season — fast-digest carbs near training, protect bandwidth." },
  post_season:{ carbs: 0.90, protein: 1.05, fats: 1.00, note: "Post-season — anti-inflammatory bias, slightly less carbs." },
  off_season: { carbs: 1.00, protein: 1.00, fats: 1.00, note: "Off-season — baseline targets; allow surplus if goal is mass." },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Subscription entitlement check ---
    const { data: ownerRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('status', 'active')
      .maybeSingle();

    if (!ownerRole) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, subscribed_modules')
        .eq('user_id', user.id)
        .maybeSingle();

      const hasActiveModule = subscription?.status === 'active'
        && (subscription?.subscribed_modules?.length ?? 0) > 0;

      if (!hasActiveModule) {
        return new Response(
          JSON.stringify({ error: 'Subscription required to use AI features' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // --- End entitlement check ---

    const { remainingMacros, recentFoods } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user's food preferences from recent logs
    const { data: recentLogs } = await supabase
      .from('vault_nutrition_logs')
      .select('food_name, meal_type')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(20);

    const recentFoodNames = recentLogs?.map(log => log.food_name) || [];

    // ── SEASON PHASE: tilt macros + steer rationale ──
    const { data: mpiSettings } = await supabase
      .from('athlete_mpi_settings')
      .select('season_status, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date')
      .eq('user_id', user.id)
      .maybeSingle();
    const seasonResolution = resolveSeasonPhase(mpiSettings ?? null);
    const phaseProfile = getSeasonProfile(seasonResolution.phase);
    const tilt = PHASE_MACRO_TILTS[seasonResolution.phase];
    const tiltedMacros = {
      calories: Math.round((remainingMacros?.calories ?? 0) * ((tilt.carbs * 4 + tilt.protein * 4 + tilt.fats * 9) / 17)),
      protein:  Math.round((remainingMacros?.protein  ?? 0) * tilt.protein),
      carbs:    Math.round((remainingMacros?.carbs    ?? 0) * tilt.carbs),
      fats:     Math.round((remainingMacros?.fats     ?? 0) * tilt.fats),
    };
    console.log(`[suggest-meals] user=${user.id} phase=${seasonResolution.phase} source=${seasonResolution.source}`);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a sports nutrition expert helping athletes hit their macro targets. Provide practical, accessible meal suggestions that help fill macro gaps. Consider the athlete's recent food choices for personalization.\n\nSEASON PHASE: ${phaseProfile.label}. ${tilt.note}\nTone: ${phaseProfile.toneGuidance}`
          },
          {
            role: "user",
            content: `An athlete needs to fill these remaining macros for the day (already adjusted for ${phaseProfile.label}):
- Calories: ${tiltedMacros.calories} kcal
- Protein: ${tiltedMacros.protein}g
- Carbs: ${tiltedMacros.carbs}g
- Fats: ${tiltedMacros.fats}g

Their recent foods: ${recentFoodNames.slice(0, 10).join(', ') || 'No recent data'}

Suggest 4-5 practical meal/snack options that would help hit these targets. For each suggestion, explain WHY it's a good choice based on the macro gaps and the current season phase (${phaseProfile.label}).`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_meals",
              description: "Provide meal suggestions to help hit macro targets",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Meal or food name" },
                        description: { type: "string", description: "Brief description" },
                        reason: { type: "string", description: "Why this helps fill macro gaps" },
                        estimatedMacros: {
                          type: "object",
                          properties: {
                            calories: { type: "number" },
                            protein: { type: "number" },
                            carbs: { type: "number" },
                            fats: { type: "number" }
                          }
                        },
                        priority: { type: "string", enum: ["high", "medium", "low"], description: "How well it fits the gaps" }
                      },
                      required: ["name", "description", "reason", "estimatedMacros", "priority"]
                    }
                  },
                  macroAnalysis: {
                    type: "string",
                    description: "Brief analysis of what the athlete needs most"
                  }
                },
                required: ["suggestions", "macroAnalysis"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_meals" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate suggestions");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Failed to generate meal suggestions");
    }
    
    const suggestions = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({
        ...suggestions,
        season_phase: seasonResolution.phase,
        season_phase_label: phaseProfile.label,
        season_phase_source: seasonResolution.source,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error suggesting meals:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
