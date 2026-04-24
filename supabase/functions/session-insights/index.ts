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
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

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
        model: "google/gemini-2.5-pro",
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

ROOT CAUSE DEPTH RULES:
- "mechanism" must describe a PRECISE biomechanical or cognitive failure — NOT a symptom. Example valid: "first step delayed due to late hip read". Invalid: "slow reaction time"
- "trigger" must specify the exact CONDITION when it occurs. Example valid: "on glove-side ground balls under <0.8s reaction window". Invalid: "during practice"
- "failure_chain" must show the step-by-step sequence: read → decision → movement breakdown. Example: "late visual pickup → delayed weight shift → arm-side compensation → rushed throw"
- If any of these three fields could apply to any athlete in any session, the output is invalid — regenerate

CLASSIFICATION RULES for root cause analysis:
- Perception: late read, misread, failed to recognize pitch/play type early enough
- Decision: recognized correctly but chose wrong action or hesitated
- Execution: correct decision, poor physical outcome (mechanics, timing, coordination)
- Consistency: performance degraded under fatigue, pressure, or across session phases

CAUSAL LINKING MANDATE (CRITICAL):
- The "issue" string must be IDENTICAL across rootCauseAnalysis, priorityStack, prescriptiveFixes, and gameTransfer
- No new issues may appear in later sections that were not established in rootCauseAnalysis
- No rewording, no drift, no paraphrasing — exact string match required
- Every prescriptive fix must directly target the mechanism identified in rootCauseAnalysis, not the symptom

PRESCRIPTIVE FIX CONSTRAINT QUALITY:
- Drill must target the MECHANISM (not the symptom)
- Constraint must REMOVE the athlete's ability to compensate (e.g., "one-step only before throw", "no gather allowed", "commit before ball contact")
- Cue must be 3-6 words and tied directly to the mechanism
- INVALID constraints: "focus on timing", "work on reaction", "be more consistent"
- If the drill could be used for multiple unrelated issues, it is invalid — be specific

DECISION QUALITY EMPHASIS:
- If decision-making data exists (chase_pct, decision index, hesitation patterns), it MUST appear in performanceBreakdown AND rootCauseAnalysis
- Evaluate: decision speed vs optimal window, correct vs safe decisions, hesitation patterns
- Decision quality failures are distinct from execution failures — classify precisely

PRIORITY STACK RULES:
- Maximum 3 issues
- Rank by impact on game performance, not by how bad the number looks
- Each issue must map directly to a game situation

GAME TRANSFER RULES:
- Tie every issue directly to game outcomes (e.g., "faster double plays", "fewer strikeouts looking", "more hard-hit balls in play")
- Be concrete, not abstract

ADAPTIVE PROGRESSION:
- If historical data is provided, compare current metrics to recent trend
- Identify what improved and what newly emerged as a weakness
- Name the current primary limiting factor

NEXT SESSION FOCUS:
- Allocate ~60% reps to primary weakness, ~30% to secondary, ~10% to maintaining strengths
- Be specific about what each rep block targets

EVIDENCE BINDING (CRITICAL):
- Every root cause MUST reference exact data signals from the session in the "data_signals" array
- "data_signals" must reference inputs ACTUALLY PRESENT in the provided data — no fabrication (e.g., "execution_grade 42/80 on backhand drills", "chase_pct at 38%", "composite power_index dropped from 72 to 58 in final block")
- "confidence" levels: "high" requires ≥2 corroborating data signals; "medium" requires 1 clear signal; "low" means the issue is inferred but not directly measurable from provided data
- If data does NOT clearly support a mechanism, set confidence to "medium" or "low" — do NOT claim high confidence without evidence
- If insufficient data exists for a root cause, explicitly state uncertainty in the mechanism/evidence instead of fabricating specifics
- Low-confidence root causes MUST have their prescriptive fix drill description prefixed with "[Exploratory]" to signal the fix is hypothesis-based
- NEVER fabricate data signals — every signal must be traceable to a specific number, metric, or pattern in the session data provided

ANTI-GENERIC FILTER (enforce before finalizing):
- Reject any sentence that could apply to any athlete without modification
- Reject any sentence that does not include a specific condition (when/where/under what circumstance)
- Reject any sentence that would not change what the athlete does next session
- If a sentence fails any of these tests, rewrite it with situation-specific detail

OUTPUT SELF-CHECK (required internal verification):
1. Are ALL issues specific to a measurable situation from THIS session's data?
2. Does EACH prescriptive fix directly map to a root cause mechanism (not symptom)?
3. Is the "issue" string identical across all sections that reference it?
4. Would a top 1% development coach actually say each sentence?
5. Does every root cause have data_signals that reference ACTUAL provided data?
6. Are confidence levels justified by the number of corroborating signals?
7. If any check fails, regenerate that section before outputting`;
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
              mechanism: { type: "string", description: "Precise biomechanical or cognitive failure — not a symptom" },
              trigger: { type: "string", description: "Specific condition when this failure occurs" },
              failure_chain: { type: "string", description: "Step-by-step sequence: read → decision → movement breakdown" },
              evidence: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"], description: "high=2+ corroborating signals, medium=1 signal, low=inferred" },
              data_signals: { type: "array", items: { type: "string" }, description: "Exact data references from session (e.g. 'execution_grade 42/80 on backhand drills')" },
            },
            required: ["issue", "classification", "mechanism", "trigger", "failure_chain", "evidence", "confidence", "data_signals"],
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
