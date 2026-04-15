import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== "string") {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache first
    const { data: cached } = await supabase
      .from("session_insights")
      .select("report")
      .eq("session_id", session_id)
      .maybeSingle();

    if (cached?.report && Object.keys(cached.report as object).length > 0) {
      return new Response(JSON.stringify({ report: cached.report }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch current session
    const { data: session, error: sessErr } = await supabase
      .from("performance_sessions")
      .select("id, composite_indexes, drill_blocks, module, session_type, session_date, sport, effective_grade, notes, user_id")
      .eq("id", session_id)
      .single();

    if (sessErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const composites = (session.composite_indexes ?? {}) as Record<string, number>;
    const drillBlocks = (session.drill_blocks ?? []) as any[];

    if (Object.keys(composites).length === 0 && drillBlocks.length === 0) {
      return new Response(JSON.stringify({ report: null, reason: "no_data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch last 10 sessions for trend context
    const { data: recentSessions } = await supabase
      .from("performance_sessions")
      .select("id, composite_indexes, drill_blocks, module, session_type, session_date, effective_grade")
      .eq("user_id", userId)
      .eq("module", session.module || "hitting")
      .neq("id", session_id)
      .order("session_date", { ascending: false })
      .limit(10);

    const trendContext = (recentSessions ?? []).map((s: any) => ({
      date: s.session_date,
      composites: s.composite_indexes ?? {},
      grade: s.effective_grade,
      type: s.session_type,
    }));

    // Build the prompt
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(session, composites, drillBlocks, trendContext);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [coachingReportTool],
        tool_choice: { type: "function", function: { name: "coaching_report" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let report: any = null;

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        report = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse AI tool call arguments");
      }
    }

    if (!report) {
      return new Response(JSON.stringify({ error: "AI returned invalid report" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache in DB
    await supabase.from("session_insights").upsert({
      session_id,
      user_id: userId,
      report,
    }, { onConflict: "session_id" });

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("session-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildSystemPrompt(): string {
  return `You are an elite baseball/softball performance analyst — the equivalent of a top 1% development coach. You analyze practice session data and produce a structured coaching report.

LANGUAGE STANDARD:
- Use high-impact verbs: drive, explode, snap, rotate, extend, plant, fire, attack, commit, lock in
- NEVER use: "focus on", "work on", "try to", "improve", "practice", "make sure to", "keep practicing", "improve consistency"
- Every sentence must be specific, actionable, and behavior-changing
- If an insight would not change what the athlete does next session, do not include it

CLASSIFICATION RULES for root cause analysis:
- Perception: late read, misread, failed to recognize pitch/play type early enough
- Decision: recognized correctly but chose wrong action or hesitated
- Execution: correct decision, poor physical outcome (mechanics, timing, coordination)
- Consistency: performance degraded under fatigue, pressure, or across session phases

PRIORITY STACK RULES:
- Maximum 3 issues
- Rank by impact on game performance, not by how bad the number looks
- Each issue must map directly to a game situation

PRESCRIPTIVE FIX RULES:
- Every fix must include a specific drill name, a constraint (how to perform it), and a single memorable coaching cue
- The drill must be immediately actionable in the next session
- No generic drills — be specific to the failure mechanism

GAME TRANSFER RULES:
- Tie every issue directly to game outcomes (e.g., "faster double plays", "fewer strikeouts looking", "more hard-hit balls in play")
- Be concrete, not abstract

ADAPTIVE PROGRESSION:
- If historical data is provided, compare current metrics to recent trend
- Identify what improved and what newly emerged as a weakness
- Name the current primary limiting factor

NEXT SESSION FOCUS:
- Allocate ~60% reps to primary weakness, ~30% to secondary, ~10% to maintaining strengths
- Be specific about what each rep block targets`;
}

function buildUserPrompt(
  session: any,
  composites: Record<string, number>,
  drillBlocks: any[],
  trendContext: any[]
): string {
  const parts: string[] = [];

  parts.push(`SESSION: ${session.module} | ${session.session_type} | ${session.session_date} | ${session.sport || "baseball"}`);
  if (session.effective_grade != null) parts.push(`OVERALL GRADE: ${Math.round(session.effective_grade)}/80`);

  parts.push(`\nCOMPOSITE INDEXES:`);
  for (const [k, v] of Object.entries(composites)) {
    parts.push(`  ${k}: ${typeof v === "number" ? Math.round(v * 10) / 10 : v}`);
  }

  if (drillBlocks.length > 0) {
    parts.push(`\nDRILL BLOCKS (${drillBlocks.length}):`);
    for (const b of drillBlocks) {
      const name = b.drill_type || b.drill_name || "unknown";
      const vol = b.volume ?? 0;
      const grade = b.execution_grade ?? "n/a";
      const intent = b.intent || "";
      const tags = (b.outcome_tags ?? []).join(", ");
      const side = b.batter_side || "";
      parts.push(`  - ${name}: ${vol} reps, grade ${grade}${intent ? `, intent: ${intent}` : ""}${tags ? `, tags: [${tags}]` : ""}${side ? `, side: ${side}` : ""}`);
    }
  }

  if (session.notes) {
    parts.push(`\nATHLETE NOTES: ${session.notes}`);
  }

  if (trendContext.length > 0) {
    parts.push(`\nRECENT SESSIONS (last ${trendContext.length}, newest first):`);
    for (const t of trendContext) {
      const comps = Object.entries(t.composites as Record<string, number>)
        .map(([k, v]) => `${k}:${typeof v === "number" ? Math.round(v) : v}`)
        .join(", ");
      parts.push(`  ${t.date} (${t.type}) grade:${t.grade ?? "n/a"} | ${comps || "no composites"}`);
    }
  } else {
    parts.push(`\nNo prior session history available.`);
  }

  parts.push(`\nGenerate the full coaching report using the coaching_report tool.`);

  return parts.join("\n");
}

const coachingReportTool = {
  type: "function" as const,
  function: {
    name: "coaching_report",
    description: "Generate a structured elite coaching report for a practice session",
    parameters: {
      type: "object",
      properties: {
        performanceBreakdown: {
          type: "object",
          properties: {
            situationalSplits: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  metric: { type: "string" },
                  value: { type: "string" },
                  context: { type: "string" },
                },
                required: ["category", "metric", "value", "context"],
              },
            },
            patterns: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["situationalSplits", "patterns"],
        },
        rootCauseAnalysis: {
          type: "array",
          items: {
            type: "object",
            properties: {
              issue: { type: "string" },
              classification: {
                type: "string",
                enum: ["perception", "decision", "execution", "consistency"],
              },
              evidence: { type: "string" },
            },
            required: ["issue", "classification", "evidence"],
          },
        },
        priorityStack: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rank: { type: "number" },
              issue: { type: "string" },
              gameImpact: { type: "string" },
            },
            required: ["rank", "issue", "gameImpact"],
          },
        },
        prescriptiveFixes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              issue: { type: "string" },
              drill: { type: "string" },
              constraint: { type: "string" },
              cue: { type: "string" },
            },
            required: ["issue", "drill", "constraint", "cue"],
          },
        },
        gameTransfer: {
          type: "array",
          items: {
            type: "object",
            properties: {
              issue: { type: "string" },
              realWorldImpact: { type: "string" },
            },
            required: ["issue", "realWorldImpact"],
          },
        },
        adaptiveProgression: {
          type: "object",
          properties: {
            improvements: { type: "array", items: { type: "string" } },
            emergingWeaknesses: { type: "array", items: { type: "string" } },
            primaryLimiter: { type: "string" },
          },
          required: ["improvements", "emergingWeaknesses", "primaryLimiter"],
        },
        nextSessionFocus: {
          type: "object",
          properties: {
            primaryWeakness: {
              type: "object",
              properties: { area: { type: "string" }, repPct: { type: "number" } },
              required: ["area", "repPct"],
            },
            secondaryIssue: {
              type: "object",
              properties: { area: { type: "string" }, repPct: { type: "number" } },
              required: ["area", "repPct"],
            },
            strengthMaintenance: {
              type: "object",
              properties: { area: { type: "string" }, repPct: { type: "number" } },
              required: ["area", "repPct"],
            },
          },
          required: ["primaryWeakness", "secondaryIssue", "strengthMaintenance"],
        },
      },
      required: [
        "performanceBreakdown",
        "rootCauseAnalysis",
        "priorityStack",
        "prescriptiveFixes",
        "gameTransfer",
        "adaptiveProgression",
        "nextSessionFocus",
      ],
    },
  },
};
