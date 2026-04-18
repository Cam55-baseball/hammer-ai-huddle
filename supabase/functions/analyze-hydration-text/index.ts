// Edge function: analyze-hydration-text
// Estimates per-oz hydration nutrition (macros + 13-key micros) for a free-form
// beverage description using Lovable AI structured tool calling.
// Strict JSON output via tool_choice — model cannot return prose.

import {
  inferCategory, isComplete, applyFallbacks, describeMissing,
  REQUIRED_MICROS, type Category, type MicroKey,
} from "../_shared/hydrationCategoryRules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MICRO_KEYS = [
  "vitamin_a_mcg","vitamin_c_mg","vitamin_d_mcg","vitamin_e_mg","vitamin_k_mcg",
  "vitamin_b6_mg","vitamin_b12_mcg","folate_mcg","calcium_mg","iron_mg",
  "magnesium_mg","potassium_mg","zinc_mg",
] as const;

const SYSTEM_PROMPT = `You are a USDA-grade hydration analyst. Given any beverage description, estimate per-fluid-ounce values for macros AND a full 13-key micronutrient panel.

GENERAL RULES:
- water_g_per_oz: 0–29.6 (1 fl oz ≈ 29.5735 g; pure water ≈ 29.5). For sweetened/dense drinks reduce water proportionally to sugar/solids.
- confidence: 0..1. Use 0.9+ for common standardized drinks, 0.7-0.85 for typical custom drinks, <0.5 for unusual or vague.
- display_name: short, clean human label (e.g. "Iced Matcha Latte with Oat Milk"). Never echo "other" or "drink".
- Mirror calcium_mg / magnesium_mg / potassium_mg between top-level macros and micros_per_oz (same value).

MACRO REFERENCE (per fl oz):
- Plain water: water≈29.5, electrolytes 0, sugar 0, osmolality≈0.
- Coffee/tea unsweetened: water≈29, minimal electrolytes, osmolality≈30.
- Sports drinks: water≈28, sodium≈14mg, potassium≈4mg, sugar≈1.7g, osmolality≈300.
- Soda: water≈26, sugar≈3.3g, osmolality≈650.
- Cow milk (2%): water≈26, sodium≈5mg, potassium≈18mg, sugar≈1.6g, osmolality≈285.
- Goat milk: water≈25, potassium≈62mg, calcium≈33mg, sugar≈1.4g, osmolality≈300.
- For sweet drinks, split sugar_g into glucose_g + fructose_g (≈50/50 for sucrose, 100% glucose for sports drinks, 100% fructose for fruit juice).

MICRONUTRIENT PANEL — micros_per_oz (ALL 13 keys required, per fl oz):
vitamin_a_mcg, vitamin_c_mg, vitamin_d_mcg, vitamin_e_mg, vitamin_k_mcg,
vitamin_b6_mg, vitamin_b12_mcg, folate_mcg, calcium_mg, iron_mg,
magnesium_mg, potassium_mg, zinc_mg.

CRITICAL — DO NOT RETURN ALL-ZEROS for any non-water, non-black-coffee, non-plain-tea drink. At least 3 keys MUST be > 0 for those.

CATEGORY MANDATES:
- Dairy (cow/goat/sheep): MUST populate calcium_mg, potassium_mg, magnesium_mg, zinc_mg, vitamin_a_mcg.
  · Cow milk: Ca~15, K~18, Mg~1.4, Zn~0.11, A~18, D~0.16, B12~0.16
  · Goat milk: Ca~33, K~62, Mg~4, Zn~0.1, A~14, B12~0.02, D~0.07, B6~0.014
  · NEVER return zinc_mg=0 for any dairy milk. Zinc is mandatory (~0.1 mg/oz minimum).
- Plant milks (almond/oat/soy/coconut, fortified): MUST populate calcium_mg, vitamin_d_mcg, vitamin_b12_mcg.
- Citrus juice: MUST populate vitamin_c_mg, folate_mcg, potassium_mg.
- Coconut water: K~75, Mg~7.5, Ca~7, folate~0.9.
- Coffee black: K~14, Mg~0.9.
- Sports drink: K~4, B12~0.04.
- Energy drink: B6~0.5, B12~0.7.
- Smoothies: scale from ingredients.

Selenium (Se) is not tracked — skip it.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "analyze_beverage",
    description: "Return per-oz hydration nutrition for the beverage.",
    parameters: {
      type: "object",
      properties: {
        display_name:         { type: "string" },
        water_g_per_oz:       { type: "number" },
        sodium_mg_per_oz:     { type: "number" },
        potassium_mg_per_oz:  { type: "number" },
        magnesium_mg_per_oz:  { type: "number" },
        calcium_mg_per_oz:    { type: "number" },
        sugar_g_per_oz:       { type: "number" },
        glucose_g_per_oz:     { type: "number" },
        fructose_g_per_oz:    { type: "number" },
        total_carbs_g_per_oz: { type: "number" },
        osmolality_estimate:  { type: "number", description: "mOsm/kg estimate." },
        confidence:           { type: "number", description: "0..1" },
        notes:                { type: "string" },
        micros_per_oz: {
          type: "object",
          properties: Object.fromEntries(MICRO_KEYS.map(k => [k, { type: "number" }])),
          required: [...MICRO_KEYS],
          additionalProperties: false,
        },
      },
      required: [
        "display_name", "water_g_per_oz", "sodium_mg_per_oz", "potassium_mg_per_oz",
        "magnesium_mg_per_oz", "calcium_mg_per_oz", "sugar_g_per_oz",
        "glucose_g_per_oz", "fructose_g_per_oz", "total_carbs_g_per_oz",
        "osmolality_estimate", "confidence", "notes", "micros_per_oz",
      ],
      additionalProperties: false,
    },
  },
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

function sanitize(parsed: Record<string, any>, fallbackName: string) {
  const m = (parsed.micros_per_oz ?? {}) as Record<string, any>;
  const calcium_mg = clamp(Number(parsed.calcium_mg_per_oz ?? m.calcium_mg), 0, 200);
  const magnesium_mg = clamp(Number(parsed.magnesium_mg_per_oz ?? m.magnesium_mg), 0, 200);
  const potassium_mg = clamp(Number(parsed.potassium_mg_per_oz ?? m.potassium_mg), 0, 500);

  const micros_per_oz = {
    vitamin_a_mcg:   clamp(Number(m.vitamin_a_mcg),   0, 400),
    vitamin_c_mg:    clamp(Number(m.vitamin_c_mg),    0, 100),
    vitamin_d_mcg:   clamp(Number(m.vitamin_d_mcg),   0, 5),
    vitamin_e_mg:    clamp(Number(m.vitamin_e_mg),    0, 10),
    vitamin_k_mcg:   clamp(Number(m.vitamin_k_mcg),   0, 50),
    vitamin_b6_mg:   clamp(Number(m.vitamin_b6_mg),   0, 5),
    vitamin_b12_mcg: clamp(Number(m.vitamin_b12_mcg), 0, 5),
    folate_mcg:      clamp(Number(m.folate_mcg),      0, 100),
    calcium_mg,
    iron_mg:         clamp(Number(m.iron_mg),         0, 10),
    magnesium_mg,
    potassium_mg,
    zinc_mg:         clamp(Number(m.zinc_mg),         0, 5),
  };

  let confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence)) {
    // Backwards-compat: accept "high"/"medium"/"low" strings too.
    const c = String(parsed.confidence ?? "").toLowerCase();
    confidence = c === "high" ? 0.9 : c === "medium" ? 0.7 : c === "low" ? 0.4 : 0.5;
  }
  confidence = clamp(confidence, 0, 1);

  return {
    display_name: String(parsed.display_name || fallbackName).slice(0, 80),
    water_g_per_oz:       clamp(Number(parsed.water_g_per_oz),       0, 29.6),
    sodium_mg_per_oz:     clamp(Number(parsed.sodium_mg_per_oz),     0, 200),
    potassium_mg_per_oz:  potassium_mg,
    magnesium_mg_per_oz:  magnesium_mg,
    calcium_mg_per_oz:    calcium_mg,
    sugar_g_per_oz:       clamp(Number(parsed.sugar_g_per_oz),       0, 12),
    glucose_g_per_oz:     clamp(Number(parsed.glucose_g_per_oz),     0, 12),
    fructose_g_per_oz:    clamp(Number(parsed.fructose_g_per_oz),    0, 12),
    total_carbs_g_per_oz: clamp(Number(parsed.total_carbs_g_per_oz), 0, 20),
    osmolality_estimate:  clamp(Number(parsed.osmolality_estimate),  0, 2000),
    confidence,
    notes: String(parsed.notes || "").slice(0, 240),
    micros_per_oz,
  };
}

async function callAI(
  apiKey: string,
  text: string,
  ozNum: number,
  opts: { strict?: boolean; missing?: MicroKey[]; categoryLabel?: Category } = {},
) {
  const { strict = false, missing = [], categoryLabel } = opts;
  let userMsg: string;
  if (strict && missing.length) {
    userMsg = `Re-analyze "${text}" (${ozNum} oz). Previous response was MISSING required micronutrients for ${categoryLabel ?? 'this drink'}: [${describeMissing(missing)}]. These MUST be non-zero per USDA. Return realistic values for ALL required keys.`;
  } else if (strict) {
    userMsg = `Re-analyze "${text}" (${ozNum} oz). Previous attempt failed validation. Return ALL required fields with realistic non-zero values for any non-plain drink.`;
  } else {
    userMsg = `Analyze this beverage and return per-oz nutrition: "${text}". Serving size: ${ozNum} oz.`;
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "function", function: { name: "analyze_beverage" } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call returned");
  return JSON.parse(args);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, amount_oz } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Beverage description is required (min 2 characters)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ozNum = Number(amount_oz);
    if (!Number.isFinite(ozNum) || ozNum <= 0 || ozNum > 200) {
      return new Response(JSON.stringify({ error: "amount_oz must be a positive number ≤ 200" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[analyze-hydration-text] "${text}" @ ${ozNum}oz`);

    let parsed: Record<string, any>;
    try {
      parsed = await callAI(apiKey, text, ozNum, false);
    } catch (e) {
      console.warn("[analyze-hydration-text] First attempt failed, retrying:", e);
      parsed = await callAI(apiKey, text, ozNum, true);
    }

    const result = sanitize(parsed, text);
    console.log(`[analyze-hydration-text] OK: ${result.display_name} conf=${result.confidence}`);

    return new Response(JSON.stringify({ analysis: result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[analyze-hydration-text] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
