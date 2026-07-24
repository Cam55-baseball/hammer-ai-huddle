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
  top_p?: number;
  seed?: number;
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

async function toGooglePayload(req: ChatCompletionRequest): Promise<Record<string, unknown>> {
  const systemParts: string[] = [];
  const contents: Array<Record<string, unknown>> = [];

  for (const m of req.messages) {
    if (m.role === "system") {
      if (typeof m.content === "string") systemParts.push(m.content);
      else if (Array.isArray(m.content)) {
        for (const b of m.content) {
          const t = (b as any)?.text;
          if (typeof t === "string") systemParts.push(t);
        }
      }
      continue;
    }
    const role = m.role === "assistant" ? "model" : "user";
    const parts = await messageContentToGoogleParts(m.content);
    if (parts.length > 0) contents.push({ role, parts });
  }

  const generationConfig: Record<string, unknown> = {};
  if (typeof req.temperature === "number") generationConfig.temperature = req.temperature;
  if (typeof req.max_tokens === "number") generationConfig.maxOutputTokens = req.max_tokens;
  if (typeof req.top_p === "number") generationConfig.topP = req.top_p;
  if (typeof req.seed === "number") generationConfig.seed = req.seed;
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
    const tc = req.tool_choice as { type?: string } | undefined;
    if (tc && (tc.type === "function" || (tc as unknown) === "required")) {
      payload.toolConfig = { functionCallingConfig: { mode: "ANY" } };
    }
  }

  return payload;
}

/**
 * Convert an OpenAI-style message `content` (string | content-block[]) into
 * Google `parts`. Handles `text`, `image_url` (data-URI or https URL), and
 * `input_audio` blocks. Non-data-URI https URLs are fetched and inlined.
 */
async function messageContentToGoogleParts(
  content: string | Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  if (typeof content === "string") return [{ text: content }];
  const parts: Array<Record<string, unknown>> = [];
  for (const block of content) {
    const type = (block as any)?.type;
    if (type === "text" && typeof (block as any).text === "string") {
      parts.push({ text: (block as any).text });
      continue;
    }
    if (type === "image_url") {
      const url: string | undefined = (block as any).image_url?.url;
      if (!url) continue;
      const inline = await urlToInlineData(url, "image/jpeg");
      if (inline) parts.push({ inlineData: inline });
      continue;
    }
    if (type === "input_audio") {
      const data: string | undefined = (block as any).input_audio?.data;
      const fmt: string | undefined = (block as any).input_audio?.format;
      if (data && fmt) {
        parts.push({ inlineData: { mimeType: `audio/${fmt}`, data } });
      }
      continue;
    }
    // Fallback: stringify unknown block as text so we don't lose info.
    const t = (block as any)?.text;
    if (typeof t === "string") parts.push({ text: t });
  }
  return parts;
}

