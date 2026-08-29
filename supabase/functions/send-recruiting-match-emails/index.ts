// @ts-nocheck
/**
 * Recruiting match ping dispatch WITH real email (pre-release, staff-gated).
 *
 * Flow: verify the caller's JWT -> call dispatch_standard_match_pings_v2 as that
 * user (so RLS/ownership still decides which matches are theirs) -> send one real
 * email per delivery through Resend. The RPC is the single place that flips
 * notified_* so nobody can be pinged twice.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://hammers-modality.lovable.app";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title: string, bodyHtml: string, ctaLabel: string, ctaHref: string) {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:28px 24px">
    <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin:0 0 12px">Hammers Modality · Recruiting</p>
    <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px">${esc(title)}</h1>
    ${bodyHtml}
    <p style="margin:24px 0 0">
      <a href="${esc(ctaHref)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${esc(ctaLabel)}</a>
    </p>
    <p style="margin-top:24px;font-size:12px;color:#6b7280">Matches are evaluated on camera-measured and coach-evaluated results only. Self-reported numbers are never used.</p>
  </div></body></html>`;
}

function buildEmail(d: Record<string, unknown>) {
  const matched = d.matched_at ? new Date(String(d.matched_at)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  if (d.side === "org") {
    const href = `${APP_URL}/coach/athlete/${d.athlete_user_id}`;
    return {
      subject: `${d.athlete_name} meets "${d.standard_label}"`,
      html: shell(
        `${d.athlete_name} meets "${d.standard_label}"`,
        `<p style="font-size:15px;line-height:1.6;margin:0">
           <strong>${esc(d.athlete_name)}</strong> met every criterion of your ${esc(d.sport)} standard
           <strong>"${esc(d.standard_label)}"</strong>${matched ? ` on ${esc(matched)}` : ""}.
         </p>
         ${d.athlete_email ? `<div style="margin:16px 0;font-size:14px;line-height:1.7;color:#374151">
           <p style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin:0 0 6px">Athlete contact (shared because of this match)</p>
           <div><a href="mailto:${esc(d.athlete_email)}" style="color:#111827">${esc(d.athlete_email)}</a></div>
         </div>` : ""}`,
        "View athlete profile",
        href,
      ),
    };
  }

  const href = `${APP_URL}/profile`;
  const contactBits: string[] = [];
  if (d.contact_name) contactBits.push(`${esc(d.contact_name)}${d.contact_title ? ` — ${esc(d.contact_title)}` : ""}`);
  if (d.contact_email) contactBits.push(`<a href="mailto:${esc(d.contact_email)}" style="color:#111827">${esc(d.contact_email)}</a>`);
  if (d.contact_phone) contactBits.push(esc(d.contact_phone));

  const message = d.personal_message
    ? `<div style="margin:16px 0;padding:14px 16px;border-left:3px solid #111827;background:#f9fafb">
         <p style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin:0 0 6px">Message from ${esc(d.org_name)}</p>
         <p style="font-size:15px;line-height:1.6;margin:0;white-space:pre-wrap">${esc(d.personal_message)}</p>
       </div>`
    : "";

  const contact = contactBits.length
    ? `<div style="margin:16px 0;font-size:14px;line-height:1.7;color:#374151">
         <p style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin:0 0 6px">Reach back directly</p>
         ${contactBits.map((b) => `<div>${b}</div>`).join("")}
       </div>`
    : "";

  return {
    subject: `You meet ${d.org_name}'s "${d.standard_label}" standard`,
    html: shell(
      `You meet ${d.org_name}'s "${d.standard_label}" standard`,
      `<p style="font-size:15px;line-height:1.6;margin:0">
         ${matched ? `On ${esc(matched)}, y` : "Y"}our verified results met every criterion of
         <strong>${esc(d.org_name)}</strong>'s ${esc(d.sport)} standard <strong>"${esc(d.standard_label)}"</strong>.
       </p>${message}${contact}`,
      "See it on your profile",
      href,
    ),
  };
}

async function sendWithResend(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Hammers Modality <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let message: string | null = null;
    try {
      const body = await req.json();
      if (typeof body?.message === "string") message = body.message.slice(0, 1000);
    } catch {
      // no body is fine
    }

    const { data, error } = await supabase.rpc("dispatch_standard_match_pings_v2", {
      p_message: message,
    });
    if (error) throw new Error(error.message);

    const deliveries: Array<Record<string, unknown>> = (data?.deliveries ?? []) as any[];
    let emailed = 0;
    const emailErrors: string[] = [];

    for (const d of deliveries) {
      const to = typeof d.to === "string" ? d.to : "";
      if (!to) continue;
      try {
        const { subject, html } = buildEmail(d);
        await sendWithResend(to, subject, html);
        emailed += 1;
      } catch (e) {
        // In-app notifications already landed; email failure must not undo them.
        console.error("recruiting match email failed:", (e as Error).message);
        emailErrors.push((e as Error).message);
      }
    }

    return new Response(
      JSON.stringify({
        org_pings: data?.org_pings ?? 0,
        athlete_pings: data?.athlete_pings ?? 0,
        emails_sent: emailed,
        email_errors: emailErrors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-recruiting-match-emails:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
