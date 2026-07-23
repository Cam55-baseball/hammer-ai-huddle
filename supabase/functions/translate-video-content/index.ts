import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatCompletion } from "../_shared/googleAi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description, notes, targetLang } = await req.json();

    if (!targetLang || targetLang === "en") {
      return new Response(JSON.stringify({ title, description, notes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const contentToTranslate = JSON.stringify({
      title: title || "",
      description: description || "",
      notes: notes || "",
    });

    const result = await chatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a translation assistant. Translate the following JSON values to ${targetLang}. Return ONLY valid JSON with the same keys (title, description, notes). Keep the translation natural and accurate. Do not translate proper nouns or technical baseball/softball terms unless they have a well-known translation.`,
        },
        { role: "user", content: contentToTranslate },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_translation",
            description: "Return the translated content",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                notes: { type: "string" },
              },
              required: ["title", "description", "notes"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_translation" } },
    });

    if (!result.ok) {
      if (result.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (result.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", result.status, result.errorBody);
      return new Response(JSON.stringify({ title, description, notes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolCall = result.data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const translated = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(translated), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: return original
    return new Response(JSON.stringify({ title, description, notes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
