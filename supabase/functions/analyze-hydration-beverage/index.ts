// Edge function: analyze-hydration-beverage
// Given a beverage NAME (e.g. "Goat Milk", "Kombucha"), returns USDA-style
// per-oz micronutrients. Used to lazily enrich hydration_beverage_database
// rows that have empty micros_per_oz so every preset eventually carries
// real micronutrient values.

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

const SYSTEM_PROMPT = `You are a USDA-grade beverage micronutrient analyst. Given a beverage NAME (and optional category hint), estimate per-fluid-ounce micronutrient values.

Return ALL 13 keys: vitamin_a_mcg, vitamin_c_mg, vitamin_d_mcg, vitamin_e_mg, vitamin_k_mcg, vitamin_b6_mg, vitamin_b12_mcg, folate_mcg, calcium_mg, iron_mg, magnesium_mg, potassium_mg, zinc_mg. All per fl oz.

CRITICAL RULES — DO NOT RETURN ALL-ZEROS for any non-water, non-black-coffee, non-plain-tea beverage:

DAIRY & MILK ALTERNATIVES (must populate calcium_mg, potassium_mg, magnesium_mg at minimum):
- Cow milk (whole/2%/skim): calcium ~15mg, potassium ~18mg, magnesium ~1.4mg, vitamin_d ~0.16mcg (fortified), vitamin_b12 ~0.16mcg, vitamin_a ~18mcg
- Goat milk: calcium ~33mg, potassium ~62mg, magnesium ~4mg, vitamin_a ~14mcg, vitamin_b12 ~0.02mcg, vitamin_d ~0.07mcg, zinc ~0.1mg, vitamin_b6 ~0.014mg
- Almond milk (fortified): calcium ~14mg, vitamin_d ~0.3mcg, vitamin_e ~2mg, vitamin_a ~18mcg
- Oat milk (fortified): calcium ~14mg, vitamin_d ~0.3mcg, vitamin_b12 ~0.15mcg, riboflavin via vitamin_b6 ~0.05mg
- Soy milk (fortified): calcium ~14mg, vitamin_d ~0.3mcg, vitamin_b12 ~0.3mcg, potassium ~17mg
- Coconut milk (drinking): calcium ~9mg, magnesium ~1mg, potassium ~6mg
- Kefir: calcium ~13mg, potassium ~16mg, vitamin_b12 ~0.1mcg, magnesium ~1.4mg

JUICES (must populate vitamin_c_mg, folate_mcg, potassium_mg for citrus):
- Orange juice: vitamin_c ~10mg, folate ~9mcg, potassium ~24mg, calcium ~1.4mg, vitamin_b6 ~0.012mg
- Apple juice: vitamin_c ~0.3mg, potassium ~14mg, calcium ~1mg
- Grapefruit juice: vitamin_c ~9mg, folate ~3mcg, potassium ~19mg
- Cranberry juice: vitamin_c ~10mg (fortified), potassium ~5mg
- Tomato juice: vitamin_c ~5mg, vitamin_a ~6mcg, potassium ~26mg, folate ~6mcg
- Pomegranate juice: vitamin_c ~0.4mg, potassium ~26mg, folate ~3mcg
- Carrot juice: vitamin_a ~250mcg, vitamin_k ~3mcg, potassium ~36mg
- Vegetable juice: vitamin_a ~32mcg, vitamin_c ~7mg, potassium ~30mg

WATERS / FUNCTIONAL:
- Plain water: all zeros (or trace ~0.4mg calcium/magnesium for spring/mineral)
- Coconut water: potassium ~75mg, magnesium ~7.5mg, calcium ~7mg, folate ~0.9mcg, vitamin_c ~0.3mg
- Mineral water: calcium ~3mg, magnesium ~3mg, potassium ~0.3mg
- Kombucha: vitamin_b12 ~0.06mcg, vitamin_b6 ~0.012mg, folate ~0.5mcg, magnesium ~0.5mg

COFFEE / TEA:
- Coffee (black): potassium ~14mg, magnesium ~0.9mg, vitamin_b6 ~0.001mg, niacin trace
- Latte / coffee with milk: scale milk values by milk fraction (~50%) and add coffee values
- Tea (black/green unsweetened): potassium ~4mg, folate ~1.5mcg, magnesium ~0.6mg
- Matcha: vitamin_k ~0.3mcg, magnesium ~1mg, potassium ~5mg, vitamin_c ~0.1mg
- Herbal tea: trace minerals (~0.5mg potassium, ~0.3mg magnesium)

SPORTS / ENERGY:
- Sports drink (Gatorade-style): potassium ~4mg, sodium covered separately, vitamin_b6 trace, vitamin_b12 ~0.04mcg
- Energy drink: vitamin_b6 ~0.5mg, vitamin_b12 ~0.7mcg, niacin ~2mg (use vitamin_b6 slot loosely), taurine not tracked

SODA / SUGARED:
- Cola/soda: potassium ~0.3mg, calcium ~0.6mg, magnesium ~0.3mg (mostly empty)
- Diet soda: same trace values

ALCOHOL:
- Beer: potassium ~8mg, magnesium ~2mg, folate ~1.5mcg, vitamin_b6 ~0.005mg, niacin trace
- Wine (red): potassium ~32mg, magnesium ~3mg, iron ~0.13mg, vitamin_b6 ~0.013mg
- Wine (white): potassium ~22mg, magnesium ~2mg

SMOOTHIES / BLENDS:
- Fruit smoothie: vitamin_c ~5mg, potassium ~30mg, folate ~5mcg, magnesium ~3mg, calcium ~5mg
- Green smoothie: vitamin_k ~10mcg, vitamin_a ~15mcg, vitamin_c ~8mg, potassium ~40mg, calcium ~8mg, iron ~0.3mg

BROTH:
- Bone broth: calcium ~3mg, potassium ~10mg, magnesium ~1mg, iron ~0.1mg

Use 0 ONLY for plain water, plain black coffee, plain unsweetened tea, distilled water. For everything else at least 3 keys MUST be > 0. If you genuinely don't know a beverage, infer from its category and produce conservative non-zero estimates rather than zero.

Selenium (Se) is not in our 13-key schema — skip it.`;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
}

