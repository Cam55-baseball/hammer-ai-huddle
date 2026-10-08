/**
 * teen-parent-waiver (legal_v2) — Florida §744.301(3) parent waiver for players 13–17.
 * Teen (signed in):  status | request {email, phone?} | resend
 * Parent (link):     view {token} | sign {token, name, relationship, adult, signature}
 * Owner/admin:       staff_list | staff_resend {teen_user_id}
 * Does nothing (required:false) unless legal_v2 is on for the teen.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { EMAIL_FROM, EMAIL_REPLY_TO } from "../_shared/email.ts";
import { ageOn, daysLeft, firstSeen, isLocked, LINK_VALID_DAYS, needsTeenWaiver, reminderDue } from "../_shared/legal/teenWaiverRules.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
// Real emails always link to the live site. Any other origin (preview, local) is a TEST:
// it goes only to the owner inbox, the subject starts with [TEST], and the link uses that origin.
const LIVE = "https://hammersmodality.org";
const LIVE_ORIGINS = [LIVE, "https://www.hammersmodality.org", "https://hammers-modality.lovable.app"];
const TEST_ORIGINS = ["https://id-preview--cefbf3ce-1234-420d-b93f-77c839c5731b.lovable.app", "http://localhost:8080"];
const OWNER_INBOX = "hammersmodality@hammersmodality.org";
const SLUG = "minor-waiver";

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const now = new Date();
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const reqOrigin = String(body.origin ?? "");
    const isTest = TEST_ORIGINS.includes(reqOrigin) || body.test === true;
    const origin = isTest ? (TEST_ORIGINS.includes(reqOrigin) ? reqOrigin : TEST_ORIGINS[0]) : LIVE;

    const switchOnFor = async (uid: string) => {
      const { data } = await admin.from("wk_feature_switches").select("mode, allowlist, updated_by").eq("feature_key", "legal_v2").maybeSingle();
      if (!data) return false;
      return data.mode === "all" || (data.mode === "pilot" && (data.allowlist ?? []).includes(uid)) || (data.mode === "self" && data.updated_by === uid);
    };

    const sendLink = async (row: any, teenFirst: string, reminder: boolean) => {
      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
      const exp = new Date(now.getTime() + LINK_VALID_DAYS * 86_400_000).toISOString();
      await admin.from("teen_waiver_requests").update({ token_hash: await sha256(token), token_expires_at: exp, updated_at: now.toISOString() }).eq("id", row.id);
      const link = `${origin}/parent-sign/${token}`;
      const key = Deno.env.get("RESEND_API_KEY");
      if (!key) return { status: "no_key" };
      const who = esc(teenFirst || "Your player");
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: EMAIL_FROM, reply_to: EMAIL_REPLY_TO, to: [isTest ? OWNER_INBOX : row.parent_email],
          subject: (isTest ? "[TEST] " : "") + (reminder ? `Reminder: ${teenFirst || "your player"} needs your signature` : `${teenFirst || "Your player"} needs your signature to train`),
          html: `<p>Hi,</p><p>${who} listed you as their parent or guardian on Hammers Modality, a baseball and softball training app.</p><p>Because they are under 18, a parent or guardian must read and sign a short waiver before ${who} can use the physical training plan.</p><p><a href="${link}">Read and sign the waiver</a></p><p>This link works for ${LINK_VALID_DAYS} days. If you don't know this player, ignore this email.</p><p>Hammers Modality LLC · 15985 Preserve Marketplace #1154, Odessa, FL 33556</p>`,
        }),
      });
      const t = await r.text();
      if (!r.ok) { console.error("[teen-parent-waiver] resend", r.status, t); return { status: "failed", detail: `${r.status} ${t.slice(0, 200)}` }; }
      return { status: "sent", test: isTest, link_host: new URL(link).host };
    };

    // ---------- parent (link) ----------
    if (action === "view" || action === "sign") {
      const token = String(body.token ?? "");
      if (token.length < 40) return json({ error: "invalid_link" }, 400);
      const { data: row } = await admin.from("teen_waiver_requests").select("*").eq("token_hash", await sha256(token)).maybeSingle();
      // Friendly states, checked in this order: unknown → expired → already signed → feature not active.
      if (!row) return json({ state: "unknown" });
      if (!row.token_expires_at || new Date(row.token_expires_at) < now) return json({ state: "expired" });
      if (row.signed_at) return json({ state: "already_signed" });
      if (!(await switchOnFor(row.teen_user_id))) return json({ state: "not_active" });
      const { data: doc } = await admin.from("legal_documents").select("slug, version, title, body, approved").eq("slug", SLUG).order("version", { ascending: false }).limit(1).maybeSingle();
      const { data: p } = await admin.from("profiles").select("first_name").eq("id", row.teen_user_id).maybeSingle();
      if (!doc) return json({ error: "not_available" }, 400);
      if (action === "view") return json({ state: "ok", doc, teen_first_name: p?.first_name ?? null });

      const name = String(body.name ?? "").trim().slice(0, 120);
      const relationship = String(body.relationship ?? "").trim().slice(0, 40);
      const sig = String(body.signature ?? "");
      if (name.split(/\s+/).length < 2) return json({ error: "name_missing" }, 400);
      if (!relationship) return json({ error: "relationship_missing" }, 400);
      if (body.adult !== true) return json({ error: "not_adult" }, 400);
      if (!sig.startsWith("data:image/png;base64,") || sig.length > 400_000) return json({ error: "signature_missing" }, 400);
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
      const { data: rec, error } = await admin.from("consent_records").insert({
        user_id: row.teen_user_id, document_slug: doc.slug, document_version: doc.version, choice: "signed", method: "typed_signature",
        signer_name: name, signer_role: "parent_guardian", ip, device: (req.headers.get("user-agent") ?? "").slice(0, 300),
        details: { flow: "teen_13_17_parent_link", relationship, confirmed_18_plus: true, parent_email: row.parent_email, parent_phone: row.parent_phone, drawn_signature_png: sig },
      }).select("id, recorded_at").single();
      if (error) throw error;
      await admin.from("teen_waiver_requests").update({ signed_at: now.toISOString(), consent_record_id: rec.id, updated_at: now.toISOString() }).eq("id", row.id);
      return json({ ok: true, recorded_at: rec.recorded_at });
    }

    // ---------- signed-in callers ----------
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const uid = u.user.id;

    if (action === "staff_list" || action === "staff_resend" || action === "staff_test_email" || action === "staff_expire") {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
      if (!(roles ?? []).some((r: any) => r.role === "owner" || r.role === "admin")) return json({ error: "not_allowed" }, 403);
      if (action === "staff_list") {
        const { data } = await admin.from("teen_waiver_requests").select("id, teen_user_id, kind, first_seen_at, grace_until, parent_email, last_sent_at, send_count").is("signed_at", null).order("first_seen_at");
        const ids = (data ?? []).map((r) => r.teen_user_id);
        const { data: ps } = ids.length ? await admin.from("profiles").select("id, first_name, last_name").in("id", ids) : { data: [] as any[] };
        const names = new Map((ps ?? []).map((p: any) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()]));
        return json({ rows: (data ?? []).map((r) => ({ ...r, teen_name: names.get(r.teen_user_id) || null, locked: isLocked({ signed_at: null, grace_until: r.grace_until }, now) })) });
      }
      if (action === "staff_expire") {
        await admin.from("teen_waiver_requests").update({ token_expires_at: new Date(now.getTime() - 60_000).toISOString(), updated_at: now.toISOString() }).eq("teen_user_id", String(body.teen_user_id));
        return json({ ok: true });
      }
      const { data: row } = await admin.from("teen_waiver_requests").select("*").eq("teen_user_id", String(body.teen_user_id)).maybeSingle();
      if (!row?.parent_email || row.signed_at) return json({ error: "nothing_to_send" }, 400);
      if (action === "staff_test_email" && !isTest) return json({ error: "test_needs_preview_origin" }, 400);
      const { data: p } = await admin.from("profiles").select("first_name").eq("id", row.teen_user_id).maybeSingle();
      const sent = await sendLink(row, p?.first_name ?? "", false);
      await admin.from("teen_waiver_requests").update({ last_sent_at: now.toISOString(), send_count: row.send_count + 1 }).eq("id", row.id);
      return json({ ok: true, email: sent });
    }

    if (!(await switchOnFor(uid))) return json({ required: false });
    const { data: prof } = await admin.from("profiles").select("date_of_birth, created_at, first_name").eq("id", uid).maybeSingle();
    if (!needsTeenWaiver(ageOn(prof?.date_of_birth, now))) return json({ required: false });

    let { data: row } = await admin.from("teen_waiver_requests").select("*").eq("teen_user_id", uid).maybeSingle();
    if (!row) {
      const fs = firstSeen(prof?.created_at ?? now.toISOString(), now);
      const ins = await admin.from("teen_waiver_requests").insert({ teen_user_id: uid, kind: fs.kind, grace_until: fs.grace_until }).select("*").single();
      if (ins.error) throw ins.error;
      row = ins.data;
    }

    if (action === "request" || action === "resend") {
      if (row.signed_at) return json({ error: "already_signed" }, 400);
      if (row.last_sent_at && now.getTime() - new Date(row.last_sent_at).getTime() < 60_000) return json({ error: "wait_a_minute" }, 429);
      if (action === "request") {
        const email = String(body.email ?? "").trim().toLowerCase();
        if (!EMAIL_RE.test(email) || email === (u.user.email ?? "").toLowerCase()) return json({ error: "bad_email" }, 400);
        const phone = body.phone ? String(body.phone).replace(/[^\d+()\- ]/g, "").slice(0, 25) : null;
        await admin.from("teen_waiver_requests").update({ parent_email: email, parent_phone: phone }).eq("id", row.id);
        row = { ...row, parent_email: email, parent_phone: phone };
      }
      if (!row.parent_email) return json({ error: "bad_email" }, 400);
      const sent = await sendLink(row, prof?.first_name ?? "", false);
      await admin.from("teen_waiver_requests").update({ last_sent_at: now.toISOString(), send_count: row.send_count + 1 }).eq("id", row.id);
      row = { ...row, last_sent_at: now.toISOString() };
      return json({ ...view(row, now), email: sent });
    }

    // status — also sends a grace-period reminder to the parent every few days (no schedule needed).
    if (reminderDue(row, now)) {
      await sendLink(row, prof?.first_name ?? "", true);
      await admin.from("teen_waiver_requests").update({ last_reminder_at: now.toISOString() }).eq("id", row.id);
    }
    return json(view(row, now));
  } catch (e) {
    console.error("[teen-parent-waiver]", e);
    return json({ error: "failed" }, 500);
  }
});

function view(row: any, now: Date) {
  return {
    required: true, signed: !!row.signed_at, locked: isLocked(row, now), kind: row.kind,
    grace_until: row.grace_until, days_left: daysLeft(row.grace_until, now),
    parent_email: row.parent_email, last_sent_at: row.last_sent_at,
  };
}
