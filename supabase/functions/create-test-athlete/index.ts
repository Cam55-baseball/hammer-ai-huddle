// Owner-only: creates (or returns) the dedicated 14-year-old baseball pitcher
// test account for gate 5 and the investor demo. Marked is_system_account so it
// is excluded from analytics; no recruiting consent row exists, so scouts see
// nothing (minor + no guardian consent = fail-closed).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const EMAIL = "test-pitcher-14@hammersmodality.test";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Missing Authorization" }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: u } = await admin.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  const { data: isOwner } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "owner" });
  if (!isOwner) return json({ error: "Owner only" }, 403);

  let id: string | null = null;
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  id = list?.users?.find((x) => x.email === EMAIL)?.id ?? null;
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: crypto.randomUUID() + "Aa1!",
      email_confirm: true,
      user_metadata: { full_name: "Test Pitcher (14)", test_account: true },
    });
    if (error) return json({ error: error.message }, 500);
    id = data.user!.id;
  }
  const body = await req.json().catch(() => ({}));
  if (!body?.generate) return json({ user_id: id, email: EMAIL });
  // Run the REAL generator as the test athlete: rotate to a one-time password,
  // sign in, call wk-generate-daily with that athlete's own session.
  const pw = crypto.randomUUID() + "Aa1!";
  await admin.auth.admin.updateUserById(id!, { password: pw });
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: s, error: se } = await anon.auth.signInWithPassword({ email: EMAIL, password: pw });
  if (se || !s.session) return json({ error: se?.message ?? "sign-in failed" }, 500);
  const r = await fetch(`${url}/functions/v1/wk-generate-daily`, {
    method: "POST",
    headers: { Authorization: `Bearer ${s.session.access_token}`, apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
    body: JSON.stringify({ plan_date: body.plan_date }),
  });
  await anon.auth.signOut();
  return json({ user_id: id, status: r.status, result: await r.json().catch(() => null) });
});