async function urlToInlineData(
  url: string,
  fallbackMime: string,
): Promise<{ mimeType: string; data: string } | null> {
  try {
    if (url.startsWith("data:")) {
      const match = url.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
      if (!match) return null;
      const mimeType = match[1] || fallbackMime;
      const data = match[2] || "";
      // If it wasn't base64, encode.
      if (url.includes(";base64,")) return { mimeType, data };
      return { mimeType, data: btoa(decodeURIComponent(data)) };
    }
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const mimeType = resp.headers.get("content-type")?.split(";")[0] || fallbackMime;
    const buf = new Uint8Array(await resp.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    return { mimeType, data: btoa(binary) };
  } catch (err) {
    console.warn("[googleAi] urlToInlineData failed", err);
    return null;
  }
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
    const body = JSON.stringify(await toGooglePayload(req));
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
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

// -----------------------------------------------------------------------------
// Streaming API — returns an OpenAI-shaped SSE stream:
//   data: {"choices":[{"delta":{"content":"..."}}]}\n\n
//   ...
//   data: [DONE]\n\n
// Google is tried first (streamGenerateContent, SSE mode). If Google fails
// before any bytes are emitted, we fall back to Lovable Gateway's OpenAI
// streaming endpoint and pass its stream body through unchanged.
// -----------------------------------------------------------------------------

export interface StreamChatCompletionResult {
  ok: boolean;
  status: number;
  provider: "google" | "lovable" | "none";
  body: ReadableStream<Uint8Array> | null;
  errorBody?: string;
}

export async function streamChatCompletion(
  req: ChatCompletionRequest,
  opts: { timeoutMs?: number; allowFallback?: boolean } = {},
): Promise<StreamChatCompletionResult> {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const allowFallback = opts.allowFallback ?? true;

  const googleKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (googleKey) {
    const google = await callGoogleStream(req, googleKey, timeoutMs);
    if (google.ok) return google;
    console.warn(
      `[googleAi] Google stream failed status=${google.status} — ${allowFallback ? "falling back to Lovable Gateway" : "no fallback"}`,
      google.errorBody?.slice(0, 200),
    );
    if (!allowFallback) return google;
  } else {
    console.warn("[googleAi] GOOGLE_AI_API_KEY missing — using Lovable Gateway stream");
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) {
    return { ok: false, status: 500, provider: "none", body: null, errorBody: "no_ai_credentials" };
  }
  return await callLovableStream(req, lovableKey, timeoutMs);
}

async function callGoogleStream(
  req: ChatCompletionRequest,
  apiKey: string,
  timeoutMs: number,
): Promise<StreamChatCompletionResult> {
  const model = toGoogleModel(req.model);
  const url = `${GOOGLE_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body = JSON.stringify(await toGooglePayload(req));
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    if (!resp.ok || !resp.body) {
      const errorBody = await resp.text().catch(() => "");
      clearTimeout(timer);
      return { ok: false, status: resp.status, provider: "google", body: null, errorBody };
    }
    const openaiStream = googleSseToOpenAiSse(resp.body, () => clearTimeout(timer));
    return { ok: true, status: 200, provider: "google", body: openaiStream };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 599,
      provider: "google",
      body: null,
      errorBody: err instanceof Error ? err.message : String(err),
    };
  }
}

async function callLovableStream(
  req: ChatCompletionRequest,
  apiKey: string,
  timeoutMs: number,
): Promise<StreamChatCompletionResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body: Record<string, unknown> = {
      model: req.model,
      messages: req.messages,
      stream: true,
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
    if (!resp.ok || !resp.body) {
      const errorBody = await resp.text().catch(() => "");
      clearTimeout(timer);
      return { ok: false, status: resp.status, provider: "lovable", body: null, errorBody };
    }
    // Lovable already emits OpenAI-shaped SSE; pass through.
    const passthrough = new ReadableStream<Uint8Array>({
      async start(controller2) {
        const reader = resp.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) controller2.enqueue(value);
          }
        } finally {
          clearTimeout(timer);
          controller2.close();
        }
      },
    });
    return { ok: true, status: 200, provider: "lovable", body: passthrough };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 599,
      provider: "lovable",
      body: null,
      errorBody: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Convert Google's SSE stream (each `data:` line is a JSON with
 * `candidates[0].content.parts[i].text`) into OpenAI-shaped SSE where each
 * chunk is `{ choices: [{ delta: { content } }] }`.
 */
function googleSseToOpenAiSse(
  input: ReadableStream<Uint8Array>,
  onClose: () => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = input.getReader();
      let buffer = "";
      const emit = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const rawLine = buffer.slice(0, idx).replace(/\r$/, "");
            buffer = buffer.slice(idx + 1);
            if (!rawLine.startsWith("data: ")) continue;
            const jsonStr = rawLine.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const parts = parsed?.candidates?.[0]?.content?.parts ?? [];
              let text = "";
              for (const p of parts) if (typeof p?.text === "string") text += p.text;
              if (text) emit({ choices: [{ delta: { content: text } }] });
            } catch {
              // Skip malformed frame
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.warn("[googleAi] stream translation error", err);
      } finally {
        onClose();
        controller.close();
      }
    },
  });
}
