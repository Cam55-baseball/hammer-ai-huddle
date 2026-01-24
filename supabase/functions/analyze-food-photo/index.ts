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

Be thorough but realistic. If the image shows no food or is too unclear, indicate that.`;

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
              { 
                type: 'text', 
                text: 'Identify all foods in this meal photo. Estimate portions and provide nutrition data for each item. If no food is visible or the image is too unclear, indicate that.' 
              },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:image/jpeg;base64,${imageBase64}` 
                } 
              }
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
                    description: 'List of identified food items',
                    items: {
                      type: 'object',
                      properties: {
                        name: { 
                          type: 'string', 
                          description: 'Name of the food item (e.g., "Scrambled Eggs", "Grilled Chicken Breast")' 
                        },
                        quantity: { 
                          type: 'number', 
                          description: 'Estimated quantity (e.g., 2 for two eggs)' 
                        },
                        unit: { 
                          type: 'string', 
                          description: 'Unit of measurement (e.g., "large", "oz", "cup", "slice")' 
                        },
                        calories: { 
                          type: 'number', 
                          description: 'Estimated calories for the portion shown' 
                        },
                        protein: { 
                          type: 'number', 
                          description: 'Estimated protein in grams' 
                        },
                        carbs: { 
                          type: 'number', 
                          description: 'Estimated carbohydrates in grams' 
                        },
                        fats: { 
                          type: 'number', 
                          description: 'Estimated fats in grams' 
                        },
                        confidence: { 
                          type: 'string', 
                          enum: ['high', 'medium', 'low'],
                          description: 'Confidence level in the identification' 
                        }
                      },
                      required: ['name', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fats', 'confidence']
                    }
                  },
                  mealDescription: {
                    type: 'string',
                    description: 'Brief overall description of the meal (e.g., "Balanced breakfast with protein and carbs")'
                  },
                  portionNotes: {
                    type: 'string',
                    description: 'Any notes about portion estimation or uncertainties'
                  },
                  noFoodDetected: {
                    type: 'boolean',
                    description: 'Set to true if no food is visible in the image'
                  },
                  imageQualityIssue: {
                    type: 'string',
                    description: 'Description of any image quality issues (blurry, dark, etc.) or null if image is clear'
                  }
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
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'identify_foods') {
      console.error('Unexpected AI response format:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Failed to parse food identification result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log(`Identified ${result.foods?.length || 0} food items`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-food-photo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
