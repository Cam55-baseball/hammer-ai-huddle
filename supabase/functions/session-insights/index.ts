import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { loggedPracticeReport } from "../_shared/practiceReport.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return reply({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key) return reply({ error: "Service unavailable" }, 503);
    const supabase = createClient(url, key, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
    if (error || !data.user) return reply({ error: "Unauthorized" }, 401);
    const { session_id } = await req.json();
    if (typeof session_id !== "string" || !session_id) return reply({ error: "session_id required" }, 400);
    // Authorize against the canonical non-deleted source before any report read.
    const result = await supabase.from("performance_sessions")
      .select("id,user_id,session_date,coach_id,drill_blocks")
      .eq("id", session_id).eq("user_id", data.user.id).is("deleted_at", null).maybeSingle();
    if (result.error) return reply({ error: "Practice log unavailable" }, 500);
    if (!result.data) return reply({ error: "Session not found" }, 404);
    // Existing AI caches remain stored, but cannot supply evidence or diagnoses.
    return reply({ report: loggedPracticeReport(result.data) });
  } catch {
    return reply({ error: "Practice report unavailable" }, 500);
  }
});