function sanitizeMicros(m: Record<string, any>) {
  return {
    vitamin_a_mcg:   clamp(Number(m.vitamin_a_mcg),   0, 400),
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
}

function isAllZero(m: Record<string, number>) {
  return MICRO_KEYS.every(k => !m[k] || m[k] === 0);
}

function isLikelyNonZero(name: string) {
  const n = name.toLowerCase();
  if (/^(plain |distilled )?water$/.test(n)) return false;
  if (/^black coffee$/.test(n)) return false;
  if (/^(plain )?tea$/.test(n)) return false;
  // Anything dairy / juice / milk-alt / smoothie / sports / energy / wine / beer / kombucha
  return /milk|juice|smoothie|sport|energy|cola|soda|wine|beer|kombucha|kefir|broth|matcha|coconut/.test(n);
}

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "analyze_micros",
    description: "Return per-oz micronutrient estimates for the beverage.",
    parameters: {
      type: "object",
      properties: Object.fromEntries(MICRO_KEYS.map(k => [k, { type: "number" }])),
      required: [...MICRO_KEYS],
      additionalProperties: false,
    },
  },
};

async function callAI(apiKey: string, name: string, category: string | null, strictRetry: boolean) {
  const userMsg = strictRetry
    ? `Analyze "${name}"${category ? ` (category: ${category})` : ""}. PREVIOUS ATTEMPT RETURNED ALL ZEROS — that was wrong. This beverage is NOT plain water/coffee/tea. Use the category guidance and produce realistic non-zero USDA estimates.`
    : `Beverage name: "${name}"${category ? `\nCategory hint: ${category}` : ""}\nReturn per-oz micronutrient estimates.`;

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
      tool_choice: { type: "function", function: { name: "analyze_micros" } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call returned");
  return sanitizeMicros(JSON.parse(args));
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

    let micros = await callAI(apiKey, name, category, false);

    // Zero-veto: if non-trivial beverage came back all zeros, retry once strict.
    if (isAllZero(micros) && isLikelyNonZero(name)) {
      console.warn(`[analyze-hydration-beverage] All-zero on "${name}" — retrying strict`);
      micros = await callAI(apiKey, name, category, true);
      if (isAllZero(micros)) {
        console.warn(`[analyze-hydration-beverage] Still all-zero on "${name}" — falling back to category default`);
        // Conservative fallback so UI never shows "no micros" for a real drink.
        micros = {
          ...micros,
          calcium_mg: 5, potassium_mg: 10, magnesium_mg: 1,
        };
      }
    }

    return new Response(JSON.stringify({ micros_per_oz: micros }), {
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
