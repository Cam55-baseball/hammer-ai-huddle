// Edge function: analyze-hydration-beverage
// Given a beverage NAME (e.g. "Goat Milk"), returns USDA-style per-oz macros
// AND micronutrients. Used to lazily enrich hydration_beverage_database
// rows that have empty data so every preset eventually carries real values.

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

const SYSTEM_PROMPT = `You are a USDA-grade beverage analyst. Given a beverage NAME (and optional category hint), estimate per-fluid-ounce macros AND a full 13-key micronutrient panel.

Return per-oz macros: water_g, sodium_mg, potassium_mg, magnesium_mg, calcium_mg, sugar_g, glucose_g, fructose_g, total_carbs_g, osmolality_estimate.
Return per-oz micros (all 13): vitamin_a_mcg, vitamin_c_mg, vitamin_d_mcg, vitamin_e_mg, vitamin_k_mcg, vitamin_b6_mg, vitamin_b12_mcg, folate_mcg, calcium_mg, iron_mg, magnesium_mg, potassium_mg, zinc_mg.
Mirror calcium_mg / magnesium_mg / potassium_mg between macros and micros (same value).
confidence: 0..1.

CRITICAL — DO NOT RETURN ALL-ZEROS for any non-water, non-black-coffee, non-plain-tea beverage.

REFERENCE (per fl oz):
- Goat milk: water~25, Ca~33, K~62, Mg~4, sugar~1.4, A~14, B12~0.02, D~0.07, Zn~0.1, B6~0.014, osmolality~300
- Cow milk: water~26, Ca~15, K~18, Mg~1.4, sugar~1.6, A~18, D~0.16, B12~0.16, osmolality~285
- Almond milk (fortified): Ca~14, D~0.3, E~2, A~18
- Oat milk (fortified): Ca~14, D~0.3, B12~0.15
- Soy milk (fortified): Ca~14, D~0.3, B12~0.3, K~17
- Coconut water: K~75, Mg~7.5, Ca~7, folate~0.9, C~0.3
- Orange juice: water~26, C~10, folate~9, K~24, sugar~2.5, fructose~1.25, glucose~1.25, osmolality~600
- Apple juice: C~0.3, K~14, sugar~2.8
- Coffee black: water~29, K~14, Mg~0.9, osmolality~30
- Tea unsweetened: water~29, K~4, folate~1.5, Mg~0.6
- Sports drink: water~28, Na~14, K~4, sugar~1.7, glucose~1.7, B12~0.04, osmolality~300
- Energy drink: B6~0.5, B12~0.7
- Soda: water~26, sugar~3.3, glucose~1.65, fructose~1.65, osmolality~650
- Beer: K~8, Mg~2, folate~1.5
- Wine red: K~32, Mg~3, Fe~0.13
- Kombucha: B12~0.06, B6~0.012, folate~0.5, Mg~0.5
- Kefir: Ca~13, K~16, B12~0.1, Mg~1.4
- Bone broth: Ca~3, K~10, Mg~1, Fe~0.1
- Smoothies: scale by ingredients

Selenium (Se) is not tracked — skip it.`;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
}

function sanitize(parsed: Record<string, any>) {
  const m = (parsed.micros_per_oz ?? {}) as Record<string, any>;
  const calcium_mg   = clamp(Number(parsed.calcium_mg   ?? m.calcium_mg),   0, 200);
  const magnesium_mg = clamp(Number(parsed.magnesium_mg ?? m.magnesium_mg), 0, 200);
  const potassium_mg = clamp(Number(parsed.potassium_mg ?? m.potassium_mg), 0, 500);

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
  const macros_per_oz = {
    water_g:             clamp(Number(parsed.water_g),             0, 29.6),
    sodium_mg:           clamp(Number(parsed.sodium_mg),           0, 200),
    potassium_mg,
    magnesium_mg,
    calcium_mg,
    sugar_g:             clamp(Number(parsed.sugar_g),             0, 12),
    glucose_g:           clamp(Number(parsed.glucose_g),           0, 12),
    fructose_g:          clamp(Number(parsed.fructose_g),          0, 12),
    total_carbs_g:       clamp(Number(parsed.total_carbs_g),       0, 20),
    osmolality_estimate: clamp(Number(parsed.osmolality_estimate), 0, 2000),
  };
  const confidence = clamp(Number(parsed.confidence), 0, 1);
  return { macros_per_oz, micros_per_oz, confidence };
}

