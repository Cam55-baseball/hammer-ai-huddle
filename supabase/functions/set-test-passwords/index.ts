// ONE-TIME owner-only tool (owner OK 2026-10-13 MM7). Sets a known password on test-only accounts. Delete after use.
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const PERSONAS = ["democoach","demoorg","demoparent","demo13","demo16ss","democollege","demomlb","demoausl","demosbc","demo2way","demoramp","ee5proof"];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const tok = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(tok);
  if (!u?.user) return new Response('{"error":"signed out"}', { status: 401, headers: cors });
  const { data: r } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "owner");
  if (!r?.length) return new Response('{"error":"owner only"}', { status: 403, headers: cors });
  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || password.length < 16) return new Response('{"error":"bad password"}', { status: 400, headers: cors });
  const out: Record<string, string> = {};
  for (const p of PERSONAS) {
    const email = `hammersmodality+${p}@gmail.com`;
    const { data: prof } = await admin.from("profiles").select("id,is_system_account").eq("email", email).maybeSingle();
    if (!prof) { out[p] = "not found"; continue; }
    if (prof.is_system_account !== true) { out[p] = "skipped (not a test account)"; continue; }
    const { error } = await admin.auth.admin.updateUserById(prof.id, { password });
    out[p] = error ? "failed" : "set";
  }
  return new Response(JSON.stringify(out), { headers: { ...cors, "Content-Type": "application/json" } });
});
