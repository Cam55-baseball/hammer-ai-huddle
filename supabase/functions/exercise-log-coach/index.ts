import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface Body {
  movementName?: string;
  dosageText?: string;
  rounds?: Record<string, number | null>[];
  rpe?: number | null;
  notes?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body: Body = await req.json().catch(() => ({}));
    const roundsText = (body.rounds ?? [])
      .map((r, i) => `#${i + 1} ${Object.entries(r).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join(" ")}`)
      .join(" | ");

    const prompt = [
      `Movement: ${body.movementName ?? "?"}`,
      `Prescribed: ${body.dosageText ?? "?"}`,
      `Rounds: ${roundsText || "none"}`,
      body.rpe != null ? `RPE: ${body.rpe}` : null,
      body.notes ? `Athlete note: ${body.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "You are Hammer, an elite S&C coach. Read the athlete's set and note. Reply in ONE short, warm, actionable sentence (max ~25 words). No preamble, no lists, no emojis. If they crushed it, celebrate briefly and suggest a next-step. If they struggled, normalize it and give one cue.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 90,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: "gateway", status: res.status, details: t }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await res.json();
    const readback: string | null = j?.choices?.[0]?.message?.content?.trim() ?? null;
    return new Response(JSON.stringify({ readback }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
