// Single-use, short-lived handoff from the iOS app (US storefront) to website
// checkout, so the purchase lands on the SAME account. The caller must be
// signed in; the token is minted for that caller's own email only.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const SITE = "https://hammersmodality.org";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u.user?.email) return json({ error: "not_signed_in" }, 401);

    const body = await req.json().catch(() => ({}));
    const rawNext = typeof body?.next === "string" ? body.next : "/checkout";
    const next = /^\/(checkout|pricing|select-modules)(\?[^\s#]*)?$/.test(rawNext) ? rawNext : "/checkout";

    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
    const th = (data as any)?.properties?.hashed_token;
    if (error || !th) return json({ error: "handoff_unavailable" }, 500);

    const url = new URL("/app-handoff", SITE);
    url.searchParams.set("th", th);
    url.searchParams.set("uid", u.user.id);
    url.searchParams.set("next", next);
    console.log("[APP-PURCHASE-HANDOFF] issued", { userId: u.user.id });
    return json({ url: url.toString() });
  } catch (e) {
    console.log("[APP-PURCHASE-HANDOFF] error", String(e));
    return json({ error: "handoff_failed" }, 500);
  }
});
