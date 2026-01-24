import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid transcript' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing food transcript:', transcript);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a nutrition parsing expert. Convert natural language food descriptions into structured data.

Rules:
1. Parse each distinct food item separately
2. Use standard serving sizes (1 egg = large ~70g, 1 slice bread ~30g, 1 cup = 240ml, etc.)
3. Estimate reasonable portions if not specified ("some" = 1 serving, "a couple" = 2)
4. Use USDA-approximate nutrition values per serving
5. Handle colloquial terms and common food combinations
6. If quantity is not specified, assume 1 serving
7. Round all numbers to whole integers

Common nutrition reference (per standard serving):
- Large egg: 70 cal, 6g protein, 0g carbs, 5g fat
- Slice of bread/toast: 80 cal, 3g protein, 15g carbs, 1g fat
- Banana (medium): 105 cal, 1g protein, 27g carbs, 0g fat
- Butter (1 tbsp): 100 cal, 0g protein, 0g carbs, 11g fat
- Chicken breast (4oz): 165 cal, 31g protein, 0g carbs, 4g fat
- Rice (1 cup cooked): 205 cal, 4g protein, 45g carbs, 0g fat
- Apple (medium): 95 cal, 0g protein, 25g carbs, 0g fat
- Milk (1 cup): 150 cal, 8g protein, 12g carbs, 8g fat
- Cheese (1 oz): 110 cal, 7g protein, 0g carbs, 9g fat
- Almonds (1 oz/23 nuts): 165 cal, 6g protein, 6g carbs, 14g fat`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse this food description into individual items: "${transcript}"` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_foods",
              description: "Parse natural language food description into structured food items with nutrition data",
              parameters: {
                type: "object",
                properties: {
                  foods: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Food name (e.g., 'Scrambled Eggs', 'Whole Wheat Toast')" },
                        quantity: { type: "number", description: "Quantity of the food item" },
                        unit: { type: "string", description: "Unit of measurement (e.g., 'large', 'slice', 'cup', 'oz', 'tbsp')" },
                        calories: { type: "number", description: "Total calories for this quantity" },
                        protein: { type: "number", description: "Total protein in grams" },
                        carbs: { type: "number", description: "Total carbohydrates in grams" },
                        fats: { type: "number", description: "Total fats in grams" },
                        confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence level in the parsing" }
                      },
                      required: ["name", "quantity", "unit", "calories", "protein", "carbs", "fats", "confidence"]
                    }
                  },
                  originalText: { type: "string", description: "The original input transcript" },
                  clarificationNeeded: { type: "string", description: "Optional clarification question if input was ambiguous", nullable: true }
                },
                required: ["foods", "originalText"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_foods" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'parse_foods') {
      throw new Error('Invalid AI response format');
    }

    const parsedResult = JSON.parse(toolCall.function.arguments);
    console.log('Parsed foods:', parsedResult);

    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing voice food:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to parse food description' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
