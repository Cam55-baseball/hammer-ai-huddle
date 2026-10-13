// ONE-TIME, owner-only tool (owner-authorized 2026-10-13). Delete after use.
// set_passwords: sets one password on the allowlisted TEST-ONLY accounts (system accounts only).
// email_owner: privately emails the owner the preview link, 3 test logins and test codes.
// Never logs or returns the password.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { EMAIL_FROM } from "../_shared/email.ts";

const OWNER_EMAIL = "hammersmodality@hammersmodality.org";
const PERSONAS = ["democoach", "demoorg", "demoparent", "demo13", "demo16ss", "democollege", "demomlb", "demoausl", "demosbc", "demo2way", "demoramp", "ee5proof"];
const TEST_EMAILS = PERSONAS.map((p) => `hammersmodality+${p}@gmail.com`);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: u } = await admin.auth.getUser((req.headers.get("Authorization") ?? "").replace("Bearer ", ""));
  if (!u.user) return json({ error: "Sign in first." }, 401);
  const { data: owner } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "owner").maybeSingle();
  if (!owner) return json({ error: "Owner only." }, 403);

  const body = await req.json().catch(() => ({}));
  const pw = String(body.password ?? "");
  if (pw.length < 16) return json({ error: "Password too short." }, 400);

  if (body.action === "set_passwords") {
    const results: Record<string, string> = {};
    for (let page = 1; page <= 20; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const users = data?.users ?? [];
      for (const usr of users) {
        const email = (usr.email ?? "").toLowerCase();
        if (!TEST_EMAILS.includes(email)) continue;
        const { data: prof } = await admin.from("profiles").select("is_system_account").eq("id", usr.id).maybeSingle();
        if (prof?.is_system_account !== true) { results[email] = "refused: not a system account"; continue; }
        const { error } = await admin.auth.admin.updateUserById(usr.id, { password: pw });
        results[email] = error ? `error: ${error.message}` : "ok";
      }
      if (users.length < 200) break;
    }
    return json({ results });
  }

  if (body.action === "email_owner") {
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ error: "email key missing" }, 500);
    const preview = String(body.preview_url ?? "");
    const rows: Array<{ label: string; email: string; code: string; buy: string }> = body.rows ?? [];
    const list = rows.map((r) => `<li><b>${esc(r.label)}</b><br/>Sign in: ${esc(r.email)}<br/>Password: <code>${esc(pw)}</code><br/>Buy: ${esc(r.buy)}<br/>Code: <code>${esc(r.code)}</code></li>`).join("");
    const html = `<div style="font-family:sans-serif"><p><b>PRIVATE — do not forward.</b></p><p>Preview link (the new plans are not published yet): <a href="${esc(preview)}">${esc(preview)}</a></p><p>For each checkout: sign out, sign in as the account below, start the checkout, type the code in "Add promotion code", then pay with your card. The total will be $0 and your card is not charged.</p><ol>${list}</ol><p>Each code works once, only for its plan, and expires in 7 days. Reply "done" in the Lovable chat when finished; all 3 test plans will then be canceled so nothing renews.</p></div>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [OWNER_EMAIL], subject: "[PRIVATE] Hammers test checkouts", html }),
    });
    const t = await res.text();
    return json({ ok: res.ok, status: res.status, id: res.ok ? JSON.parse(t).id : undefined, error: res.ok ? undefined : t.slice(0, 200) }, res.ok ? 200 : 502);
  }
  return json({ error: "Unknown action." }, 400);
});
