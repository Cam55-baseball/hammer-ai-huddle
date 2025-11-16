import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  videoId: z.string().uuid("Invalid video ID format"),
  module: z.enum(["hitting", "pitching", "throwing"], { errorMap: () => ({ message: "Invalid module" }) }),
  sport: z.enum(["baseball", "softball"], { errorMap: () => ({ message: "Invalid sport" }) }),
  userId: z.string().uuid("Invalid user ID format"),
});

// Helper function to generate beginner-friendly bullet points
const makeBeginnerBullets = (feedback: string, positives: string[]): string[] => {
  const bullets: string[] = [];
  
  // Add 1-2 strength bullets from positives (if available)
  if (positives && positives.length > 0) {
    const strengthBullets = positives.slice(0, 2).map(p => {
      const words = p.split(' ');
      return words.length <= 15 ? p : words.slice(0, 15).join(' ') + '...';
    });
    bullets.push(...strengthBullets);
  }
  
  // Add issue bullets from feedback
  if (feedback) {
    const sentences = feedback.split(/[.!?]+/).filter(s => s.trim().length > 0);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      const words = trimmed.split(' ');
      if (words.length > 0 && words.length <= 15) {
        bullets.push(trimmed);
      } else if (words.length > 15) {
        bullets.push(words.slice(0, 15).join(' ') + '...');
      }
      if (bullets.length >= 5) break;
    }
  }
  
  // Dedupe and limit to 3-5 bullets
  const unique = Array.from(new Set(bullets));
  return unique.slice(0, Math.max(3, Math.min(5, unique.length)));
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
6. Shoulders Rotate (FRONT SHOULDER MUST STAY CLOSED UNTIL THIS POINT) ⭐
7. Hands/Bat Release (HANDS MUST NOT PASS BACK ELBOW BEFORE SHOULDERS ROTATE) ⭐⭐

BALANCE & HEAD CONTROL - PHASE-SPECIFIC ANALYSIS:

PRE-SWING PHASE (Before Swing Sequence Starts):
- Forward head movement toward home plate = ACCEPTABLE ✓
- This is part of natural stride and load mechanics
- Does NOT disrupt visual tracking or timing

SWING SEQUENCE PHASE (During Active Swing):
- ⚠️ CRITICAL: Minimal forward head movement required ⭐⭐
  * Moving head = moving eyes = contact point disruption
  * Some natural movement will occur, but excessive movement is a RED FLAG
  * Proper back elbow placement and hands staying back naturally stabilize the head
  
- ⚠️ CRITICAL RED FLAG: Lateral head movement toward pitcher during swing sequence ⭐⭐⭐
  * MAJOR DISRUPTOR of swing mechanics
  * Indicates broken sequence timing (elbow and/or hands out of sequence)
  * Head racing forward = loss of time on pitch (moving closer to ball prematurely)
  * Disrupts spatial awareness → contact inaccuracies
  * Often caused by:
    → Elbow leaving sequence timing early
    → Hands leaving sequence timing early
    → Rushing the swing
    
HEAD MOVEMENT ROOT CAUSES:
- If head moves excessively during sequence: Check elbow and hand timing
- Proper sequence (elbow → hips → shoulders → hands) naturally prevents head drift
- Head stability is a RESULT of good sequence, not a separate goal
- **IMPORTANT:** Don't sacrifice swing sequence to keep head still - proper sequence creates natural head stability

RED FLAGS:
- ⚠️ CRITICAL: Hands pass back elbow BEFORE shoulders begin rotating → MAJOR SEQUENCE DISRUPTOR
  * Bat not on plane early enough or long enough
  * Reduces contact abilities and accuracy at contact
  * Breaks kinetic chain → Power loss
- ⚠️ CRITICAL: Front shoulder pulls/opens out of sequence (too early) → MAJOR CONTACT DISRUPTOR ⭐
  * Causes inaccuracies when making contact with the pitch
  * Barrel loses tension and connection to body rotation
  * Barrel drops BELOW the plane of the properly sequenced swing
  * Disrupts bat path and timing
- ⚠️ CRITICAL: Lateral head movement toward pitcher during swing sequence → MAJOR CONTACT DISRUPTOR ⭐⭐⭐
  * Head moving toward pitcher = broken swing sequence
  * Loss of spatial awareness and timing on pitch
  * Indicates elbow and/or hands traveling out of sequence
  * Causes contact inaccuracies and inconsistent bat path
  * Hitter loses time on pitch by moving closer to ball prematurely
