// Roadmap 7c — emails saved problem reports to the owner. The report is saved by
// the app first; this function only sends. Each call also retries up to 20
// queued/failed reports, so the queue drains as soon as the email key works.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { EMAIL_FROM, EMAIL_REPLY_TO } from "../_shared/email.ts";

const TO = "hammersmodality@hammersmodality.org";
const MAX_ATTEMPTS = 50;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const auth = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "Sign in required" }, 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows } = await admin.from("problem_reports")
    .select("id, user_id, page, message, app_info, created_at, email_attempts")
    .neq("email_status", "sent").lt("email_attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true }).limit(20);

  const key = Deno.env.get("RESEND_API_KEY");
  let sent = 0, failed = 0;
  for (const r of rows ?? []) {
    let err: string | null = null;
    if (!key) err = "email key missing";
    else {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: EMAIL_FROM, reply_to: EMAIL_REPLY_TO, to: [TO],
            subject: `Problem report — ${String(r.page ?? "app").slice(0, 60)}`,
            html: `<div style="font-family:sans-serif"><p><b>Report</b> ${r.id}<br/>User ${r.user_id}<br/>Page ${esc(String(r.page ?? ""))}<br/>Saved ${r.created_at}</p><pre style="white-space:pre-wrap">${esc(String(r.message))}</pre><pre style="font-size:11px;color:#666">${esc(JSON.stringify(r.app_info ?? {}))}</pre></div>`,
          }),
        });
        if (!res.ok) err = `send failed ${res.status}: ${(await res.text()).slice(0, 200)}`;
      } catch (e) { err = String(e).slice(0, 200); }
    }
    if (err) {
      failed++;
      await admin.from("problem_reports").update({ email_status: "failed", email_attempts: r.email_attempts + 1, email_last_error: err }).eq("id", r.id);
    } else {
      sent++;
      await admin.from("problem_reports").update({ email_status: "sent", email_attempts: r.email_attempts + 1, email_last_error: null, email_sent_at: new Date().toISOString() }).eq("id", r.id);
    }
  }
  return json({ sent, failed });
});
