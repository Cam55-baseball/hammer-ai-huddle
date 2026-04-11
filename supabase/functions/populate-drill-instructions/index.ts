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

    // Auth check - Owner_Key header, OWNER_INIT_KEY header, or authenticated owner/admin user
    const ownerKey = req.headers.get("x-owner-key") || req.headers.get("Owner_Key");
    const expectedKey = Deno.env.get("Owner_Key");
    const initKey = req.headers.get("x-init-key");
    const expectedInitKey = Deno.env.get("OWNER_INIT_KEY");
    let authorized = !!(expectedKey && ownerKey === expectedKey);
    if (!authorized && expectedInitKey && initKey === expectedInitKey) {
      authorized = true;
    }

    if (!authorized) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabase.auth.getUser(token);
        if (data?.user) {
          const { data: role } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .in("role", ["owner", "admin"])
            .eq("status", "active")
            .maybeSingle();
          authorized = !!role;
        }
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    const batchSize = body.batch_size || 5;
    const limit = body.limit || 100;
    const offset = body.offset || 0;

    // Fetch drills needing instructions
    let query = supabase
      .from("drills")
      .select("id, name, description, skill_target, module, sport, ai_context, progression_level")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

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
                content: `You are an elite baseball/softball coaching expert who writes GAME-SPEED, FIELD-READY drill instructions. Every instruction set must enable a player to execute the drill PERFECTLY at full intensity WITHOUT a video and WITHOUT a coach present.

ELITE STANDARD — EVERY DRILL MUST MEET ALL OF THESE:

═══ SETUP (mandatory fields) ═══
- Exact distances in feet or yards (e.g., "15 feet", "60 feet 6 inches")
- All required equipment listed explicitly
- Starting stance described with body part positions (feet, hands, hips, eyes)
- Specific reps AND sets (e.g., "3 sets of 8 reps" not just "multiple reps")

═══ EXECUTION (minimum 6 steps, no exceptions) ═══
Each step MUST contain ALL THREE:
1. A specific body movement (which body part does what)
2. A direction (laterally, forward, at 45°, toward target, across body)
3. Timing or sequencing (on the signal, simultaneously, after contact, as the ball releases)
NO STEP may be vague or omit any of these three elements.

═══ COACHING CUES (3–5 cues, each 3–6 words) ═══
- Must be yellable mid-rep by a coach
- Imperative voice, action verbs only
- Examples: "Snap glove to midline!", "Explode through the ball!", "Eyes locked on release!"
- NOT instructional paragraphs — short, sharp commands

═══ MISTAKES (3+ entries, each with THREE parts) ═══
Each mistake must describe:
1. The incorrect body movement (what goes wrong physically)
2. Why it happens (the root cause)
3. What it causes (the game consequence)

═══ PROGRESSION (3+ entries, each with specific mechanism) ═══
Each must specify the EXACT difficulty increase using one of:
- Speed (e.g., "reduce reaction window from 2s to 0.8s")
- Reaction (e.g., "add random directional calls")
- Movement (e.g., "start from a full sprint instead of standing")
- Pressure (e.g., "add a runner on base forcing urgency")
- Constraint (e.g., "use only backhand, no forehand allowed")
NO generic "make it harder" — every progression must be concrete and measurable.

═══ BANNED LANGUAGE (automatic fail if found) ═══
NEVER use: "focus on", "work on", "improve", "practice", "try to", "make sure to", "be sure to", "remember to", "concentrate on", "pay attention to", "aim for", "strive to", "attempt to"

═══ REQUIRED VERBS ═══
Use these: drive, explode, snap, rotate, extend, plant, fire, whip, rip, punch, load, transfer, engage, brace, attack, funnel, channel, lock, release, clear`,
              },
              {
                role: "user",
                content: `Generate ELITE-LEVEL, field-ready instructions for these ${batch.length} drills. Every drill must meet ALL standards above — 6+ execution steps, specific distances, reps/sets, yellable cues, detailed mistakes with causes, and concrete progressions.\n\n${drillDescriptions}\n\nReturn structured data using the generate_instructions function.`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "generate_instructions",
                  description:
                    "Generate elite field-ready drill instructions for each drill",
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
                                "EXACT setup with: distances in feet/yards, all equipment, starting stance with body positions (feet/hands/hips/eyes), specific reps AND sets.",
                            },
                            execution: {
                              type: "array",
                              items: { type: "string" },
                              minItems: 6,
                              description:
                                "MINIMUM 6 step-by-step instructions. EACH step must include: specific body movement + direction + timing/sequencing. No vague steps allowed.",
                            },
                            coaching_cues: {
                              type: "array",
                              items: { type: "string" },
                              minItems: 3,
                              maxItems: 5,
                              description:
                                "3-5 short (3-6 word) cues a coach yells MID-REP. Imperative voice, action verbs only.",
                            },
                            mistakes: {
                              type: "array",
                              items: { type: "string" },
                              minItems: 3,
                              description:
                                "3+ mistakes. EACH must state: (1) the incorrect movement, (2) why it happens, (3) what game consequence it causes.",
                            },
                            progression: {
                              type: "array",
                              items: { type: "string" },
                              minItems: 3,
                              description:
                                "3+ progressions using specific mechanisms: speed, reaction, movement, pressure, or constraint. Each must be concrete and measurable.",
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
          console.log("Rate limited, waiting 30s...");
          await new Promise((r) => setTimeout(r, 30000));
          i -= batchSize;
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

        // ELITE validation gate — minimum 6 execution steps
        if (!inst.execution || inst.execution.length < 6) {
          console.warn(`FAIL "${drill.name}": execution only ${inst.execution?.length || 0} steps (need 6+), skipping`);
          failedCount++;
          continue;
        }
        if (!inst.coaching_cues || inst.coaching_cues.length < 3) {
          console.warn(`FAIL "${drill.name}": only ${inst.coaching_cues?.length || 0} cues (need 3+), skipping`);
          failedCount++;
          continue;
        }
        if (!inst.mistakes || inst.mistakes.length < 3) {
          console.warn(`FAIL "${drill.name}": only ${inst.mistakes?.length || 0} mistakes (need 3+), skipping`);
          failedCount++;
          continue;
        }
        if (!inst.progression || inst.progression.length < 3) {
          console.warn(`FAIL "${drill.name}": only ${inst.progression?.length || 0} progressions (need 3+), skipping`);
          failedCount++;
          continue;
        }
        if (!inst.setup) {
          console.warn(`FAIL "${drill.name}": missing setup, skipping`);
          failedCount++;
          continue;
        }

        // Banned phrase check
        const bannedPhrases = ["focus on", "work on", "improve", "practice", "try to", "make sure to", "be sure to", "remember to", "concentrate on", "pay attention to"];
        const allText = JSON.stringify(inst).toLowerCase();
        const foundBanned = bannedPhrases.filter(p => allText.includes(p));
        if (foundBanned.length > 0) {
          console.warn(`FAIL "${drill.name}": contains banned phrases: ${foundBanned.join(", ")}, skipping`);
          failedCount++;
          continue;
        }

        const instructions = {
          purpose: inst.purpose,
          setup: inst.setup,
          execution: inst.execution,
          coaching_cues: inst.coaching_cues,
          mistakes: inst.mistakes,
          progression: inst.progression,
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
          console.log(`✓ ELITE: ${drill.name} (${inst.execution.length} steps, ${inst.coaching_cues.length} cues)`);
        }
      }

      // Delay between batches
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
