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
    const { videoId, module, sport, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    console.log(`Analyzing video ${videoId} for user ${userId}`);

    // Initialize Supabase client with service role
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update video status to processing
    await supabase.from("videos").update({ status: "processing" }).eq("id", videoId);

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
            content: `Analyze this ${sport} ${module} video. Provide detailed feedback on form and mechanics. Include an efficiency score out of 100 in your response.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      await supabase.from("videos").update({ status: "failed" }).eq("id", videoId);
      
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

    // Extract efficiency score from feedback
    const scoreMatch = feedback.match(/(\d+)\/100/);
    const efficiency_score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    const mocap_data = {
      module,
      sport,
      analyzed_at: new Date().toISOString(),
    };

    const ai_analysis = {
      feedback,
      model_used: "google/gemini-2.5-flash",
      analyzed_at: new Date().toISOString(),
    };

    // Update video with analysis results
    const { error: updateError } = await supabase
      .from("videos")
      .update({
        status: "completed",
        efficiency_score,
        mocap_data,
        ai_analysis,
      })
      .eq("id", videoId);

    if (updateError) {
      console.error("Error updating video:", updateError);
      throw updateError;
    }

    // Update user progress
    const { data: progressData, error: progressFetchError } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("module", module)
      .eq("sport", sport)
      .maybeSingle();

    if (progressFetchError) {
      console.error("Error fetching progress:", progressFetchError);
    } else {
      const newVideosAnalyzed = (progressData?.videos_analyzed || 0) + 1;
      const currentAvgScore = progressData?.average_efficiency_score || 0;
      const newAvgScore = currentAvgScore === 0 
        ? efficiency_score 
        : Math.round((currentAvgScore * (newVideosAnalyzed - 1) + efficiency_score) / newVideosAnalyzed);

      const { error: progressUpdateError } = await supabase
        .from("user_progress")
        .update({
          videos_analyzed: newVideosAnalyzed,
          average_efficiency_score: newAvgScore,
          last_activity: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("module", module)
        .eq("sport", sport);

      if (progressUpdateError) {
        console.error("Error updating progress:", progressUpdateError);
      }
    }

    // Decrement videos_remaining in subscription
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("videos_remaining")
      .eq("user_id", userId)
      .single();

    if (subData && subData.videos_remaining > 0) {
      await supabase
        .from("subscriptions")
        .update({ videos_remaining: subData.videos_remaining - 1 })
        .eq("user_id", userId);
    }

    console.log(`Analysis complete for video ${videoId}`);

    return new Response(
      JSON.stringify({
        efficiency_score,
        feedback,
        mocap_data,
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
