// Organization official-email check: { mode: "send" | "confirm", organization_id, code? }
// Only the organization's owner may call it. Codes: 6 digits, 10 minutes, 5 tries, one send per minute.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { EMAIL_FROM, EMAIL_REPLY_TO } from "../_shared/email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

export const CODE_MINUTES = 10;
export const MAX_TRIES = 5;

async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "Sign in first" }, 401);

  let body: { mode?: string; organization_id?: string; code?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: org } = await admin.from("organizations")
    .select("id, name, owner_user_id, official_email, email_verified_at, email_code_hash, email_code_expires_at, email_code_attempts")
    .eq("id", body.organization_id ?? "").maybeSingle();
  if (!org || org.owner_user_id !== u.user.id) return json({ error: "Not your organization" }, 403);
  if (!org.official_email) return json({ error: "Add the official email first" }, 400);
  if (org.email_verified_at) return json({ ok: true, already: true });

  if (body.mode === "send") {
    const exp = org.email_code_expires_at ? new Date(org.email_code_expires_at).getTime() : 0;
    if (exp - Date.now() > (CODE_MINUTES - 1) * 60_000) return json({ error: "Wait a minute before asking for another code" }, 429);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ error: "Email is not set up" }, 503);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM, reply_to: EMAIL_REPLY_TO, to: [org.official_email],
        subject: `Your Hammers Modality code: ${code}`,
        text: `Your code to confirm ${org.name}'s official email is ${code}. It works for ${CODE_MINUTES} minutes. If you didn't ask for this, ignore this email.`,
      }),
    });
    if (!r.ok) return json({ error: "Could not send the email" }, 502);
    await admin.from("organizations").update({
      email_code_hash: await sha(`${org.id}:${code}`),
      email_code_expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
      email_code_attempts: 0,
    }).eq("id", org.id);
    return json({ ok: true, sent: true });
  }

  if (body.mode === "confirm") {
    const code = String(body.code ?? "").trim();
    if (!org.email_code_hash || !org.email_code_expires_at || new Date(org.email_code_expires_at).getTime() < Date.now())
      return json({ ok: false, reason: "expired" });
    if ((org.email_code_attempts ?? 0) >= MAX_TRIES) return json({ ok: false, reason: "too_many" });
    if ((await sha(`${org.id}:${code}`)) !== org.email_code_hash) {
      await admin.from("organizations").update({ email_code_attempts: (org.email_code_attempts ?? 0) + 1 }).eq("id", org.id);
      return json({ ok: false, reason: "wrong" });
    }
    await admin.from("organizations").update({
      email_verified_at: new Date().toISOString(), email_code_hash: null, email_code_expires_at: null, email_code_attempts: 0,
    }).eq("id", org.id);
    return json({ ok: true });
  }
  return json({ error: "Bad request" }, 400);
});
