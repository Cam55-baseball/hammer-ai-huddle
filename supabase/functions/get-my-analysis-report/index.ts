// Self-only read of the caller's own saved analysis report for one clip.
// Lets the analysis screen show the saved coaching when the analyze reply
// was lost, failed, or came back without a save confirmation. Never reads
// another user's clip, so no recruiting gate is involved.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { canSeeScoredGrading, stripScoredGrading } from "../_shared/scoredGradingGate.ts";

const Body = z.object({ videoId: z.string().uuid() });

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Unavailable" }, 500);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: auth } = await sb.auth.getUser(token);
  const userId = auth.user?.id;
  if (!userId) return json({ error: "Unauthorized" }, 401);
  let parsed;
  try { parsed = Body.safeParse(await req.json()); } catch { return json({ error: "Invalid request" }, 400); }
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const { data, error } = await sb.from("videos")
    .select("id, status, ai_analysis, efficiency_score")
    .eq("id", parsed.data.videoId).eq("user_id", userId).maybeSingle();
  if (error) return json({ error: "Report unavailable" }, 500);
  if (!data) return json({ found: false });
  const payload = { found: true, status: data.status, ai_analysis: data.ai_analysis, efficiency_score: data.efficiency_score };
  const scored = await canSeeScoredGrading(sb, userId).catch(() => false);
  return json(scored ? payload : stripScoredGrading(payload));
});
