const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MICRO_KEYS = [
  "vitamin_a_mcg", "vitamin_c_mg", "vitamin_d_mcg", "vitamin_e_mg",
  "vitamin_k_mcg", "vitamin_b6_mg", "vitamin_b12_mcg", "folate_mcg",
  "calcium_mg", "iron_mg", "magnesium_mg", "potassium_mg", "zinc_mg",
];

// Build explicit micro properties schema — forces AI to populate each key
const microProperties: Record<string, { type: string; description: string }> = {};
for (const key of MICRO_KEYS) {
  microProperties[key] = { type: "number", description: `${key} value from USDA data` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Text is required (min 2 characters)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[parse-food-text] LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[parse-food-text] Parsing: "${text}"`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a nutrition expert. Parse food descriptions and return accurate nutritional estimates.
Use USDA standard values. For compound foods, break them into individual items.
Be conservative with estimates - use typical serving sizes unless specified.
Confidence levels: "high" for common foods with known values, "medium" for estimates, "low" for unusual items.
For beverages (water, juice, coffee, tea, milk, soda, etc.), estimate fluid ounces. One glass = 8oz, one bottle = 16oz.

MICRONUTRIENTS (MANDATORY): For EVERY food item, you MUST populate ALL 13 micronutrient fields with realistic USDA-based values.
Use 0 only if truly negligible. Every whole food has micronutrients.

MEAL TYPE INFERENCE - Infer suggested_meal_type from context:
- Morning items (eggs, bacon, oatmeal, cereal, toast, pancakes, waffles, coffee, orange juice) → "breakfast"
- Midday items (sandwich, salad, soup, burger, wrap, lunch) → "lunch"  
- Evening items (steak, pasta, casserole, dinner plate, roast, grilled fish) → "dinner"
- Small items (bar, nuts, fruit, chips, yogurt, crackers) → "snack"
- ONLY beverages with zero or minimal calories (water, black coffee, unsweetened tea) → "hydration"`,
          },
          {
            role: "user",
            content: `Parse this food description and return nutritional information: "${text}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_food_nutrition",
              description: "Extract nutritional information from a food description",
              parameters: {
                type: "object",
                properties: {
                  foods: {
                    type: "array",
                    description: "List of individual food items identified",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Name of the food item" },
                        quantity: { type: "number", description: "Amount/quantity" },
                        unit: { type: "string", description: "Unit of measurement" },
                        calories: { type: "number", description: "Calories (kcal)" },
                        protein_g: { type: "number", description: "Protein in grams" },
                        carbs_g: { type: "number", description: "Carbohydrates in grams" },
                        fats_g: { type: "number", description: "Fats in grams" },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        micros: {
                          type: "object",
                          description: "Micronutrients for this food item. ALL 13 keys are required with USDA-based values.",
                          properties: microProperties,
                          required: MICRO_KEYS,
                        },
                      },
                      required: ["name", "quantity", "unit", "calories", "protein_g", "carbs_g", "fats_g", "confidence", "micros"],
                    },
                  },
                  totals: {
                    type: "object",
                    description: "Combined totals for all foods",
                    properties: {
                      calories: { type: "number" },
                      protein_g: { type: "number" },
                      carbs_g: { type: "number" },
                      fats_g: { type: "number" },
                      hydration_oz: { type: "number", description: "Total fluid ounces if beverages mentioned" },
                      micros: {
                        type: "object",
                        description: "Aggregated micronutrients across all foods.",
                        properties: microProperties,
                        required: MICRO_KEYS,
                      },
                    },
                    required: ["calories", "protein_g", "carbs_g", "fats_g", "hydration_oz", "micros"],
                  },
                  suggested_meal_type: {
                    type: "string",
                    enum: ["breakfast", "lunch", "dinner", "snack", "hydration"],
                    description: "Inferred meal type",
                  },
                  mealDescription: { type: "string", description: "Brief description of the meal" },
                },
                required: ["foods", "totals", "suggested_meal_type"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "parse_food_nutrition" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      console.error(`[parse-food-text] AI gateway error: ${status}`);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("[parse-food-text] No tool call in AI response");
      return new Response(JSON.stringify({ error: "Could not parse food description" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    // Ensure totals.micros is aggregated from per-food micros if missing
    if (parsed.foods?.length > 0) {
      const hasTotalMicros = parsed.totals?.micros && Object.values(parsed.totals.micros).some((v: any) => typeof v === "number" && v > 0);
      if (!hasTotalMicros) {
        const agg: Record<string, number> = {};
        for (const food of parsed.foods) {
          if (food.micros && typeof food.micros === "object") {
            for (const [key, val] of Object.entries(food.micros)) {
              if (typeof val === "number" && val > 0) {
                agg[key] = (agg[key] || 0) + val;
              }
            }
          }
        }
        if (Object.keys(agg).length > 0) {
          parsed.totals = { ...parsed.totals, micros: agg };
        }
      }
    }

    const hasMicros = parsed.totals?.micros && Object.values(parsed.totals.micros).some((v: any) => typeof v === "number" && v > 0);
    console.log(`[parse-food-text] Parsed ${parsed.foods?.length || 0} foods, micros populated: ${hasMicros}`);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[parse-food-text] Error:", error);
    return new Response(JSON.stringify({ error: "Failed to parse food description" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