function isAllZeroMicros(m: Record<string, number>) {
  return MICRO_KEYS.every(k => !m[k] || m[k] === 0);
}

function isLikelyNonZero(name: string) {
  const n = name.toLowerCase();
  if (/^(plain |distilled )?water$/.test(n)) return false;
  if (/^black coffee$/.test(n)) return false;
  if (/^(plain )?tea$/.test(n)) return false;
  return /milk|juice|smoothie|sport|energy|cola|soda|wine|beer|kombucha|kefir|broth|matcha|coconut|latte|coffee/.test(n);
}

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "analyze_beverage",
    description: "Return per-oz macros and micros for the beverage.",
    parameters: {
      type: "object",
      properties: {
        water_g:             { type: "number" },
        sodium_mg:           { type: "number" },
        potassium_mg:        { type: "number" },
        magnesium_mg:        { type: "number" },
        calcium_mg:          { type: "number" },
        sugar_g:             { type: "number" },
        glucose_g:           { type: "number" },
        fructose_g:          { type: "number" },
        total_carbs_g:       { type: "number" },
        osmolality_estimate: { type: "number" },
        confidence:          { type: "number" },
        micros_per_oz: {
          type: "object",
          properties: Object.fromEntries(MICRO_KEYS.map(k => [k, { type: "number" }])),
          required: [...MICRO_KEYS],
          additionalProperties: false,
        },
      },
      required: [
        "water_g","sodium_mg","potassium_mg","magnesium_mg","calcium_mg",
        "sugar_g","glucose_g","fructose_g","total_carbs_g","osmolality_estimate",
        "confidence","micros_per_oz",
      ],
      additionalProperties: false,
    },
  },
};

async function callAI(apiKey: string, name: string, category: string | null, strict: boolean) {
  const userMsg = strict
    ? `Re-analyze "${name}"${category ? ` (category: ${category})` : ""}. Previous attempt returned all-zero micros — wrong. Produce realistic USDA non-zero values.`
    : `Beverage: "${name}"${category ? `\nCategory: ${category}` : ""}\nReturn per-oz macros and micros.`;

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
  return sanitize(JSON.parse(args));
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

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const category = body.category ? String(body.category).slice(0, 60) : null;
    if (!name || name.length < 2) {
      return new Response(JSON.stringify({ error: "name is required (min 2 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[analyze-hydration-beverage] "${name}" cat=${category}`);

    let result = await callAI(apiKey, name, category, false);

    // Zero-veto: if non-trivial beverage came back all zeros, retry once strict.
    if (isAllZeroMicros(result.micros_per_oz) && isLikelyNonZero(name)) {
      console.warn(`[analyze-hydration-beverage] All-zero on "${name}" — retrying strict`);
      result = await callAI(apiKey, name, category, true);
      if (isAllZeroMicros(result.micros_per_oz)) {
        console.warn(`[analyze-hydration-beverage] Still zero — applying conservative fallback`);
        result.micros_per_oz.calcium_mg   = 5;
        result.micros_per_oz.potassium_mg = 10;
        result.micros_per_oz.magnesium_mg = 1;
        result.macros_per_oz.calcium_mg   = 5;
        result.macros_per_oz.potassium_mg = 10;
        result.macros_per_oz.magnesium_mg = 1;
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[analyze-hydration-beverage] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
