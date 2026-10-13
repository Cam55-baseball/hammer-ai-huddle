// One-time, owner-only: set passwords on named TEST accounts. Deleted right after use.
import { createClient } from "npm:@supabase/supabase-js@2";
const ALLOWED = new Set(["demo16ss", "democoach", "demoorg"].map((k) => `hammersmodality+${k}@gmail.com`));
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jwt = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u.user) return new Response("no", { status: 401, headers: cors });
  const { data: r } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "owner");
  if (!r?.length) return new Response("no", { status: 403, headers: cors });
  const { items } = await req.json() as { items: { email: string; password: string }[] };
  const out: Record<string, unknown> = {};
  for (const it of items) {
    if (!ALLOWED.has(it.email) || it.password.length < 16) { out[it.email] = "refused"; continue; }
    let id: string | null = null;
    for (let page = 1; page < 20 && !id; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      id = data.users.find((x) => x.email === it.email)?.id ?? null;
      if (data.users.length < 200) break;
    }
    if (!id) { out[it.email] = "not found"; continue; }
    const { data: got, error } = await admin.auth.admin.updateUserById(id, { password: it.password, email_confirm: true, ban_duration: "none" });
    out[it.email] = error ? error.message : { ok: true, confirmed: !!got.user?.email_confirmed_at };
  }
  return new Response(JSON.stringify(out), { headers: { ...cors, "content-type": "application/json" } });
});
