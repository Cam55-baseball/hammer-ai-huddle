/**
 * googleAi.ts — Direct Google AI Studio (Generative Language) client that
 * speaks the OpenAI chat-completions request/response shape used across
 * this project, with a transparent Lovable AI Gateway fallback.
 *
 * Why: we want Google to hold runtime AI spend for Hammers Modality so
 * Lovable credits are used only for building. This helper lets every
 * edge function migrate with a near-drop-in replacement of the raw
 * `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)`
 * call — same body, same returned shape.
 *
 * Usage:
 *   import { chatCompletion } from "../_shared/googleAi.ts";
 *   const resp = await chatCompletion({
 *     model: "google/gemini-2.5-flash",
 *     messages: [...],
 *     tools: [...],           // optional — OpenAI-style tool defs
 *     tool_choice: {...},     // optional
 *     response_format: {...}, // optional (json_object supported)
 *     temperature: 0.6,       // optional
 *   });
 *   // resp is an OpenAI-shaped { ok, status, data } — data mirrors
 *   //   { choices: [{ message: { content, tool_calls } }] }
 */

const GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// -----------------------------------------------------------------------------
// Types (loose; we mirror only what the callers use)
// -----------------------------------------------------------------------------

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<Record<string, unknown>>;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  tool_choice?: unknown;
  response_format?: { type?: string } & Record<string, unknown>;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResult {
  ok: boolean;
  status: number;
  provider: "google" | "lovable" | "none";
  data: {
    choices: Array<{
      message: {
        role: "assistant";
        content: string;
        tool_calls?: Array<{
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }>;
      };
      finish_reason?: string;
    }>;
  };
  errorBody?: string;
}

// -----------------------------------------------------------------------------
// Model name mapping. Callers pass Lovable-style ids like "google/gemini-2.5-flash";
// Google's REST API wants "gemini-2.5-flash". Unknown models pass through
// with the "google/" prefix stripped.
// -----------------------------------------------------------------------------

function toGoogleModel(model: string): string {
  const stripped = model.startsWith("google/") ? model.slice("google/".length) : model;
  // Map any preview/dated aliases used in the codebase to the closest stable
  // Google AI Studio equivalent so a direct call actually works.
  const alias: Record<string, string> = {
    "gemini-3-flash-preview": "gemini-2.5-flash",
    "gemini-2.0-flash-exp": "gemini-2.0-flash",
    "gemini-2.5-flash-lite": "gemini-2.5-flash",
  };
  return alias[stripped] ?? stripped;
}

// -----------------------------------------------------------------------------
// OpenAI ↔ Google translation
// -----------------------------------------------------------------------------

function toGooglePayload(req: ChatCompletionRequest): Record<string, unknown> {
  const systemParts: string[] = [];
  const contents: Array<Record<string, unknown>> = [];

  for (const m of req.messages) {
    if (m.role === "system") {
      if (typeof m.content === "string") systemParts.push(m.content);
      continue;
    }
    const role = m.role === "assistant" ? "model" : "user";
    const text = typeof m.content === "string"
      ? m.content
      : JSON.stringify(m.content);
    contents.push({ role, parts: [{ text }] });
  }

  const generationConfig: Record<string, unknown> = {};
  if (typeof req.temperature === "number") generationConfig.temperature = req.temperature;
  if (typeof req.max_tokens === "number") generationConfig.maxOutputTokens = req.max_tokens;
  if (req.response_format?.type === "json_object") {
    generationConfig.responseMimeType = "application/json";
  }

  const payload: Record<string, unknown> = {
    contents,
    generationConfig,
  };

  if (systemParts.length > 0) {
    payload.systemInstruction = { parts: [{ text: systemParts.join("\n\n") }] };
  }

  if (req.tools && req.tools.length > 0) {
    payload.tools = [
      {
        functionDeclarations: req.tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: sanitizeJsonSchemaForGoogle(t.function.parameters ?? {}),
        })),
      },
    ];
    // Force the model to call one of the declared functions when the caller
    // specified tool_choice: { type: "function", ... } (matches OpenAI intent).
    const tc = req.tool_choice as { type?: string } | undefined;
    if (tc && (tc.type === "function" || tc === "required" as unknown)) {
      payload.toolConfig = { functionCallingConfig: { mode: "ANY" } };
    }
  }

  return payload;
}

