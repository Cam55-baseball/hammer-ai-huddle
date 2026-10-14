// ONE-TIME owner-only tool: sets passwords on test-only accounts. Delete after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const ALLOWED = new Set(["demo13","demoparent","democollege","demomlb","demoausl","demosbc","demo2way","demoramp","ee5proof"].map((s) => `hammersmodality+${s}@gmail.com`));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: "Sign in" }, 401);
  const { data: isOwner } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "owner" });
  if (!isOwner) return json({ error: "Owner only" }, 403);
  const { accounts } = await req.json() as { accounts: { email: string; password: string }[] };
  const out: Record<string, string> = {};
  for (const a of accounts ?? []) {
    if (!ALLOWED.has(a.email) || (a.password ?? "").length < 16) { out[a.email] = "refused"; continue; }
    const { data } = await admin.from("profiles").select("id").eq("email", a.email).maybeSingle();
    let id = data?.id as string | undefined;
    if (!id) {
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      id = list?.users.find((x) => x.email === a.email)?.id;
    }
    if (!id) { out[a.email] = "not found"; continue; }
    const { error } = await admin.auth.admin.updateUserById(id, { password: a.password });
    out[a.email] = error ? "error" : "ok";
  }
  return json({ result: out });
});
