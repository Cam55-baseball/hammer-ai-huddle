/**
 * Coach Hammer · Next Best Step
 *
 * Takes a compact athlete snapshot and asks Lovable AI to produce a single
 * personalized next-best-step recommendation in strict JSON.
 *
 * Coach Hammer interprets organism signals — he never authors organism truth.
 * CTA route is constrained to a fixed allow-list; if the model returns
 * anything else, the client falls back to its deterministic step.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROUTES = [
  "/check-in",
  "/command",
  "/practice",
  "/tex-vision",
  "/bounce-back-bay",
  "/vault",
  "/nutrition-hub",
] as const;

const ALLOWED_TIERS = [
  "survivability",
  "recovery",
  "readiness-low",
  "consistency",
  "performance",
  "optimization",
  "missing",
] as const;

interface Snapshot {
  hour: number;
  dayType?: string | null;
  escalationCount: number;
  readiness?: { score: number | null; staleHours: number | null } | null;
  fatigue?: { score: number | null; staleHours: number | null } | null;
  recovery?: { score: number | null; staleHours: number | null } | null;
  mpi?: { score: number | null; trend: string | null } | null;
  recentActivity?: {
    sessionsLast7Days: number;
    checkInsLast7Days: number;
    recoveryLast7Days: number;
  };
}

function buildPrompt(snap: Snapshot): string {
  return `You are Coach Hammer, a calm, plain-English baseball/softball coach speaking directly to one athlete on their dashboard.

ATHLETE SNAPSHOT (right now):
${JSON.stringify(snap, null, 2)}

YOUR JOB:
Tell this athlete the single most important thing to do RIGHT NOW, in coach voice. Acknowledge what they've actually done recently (the recentActivity counts), then give one clear instruction and one short reason. Stay grounded in the snapshot — do not invent metrics, drills, or numbers that aren't there.

RULES:
- Survivability first: if escalationCount > 0, route to /command and tell them to check the alert before training.
- If readiness, fatigue, or recovery is missing (null) OR staleHours > 18, route to /check-in with ctaLabel "Do Check-In" and tell them you need a fresh check-in before you can coach. Tier = "missing".
- If recovery is low (< 0.45 and fresh) OR fatigue is high (> 0.7 and fresh), prioritize recovery.
- If readiness is < 0.4 and fresh, tell them to take it easy.
- If readiness >= 0.65 and fatigue is in check, encourage a strong session.
- Otherwise, pick the right action for the time of day (hour 0-23).
- Any signal with staleHours > 36 means that signal is stale — say so and route to /check-in instead of inventing certainty.
- One sentence each for analysis, instruction, and why. No lists. No emojis.
- ctaRoute MUST be one of: ${ALLOWED_ROUTES.join(", ")}
- tier MUST be one of: ${ALLOWED_TIERS.join(", ")}
Return ONLY valid JSON matching this exact shape, no markdown, no commentary:
{
  "tier": "<one of the tiers above>",
  "tierLabel": "<2-3 word badge label, Title Case>",
  "title": "<short headline, max 8 words, no period>",
  "analysis": "<one sentence acknowledging what they have or haven't done recently>",
  "instruction": "<one sentence telling them exactly what to do now>",
  "why": "<one short sentence explaining the reason>",
  "ctaLabel": "<2-3 word button label>",
  "ctaRoute": "<one of the allowed routes>"
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      token,
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const snapshot = body?.snapshot as Snapshot | undefined;
    if (!snapshot || typeof snapshot.hour !== "number") {
      return new Response(
        JSON.stringify({ error: "snapshot is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const prompt = buildPrompt(snapshot);

    const aiResp = await fetch(
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
              content:
                "You are Coach Hammer. Return ONLY valid JSON. Never include markdown fences or commentary.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limit" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "payment_required" }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      return new Response(
        JSON.stringify({ error: "ai_gateway_error" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiData = await aiResp.json();
    const rawContent = aiData?.choices?.[0]?.message?.content ?? "";

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // tolerate ```json fences just in case
      const cleaned = String(rawContent)
        .replace(/```json\s*/gi, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    }

    // Validate
    const tier = ALLOWED_TIERS.includes(parsed?.tier)
      ? parsed.tier
      : "optimization";
    const ctaRoute = ALLOWED_ROUTES.includes(parsed?.ctaRoute)
      ? parsed.ctaRoute
      : "/command";

    const step = {
      tier,
      tierLabel: String(parsed?.tierLabel ?? "Next Step").slice(0, 24),
      title: String(parsed?.title ?? "Here's your next step.").slice(0, 80),
      analysis: String(parsed?.analysis ?? "").slice(0, 200),
      instruction: String(parsed?.instruction ?? "").slice(0, 200),
      why: String(parsed?.why ?? "").slice(0, 200),
      ctaLabel: String(parsed?.ctaLabel ?? "Open").slice(0, 24),
      ctaRoute,
    };

    return new Response(JSON.stringify({ step }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("coach-hammer-next-step error:", error);
    const msg = error instanceof Error ? error.message : "unknown_error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
