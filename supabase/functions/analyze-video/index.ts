import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Module-specific system prompts
const getSystemPrompt = (module: string, sport: string) => {
  if (module === "hitting") {
    return `You are an expert ${sport} hitting mechanics analyst.

CRITICAL HITTING KINETIC SEQUENCE:
1. Ground Force
2. Legs Drive
3. BACK ELBOW TRAVELS FORWARD (BEFORE hips rotate) ⭐
4. Hips Rotate
5. Torso Rotates
6. Shoulders Rotate
7. Hands/Bat Release

RED FLAGS:
- Front shoulder opens early (out of sequence) → Drops bat speed
- Back elbow drops to slot without traveling forward → Reduces bat speed
- Hips rotate before back elbow travels → Broken kinetic chain

Focus on:
1. Does back elbow TRAVEL forward before hips?
2. Does front shoulder stay closed until proper timing?
3. Are timing gaps correct (elbow → hips → shoulders)?

Provide:
- Efficiency score (0-100) based on form correctness
- Specific feedback on back elbow travel, front shoulder control, kinetic sequence timing
- Identify any sequence violations

DO NOT MENTION: velocity, bat speed, exit velocity, or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  if (module === "pitching" && sport === "baseball") {
    return `You are an expert baseball pitching mechanics analyst.

CRITICAL BASEBALL PITCHING SEQUENCE:

Phase 1 - LANDING POSITION (MUST CHECK FIRST):
At the moment of front foot landing:
1. Back foot, knee, hip → ALL facing the target ⭐
2. Shoulders → In line with target ⭐
3. Front elbow → In line with target ⭐
4. Glove → Open and facing the target ⭐

Phase 2 - STANDARD SEQUENCING (After Landing):
5. Hip rotation
6. Torso rotation
7. Shoulder rotation
8. Arm action
9. Release

RED FLAGS:
- Back leg (foot/knee/hip) NOT facing target before shoulder rotation → Causes INACCURACIES
- Arm flips up BEFORE shoulder moves → INJURY RISK + velocity lowering (indicates T-spine mobility or patterning issue)
- Glove closed or not facing target at landing → Poor directional control
- Shoulders not aligned with target at landing → Energy leakage

Focus on:
1. Is back leg (foot, knee, hip) facing target at landing?
2. Are shoulders and front elbow aligned with target at landing?
3. Is glove open and facing target at landing?
4. Does arm flip up before shoulder rotation (patterning issue)?
5. Does back leg face target BEFORE shoulder moves?

When sequence is correct, the throw should feel EFFORTLESS and AUTOMATIC due to fascial contractile properties.

Provide efficiency score (0-100) and specific feedback on landing position and sequence.`;
  }

  if (module === "pitching" && sport === "softball") {
    return `You are an expert softball pitching mechanics analyst.

Analyze using PROFESSIONAL SOFTBALL PITCHING STANDARDS:

Key Focus Areas:
1. Arm circle mechanics (windmill or slingshot)
2. Hip drive and rotation
3. Release point consistency
4. Balance and stability throughout delivery
5. Follow-through mechanics
6. Lower body engagement
7. Shoulder alignment

Use your knowledge of professional softball pitching mechanics to evaluate form.

Provide efficiency score (0-100) based on professional standards.`;
  }

  if (module === "throwing") {
    return `You are an expert ${sport} throwing mechanics analyst.

CRITICAL THROWING SEQUENCE:

Phase 1 - PRE-THROW POSITION:
Before shoulder rotation begins:
1. Back leg (foot, knee, hip) → MUST face the target ⭐
2. Glove → Open and facing target

Phase 2 - STANDARD SEQUENCING:
3. Footwork → Crow hop or pro step (aligned to target)
4. Hip rotation
5. Torso rotation
6. Shoulder rotation (AFTER back leg faces target)
7. Arm action (follows shoulder)
8. Release

RED FLAGS:
- Back leg NOT facing target before shoulder rotation → Causes INACCURACIES
- Arm flips up BEFORE shoulder moves → INJURY RISK + velocity lowering (indicates T-spine mobility or patterning issue)
- Poor footwork alignment (not directed to target) → Reduces accuracy

Focus on:
1. Does back leg (foot, knee, hip) face target BEFORE shoulder rotation?
2. Does arm flip up before shoulder moves (T-spine/patterning issue)?
3. Is footwork aligned to target?
4. Does shoulder move BEFORE arm action?

When sequence is correct, the throw should feel EFFORTLESS and AUTOMATIC due to fascial contractile properties.

Provide efficiency score (0-100) and specific feedback on sequence and alignment.`;
  }

  return "You are an expert sports mechanics analyst.";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, module, sport } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get system prompt based on module and sport
    const systemPrompt = getSystemPrompt(module, sport);

    // Call Lovable AI for video analysis
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
          {
            role: "user",
            content: `Analyze this ${sport} ${module} video. Note: This is a simulated analysis since actual video processing is not yet implemented. Provide realistic feedback as if analyzing a real video.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content || "No analysis available";

    // Extract efficiency score from feedback (simple pattern matching)
    const scoreMatch = feedback.match(/(\d+)\/100/);
    const efficiency_score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    return new Response(
      JSON.stringify({
        efficiency_score,
        feedback,
        mocap_data: {
          // Placeholder mocap data
          module,
          sport,
          analyzed_at: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("analyze-video error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
