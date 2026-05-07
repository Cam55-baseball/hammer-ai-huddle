import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { resolveSeasonPhase, getSeasonProfile, buildPhasePromptBlock } from "../_shared/seasonPhase.ts";
import { HITTING_DOCTRINE_PROMPT } from "../_shared/hittingPhases.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { messages, analysisContext, dashboardContext, royalTimingContext, stream } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    const userId = user.id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch owner's profile to get coaching philosophy
    let ownerBio = "";
    let ownerName = "Coach";

    const { data: ownerRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner")
      .maybeSingle();

    if (ownerRole) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("full_name, bio")
        .eq("id", ownerRole.user_id)
        .single();

      if (ownerProfile) {
        ownerName = ownerProfile.full_name || "Coach";
        ownerBio = ownerProfile.bio || "";
      }
    }

    // Get user context for authenticated user
    let userContext = "";
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("subscribed_modules")
      .eq("user_id", userId)
      .single();

    const { data: progress } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId);

    if (subscription || progress) {
      userContext = `\n\nUser Context:\n`;
      if (subscription?.subscribed_modules) {
        const tierNames: Record<string, string> = {
          'baseball_pitcher': 'Complete Pitcher (Baseball)',
          'softball_pitcher': 'Complete Pitcher (Softball)',
          'baseball_5tool': '5Tool Player (Baseball)',
          'softball_5tool': '5Tool Player (Softball)',
          'baseball_golden2way': 'Golden 2Way (Baseball)',
          'softball_golden2way': 'Golden 2Way (Softball)',
        };
        const displayModules = subscription.subscribed_modules.map(
          (m: string) => tierNames[m] || m
        );
        userContext += `Active Tier: ${displayModules.join(", ")}\n`;
      }
      if (progress && progress.length > 0) {
        userContext += `Progress:\n`;
        progress.forEach((p: any) => {
          userContext += `- ${p.sport} ${p.module}: ${p.videos_analyzed} videos, avg score: ${p.average_efficiency_score || "N/A"}\n`;
        });
      }
    }

    let analysisContextSection = "";
    if (analysisContext) {
      analysisContextSection = `\n\nANALYSIS CONTEXT:\nThe athlete just received the following analysis. Use this context to answer their follow-up questions with specific, personalized advice:\n${analysisContext}\n`;
    }

    let dashboardContextSection = "";
    if (dashboardContext) {
      dashboardContextSection = `\n\nDASHBOARD CONTEXT:\nThe athlete is viewing their Progress Dashboard. Here is their current performance data — use it to ground your answers in their actual metrics:\n${dashboardContext}\n`;
    }

    let royalTimingContextSection = "";
    if (royalTimingContext) {
      royalTimingContextSection = `\n\nROYAL TIMING CONTEXT:\nThe athlete is using the Royal Timing video analysis module. They are studying timing mechanics via video comparison. Provide elite-level (top 0.01%) timing analysis insight that is sport-specific and actionable. Here is their study context:\n${royalTimingContext}\n`;
    }

    // Resolve season phase for tone + constraints
    const { data: mpiSettings } = await supabase
      .from('athlete_mpi_settings')
      .select('season_status, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date')
      .eq('user_id', userId)
      .maybeSingle();
    const phaseRes = resolveSeasonPhase(mpiSettings as any);
    const phaseProfile = getSeasonProfile(phaseRes.phase);
    const phaseSection = `\n\n${buildPhasePromptBlock(phaseRes)}\n\nCRITICAL: Respect the athlete's season phase. ${phaseRes.phase === 'in_season' ? 'NEVER prescribe new mechanical changes mid-season — queue them for off-season and offer maintenance/refinement cues only.' : phaseRes.phase === 'post_season' ? 'Prioritize recovery, sleep, and pain resolution over performance gains.' : phaseRes.phase === 'preseason' ? 'Sharpen what exists; avoid introducing brand-new patterns this close to opening day.' : 'Off-season — aggressive changes are appropriate when data supports them.'}\n`;

    const systemPrompt = `You are Hammer, an elite biomechanics coach for baseball and softball athletes. You provide detailed, actionable advice on hitting, pitching, and throwing mechanics.

${ownerBio ? `Follow the coaching philosophy below unless the user asks otherwise.\n\nCoach: ${ownerName}\nPhilosophy: ${ownerBio}\n` : ''}
${userContext}
${analysisContextSection}
${dashboardContextSection}
${royalTimingContextSection}
${phaseSection}

${HITTING_DOCTRINE_PROMPT}

When the conversation touches HITTING, you MUST answer through the 1-2-3-4 phase lens above:
- Diagnose which phase is the likely root cause before suggesting a fix.
- For Phase 2 / Phase 3 issues, ask the hitter what they FEEL and invite dialogue — hitters love dialogue and you should prompt for it.
- Always tie a recommendation to one phase-isolation drill (hip_load_iso, load_sequence_pause, sideways_landing_check, elbow_first_fulcrum, catch_the_ball, no_stride_power) when relevant.
- Remember: bigger early hip load = more power; Phase 4 is the most important phase; softball slap-progression at-bats relax P2 + P3.

Provide clear, concise responses focused on improving athletic performance. Use technical terminology when appropriate but explain concepts clearly. When referencing the athlete's data, be specific about numbers and trends. Never give vague or generic advice — every response should be actionable and grounded in the athlete's actual performance data and current season phase.`;

    const useStreaming = stream === true;

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
          ...messages,
        ],
        ...(useStreaming ? { stream: true } : {}),
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    if (useStreaming) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return new Response(JSON.stringify({ message: assistantMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-chat function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
