import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { chatCompletion } from "../_shared/googleAi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // Intentionally bogus Google model so the Google call 404s and the OpenAI
  // fallback is exercised end-to-end. Temporary verification function.
  const res = await chatCompletion({
    model: "google/gemini-does-not-exist",
    messages: [{ role: "user", content: "Reply with exactly: fallback ok" }],
    max_tokens: 50,
  });
  return new Response(
    JSON.stringify({ provider: res.provider, ok: res.ok, status: res.status, text: res.data?.choices?.[0]?.message?.content ?? null, err: res.errorBody?.slice(0, 200) ?? null }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
