// Owner-only. Sets one known password on TEST accounts only (owner approval 2026-10-13).
// Allowed: is_system_account = true AND email is hammersmodality+demo*/ee5proof@gmail.com or *@hammersmodality.test.
// Never: real accounts, App Review accounts (applereview*), internal system/sandbox accounts.
// The password comes in the request and is never logged, stored or returned.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

export function isTestEmail(email: string): boolean {
  const e = email.toLowerCase();
  if (e.includes("applereview")) return false;
  return /^hammersmodality\+(demo[a-z0-9]*|ee5proof)@gmail\.com$/.test(e) || /@hammersmodality\.test$/.test(e);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u.user) return json({ error: "Sign in first." }, 401);
  const { data: owner } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "owner").maybeSingle();
  if (!owner) return json({ error: "Owner only." }, 403);

  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || password.length < 16) return json({ error: "Password must be 16+ characters." }, 400);

  const { data: rows } = await admin.from("profiles").select("id").eq("is_system_account", true);
  const done: string[] = [];
  const skipped: string[] = [];
  for (const r of rows ?? []) {
    const { data: au } = await admin.auth.admin.getUserById(r.id);
    const email = au.user?.email ?? "";
    if (!isTestEmail(email)) { skipped.push(email); continue; }
    const { error } = await admin.auth.admin.updateUserById(r.id, { password });
    if (!error) done.push(email);
  }
  return json({ updated: done, skipped });
});
