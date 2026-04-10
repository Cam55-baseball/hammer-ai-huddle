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
    // Auth check
    const ownerKey = req.headers.get("x-owner-key") || req.headers.get("Owner_Key");
    const expectedKey = Deno.env.get("Owner_Key");
    if (!expectedKey || ownerKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    const batchSize = body.batch_size || 5;
    const limit = body.limit || 100;

    // Fetch drills needing instructions
    let query = supabase
      .from("drills")
      .select("id, name, description, skill_target, module, sport, ai_context, progression_level")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (!force) {
      query = query.is("instructions", null);
    }

    const { data: drills, error: fetchErr } = await query;
    if (fetchErr) throw new Error(`Failed to fetch drills: ${fetchErr.message}`);
    if (!drills || drills.length === 0) {
      return new Response(
        JSON.stringify({ message: "No drills need instructions", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${drills.length} drills in batches of ${batchSize}`);

    let updatedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < drills.length; i += batchSize) {
      const batch = drills.slice(i, i + batchSize);

      const drillDescriptions = batch
        .map(
          (d, idx) =>
            `Drill ${idx + 1}: "${d.name}" | Sport: ${d.sport} | Module: ${d.module} | Skill: ${d.skill_target || "general"} | Level: ${d.progression_level}/7 | Description: ${d.description || "none"} | Context: ${d.ai_context || "none"}`
        )
        .join("\n\n");

      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
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
                content: `You are an elite baseball/softball coaching expert who writes FIELD-READY drill instructions. Every instruction must enable a player to perform the drill perfectly WITHOUT watching a video.

ABSOLUTE RULES:
- Setup MUST include: exact distances (in feet/yards), required equipment, starting body position, and recommended reps
- Execution MUST have 5+ numbered steps describing EXACT body mechanics, timing, and movement directions
- Coaching cues MUST be short (3-6 words), usable in real-time during practice
- Mistakes MUST describe specific bad habits with body positioning details
- Progression MUST increase difficulty via speed, reaction, movement, constraint, or pressure

BANNED PHRASES (never use these):
- "work on", "focus on", "improve", "practice", "try to", "make sure to"
- Any vague language that doesn't describe physical movement

REQUIRED LANGUAGE:
- Use action verbs: "drive", "explode", "snap", "drop", "rotate", "extend"
- Include body parts: "hips", "glove hand", "back foot", "throwing shoulder"
- Specify directions: "laterally", "at 45 degrees", "toward the target", "across your body"`,
              },
              {
                role: "user",
                content: `Generate detailed, field-ready instructions for these ${batch.length} drills:\n\n${drillDescriptions}\n\nReturn structured data using the generate_instructions function. Each drill's instructions must be complete enough for a player to execute perfectly without any video.`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "generate_instructions",
                  description:
                    "Generate field-ready drill instructions for each drill",
                  parameters: {
                    type: "object",
                    properties: {
                      instructions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            drill_index: {
                              type: "integer",
                              description: "0-based index matching the drill order",
                            },
                            purpose: {
                              type: "string",
                              description:
                                "WHY this drill matters in a game context. 1-2 sentences connecting to real game situations.",
                            },
                            setup: {
                              type: "string",
                              description:
                                "EXACT setup: distances in feet, equipment needed, starting body position, recommended reps/sets.",
                            },
                            execution: {
                              type: "array",
                              items: { type: "string" },
                              description:
                                "5+ step-by-step instructions with exact body mechanics. Each step must describe a specific physical movement.",
                            },
                            coaching_cues: {
                              type: "array",
                              items: { type: "string" },
                              description:
                                "3+ short (3-6 word) cues a coach would yell during reps.",
                            },
                            mistakes: {
                              type: "array",
                              items: { type: "string" },
                              description:
                                "3+ specific bad habits with body positioning details.",
                            },
                            progression: {
                              type: "array",
                              items: { type: "string" },
                              description:
                                "3+ ways to increase difficulty: speed, reaction, movement, constraint, or pressure.",
                            },
                          },
                          required: [
                            "drill_index",
                            "purpose",
                            "setup",
                            "execution",
                            "coaching_cues",
                            "mistakes",
                            "progression",
                          ],
                        },
                      },
                    },
                    required: ["instructions"],
                  },
                },
              },
            ],
            tool_choice: {
              type: "function",
              function: { name: "generate_instructions" },
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error(`AI error for batch ${i / batchSize}:`, response.status, errText);
        if (response.status === 429) {
          // Wait and retry
          console.log("Rate limited, waiting 30s...");
          await new Promise((r) => setTimeout(r, 30000));
          i -= batchSize; // retry this batch
          continue;
        }
        errors.push(`Batch ${i / batchSize}: AI error ${response.status}`);
        failedCount += batch.length;
        continue;
      }

      const aiResult = await response.json();
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        errors.push(`Batch ${i / batchSize}: No tool call in response`);
        failedCount += batch.length;
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        errors.push(`Batch ${i / batchSize}: Failed to parse AI response`);
        failedCount += batch.length;
        continue;
      }

      const generatedInstructions = parsed.instructions || [];

      for (const inst of generatedInstructions) {
        const drillIdx = inst.drill_index;
        if (drillIdx == null || drillIdx < 0 || drillIdx >= batch.length) continue;

        const drill = batch[drillIdx];

        // Validate quality
        if (!inst.execution || inst.execution.length < 4) {
          console.warn(`Drill "${drill.name}": execution too short (${inst.execution?.length || 0} steps), skipping`);
          failedCount++;
          continue;
        }
        if (!inst.coaching_cues || inst.coaching_cues.length < 3) {
          console.warn(`Drill "${drill.name}": too few coaching cues, skipping`);
          failedCount++;
          continue;
        }
        if (!inst.setup) {
          console.warn(`Drill "${drill.name}": missing setup, skipping`);
          failedCount++;
          continue;
        }

        // Build clean instructions object
        const instructions = {
          purpose: inst.purpose,
          setup: inst.setup,
          execution: inst.execution,
          coaching_cues: inst.coaching_cues,
          mistakes: inst.mistakes || [],
          progression: inst.progression || [],
        };

        const { error: updateErr } = await supabase
          .from("drills")
          .update({ instructions })
          .eq("id", drill.id);

        if (updateErr) {
          console.error(`Failed to update drill "${drill.name}":`, updateErr);
          failedCount++;
        } else {
          updatedCount++;
          console.log(`✓ Updated: ${drill.name}`);
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + batchSize < drills.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return new Response(
      JSON.stringify({
        total_drills: drills.length,
        updated: updatedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("populate-drill-instructions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
