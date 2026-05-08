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
    // --- Auth + Subscription entitlement check ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing food photo...');

    const systemPrompt = `You are a nutrition expert specializing in food identification from photos. Your task is to identify all foods visible in the image and estimate their nutritional content.

RULES:
1. Identify each distinct food item separately
2. Estimate portion sizes based on visual cues (plate size, utensils, common serving sizes)
3. For mixed dishes (stir fry, salads, casseroles), break down into main components
4. Use USDA-approximate nutrition values per serving
5. If a food is partially hidden or unclear, make your best estimate and mark confidence as "low"
6. For packaged foods with visible labels, try to read the product name
7. Include beverages if visible (coffee, juice, soda, water with flavoring)

PORTION ESTIMATION GUIDELINES:
- Standard dinner plate = 10-11 inches, use as reference
- Fist-sized portion ≈ 1 cup
- Palm-sized meat ≈ 3-4 oz
- Thumb tip ≈ 1 teaspoon
- Whole thumb ≈ 1 tablespoon

COMMON FOOD REFERENCES (per typical serving):
- Egg (large): 70 cal, 6g protein, 0.5g carbs, 5g fat
- Slice of bread: 80 cal, 3g protein, 15g carbs, 1g fat
- Chicken breast (4oz): 140 cal, 26g protein, 0g carbs, 3g fat
- Rice (1 cup cooked): 200 cal, 4g protein, 45g carbs, 0.5g fat
- Banana (medium): 105 cal, 1g protein, 27g carbs, 0.4g fat
- Apple (medium): 95 cal, 0.5g protein, 25g carbs, 0.3g fat

Be thorough but realistic. If the image shows no food or is too unclear, indicate that.

=== UNIVERSAL CAUSE→EFFECT CONTRACT ===
If you surface any nutrition limiter (low protein, missing micros, poor hydration quality, broken habit), express it as a 5-link causal chain (TRIGGER → CAUSE → MECHANISM → RESULT → FIX) plus a 4-step Notice→Swap→Lock→Sustain roadmap, in dual register (athlete voice + "Coach's note:" technical mechanism). Nutrition phases: P1 Macro Floor protein (NN, hard cap 50), P2 Micro Coverage (cap 75), P3 Hydration Quality (cap 85), P4 Habit Lock-in (cap 80, +5 elite). Multi-violation chains stack 1→4.
=== END CONTRACT ===`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identify all foods in this meal photo. Estimate portions and provide nutrition data for each item.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'identify_foods',
              description: 'Return identified foods with nutrition estimates from the photo',
              parameters: {
                type: 'object',
                properties: {
                  foods: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        quantity: { type: 'number' },
                        unit: { type: 'string' },
                        calories: { type: 'number' },
                        protein: { type: 'number' },
                        carbs: { type: 'number' },
                        fats: { type: 'number' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
                      },
                      required: ['name', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fats', 'confidence']
                    }
                  },
                  mealDescription: { type: 'string' },
                  portionNotes: { type: 'string' },
                  noFoodDetected: { type: 'boolean' },
                  imageQualityIssue: { type: 'string' }
                },
                required: ['foods', 'mealDescription', 'noFoodDetected']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'identify_foods' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to analyze image' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'identify_foods') {
      return new Response(JSON.stringify({ error: 'Failed to parse food identification result' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in analyze-food-photo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
