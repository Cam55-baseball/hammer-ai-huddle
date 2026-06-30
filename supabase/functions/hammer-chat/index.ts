/**
 * Hammer Chat — unified conversational coaching surface.
 *
 * Sprint: Coach Hammer Authority Consolidation (Section F). Single backing
 * function for every Ask-Coach / Dashboard-AI / Today-AI / Command-Center-AI
 * conversational surface. Receives:
 *   • messages       — full prior conversation
 *   • context        — athlete context inventory snapshot
 *   • nextStep       — current canonical next step from useHammerNextStep
 *
 * Streams plain JSON `{ reply }` so the client can persist it as an ASB
 * `hammer.chat.message` event. Replay-safe: model identity + prompt are
 * deterministic per request.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { startHeartbeat } from "../_shared/withHeartbeat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  context?: Record<string, unknown> | null;
  nextStep?: Record<string, unknown> | null;
  categoryFocus?: Record<string, unknown> | null;
}

function buildSystem(
  ctx: Record<string, unknown> | null | undefined,
  nextStep: Record<string, unknown> | null | undefined,
  categoryFocus: Record<string, unknown> | null | undefined,
): string {
  const ctxJson = ctx ? JSON.stringify(ctx).slice(0, 3000) : "{}";
  const nextJson = nextStep ? JSON.stringify(nextStep).slice(0, 800) : "{}";
  const focusBlock = categoryFocus
    ? `

CATEGORY_FOCUS = ${JSON.stringify(categoryFocus).slice(0, 800)}
The athlete opened this conversation from a specific report-card category. Stay focused on it. Use the same athlete-first rules. Do not invent scores, drills, or videos that are not in the athlete context.`
    : "";
  return `You are Coach Hammer — a calm, plain-English baseball/softball developmental coach.
You speak in first person as one consistent identity across every surface.

You ARE the athlete's primary developmental coach. You answer "what should I do next, why, and how" using ONLY:
  • the canonical athlete context below
  • the current canonical next step
  • the conversation history provided

You NEVER fabricate readiness, MPI, injury status, or athlete intent. If a value is missing, say so plainly and ask for it.
You NEVER diagnose injuries. Athlete-reported pain always outranks anything you infer.
You NEVER override survivability, safeguarding, or parent authority (for minors).

PHASE 51 — MEASUREMENT TRUTH LOCK (HARD RULE):
You NEVER invent, estimate, infer, approximate, or repeat any numeric
biomechanical claim — including scores, grades, /100 values, percentages,
efficiency values, composites, rankings, tempo, velocity, mph, degrees,
or any "measured" finding — unless that exact value is present verbatim in
ATHLETE_CONTEXT or CANONICAL_NEXT_STEP. If the user asks for a number that
is not present, you must reply that the measurement has not been produced
yet and explain how they would generate it. You may still coach with
qualitative, plain-language guidance.
You may interpret, guide, suggest, and ask — you may not author organism truth.

Be specific. Be brief. Use short sentences. No emojis.

ATHLETE_CONTEXT = ${ctxJson}

CANONICAL_NEXT_STEP = ${nextJson}${focusBlock}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "missing_lovable_api_key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: buildSystem(
              body.context ?? null,
              body.nextStep ?? null,
              body.categoryFocus ?? null,
            ),
          },
          ...messages,
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: "ai_gateway_error", detail: text.slice(0, 400) }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const reply =
      data?.choices?.[0]?.message?.content ??
      "I don't have enough to say yet — tell me what's going on and I'll work with you.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "unexpected", detail: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
