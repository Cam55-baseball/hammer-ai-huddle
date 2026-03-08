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

    const { frames, signalFrameIndex, signalType, signalValue, totalFrames } = await req.json();

    if (!frames || !Array.isArray(frames) || frames.length < 3) {
      return new Response(
        JSON.stringify({ error: "At least 3 frames required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert baseball base-stealing movement analyst. You are analyzing video frames from a base-stealing reaction drill.

The athlete saw a visual signal (a color or number flash) at frame index ${signalFrameIndex} (0-indexed). The signal was: ${signalType} = "${signalValue}".

After seeing the signal, the athlete either:
- Moved FORWARD (toward the next base) = "go" / steal attempt
- Moved BACKWARD (back to the current base) = "return"

Your job:
1. Determine which direction the athlete moved after the signal appeared.
2. Identify which frame index shows the FIRST visible body movement (weight shift, first step, lean).

Rules:
- Only analyze frames AFTER the signal frame index (${signalFrameIndex}).
- Look for subtle weight shifts, hip rotation, shoulder lean, or foot movement.
- If no clear movement is visible, default to the most likely direction based on body posture.
- The movementStartFrameIndex must be >= ${signalFrameIndex} and < ${totalFrames}.`;

    const userContent: any[] = [
      {
        type: "text",
        text: `Analyze these ${frames.length} sequential frames from a base-stealing drill. The signal appeared at frame ${signalFrameIndex}. Determine the athlete's reaction direction and the frame where movement began.`,
      },
    ];

    for (let i = 0; i < frames.length; i++) {
      userContent.push({
        type: "text",
        text: `Frame ${i}:`,
      });
      userContent.push({
        type: "image_url",
        image_url: { url: frames[i] },
      });
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
              description: "Report the detected movement direction and timing from the base-stealing drill frames.",
              parameters: {
                type: "object",
                properties: {
                  direction: {
                    type: "string",
                    enum: ["go", "return"],
                    description: "The direction the athlete moved: 'go' for forward/steal, 'return' for backward/back to base.",
                  },
                  movementStartFrameIndex: {
                    type: "integer",
                    description: "The 0-indexed frame number where the first visible body movement occurs after the signal.",
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Confidence level of the analysis based on frame clarity and movement visibility.",
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of what movement cues were detected.",
                  },
                },
                required: ["direction", "movementStartFrameIndex", "confidence", "reasoning"],
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
