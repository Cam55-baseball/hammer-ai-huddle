import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { resolveSeasonPhase, getSeasonProfile, buildPhasePromptBlock } from "../_shared/seasonPhase.ts";
import { HITTING_DOCTRINE_PROMPT } from "../_shared/hittingPhases.ts";
import { HITTING_CAUSAL_CHAIN_PROMPT, PHASE_CAUSAL_CHAINS, PHASE_ROADMAPS, formatChainText, formatRoadmapText } from "../_shared/hittingCausalChains.ts";
import { buildCausalContractPromptSuffix } from "../_shared/causalContract.ts";
import { summarizeAnyDomain } from "../_shared/domainPhaseDoctrine.ts";

const UNIVERSAL_CAUSE_EFFECT_PROMPT = `\n\n=== UNIVERSAL CAUSE→EFFECT MANDATE (ALL DOMAINS) ===
Every diagnostic answer — hitting, pitching, defense, baserunning, strength, regulation/recovery, nutrition, mental — MUST be expressed as a 5-link causal chain (TRIGGER → CAUSE → MECHANISM → RESULT → FIX) followed by a 4-step roadmap. Two registers: athlete voice + a one-line "Coach's note:" with the technical mechanism. Multi-violation answers stack chains in phase order (P1 → P2 → P3 → P4). Severity model is universal: NN hard cap 50, NN soft cap 70, standard cap 80, secondary 75/85, two-or-more violations cap 65, elite execution +5.

DOMAIN PHASE DOCTRINES (use as scaffolding when answering outside hitting):
PITCHING:\n${summarizeAnyDomain('pitching')}
DEFENSE:\n${summarizeAnyDomain('defense')}
BASERUNNING:\n${summarizeAnyDomain('baserunning')}
STRENGTH/CNS:\n${summarizeAnyDomain('strength')}
REGULATION/RECOVERY:\n${summarizeAnyDomain('regulation')}
NUTRITION/HYDRATION:\n${summarizeAnyDomain('nutrition')}
MENTAL/DECISION:\n${summarizeAnyDomain('mental')}

Domain-tuned 4-step ladders (use the right one for the topic):
- Skill (hit/pitch/defense/baserunning): Feel → Isolate → Constrain → Transfer
- Strength/CNS: Activate → Load → Integrate → Express
- Nutrition/Hydration: Notice → Swap → Lock → Sustain
- Recovery/Regulation: Detect → Downshift → Restore → Reload
- Mental/Decision: See → Name → Choose → Repeat under pressure

Never collapse to a single sentence. Never skip the chain. Never drop the coach voice.
=== END UNIVERSAL MANDATE ===`;

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

${HITTING_CAUSAL_CHAIN_PROMPT}

CANONICAL CHAINS + ROADMAPS (use verbatim — never invent your own):
=== P1 (Hip Load) ===
${formatChainText(PHASE_CAUSAL_CHAINS.P1, 'athlete')}
ROADMAP:
${formatRoadmapText(PHASE_ROADMAPS.P1, 'athlete')}

=== P2 (Hand Load) ===
${formatChainText(PHASE_CAUSAL_CHAINS.P2, 'athlete')}
ROADMAP:
${formatRoadmapText(PHASE_ROADMAPS.P2, 'athlete')}

=== P3 (Stride / Landing) ===
${formatChainText(PHASE_CAUSAL_CHAINS.P3, 'athlete')}
ROADMAP:
${formatRoadmapText(PHASE_ROADMAPS.P3, 'athlete')}

=== P4 (Hitter's Move — MOST IMPORTANT) ===
${formatChainText(PHASE_CAUSAL_CHAINS.P4, 'athlete')}
ROADMAP:
${formatRoadmapText(PHASE_ROADMAPS.P4, 'athlete')}

When the conversation touches HITTING, you MUST answer through the 1-2-3-4 phase lens AND in cause→effect form:
1. Identify the dominant failed phase.
2. Teach the FULL 5-link chain (TRIGGER → CAUSE → MECHANISM → RESULT → FIX) — never fragments.
3. Default to athlete-voice; append one line as "Coach's note: ..." with the technical mechanism.
4. Then give the 4-step roadmap (FEEL → ISO → CONSTRAINT → TRANSFER) with the named drills.
5. For P2/P3: still invite dialogue — ask what they FEEL after presenting the chain.
6. Always remember the canonical P4 rule: "the back elbow leading forward IS what turns the body and brings the barrel to the ball."
7. Bigger early hip load = more power. Softball slap-progression at-bats: skip P2/P3 chains, keep P1+P4.
8. P1 HANDS-BREAK is a HARD trigger — if hips aren't loaded by the pitcher's hands break, P1 is violated regardless of pitcher tempo (windup, stretch, slide-step, quick-pitch).
9. P4 SEVERITY: Hard P4 (cast/rollover/early flip/shoulders open before elbow/hands clearly leading) → cap 50, direct teaching tone. Soft P4 (elbow IS leading but extension AT contact OR hands very slightly leading) → cap 70, dialogue tone ("you're 90% there"). Elite P4 (elbow leads → hands stay back → caught with hands → extension post-contact → barrel last) → +5 reward, celebrate it.
10. MULTI-VIOLATION ORDER: If P4 is the only failed phase, lead with P4. If ANY of P1/P2/P3 is also broken, present ALL violated chains stacked in 1→2→3→4 order. P4 always carries an "extreme importance" note no matter where it sits.
11. SLAP ELITE rep = P1 + P4 + three gates ALL true: (a) running-start lands in rhythm with pitcher release, (b) top-down barrel (no uppercut), (c) body already moving toward 1B at contact.

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