- ⚠️ Excessive forward head movement during swing sequence → Balance and contact issues ⭐
  * Moving head = moving eyes = inconsistent contact point
  * Natural during load/stride is OK, but during active swing is problematic
  * Often indicates hands traveling forward out of sequence
  * Can signal improper back elbow placement
- Back elbow drops to slot without traveling forward → Reduces bat speed
- Hips rotate before back elbow travels → Broken kinetic chain

Focus on:
1. ⭐⭐⭐ Does the head move LATERALLY toward the pitcher during swing sequence? (CRITICAL RED FLAG)
2. ⭐⭐ Does the head move EXCESSIVELY FORWARD during swing sequence? (Some natural movement OK)
3. ⭐ Do hands stay BEHIND the back elbow until AFTER shoulders begin rotating?
4. ⭐ Does the FRONT SHOULDER stay CLOSED until proper timing in sequence?
5. Does back elbow TRAVEL forward before hips?
6. Are timing gaps correct (elbow → hips → shoulders → hands)?

Provide:
- Efficiency score (0-100) based on form correctness
- **PRIORITY CHECK:** Flag if hands pass back elbow before shoulder rotation (major deduction to score)
- **PRIORITY CHECK:** Flag if front shoulder opens/pulls out of sequence (major deduction to score)
- **BALANCE CHECK:** Assess head movement and balance throughout the swing
- Specific feedback on:
  * Hand-elbow timing relative to shoulder rotation
  * Front shoulder control and timing (watch for early opening)
  * Head position and forward movement (balance indicator)
  * Back elbow travel
  * Kinetic sequence timing
- Identify any sequence violations and their impact on power/contact
- **If front shoulder opens early:** Explain impact on barrel tension, swing plane, and contact accuracy
- **If forward head movement detected:** Note correlation with back elbow position and hand travel
- Recommended drills to correct any sequence issues and improve balance

SUMMARY FORMAT:
REQUIRED: Provide exactly 3-5 bullet points in plain, beginner-friendly language (avoid jargon, max 15 words per bullet).
Focus on the most important actionable insights that a player or parent would understand immediately.
Balance issues with strengths. Examples:
- "Your hands move too early - wait for shoulders to start turning first"
- "Great balance throughout the swing - head stays steady"
- "Front shoulder opens too soon - this makes contact harder"

IMPORTANT - POSITIVES IDENTIFICATION:
After your analysis, identify 2-4 specific positive aspects of the player's mechanics. Look for:
- Good foundation elements (stance, setup, balance)
- Correct sequencing in any part of the swing
- Proper timing in any phase
- Good rotation mechanics
- Strong finish/follow-through
- Any element that shows proper form or good athletic movement

These positives will be displayed separately to encourage the player.

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

Provide efficiency score (0-100) and specific feedback on landing position and sequence.

After the feedback, provide 3–5 actionable drills tailored to the issues found. For each drill:
- title: Short drill name
- purpose: Why this drill helps
- steps: 3–6 specific step-by-step instructions
- reps_sets: Recommended reps/sets (e.g., "3 sets of 10 reps")
- equipment: Required equipment or "None"
- cues: 2–3 coaching cues for proper execution

SUMMARY FORMAT:
REQUIRED: Provide exactly 3-5 bullet points in plain, beginner-friendly language (avoid jargon, max 15 words per bullet).
Focus on the most important actionable insights that a player or parent would understand immediately.
Balance issues with strengths. Examples:
- "Back leg needs to face the target earlier for better accuracy"
- "Good drive toward the plate with your legs"
- "Front shoulder opens too early in your delivery"

IMPORTANT - POSITIVES IDENTIFICATION:
Identify 2-4 specific positive mechanical elements, such as:
- Good leg drive or momentum toward target
- Proper landing position elements
- Correct sequencing in any phase
- Good arm path or slot
- Strong follow-through
- Proper balance and athleticism
- Any correct alignment or rotation mechanics

DO NOT MENTION: velocity, spin rate, or output metrics.
Focus ONLY on form and body mechanics.`;
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

SUMMARY FORMAT:
REQUIRED: Provide exactly 3-5 bullet points in plain, beginner-friendly language (avoid jargon, max 15 words per bullet).
Focus on the most important actionable insights that a player or parent would understand immediately.
Balance issues with strengths. Examples:
- "Your arm circle is smooth and powerful"
- "Release point varies - work on consistency for better control"
- "Strong hip drive generates good power"

IMPORTANT - POSITIVES IDENTIFICATION:
Identify 2-4 positive aspects of their windmill mechanics:
- Clean arm circle
- Good hip drive and rotation
- Consistent release point
- Strong lower body engagement
- Good balance and athletic movement
- Smooth rhythm and tempo

Provide an efficiency score (0-100) based on professional standards, specific feedback, and recommended drills.

DO NOT MENTION: velocity, spin rate, or output metrics.
Focus ONLY on form and body mechanics.`;
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

