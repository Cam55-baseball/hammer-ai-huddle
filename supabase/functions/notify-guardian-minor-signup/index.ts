/**
 * notify-guardian-minor-signup
 *
 * STOPGAP — pending legal review. This makes NO compliance claim for COPPA,
 * any state law, or any other regime. It exists to make the interim 13–17
 * signup posture more protective: when an account is created for a user whose
 * server-computed age band is `minor_13_17`, the parent/guardian contact given
 * at signup is notified that the account exists and told how to reach support
 * to review or request removal.
 *
 * Abuse bounds (no JWT is available at signup when email confirmation is on):
 *  - The referenced auth user must exist.
 *  - Their metadata age_band must be `minor_13_17`.
 *  - The account must have been created within the last 15 minutes.
 *  - One notification row per user (unique user_id) — repeat calls no-op.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const SUPPORT_URL = "https://hammers-modality.lovable.app/help-desk";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FRESH_WINDOW_MS = 15 * 60 * 1000;

function guardianEmailBody(athleteName: string) {
  const name = athleteName?.trim() || "A minor";
  return `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;line-height:1.55;color:#111">
  <h2 style="margin:0 0 16px">An account was created and you were listed as the parent or guardian</h2>
  <p>${name} signed up for Hammers Modality and gave this email address as their parent or guardian contact. They told us they are between 13 and 17 years old.</p>
  <p><strong>What the app does:</strong> Hammers Modality is a baseball and softball training app. Athletes record training sessions, upload video of themselves throwing, hitting, pitching and fielding for movement analysis, log workouts and wellness check-ins, and follow a daily training plan. Video and training data the athlete uploads is stored in their account.</p>
  <p><strong>If you want to review this account, ask questions, or have it removed,</strong> contact support here:</p>
  <p><a href="${SUPPORT_URL}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Contact support</a></p>
  <p style="font-size:13px;color:#555">Include this email address in your message so we can match it to the account. If you did not expect this message, please contact support and let us know.</p>
</div>`.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => null) as
      | { user_id?: unknown; guardian_email?: unknown }
      | null;

    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : "";
    const guardianEmail =
      typeof body?.guardian_email === "string" ? body.guardian_email.trim() : "";

    if (!userId) return json({ error: "missing_user_id" }, 400);
    if (!EMAIL_RE.test(guardianEmail)) return json({ error: "invalid_guardian_email" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
    const user = userRes?.user;
    if (userErr || !user) return json({ error: "unknown_user" }, 404);

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (meta.age_band !== "minor_13_17") return json({ error: "not_applicable" }, 400);

    const createdAt = user.created_at ? Date.parse(user.created_at) : 0;
    if (!createdAt || Date.now() - createdAt > FRESH_WINDOW_MS) {
      return json({ error: "signup_window_expired" }, 400);
    }

    // One notification per account. Conflict ⇒ already handled.
    const { data: inserted, error: insertErr } = await admin
      .from("minor_guardian_notifications")
      .insert({
        user_id: userId,
        guardian_email: guardianEmail,
        age_band: "minor_13_17",
        status: "queued",
      })
      .select("id")
      .maybeSingle();

    if (insertErr) {
      if ((insertErr as { code?: string }).code === "23505") {
        return json({ ok: true, status: "already_notified" });
      }
      console.error("guardian notification insert failed", insertErr.message);
      return json({ error: "record_failed" }, 500);
    }

    const rowId = inserted?.id;

    if (!RESEND_API_KEY) {
      await admin
        .from("minor_guardian_notifications")
        .update({ status: "failed", error: "email_transport_unavailable" })
        .eq("id", rowId);
      return json({ ok: false, status: "failed" });
    }

    const athleteName = typeof meta.full_name === "string" ? meta.full_name : "";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Hammers Modality <onboarding@resend.dev>",
        to: [guardianEmail],
        subject: "A minor listed you as their parent or guardian on Hammers Modality",
        html: guardianEmailBody(athleteName),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("guardian notification email failed", res.status);
      await admin
        .from("minor_guardian_notifications")
        .update({ status: "failed", error: detail.slice(0, 500) })
        .eq("id", rowId);
      return json({ ok: false, status: "failed" });
    }

    await admin
      .from("minor_guardian_notifications")
      .update({ status: "sent", notified_at: new Date().toISOString(), error: null })
      .eq("id", rowId);

    return json({ ok: true, status: "sent" });
  } catch (e) {
    console.error("notify-guardian-minor-signup error", (e as Error).message);
    return json({ error: "unexpected_error" }, 500);
  }
});
