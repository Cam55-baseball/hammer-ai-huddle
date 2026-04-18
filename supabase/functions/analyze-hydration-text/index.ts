// Edge function: analyze-hydration-text
// Estimates per-oz hydration nutrition for a free-form beverage description
// using Lovable AI structured tool calling. No DB writes — client owns insert.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { text, amount_oz } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Beverage description is required (min 2 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const ozNum = Number(amount_oz);
    if (!Number.isFinite(ozNum) || ozNum <= 0 || ozNum > 200) {
      return new Response(
        JSON.stringify({ error: "amount_oz must be a positive number ≤ 200" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[analyze-hydration-text] LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[analyze-hydration-text] Analyzing: "${text}" @ ${ozNum}oz`);

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
            content:
              `You are a USDA-grade hydration analyst. Given any beverage description, estimate per-fluid-ounce values for water, sodium, potassium, magnesium, sugar, total carbs, AND a full 13-key micronutrient panel.

GENERAL RULES:
- water_g_per_oz must be between 0 and 29.6 (1 fl oz ≈ 29.5735 g; pure water ≈ 29.5).
- Be conservative on water — for sweetened/dense drinks reduce water proportionally to sugar/solids.
- Confidence: "high" for common/standard drinks, "medium" for typical custom drinks, "low" for unusual or vague.
- display_name: short, clean human label (e.g. "Iced Matcha Latte with Oat Milk"). Do NOT echo "other" or "drink".

MACRO REFERENCE (per fl oz):
- Plain water: water≈29.5, electrolytes 0, sugar 0.
- Coffee/tea unsweetened: water≈29, minimal electrolytes, sugar 0.
- Sports drinks: water≈28, sodium≈14mg, potassium≈4mg, sugar≈1.7g.
- Soda: water≈26, sodium≈2mg, sugar≈3.3g.
- Cow milk (2%): water≈26, sodium≈5mg, potassium≈18mg, sugar≈1.6g.
- Goat milk: water≈25, sodium≈4mg, potassium≈62mg, sugar≈1.4g.
- Smoothies/lattes: estimate from likely composition.

MICRONUTRIENT PANEL — micros_per_oz (ALL 13 keys required, per fl oz):
vitamin_a_mcg, vitamin_c_mg, vitamin_d_mcg, vitamin_e_mg, vitamin_k_mcg,
vitamin_b6_mg, vitamin_b12_mcg, folate_mcg, calcium_mg, iron_mg,
magnesium_mg, potassium_mg, zinc_mg.

CRITICAL — DO NOT RETURN ALL-ZEROS for any non-water, non-black-coffee, non-plain-tea drink. At least 3 keys MUST be > 0 for those.

CATEGORY MANDATES:
- Dairy (cow/goat/sheep): MUST populate calcium_mg, potassium_mg, magnesium_mg, vitamin_a_mcg.
  · Cow milk: Ca~15, K~18, Mg~1.4, A~18, D~0.16, B12~0.16
  · Goat milk: Ca~33, K~62, Mg~4, A~14, B12~0.02, D~0.07, Zn~0.1, B6~0.014
- Plant milks (almond/oat/soy/coconut, fortified): MUST populate calcium_mg, vitamin_d_mcg, vitamin_b12_mcg.
  · Almond: Ca~14, D~0.3, E~2, A~18
  · Oat:    Ca~14, D~0.3, B12~0.15
  · Soy:    Ca~14, D~0.3, B12~0.3, K~17
- Citrus juice (orange/grapefruit/lemonade): MUST populate vitamin_c_mg, folate_mcg, potassium_mg.
  · OJ: C~10, folate~9, K~24
- Other juice (apple/cranberry/pomegranate/tomato/carrot/veg): populate vitamin_c_mg, potassium_mg, plus vitamin_a_mcg for tomato/carrot/veg.
- Coconut water: K~75, Mg~7.5, Ca~7, folate~0.9.
- Coffee black: K~14, Mg~0.9, rest ~0.
- Tea unsweetened: K~4, folate~1.5, Mg~0.6.
- Sports drink: K~4, B12~0.04, B6~0.005.
- Energy drink: B6~0.5, B12~0.7.
- Beer: K~8, Mg~2, folate~1.5.
- Wine red: K~32, Mg~3, Fe~0.13.
- Kombucha: B12~0.06, B6~0.012, folate~0.5.
- Kefir: Ca~13, K~16, B12~0.1, Mg~1.4.
- Bone broth: Ca~3, K~10, Mg~1, Fe~0.1.
- Smoothies: scale from ingredients (fruit smoothie ≈ C~5, K~30, folate~5; green smoothie ≈ K~10mcg, A~15, C~8, K~40, Ca~8, Fe~0.3).

Selenium (Se) is not tracked — skip it.

Mirror the magnesium_mg and potassium_mg you returned at top-level inside micros_per_oz too (same value).`,
          },
          {
            role: "user",
            content: `Analyze this beverage and return per-oz nutrition: "${text}". Serving size context: ${ozNum} oz.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_beverage",
              description: "Return per-oz hydration nutrition for the beverage.",
              parameters: {
                type: "object",
                properties: {
                  display_name: { type: "string", description: "Short clean human-readable beverage name." },
                  water_g_per_oz: { type: "number", description: "Grams of water per fl oz (0–29.6)." },
                  sodium_mg_per_oz: { type: "number", description: "Sodium mg per fl oz." },
                  potassium_mg_per_oz: { type: "number", description: "Potassium mg per fl oz." },
                  magnesium_mg_per_oz: { type: "number", description: "Magnesium mg per fl oz." },
                  sugar_g_per_oz: { type: "number", description: "Sugar grams per fl oz." },
                  total_carbs_g_per_oz: { type: "number", description: "Total carbohydrate grams per fl oz." },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  notes: { type: "string", description: "Brief 1-sentence rationale or assumption." },
                  micros_per_oz: {
                    type: "object",
                    description: "USDA-style micronutrient estimates per fl oz.",
                    properties: {
                      vitamin_a_mcg:   { type: "number" },
                      vitamin_c_mg:    { type: "number" },
                      vitamin_d_mcg:   { type: "number" },
                      vitamin_e_mg:    { type: "number" },
                      vitamin_k_mcg:   { type: "number" },
                      vitamin_b6_mg:   { type: "number" },
                      vitamin_b12_mcg: { type: "number" },
                      folate_mcg:      { type: "number" },
                      calcium_mg:      { type: "number" },
                      iron_mg:         { type: "number" },
                      magnesium_mg:    { type: "number" },
                      potassium_mg:    { type: "number" },
                      zinc_mg:         { type: "number" },
                    },
                    required: [
                      "vitamin_a_mcg","vitamin_c_mg","vitamin_d_mcg","vitamin_e_mg","vitamin_k_mcg",
                      "vitamin_b6_mg","vitamin_b12_mcg","folate_mcg","calcium_mg","iron_mg",
                      "magnesium_mg","potassium_mg","zinc_mg",
                    ],
                    additionalProperties: false,
                  },
                },
                required: [
                  "display_name",
                  "water_g_per_oz",
                  "sodium_mg_per_oz",
                  "potassium_mg_per_oz",
                  "magnesium_mg_per_oz",
                  "sugar_g_per_oz",
                  "total_carbs_g_per_oz",
                  "confidence",
                  "notes",
                  "micros_per_oz",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_beverage" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Hammer is busy right now — please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiResponse.text();
      console.error("[analyze-hydration-text] AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("[analyze-hydration-text] No tool call in response", aiData);
      return new Response(JSON.stringify({ error: "AI did not return structured analysis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("[analyze-hydration-text] Failed to parse AI args", e);
      return new Response(JSON.stringify({ error: "Failed to parse AI analysis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize / clamp values
    const clamp = (n: number, min: number, max: number) =>
      Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
    const m = (parsed.micros_per_oz ?? {}) as Record<string, any>;
    const micros_per_oz = {
      vitamin_a_mcg:   clamp(Number(m.vitamin_a_mcg),   0, 200),
      vitamin_c_mg:    clamp(Number(m.vitamin_c_mg),    0, 100),
      vitamin_d_mcg:   clamp(Number(m.vitamin_d_mcg),   0, 5),
      vitamin_e_mg:    clamp(Number(m.vitamin_e_mg),    0, 10),
      vitamin_k_mcg:   clamp(Number(m.vitamin_k_mcg),   0, 50),
      vitamin_b6_mg:   clamp(Number(m.vitamin_b6_mg),   0, 5),
      vitamin_b12_mcg: clamp(Number(m.vitamin_b12_mcg), 0, 5),
      folate_mcg:      clamp(Number(m.folate_mcg),      0, 100),
      calcium_mg:      clamp(Number(m.calcium_mg),      0, 200),
      iron_mg:         clamp(Number(m.iron_mg),         0, 10),
      magnesium_mg:    clamp(Number(m.magnesium_mg),    0, 200),
      potassium_mg:    clamp(Number(m.potassium_mg),    0, 500),
      zinc_mg:         clamp(Number(m.zinc_mg),         0, 5),
    };
    const result = {
      display_name: String(parsed.display_name || text).slice(0, 80),
      water_g_per_oz: clamp(Number(parsed.water_g_per_oz), 0, 29.6),
      sodium_mg_per_oz: clamp(Number(parsed.sodium_mg_per_oz), 0, 500),
      potassium_mg_per_oz: clamp(Number(parsed.potassium_mg_per_oz), 0, 500),
      magnesium_mg_per_oz: clamp(Number(parsed.magnesium_mg_per_oz), 0, 200),
      sugar_g_per_oz: clamp(Number(parsed.sugar_g_per_oz), 0, 15),
      total_carbs_g_per_oz: clamp(Number(parsed.total_carbs_g_per_oz), 0, 20),
      confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low",
      notes: String(parsed.notes || "").slice(0, 240),
      micros_per_oz,
    };

    console.log(`[analyze-hydration-text] OK: ${result.display_name} (${result.confidence})`);

    return new Response(JSON.stringify({ analysis: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[analyze-hydration-text] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
