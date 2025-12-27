import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch the recipe page
    console.log(`Fetching recipe from: ${url}`);
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeParser/1.0)'
      }
    });
    
    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch URL: ${pageResponse.status}`);
    }
    
    const html = await pageResponse.text();
    
    // Use AI to extract recipe data
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
            content: `You are a recipe extraction expert. Extract recipe information from HTML content and return it as structured JSON. Be thorough in extracting all ingredients with their quantities and units.`
          },
          {
            role: "user",
            content: `Extract the recipe from this HTML and return ONLY a JSON object with these fields:
{
  "name": "recipe name",
  "description": "brief description",
  "servings": number,
  "prepTime": number (in minutes),
  "cookTime": number (in minutes),
  "ingredients": [
    { "name": "ingredient name", "quantity": number, "unit": "unit", "notes": "optional prep notes" }
  ],
  "instructions": ["step 1", "step 2", ...],
  "estimatedNutrition": {
    "calories": number per serving,
    "protein": number in grams,
    "carbs": number in grams,
    "fats": number in grams,
    "fiber": number in grams
  }
}

HTML content (truncated to first 50000 chars):
${html.substring(0, 50000)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_recipe",
              description: "Extract structured recipe data from HTML",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Recipe name" },
                  description: { type: "string", description: "Brief description" },
                  servings: { type: "number", description: "Number of servings" },
                  prepTime: { type: "number", description: "Prep time in minutes" },
                  cookTime: { type: "number", description: "Cook time in minutes" },
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        quantity: { type: "number" },
                        unit: { type: "string" },
                        notes: { type: "string" }
                      },
                      required: ["name", "quantity", "unit"]
                    }
                  },
                  instructions: {
                    type: "array",
                    items: { type: "string" }
                  },
                  estimatedNutrition: {
                    type: "object",
                    properties: {
                      calories: { type: "number" },
                      protein: { type: "number" },
                      carbs: { type: "number" },
                      fats: { type: "number" },
                      fiber: { type: "number" }
                    }
                  }
                },
                required: ["name", "servings", "ingredients"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_recipe" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to parse recipe with AI");
    }

    const aiResult = await response.json();
    console.log("AI response:", JSON.stringify(aiResult, null, 2));
    
    // Extract the function call result
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("Failed to extract recipe data");
    }
    
    const recipe = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ recipe }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error parsing recipe:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
