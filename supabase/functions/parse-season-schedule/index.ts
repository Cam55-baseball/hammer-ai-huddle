// Edge function: parse-season-schedule
// Parses a free-text season/team schedule OR a photo of one into structured
// calendar events using Lovable AI. AI is interpretive only — the client
// persists rows after explicit athlete review.

import { startHeartbeat } from "../_shared/withHeartbeat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `You convert free-form athlete/team schedules (typed text OR a photo of a printed/team-app schedule) into normalized calendar events.

Rules:
- Output JSON only, via the provided tool. Never prose.
- Expand multi-day ranges (e.g. "April 1-4 Final Bash Tournament") into ONE row per calendar day with kind "tournament_day".
- Single-day games are kind "game". Practices "practice". Travel days "travel". Anything else "other".
- Dates must be YYYY-MM-DD. If the year is missing, infer using TODAY: prefer the soonest future occurrence; never invent past years.
- Leave unknowns null. Do NOT hallucinate opponents, venues, or times.
- confidence: "high" when date+title are unambiguous, "medium" when a field is inferred, "low" when ambiguous.
- For an image that is NOT a schedule (selfie, random photo, etc.), return events: [].
- source_snippet: the exact line/phrase you parsed this row from (≤120 chars). For images, transcribe the visible row.
- Maximum 200 events per call.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "emit_schedule",
    description: "Return the parsed calendar events.",
    parameters: {
      type: "object",
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: {
                type: "string",
                enum: ["game", "tournament_day", "practice", "travel", "other"],
              },
              start_date: { type: "string", description: "YYYY-MM-DD" },
              end_date: { type: "string", description: "YYYY-MM-DD (== start_date for single day)" },
              title: { type: "string" },
              opponent: { type: ["string", "null"] },
              location: { type: ["string", "null"] },
              time_local: { type: ["string", "null"], description: "HH:mm 24h, or null" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              source_snippet: { type: "string" },
            },
            required: [
              "kind",
              "start_date",
              "end_date",
              "title",
              "confidence",
              "source_snippet",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["events"],
      additionalProperties: false,
    },
  },
};

interface ParseRequest {
  mode: "text" | "image";
  text?: string;
  imageBase64?: string;
  mimeType?: string;
  todayISO: string;
  timezone?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return json({ error: "AI service not configured" }, 500);
    }

    const body = (await req.json()) as ParseRequest;
    const today = String(body.todayISO ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
      return json({ error: "todayISO required (YYYY-MM-DD)" }, 400);
    }

    let userContent: unknown;
    if (body.mode === "text") {
      const text = String(body.text ?? "").trim();
      if (text.length < 3) return json({ error: "Provide some schedule text" }, 400);
      if (text.length > 20_000) return json({ error: "Text too long (max 20k chars)" }, 400);
      userContent = `TODAY=${today}. Timezone=${body.timezone ?? "local"}.\n\nSCHEDULE TEXT:\n${text}`;
    } else if (body.mode === "image") {
      const b64 = String(body.imageBase64 ?? "");
      const mime = String(body.mimeType ?? "image/jpeg");
      if (b64.length < 100) return json({ error: "Image data missing" }, 400);
      userContent = [
        { type: "text", text: `TODAY=${today}. Timezone=${body.timezone ?? "local"}. Parse the schedule in this image.` },
        { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
      ];
    } else {
      return json({ error: "mode must be 'text' or 'image'" }, 400);
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "emit_schedule" } },
      }),
    });

    if (res.status === 429) {
      return json({ error: "AI rate limit — please try again in a moment." }, 429);
    }
    if (res.status === 402) {
      return json({ error: "AI credits exhausted — workspace needs more credits." }, 402);
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("[parse-season-schedule] gateway error", res.status, t.slice(0, 500));
      return json({ error: `AI gateway ${res.status}` }, 502);
    }

    const data = await res.json();
    const args =
      data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return json({ events: [] });
    }

    let parsed: { events?: unknown };
    try {
      parsed = JSON.parse(args);
    } catch {
      return json({ events: [] });
    }

    const events = Array.isArray(parsed.events) ? parsed.events.slice(0, 200) : [];
    return json({ events, model: MODEL });
  } catch (e) {
    console.error("[parse-season-schedule] fatal:", e);
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
