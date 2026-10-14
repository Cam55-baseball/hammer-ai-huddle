// ONE-TIME owner-only tool: resets the 3 test-only logins, proves password sign-in, emails them privately. Delete after use.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { EMAIL_FROM, EMAIL_REPLY_TO } from "../_shared/email.ts";

const ACCOUNTS = [
  { role: "Test PLAYER (adult, born 2005)", email: "hammersmodality+democollege@gmail.com", plan: "Complete Pitcher", code: "ADlWH6Ul", page: "Pricing → Complete Pitcher" },
  { role: "Test COACH", email: "hammersmodality+democoach@gmail.com", plan: "Hammers Coach", code: "0iFnOWHK", page: "Staff Plans → Choose Hammers Coach" },
  { role: "Test ORG ADMIN", email: "hammersmodality+demoorg@gmail.com", plan: "Hammers Organization + 1 extra seat", code: "zHf8t0a5", page: "Staff Plans → set extra seats to 1 → Choose Hammers Organization" },
];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
function pw() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(18));
  return "Hm-" + Array.from(b, (x) => a[x % a.length]).join("") + "-9";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: u } = await createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }).auth.getUser();
  if (!u?.user) return new Response(JSON.stringify({ error: "no user" }), { status: 401, headers: corsHeaders });
  const { data: isOwner } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "owner" });
  if (!isOwner) return new Response(JSON.stringify({ error: "owner only" }), { status: 403, headers: corsHeaders });

  const dry = new URL(req.url).searchParams.get("send") !== "1";
  const report: any[] = [];
  const rows: string[] = [];
  for (const a of ACCOUNTS) {
    const { data: list } = await admin.from("profiles").select("id,date_of_birth").eq("email", a.email).maybeSingle();
    let id = (list as any)?.id;
    if (!id) { const { data } = await admin.auth.admin.listUsers({ perPage: 1000 }); id = data.users.find((x) => x.email === a.email)?.id; }
    if (!id) { report.push({ email: a.email, found: false }); continue; }
    const p = pw();
    const { error: ue } = await admin.auth.admin.updateUserById(id, { password: p, email_confirm: true });
    const { data: s, error: se } = await createClient(url, anon).auth.signInWithPassword({ email: a.email, password: p });
    report.push({ email: a.email, found: true, reset: !ue, signin: !!s?.session && !se, dob: (list as any)?.date_of_birth ?? null });
    rows.push(`<tr><td>${esc(a.role)}</td><td>${esc(a.email)}</td><td><code>${esc(p)}</code></td><td>${esc(a.plan)}</td><td><code>${a.code}</code></td><td>${esc(a.page)}</td></tr>`);
  }
  const ok = report.every((r) => r.found && r.reset && r.signin);
  let sent = false;
  if (ok && !dry) {
    const html = `<div style="font-family:sans-serif"><p><b>This email REPLACES both earlier "[PRIVATE] Hammers test checkouts" emails.</b> The player login changed to an adult player (the old one was a 16-year-old). All passwords below are new.</p>
<p>Preview: <a href="https://id-preview--cefbf3ce-1234-420d-b93f-77c839c5731b.lovable.app">open in its own browser tab</a></p>
<ol><li>Open the menu (your initials, top right) → Sign Out. If you're already signed out, skip this.</li>
<li>Sign in with ONE login below.</li><li>Check the line "Signed in as …" at the top of Pricing / Staff Plans matches that login.</li>
<li>Go to the page listed, tap the plan, enter the code on Stripe's page.</li><li>Back in the app, Sign Out before the next login.</li></ol>
<table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Who</th><th>Login</th><th>Password</th><th>Plan</th><th>Code</th><th>Where</th></tr>${rows.join("")}</table>
<p>Codes: 100% off, one use each, expire Oct 20.</p></div>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, reply_to: EMAIL_REPLY_TO, to: ["hammersmodality@hammersmodality.org"], subject: "[PRIVATE] Hammers test checkouts — FINAL (use these)", html }),
    });
    sent = res.ok;
  }
  return new Response(JSON.stringify({ ok, sent, report }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