SUMMARY FORMAT:
REQUIRED: Provide exactly 3-5 bullet points in plain, beginner-friendly language (avoid jargon, max 15 words per bullet).
Focus on the most important actionable insights that a player or parent would understand immediately.
Balance issues with strengths. Examples:
- "Good momentum moving toward your target"
- "Back leg needs to face target before you throw for better accuracy"
- "Strong finish on your throw"

IMPORTANT - POSITIVES IDENTIFICATION:
Identify 2-4 positive throwing mechanics:
- Good footwork toward target
- Proper momentum generation
- Correct body rotation elements
- Strong arm path
- Good follow-through
- Athletic balance throughout throw

Provide efficiency score (0-100) and specific feedback on sequence and alignment.

DO NOT MENTION: velocity or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  return "You are an expert sports mechanics analyst.";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const body = await req.json();
    const { videoId, module, sport, userId } = requestSchema.parse(body);

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

    // Call Lovable AI for video analysis with tool-calling for structured output
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
            content: `Analyze this ${sport} ${module} video. Provide detailed feedback on form and mechanics. Include an efficiency score out of 100 and recommended drills.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analysis",
              description: "Return structured analysis with score, feedback, and drills",
              parameters: {
                type: "object",
                properties: {
                  efficiency_score: {
                    type: "number",
                    description: "Score from 0-100 based on form correctness"
                  },
                  summary: {
                    type: "array",
                    description: "REQUIRED: Exactly 3-5 bullet points in plain, beginner-friendly language (no jargon, max 15 words per bullet). Focus on actionable insights a player or parent would understand. Balance issues with strengths.",
                    items: { type: "string" }
                  },
                  feedback: {
                    type: "string",
                    description: "Detailed feedback on mechanics and form"
                  },
                  positives: {
                    type: "array",
                    description: "List of 2-4 specific positive aspects of the player's mechanics that they should feel good about and build upon",
                    items: { type: "string" }
                  },
                  drills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        purpose: { type: "string" },
                        steps: { type: "array", items: { type: "string" } },
                        reps_sets: { type: "string" },
                        equipment: { type: "string" },
                        cues: { type: "array", items: { type: "string" } }
                      },
                      required: ["title", "purpose", "steps", "reps_sets", "equipment", "cues"]
                    }
                  }
                },
                required: ["efficiency_score", "summary", "feedback", "positives", "drills"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_analysis" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      const errorData = {
        code: response.status.toString(),
        message: errorText
      };
      
      await supabase
        .from("videos")
        .update({ 
          status: "failed",
          ai_analysis: { error: errorData }
        })
        .eq("id", videoId);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later.", status: 429 }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits to your workspace.", status: 402 }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI gateway error", status: 500 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    let efficiency_score = 75;
    let feedback = "No analysis available";
    let summary: string[] = [];
    let positives: string[] = [];
    let drills: any[] = [];

    // Parse tool calls for structured output
    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      try {
        const analysisArgs = JSON.parse(toolCalls[0].function.arguments);
        efficiency_score = analysisArgs.efficiency_score || 75;
        summary = analysisArgs.summary || [];
        feedback = analysisArgs.feedback || "No feedback available";
        positives = analysisArgs.positives || [];
        drills = analysisArgs.drills || [];
      } catch (parseError) {
        console.error("Error parsing tool call arguments:", parseError);
      }
    } else {
      // Fallback to text parsing if no tool calls
      const content = data.choices?.[0]?.message?.content || "";
      feedback = content;
      const scoreMatch = content.match(/(\d+)\/100/);
      if (scoreMatch) {
        efficiency_score = parseInt(scoreMatch[1]);
      }
    }
    
    // Guarantee bullets: If summary is empty or not an array, generate from feedback and positives
    if (!Array.isArray(summary) || summary.length === 0) {
      console.log("Summary empty or invalid, generating beginner bullets from feedback");
      summary = makeBeginnerBullets(feedback, positives);
    }

    const mocap_data = {
      module,
      sport,
      analyzed_at: new Date().toISOString(),
    };

    const ai_analysis = {
      summary,
      feedback,
      positives,
      drills,
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
        summary,
        feedback,
        positives,
        drills,
        mocap_data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("analyze-video error:", error);
    
    // Return validation errors with 400 status
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Validation error", details: error.errors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", status: 500 }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});