/**
 * Google's function-calling schema is a subset of JSON Schema. Strip fields
 * it commonly rejects (`$schema`, `additionalProperties`, etc.) recursively
 * so tool definitions built for OpenAI don't 400.
 */
function sanitizeJsonSchemaForGoogle(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(sanitizeJsonSchemaForGoogle);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    if (k === "$schema" || k === "additionalProperties" || k === "$id") continue;
    out[k] = sanitizeJsonSchemaForGoogle(v);
  }
  return out;
}

interface GoogleCandidate {
  content?: { parts?: Array<{ text?: string; functionCall?: { name: string; args: unknown } }> };
  finishReason?: string;
}

function fromGoogleResponse(json: { candidates?: GoogleCandidate[] }): ChatCompletionResult["data"] {
  const cand = json.candidates?.[0];
  const parts = cand?.content?.parts ?? [];
  let text = "";
  const toolCalls: NonNullable<ChatCompletionResult["data"]["choices"][number]["message"]["tool_calls"]> = [];
  for (const p of parts) {
    if (typeof p.text === "string") text += p.text;
    if (p.functionCall) {
      toolCalls.push({
        id: `call_${toolCalls.length}`,
        type: "function",
        function: {
          name: p.functionCall.name,
          arguments: JSON.stringify(p.functionCall.args ?? {}),
        },
      });
    }
  }
  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: text,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: cand?.finishReason?.toLowerCase() ?? "stop",
      },
    ],
  };
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export async function chatCompletion(
  req: ChatCompletionRequest,
  opts: { timeoutMs?: number; allowFallback?: boolean } = {},
): Promise<ChatCompletionResult> {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const allowFallback = opts.allowFallback ?? true;

  const googleKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (googleKey) {
    const google = await callGoogle(req, googleKey, timeoutMs);
    if (google.ok) return google;
    console.warn(
      `[googleAi] Google call failed status=${google.status} — ${allowFallback ? "falling back to Lovable Gateway" : "no fallback"}`,
      google.errorBody?.slice(0, 200),
    );
    if (!allowFallback) return google;
  } else {
    console.warn("[googleAi] GOOGLE_AI_API_KEY missing — using Lovable Gateway");
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) {
    return {
      ok: false,
      status: 500,
      provider: "none",
      data: { choices: [] },
      errorBody: "no_ai_credentials",
    };
  }
  return await callLovable(req, lovableKey, timeoutMs);
}

async function callGoogle(
  req: ChatCompletionRequest,
  apiKey: string,
  timeoutMs: number,
): Promise<ChatCompletionResult> {
  const model = toGoogleModel(req.model);
  const url = `${GOOGLE_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toGooglePayload(req)),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const errorBody = await resp.text().catch(() => "");
      return { ok: false, status: resp.status, provider: "google", data: { choices: [] }, errorBody };
    }
    const json = await resp.json();
    return { ok: true, status: 200, provider: "google", data: fromGoogleResponse(json) };
  } catch (err) {
    return {
      ok: false,
      status: 599,
      provider: "google",
      data: { choices: [] },
      errorBody: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callLovable(
  req: ChatCompletionRequest,
  apiKey: string,
  timeoutMs: number,
): Promise<ChatCompletionResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body: Record<string, unknown> = {
      model: req.model,
      messages: req.messages,
    };
    if (req.tools) body.tools = req.tools;
    if (req.tool_choice) body.tool_choice = req.tool_choice;
    if (req.response_format) body.response_format = req.response_format;
    if (typeof req.temperature === "number") body.temperature = req.temperature;
    if (typeof req.max_tokens === "number") body.max_tokens = req.max_tokens;

    const resp = await fetch(LOVABLE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const errorBody = await resp.text().catch(() => "");
      return { ok: false, status: resp.status, provider: "lovable", data: { choices: [] }, errorBody };
    }
    const json = await resp.json();
    return { ok: true, status: 200, provider: "lovable", data: json };
  } catch (err) {
    return {
      ok: false,
      status: 599,
      provider: "lovable",
      data: { choices: [] },
      errorBody: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}
