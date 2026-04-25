// Phase 11 — Analytics ingestion endpoint.
// Fast, dumb, fire-and-forget. Always returns 204 so the client never observes failure.
// Service-role insert into public.launch_events.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_EVENTS = new Set([
  "NN_COMPLETED",
  "STANDARD_MET",
  "NIGHT_CHECKIN_COMPLETED",
  "DAY_SKIPPED",
  "FEEDBACK",
]);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const noContent = () => new Response(null, { status: 204, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown = null;
  try {
    // sendBeacon Blobs come through as text — handle both shapes.
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const obj = (body ?? {}) as Record<string, unknown>;
  const event = typeof obj.event === "string" ? obj.event : "";
  if (!ALLOWED_EVENTS.has(event)) {
    return new Response(JSON.stringify({ error: "Unknown event" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload =
    obj.payload && typeof obj.payload === "object" && !Array.isArray(obj.payload)
      ? (obj.payload as Record<string, unknown>)
      : {};

  try {
    const { error } = await supabase
      .from("launch_events")
      .insert({ event, payload });
    if (error) {
      console.error("[analytics-ingest] insert error", error.message);
    }
  } catch (e) {
    console.error("[analytics-ingest] unexpected error", e);
  }

  // Always 204 — fire-and-forget contract.
  return noContent();
});
