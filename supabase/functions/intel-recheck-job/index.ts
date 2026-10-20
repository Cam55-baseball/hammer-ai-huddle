import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.118.0/cors";
import { recheckComparablePlayer } from "./comparableRecheck.ts";

// Same Vault credential as the existing plan job. Never store or log the raw token.
const TOKEN_DIGEST = "92a0d7f956decec62aeaf2c309a150a936afda73572d8755f9b3999fc91325c9";
export async function validJobToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const actual = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
  let difference = 0;
  for (let i = 0; i < TOKEN_DIGEST.length; i++) difference |= actual.charCodeAt(i) ^ TOKEN_DIGEST.charCodeAt(i);
  return difference === 0;
}

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await validJobToken(req.headers.get("x-job-token")))) return new Response(null, { status: 401, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  try {
    const body = await req.json();
    if (body?.mode !== "recheck") return json({ error: "mode must be recheck" }, 400);
    const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    const deadline = Date.now() + 110_000;
    let cursor: string | null = null;
    let players = 0, checked = 0, pending = 0;
    const visited = new Set<string>();
    while (Date.now() < deadline) {
      let query = sb.from("intelligence_recommendations").select("user_id")
        .eq("followed", true).is("outcome", null).order("user_id").limit(200);
      if (cursor) query = query.gt("user_id", cursor);
      const { data, error } = await query;
      if (error) throw error;
      for (const row of data ?? []) {
        if (Date.now() >= deadline) break;
        if (visited.has(row.user_id)) continue;
        visited.add(row.user_id);
        const results = await recheckComparablePlayer(sb, row.user_id);
        players++; checked += results.filter((r) => r.outcome != null).length;
        pending += results.filter((r) => r.outcome == null).length;
      }
      if (!data || data.length < 200) return json({ status: "complete", players, checked, pending });
      cursor = data[data.length - 1]?.user_id ?? cursor;
    }
    return json({ status: "partial", players, checked, pending });
  } catch {
    console.error("[intel-recheck-job] Re-check failed; recommendations retained.");
    return json({ status: "failed", error: "Re-check failed" }, 500);
  }
});