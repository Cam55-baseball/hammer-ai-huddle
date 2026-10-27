// The classic analysis engine: the call that produced every saved report from
// January through late September 2026. Sampled clip frames go as images in one
// multimodal chat request through the Lovable AI Gateway to Gemini 2.5 Flash,
// with the `return_analysis` tool forcing the structured report. No body
// tracking, metrics or quality gate is involved; today's prompt content rides
// on top unchanged.
import type { ChatCompletionRequest, ChatCompletionResult } from "./googleAi.ts";

export const CLASSIC_ANALYSIS_ROUTE = "classic:google/gemini-2.5-flash";
export const CLASSIC_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const CLASSIC_MODEL = "google/gemini-2.5-flash";

export function isClassicRoute(route: string): boolean {
  return route === CLASSIC_ANALYSIS_ROUTE;
}

/** The January request body: model, messages, tools, forced tool choice. */
export function classicRequestBody(req: ChatCompletionRequest): Record<string, unknown> {
  return {
    model: CLASSIC_MODEL,
    messages: req.messages,
    ...(req.tools ? { tools: req.tools } : {}),
    ...(req.tool_choice ? { tool_choice: req.tool_choice } : {}),
    ...(typeof req.temperature === "number" ? { temperature: req.temperature } : {}),
  };
}

export async function classicGatewayCompletion(
  req: ChatCompletionRequest,
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch; apiKey?: string | null } = {},
): Promise<ChatCompletionResult> {
  const key = opts.apiKey ?? Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { ok: false, status: 500, provider: "none", data: { choices: [] }, errorBody: "classic_gateway_key_missing" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);
  try {
    const resp = await (opts.fetchImpl ?? fetch)(CLASSIC_GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify(classicRequestBody(req)),
      signal: controller.signal,
    });
    const text = await resp.text();
    if (!resp.ok) return { ok: false, status: resp.status, provider: "lovable", data: { choices: [] }, errorBody: text.slice(0, 2000) };
    // deno-lint-ignore no-explicit-any
    let json: any;
    try { json = JSON.parse(text); } catch { return { ok: false, status: 502, provider: "lovable", data: { choices: [] }, errorBody: "classic_gateway_unreadable_body" }; }
    const usage = json?.usage;
    return {
      ok: true, status: 200, provider: "lovable", data: json,
      ...(usage ? { usage: { model: CLASSIC_MODEL, input_tokens: usage.prompt_tokens ?? -1, output_tokens: usage.completion_tokens ?? -1 } } : {}),
    };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return { ok: false, status: aborted ? 504 : 502, provider: "lovable", data: { choices: [] }, errorBody: aborted ? "classic_gateway_timeout" : String(e).slice(0, 300) };
  } finally {
    clearTimeout(timer);
  }
}
