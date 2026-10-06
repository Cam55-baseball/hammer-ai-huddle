/**
 * Under-13 parent-controlled accounts (owner ruling 2026-10-06), behind the
 * `under13_parent_program` switch. Actions:
 *   status   — is the parent path open (anonymous signup or this account)
 *   signup   — new under-13 account: parent details + signature (nothing is
 *              saved before this call; it creates the account locked)
 *   sign     — an existing paused under-13 account: parent details + signature
 *   finalize — confirm the parent's payment with Stripe; unlock only when the
 *              signature AND an active paid subscription are both on file
 *   withdraw — take back permission: lock at once, cancel billing
 *   delete   — delete the child's data (listed tables), lock, cancel billing
 *   sharing  — separate optional-sharing yes/no (off by default)
 * Never logs signatures, passwords or birthdates.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { EMAIL_FROM } from "../_shared/email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SWITCH = "under13_parent_program";
/** Marker on the pilot list that opens the anonymous signup path during tests. */
export const ANON_PILOT_MARKER = "anon_signup_pilot";

/** Whole years on a calendar date (YYYY-MM-DD), the same rule as the database. */
export function yearsOn(dob: string, on: string): number {
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = on.split("-").map(Number);
  let a = ty - by;
  if (tm < bm || (tm === bm && td < bd)) a -= 1;
  return a;
}
const utcToday = () => new Date().toISOString().slice(0, 10);

/**
 * Tables cleared by "delete my child's data". The account row, the consent
 * record and this deletion log are kept (proof of consent and of deletion).
 */
export const CHILD_DATA_TABLES: Array<[string, string]> = [
  ["videos", "user_id"], ["vault_progress_photos", "user_id"], ["athlete_height_checks", "user_id"],
  ["athlete_daily_log", "user_id"], ["hydration_logs", "user_id"], ["mental_health_journal", "user_id"],
  ["emotion_tracking", "user_id"], ["mindfulness_sessions", "user_id"], ["custom_activity_logs", "user_id"],
  ["athlete_body_goals", "user_id"], ["athlete_events", "user_id"], ["calendar_events", "user_id"],
  ["catching_reps", "user_id"], ["defensive_plays", "user_id"], ["user_behavior_patterns", "user_id"],
  ["wk_prescriptions", "user_id"], ["wk_session_logs", "user_id"], ["wk_plan_changes", "user_id"], ["hammer_daily_task_completions", "user_id"],
];

