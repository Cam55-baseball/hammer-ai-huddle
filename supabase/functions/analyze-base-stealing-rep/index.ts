import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { frames, signalFrameIndex, signalType, signalValue, totalFrames, frameTimestampsMs } = await req.json();

    if (!frames || !Array.isArray(frames) || frames.length < 3) {
      return new Response(
        JSON.stringify({ error: "At least 3 frames required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasTimestamps = Array.isArray(frameTimestampsMs) && frameTimestampsMs.length === frames.length;

    const timestampInfo = hasTimestamps
      ? `\n\nEach frame has an exact millisecond timestamp relative to the signal (negative = before signal, 0 = signal, positive = after signal):\n${frameTimestampsMs.map((ms: number, i: number) => `Frame ${i}: ${ms}ms`).join('\n')}\n\nIMPORTANT: Use these timestamps to estimate the EXACT reaction time in milliseconds. If movement starts between two frames, interpolate based on the visual cues (e.g., if frame 5 at +150ms shows no movement but frame 6 at +308ms shows clear movement, estimate the onset somewhere between those timestamps based on how much movement is visible in frame 6).`
      : '';

    const firstTwoStepsInstruction = signalType === 'go'
      ? `\n\nADDITIONAL TASK FOR "GO" SIGNALS: Also identify the frame where the athlete has completed their first TWO steps (both feet have moved from the initial position). Report this as firstTwoStepsCompleteFrameIndex. If you cannot determine this, set it to null.`
      : '';

    const systemPrompt = `You are an expert baseball base-stealing movement analyst. You are analyzing video frames from a base-stealing reaction drill.

The athlete saw a visual signal (a color or number flash) at frame index ${signalFrameIndex} (0-indexed). The signal was: ${signalType} = "${signalValue}".${timestampInfo}

After seeing the signal, the athlete either:
- Moved FORWARD (toward the next base) = "go" / steal attempt
- Moved BACKWARD (back to the current base) = "return"

Your job:
1. First, determine if ANY actual body movement occurred after the signal.
2. If movement occurred, determine the direction and which frame shows the first visible movement.
3. If NO movement is detected (the athlete stays still, or the video shows no person/no reaction), you MUST set movementDetected to false.
4. Estimate the reaction time in milliseconds as precisely as possible using the frame timestamps and visual interpolation.${firstTwoStepsInstruction}

Rules:
- Only analyze frames AFTER the signal frame index (${signalFrameIndex}).
- Look for subtle weight shifts, hip rotation, shoulder lean, or foot movement.
- If no clear movement is visible, set movementDetected to false and confidence to "low".
- If there is no person visible in the frames, set movementDetected to false.
- The movementStartFrameIndex must be >= ${signalFrameIndex} and < ${totalFrames}.
- For estimatedReactionMs: interpolate between frames for sub-frame precision. This is critical for accurate athlete feedback.

=== UNIVERSAL CAUSE→EFFECT CONTRACT ===
If you surface any movement fault in your notes/feedback, express it as a 5-link causal chain (TRIGGER → CAUSE → MECHANISM → RESULT → FIX) plus a 4-step Feel→Isolate→Constrain→Transfer roadmap, in dual register (athlete voice + "Coach's note:" technical mechanism). Baserunning phases: P1 Lead/Stance, P2 Read/Trigger (NN, hard cap 50), P3 First Three Steps (cap 75), P4 Slide/Touch (NN, +5 elite eligible). Multi-violation chains stack 1→4.
=== END CONTRACT ===`;

    const userContent: any[] = [
      {
        type: "text",
        text: `Analyze these ${frames.length} sequential frames from a base-stealing drill. The signal appeared at frame ${signalFrameIndex}. Determine the athlete's reaction direction, the frame where movement began, and estimate the precise reaction time in milliseconds.`,
      },
    ];

    for (let i = 0; i < frames.length; i++) {
      const tsLabel = hasTimestamps ? ` (${frameTimestampsMs[i]}ms from signal)` : '';
      userContent.push({
        type: "text",
        text: `Frame ${i}${tsLabel}:`,
      });
      userContent.push({
        type: "image_url",
        image_url: { url: frames[i] },
      });
    }

    const toolProperties: Record<string, any> = {
      movementDetected: {
        type: "boolean",
        description: "Whether any actual body movement was detected in the frames after the signal. Set to false if no person is visible, no reaction occurred, or the athlete remained completely still.",
      },
      direction: {
        type: "string",
        enum: ["go", "return"],
        description: "The direction the athlete moved: 'go' for forward/steal, 'return' for backward/back to base. Only meaningful if movementDetected is true.",
      },
      movementStartFrameIndex: {
        type: "integer",
        description: "The 0-indexed frame number where the first visible body movement occurs after the signal. Only meaningful if movementDetected is true.",
      },
      estimatedReactionMs: {
        type: "integer",
        description: "Estimated reaction time in milliseconds from signal to first movement. Interpolate between frames for sub-frame precision. E.g., if movement onset appears ~60% between frame at +150ms and frame at +308ms, estimate ~245ms. This should be as precise as possible.",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Confidence level of the analysis based on frame clarity and movement visibility.",
      },
      reasoning: {
        type: "string",
        description: "Brief explanation of what movement cues were detected, or why no movement was found.",
      },
    };

    const requiredFields = ["movementDetected", "direction", "movementStartFrameIndex", "estimatedReactionMs", "confidence", "reasoning"];

    if (signalType === 'go') {
      toolProperties.firstTwoStepsCompleteFrameIndex = {
        type: ["integer", "null"],
        description: "The 0-indexed frame where the athlete has completed their first two steps after the signal (both feet moved). Only applicable for 'go' direction. Set to null if unable to determine.",
      };
      requiredFields.push("firstTwoStepsCompleteFrameIndex");
    }

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
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_movement_analysis",
              description: "Report the detected movement direction, timing, and step analysis from the base-stealing drill frames.",
              parameters: {
                type: "object",
                properties: toolProperties,
                required: requiredFields,
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_movement_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-base-stealing-rep error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
