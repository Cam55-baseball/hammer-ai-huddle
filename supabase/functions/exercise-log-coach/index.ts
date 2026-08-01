import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { chatCompletion } from "../_shared/googleAi.ts";

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

    const res = await chatCompletion({
      model: "google/gemini-2.5-flash",
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
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "ai_provider", status: res.status, details: res.errorBody ?? null }),
        {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const readback: string | null = res.data?.choices?.[0]?.message?.content?.trim() ?? null;
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