const Parent = z.object({
  parent_full_name: z.string().trim().min(3).max(120),
  relationship: z.string().trim().min(2).max(40),
  parent_birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  child_display_name: z.string().trim().min(1).max(40),
  typed_name: z.string().trim().min(3).max(120),
  agreed: z.literal(true),
  signature_png: z.string().startsWith("data:image/png;base64,").max(600_000),
  promise_version: z.number().int().positive(),
  notice_version: z.number().int().positive(),
});
const Signup = Parent.extend({
  child_birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  parent_email: z.string().trim().email().max(255),
  password: z.string().min(6).max(200),
});
const Sign = Parent.extend({ parent_email: z.string().trim().email().max(255) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const action = String(body?.action ?? "");

  const { data: sw } = await admin.from("wk_feature_switches").select("mode, allowlist, updated_by").eq("feature_key", SWITCH).maybeSingle();
  const onFor = (uid: string | null) => {
    if (!sw) return false;
    if (sw.mode === "all") return true;
    if (sw.mode === "pilot") return uid ? (sw.allowlist ?? []).includes(uid) : (sw.allowlist ?? []).includes(ANON_PILOT_MARKER);
    if (sw.mode === "self") return !!uid && sw.updated_by === uid;
    return false;
  };

  // Signed-in caller (optional for status/signup).
  let user: { id: string; email?: string } | null = null;
  const auth = req.headers.get("Authorization") ?? "";
  if (auth.startsWith("Bearer ")) {
    const { data } = await admin.auth.getUser(auth.slice(7));
    user = data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
  }
  const meta = { ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, ua: req.headers.get("user-agent")?.slice(0, 300) ?? null };

  const texts = async (pv: number, nv: number) => {
    const { data } = await admin.from("consent_texts").select("kind, version, body").in("kind", ["parent_promise", "parent_notice"]);
    const p = (data ?? []).find((r: any) => r.kind === "parent_promise" && r.version === pv);
    const n = (data ?? []).find((r: any) => r.kind === "parent_notice" && r.version === nv);
    return p && n ? { promise: String(p.body) } : null;
  };

  const storeConsent = async (childId: string, d: z.infer<typeof Parent> & { parent_email: string }) => {
    const t = await texts(d.promise_version, d.notice_version);
    if (!t) return { error: "unknown_text_version" };
    const bytes = Uint8Array.from(atob(d.signature_png.split(",")[1]), (c) => c.charCodeAt(0));
    if (bytes.length < 200) return { error: "signature_missing" };
    const path = `${childId}/${crypto.randomUUID()}.png`;
    const up = await admin.storage.from("parent-signatures").upload(path, new Blob([bytes], { type: "image/png" }), { contentType: "image/png" });
    if (up.error) return { error: "signature_upload_failed" };
    const { data, error } = await admin.from("parent_consents").insert({
      child_user_id: childId, parent_full_name: d.parent_full_name, relationship: d.relationship,
      parent_birthdate: d.parent_birthdate, parent_is_adult: true, parent_email: d.parent_email.toLowerCase(),
      child_display_name: d.child_display_name, typed_name: d.typed_name, signature_path: path,
      promise_version: d.promise_version, notice_version: d.notice_version,
      promise_text: t.promise.replace("[child's name]", d.child_display_name),
      ip: meta.ip, user_agent: meta.ua,
    }).select("id").single();
    if (error) return { error: "consent_save_failed" };
    return { id: data.id as string };
  };

  const sendReceipt = async (to: string, child: string) => {
    const key = Deno.env.get("RESEND_API_KEY") ?? "";
    if (!key) return { sent: false, reason: "no_key" };
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject: "Your signed Parent Promise — Hammers Modality",
        text: `Thank you. We received your signed Parent Promise for ${child}. You can view and download it any time in Settings → Parent controls. The account opens once your payment is confirmed.` }),
    });
    const ok = r.ok; await r.text();
    return { sent: ok, reason: ok ? null : `resend_${r.status}` };
  };

  const stripe = () => new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2025-08-27.basil" });
  const activeSubscription = async (email: string) => {
    const s = stripe();
    const customers = await s.customers.list({ email, limit: 5 });
    for (const c of customers.data) {
      const subs = await s.subscriptions.list({ customer: c.id, status: "all", limit: 10 });
      const live = subs.data.find((x) => x.status === "active" || x.status === "trialing");
      if (live) return live;
    }
    return null;
  };
  const cancelBilling = async (email: string) => {
    const s = stripe();
    const canceled: string[] = [];
    const customers = await s.customers.list({ email, limit: 5 });
    for (const c of customers.data) {
      const subs = await s.subscriptions.list({ customer: c.id, status: "all", limit: 20 });
      for (const x of subs.data) if (["active", "trialing", "past_due", "unpaid", "incomplete"].includes(x.status)) {
        await s.subscriptions.cancel(x.id); canceled.push(x.id);
      }
    }
    return canceled;
  };
  const lock = async (uid: string, reason: string) =>
    admin.from("profiles").update({ parent_consent_ok: false, account_paused_at: new Date().toISOString(), paused_reason: reason }).eq("id", uid);

  try {
    if (action === "status") {
      const uid = user?.id ?? null;
      let consent: any = null;
      if (uid) {
        const { data } = await admin.from("parent_consents").select("id, signed_at, payment_confirmed_at, withdrawn_at, child_display_name")
          .eq("child_user_id", uid).order("signed_at", { ascending: false }).limit(1).maybeSingle();
        consent = data;
      }
      return json({ enabled: onFor(uid), consent });
    }

    if (action === "signup") {
      if (!onFor(null)) return json({ error: "not_available" }, 403);
      const p = Signup.safeParse(body);
      if (!p.success) return json({ error: "invalid", fields: Object.keys(p.error.flatten().fieldErrors) }, 400);
      const d = p.data; const today = utcToday();
      if (yearsOn(d.parent_birthdate, today) < 18) return json({ error: "parent_not_adult" }, 422);
      const childAge = yearsOn(d.child_birthdate, today);
      if (childAge >= 13 || childAge < 0) return json({ error: "not_under_13" }, 422);
      const created = await admin.auth.admin.createUser({
        email: d.parent_email, password: d.password, email_confirm: true,
        user_metadata: { full_name: d.child_display_name, date_of_birth: d.child_birthdate, parent_controlled: true },
      });
      if (created.error || !created.data.user) {
        const dup = /already|registered|exists/i.test(created.error?.message ?? "");
        return json({ error: dup ? "email_in_use" : "account_failed" }, dup ? 409 : 500);
      }
      const uid = created.data.user.id;
      await admin.from("profiles").upsert({ id: uid, first_name: d.child_display_name, full_name: d.child_display_name, date_of_birth: d.child_birthdate,
        parent_controlled: true, parent_consent_ok: false, account_paused_at: new Date().toISOString(), paused_reason: "parent_payment_pending" });
      const c = await storeConsent(uid, d);
      if ("error" in c) { await admin.auth.admin.deleteUser(uid); return json({ error: c.error }, 500); }
      const receipt = await sendReceipt(d.parent_email, d.child_display_name);
      return json({ ok: true, consent_id: c.id, receipt });
    }

    if (!user) return json({ error: "unauthorized" }, 401);

    if (action === "sign") {
      if (!onFor(user.id)) return json({ error: "not_available" }, 403);
      const p = Sign.safeParse(body);
      if (!p.success) return json({ error: "invalid", fields: Object.keys(p.error.flatten().fieldErrors) }, 400);
      const d = p.data;
      if (yearsOn(d.parent_birthdate, utcToday()) < 18) return json({ error: "parent_not_adult" }, 422);
      const { data: prof } = await admin.from("profiles").select("date_of_birth").eq("id", user.id).maybeSingle();
      if (!prof?.date_of_birth || yearsOn(String(prof.date_of_birth), utcToday()) >= 13) return json({ error: "not_under_13" }, 422);
      const { data: open } = await admin.from("parent_consents").select("id").eq("child_user_id", user.id).is("withdrawn_at", null).limit(1).maybeSingle();
      if (open) return json({ ok: true, consent_id: open.id, already_signed: true });
      await admin.from("profiles").update({ parent_controlled: true, paused_reason: "parent_payment_pending" }).eq("id", user.id);
      const c = await storeConsent(user.id, d);
      if ("error" in c) return json({ error: c.error }, 500);
      const receipt = await sendReceipt(d.parent_email, d.child_display_name);
      return json({ ok: true, consent_id: c.id, receipt });
    }

    if (action === "finalize") {
      const { data: c } = await admin.from("parent_consents").select("id, payment_confirmed_at")
        .eq("child_user_id", user.id).is("withdrawn_at", null).order("signed_at", { ascending: false }).limit(1).maybeSingle();
      if (!c) return json({ ok: false, reason: "signature_missing" });
      const sub = user.email ? await activeSubscription(user.email) : null;
      if (!sub) return json({ ok: false, reason: "payment_missing" });
      await admin.from("parent_consents").update({ stripe_payment_id: sub.id, payment_confirmed_at: c.payment_confirmed_at ?? new Date().toISOString() }).eq("id", c.id);
      await admin.from("profiles").update({ parent_consent_ok: true, account_paused_at: null, paused_reason: null }).eq("id", user.id);
      return json({ ok: true });
    }

    if (action === "withdraw" || action === "delete") {
      const { data: c } = await admin.from("parent_consents").select("id").eq("child_user_id", user.id).is("withdrawn_at", null)
        .order("signed_at", { ascending: false }).limit(1).maybeSingle();
      if (!c) return json({ error: "no_consent" }, 404);
      await lock(user.id, action === "delete" ? "parent_deleted_data" : "parent_withdrew");
      await admin.from("parent_consents").update({ withdrawn_at: new Date().toISOString() }).eq("id", c.id);
      let canceled: string[] = []; let billingError: string | null = null;
      try { if (user.email) canceled = await cancelBilling(user.email); } catch { billingError = "stripe_cancel_failed"; }
      const removed: Record<string, number | string> = {};
      if (action === "delete") {
        for (const [table, col] of CHILD_DATA_TABLES) {
          const { count, error } = await admin.from(table).delete({ count: "exact" }).eq(col, user.id);
          removed[table] = error ? `error: ${error.code ?? "failed"}` : (count ?? 0);
        }
        await admin.from("child_data_deletions").insert({ child_user_id: user.id, consent_id: c.id, removed });
      }
      return json({ ok: true, locked: true, canceled_subscriptions: canceled.length, billingError, removed });
    }

    if (action === "sharing") {
      const yes = body?.optional_sharing === true;
      const { error } = await admin.from("parent_consents").update({ optional_sharing: yes, optional_sharing_at: new Date().toISOString() })
        .eq("child_user_id", user.id).is("withdrawn_at", null);
      return error ? json({ error: "failed" }, 500) : json({ ok: true, optional_sharing: yes });
    }

    if (action === "signature_url") {
      const { data: c } = await admin.from("parent_consents").select("signature_path").eq("child_user_id", user.id)
        .order("signed_at", { ascending: false }).limit(1).maybeSingle();
      if (!c) return json({ error: "no_consent" }, 404);
      const { data } = await admin.storage.from("parent-signatures").createSignedUrl(c.signature_path, 300);
      return json({ url: data?.signedUrl ?? null });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (_e) {
    return json({ error: "server_error" }, 500);
  }
});
