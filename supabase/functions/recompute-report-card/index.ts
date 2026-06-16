import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  getContractFor,
  buildMetricsSchema,
  buildMetricsPromptBlock,
  type DisciplineContract,
  type MetricSpec,
} from "../_shared/reportCardContracts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Deterministic seed from videoId — same video → same scores. */
function stableSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h & 0x7fffffff;
}

const BodySchema = z.object({
  video_id: z.string().uuid("Invalid video id"),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

/**
 * Validate the model's metrics object against the contract. Drop unknown keys,
 * coerce/validate values, force missing=true when the value is unusable.
 * Never invents data — preserves the model's missing_reason when present.
 */
function validateMetrics(
  contract: DisciplineContract,
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== "object") {
    for (const m of contract.metrics) {
      out[m.key] = { missing: true, missing_reason: "Model returned no metrics", confidence: 0 };
    }
    return out;
  }
  for (const m of contract.metrics) {
    const entry = (raw as Record<string, any>)[m.key];
    out[m.key] = normalizeEntry(m, entry);
  }
  return out;
}

function normalizeEntry(spec: MetricSpec, entry: any): Record<string, unknown> {
  if (!entry || typeof entry !== "object") {
    return { missing: true, missing_reason: "Not reported", confidence: 0 };
  }
  if (entry.missing === true) {
    return {
      missing: true,
      missing_reason: typeof entry.missing_reason === "string" ? entry.missing_reason : "Not measurable from saved analysis",
      confidence: 0,
    };
  }
  const conf = typeof entry.confidence === "number" ? Math.max(0, Math.min(1, entry.confidence)) : 0.5;
  if (spec.kind === "number") {
    const v = typeof entry.value === "number" && Number.isFinite(entry.value) ? entry.value : null;
    if (v === null) {
      return { missing: true, missing_reason: "Value missing or not numeric", confidence: 0 };
    }
    return { value: v, confidence: conf };
  }
  // boolean
  if (typeof entry.value === "boolean") return { value: entry.value, confidence: conf };
  return { missing: true, missing_reason: "Value missing or not boolean", confidence: 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { video_id } = parsed.data;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: video, error: vErr } = await supabase
      .from("videos")
      .select("id, user_id, module, sport, ai_analysis, efficiency_score")
      .eq("id", video_id)
      .maybeSingle();

    if (vErr || !video) {
      return new Response(JSON.stringify({ error: "Video not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contract = getContractFor(video.module ?? "", video.sport ?? "");
    if (!contract) {
      return new Response(
        JSON.stringify({ error: "No report card contract for this discipline" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const analysis = (video.ai_analysis ?? {}) as Record<string, any>;
    const feedback: string = analysis.feedback ?? "";
    const summary: string[] = Array.isArray(analysis.summary) ? analysis.summary : [];
    const positives: string[] = Array.isArray(analysis.positives) ? analysis.positives : [];

    if (!feedback && summary.length === 0) {
      return new Response(
        JSON.stringify({ error: "Saved analysis has no narrative content to interpret" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const promptBlock = buildMetricsPromptBlock(contract);
    const systemPrompt = `You are a ${contract.label} mechanics analyst.
You will receive an existing narrative analysis (no video frames) and MUST emit ONLY the structured metrics object for the Hammer Report Card.
RULES:
- Do NOT invent measurements. If the narrative does not support a confident number, set missing=true with a one-sentence reason citing the narrative gap.
- Confidence is YOUR measurement confidence based on how clearly the narrative supports the value (0..1). When inferred from prose, confidence should rarely exceed 0.6.
- Use the schema keys EXACTLY. Never add extra keys.
${promptBlock}`;

    const userContent = [
      `EFFICIENCY SCORE: ${video.efficiency_score ?? "n/a"}`,
      summary.length ? `KEY FINDINGS:\n- ${summary.join("\n- ")}` : "",
      positives.length ? `POSITIVES:\n- ${positives.join("\n- ")}` : "",
      feedback ? `DETAILED FEEDBACK:\n${feedback}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0,
        top_p: 0,
        seed: stableSeed(video.id),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_metrics",
              description: "Return the Hammer Report Card structured metrics object.",
              parameters: {
                type: "object",
                properties: { metrics: buildMetricsSchema(contract) },
                required: ["metrics"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_metrics" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("[recompute-report-card] AI gateway error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error", status: aiResp.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCalls = data?.choices?.[0]?.message?.tool_calls;
    let rawMetrics: Record<string, unknown> | null = null;
    if (toolCalls && toolCalls.length > 0) {
      try {
        const args = JSON.parse(toolCalls[0].function.arguments);
        if (args?.metrics && typeof args.metrics === "object") rawMetrics = args.metrics;
      } catch (e) {
        console.error("[recompute-report-card] parse error", e);
      }
    }

    const metrics = validateMetrics(contract, rawMetrics);

    // Phase 0 — Pass-2 retired (single-pass only). Missing keys remain
    // explicitly flagged with `missing: true` and a missing_reason; no model
    // swap, no second-pass mutation, no escalation. The canonical metric
    // engine is the sole authority for derived values.



    // Additive write — never touch feedback / efficiency_score / scorecard.
    const nextAnalysis = {
      ...analysis,
      metrics,
      report_card_contract_id: contract.id,
      report_card_recomputed_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from("videos")
      .update({ ai_analysis: nextAnalysis })
      .eq("id", video_id);

    if (upErr) {
      console.error("[recompute-report-card] update error", upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ metrics, report_card_contract_id: contract.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[recompute-report-card] error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
