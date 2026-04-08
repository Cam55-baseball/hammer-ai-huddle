import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { sport = "baseball", module = "fielding", count = 5, target_issues } = await req.json();

    // Fetch existing drill names to deduplicate
    const { data: existingDrills } = await supabase
      .from("drills")
      .select("name")
      .eq("sport", sport);
    const existingNames = new Set(
      (existingDrills || []).map((d: any) => d.name.toLowerCase())
    );

    // Also check pending
    const { data: pendingDrills } = await supabase
      .from("pending_drills")
      .select("title")
      .eq("sport", sport)
      .eq("status", "pending");
    for (const p of pendingDrills || []) {
      existingNames.add(p.title.toLowerCase());
    }

    const issueContext = target_issues?.length
      ? `Focus on drills that address these specific issues: ${target_issues.join(", ")}.`
      : "";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
              content: `You are an elite baseball/softball defensive coaching expert. Generate unique, practical defensive drills. Each drill must have a clear purpose, specific positions it helps, and a progression level from 1-7 (1=Tee Ball, 2=Youth, 3=Middle School, 4=High School, 5=College, 6=Pro, 7=Elite). Drills must be unique and not duplicates of: ${Array.from(existingNames).slice(0, 50).join(", ")}`,
            },
            {
              role: "user",
              content: `Generate ${count} unique ${sport} ${module} drills. ${issueContext} Return structured data using the generate_drills function.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_drills",
                description: "Generate defensive drill suggestions",
                parameters: {
                  type: "object",
                  properties: {
                    drills: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          sport: { type: "string", enum: ["baseball", "softball"] },
                          positions: {
                            type: "array",
                            items: { type: "string" },
                          },
                          progression_level: { type: "integer", minimum: 1, maximum: 7 },
                          tags: {
                            type: "object",
                            properties: {
                              error_type: { type: "array", items: { type: "string" } },
                              skill: { type: "array", items: { type: "string" } },
                              situation: { type: "array", items: { type: "string" } },
                            },
                            required: ["error_type", "skill", "situation"],
                          },
                          ai_context: { type: "string" },
                          module: { type: "string" },
                          skill_target: { type: "string" },
                        },
                        required: [
                          "title", "description", "sport", "positions",
                          "progression_level", "tags", "ai_context", "module", "skill_target",
                        ],
                      },
                    },
                  },
                  required: ["drills"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_drills" } },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway returned ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    const generatedDrills = parsed.drills || [];

    // Validate and insert into pending_drills
    let insertedCount = 0;
    for (const drill of generatedDrills) {
      // Validation
      if (!drill.title || !drill.tags || !drill.progression_level) continue;
      if (!drill.tags.error_type?.length && !drill.tags.skill?.length) continue;
      if (existingNames.has(drill.title.toLowerCase())) continue;

      const { error } = await supabase.from("pending_drills").insert({
        title: drill.title,
        description: drill.description || null,
        sport: drill.sport || sport,
        positions: drill.positions || [],
        progression_level: Math.min(7, Math.max(1, drill.progression_level)),
        tags: drill.tags,
        ai_context: drill.ai_context || null,
        module: drill.module || module,
        skill_target: drill.skill_target || null,
        source: "ai",
        status: "pending",
      });

      if (!error) {
        insertedCount++;
        existingNames.add(drill.title.toLowerCase());
      }
    }

    return new Response(
      JSON.stringify({ generated: insertedCount, total_returned: generatedDrills.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-drills error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
