/**
 * injury-full-go — the healed / full go step (owner Oct 31, Fix 7).
 * Player (signed in): clear {area, origin}
 *   18+  → the EXISTING active entries for that area are marked healed (no new row).
 *   <18  → a one-time link is emailed to the parent; nothing is cleared yet.
 * Parent (link):      view {token} | confirm {token}
 *   The link holder sees only the player's first name and the area name.
 * Rebuilding the week stays with the player's own signed-in plan path.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { EMAIL_FROM, EMAIL_REPLY_TO } from "../_shared/email.ts";
import { activeInjuryAreas, isActiveInjuryEntry, markAreaHealed, pendingFullGoRequest } from "../_shared/health/fullGo.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const LIVE = "https://hammersmodality.org";
const TEST_ORIGINS = ["https://id-preview--cefbf3ce-1234-420d-b93f-77c839c5731b.lovable.app", "http://localhost:8080"];
const OWNER_INBOX = "hammersmodality@hammersmodality.org";
const LINK_DAYS = 7;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function ageYears(dob: string | null, now: Date): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}/.test(dob)) return null;
  const [y, m, d] = dob.slice(0, 10).split("-").map(Number);
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) age--;
  return age;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const now = new Date();
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    // ---------- parent (link) ----------
    if (action === "view" || action === "confirm") {
      const token = String(body.token ?? "");
      if (token.length < 40) return json({ state: "unknown" });
      const hash = await sha256(token);
      const { data: rows, error } = await admin.from("athlete_context").select("user_id, injury_history")
        .contains("injury_history", [{ full_go_request: { token_hash: hash } }]).limit(2);
      if (error) throw error;
      if (!rows || rows.length !== 1) return json({ state: "unknown" });
      const row = rows[0] as { user_id: string; injury_history: unknown[] };
      const entry = (row.injury_history ?? []).find((e: any) => e?.full_go_request?.token_hash === hash) as any;
      if (!entry || !isActiveInjuryEntry(entry)) return json({ state: "already_done" });
      if (!entry.full_go_request.expires_at || new Date(entry.full_go_request.expires_at) < now) return json({ state: "expired" });
      const area = String(entry.region);
      const { data: p } = await admin.from("profiles").select("first_name").eq("id", row.user_id).maybeSingle();
      if (action === "view") return json({ state: "ok", area, first_name: p?.first_name ?? null });
      const { next, changed } = markAreaHealed(row.injury_history, area, "parent", now.toISOString(), true);
      if (!changed) return json({ state: "already_done" });
      const up = await admin.from("athlete_context").update({ injury_history: next }).eq("user_id", row.user_id).select("user_id").single();
      if (up.error) throw up.error;
      return json({ state: "confirmed", area, first_name: p?.first_name ?? null });
    }

    // ---------- player (signed in) ----------
    if (action !== "clear") return json({ error: "unknown_action" }, 400);
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await admin.auth.getUser(jwt);
    const uid = auth?.user?.id;
    if (!uid) return json({ error: "Sign in again. Nothing was changed." }, 401);
    const area = String(body.area ?? "").trim().toLowerCase();
    const [{ data: ctx, error: ctxErr }, { data: prof, error: profErr }] = await Promise.all([
      admin.from("athlete_context").select("injury_history").eq("user_id", uid).maybeSingle(),
      admin.from("profiles").select("first_name, date_of_birth").eq("id", uid).maybeSingle(),
    ]);
    if (ctxErr || profErr) throw ctxErr ?? profErr;
    const history = ctx?.injury_history;
    if (!activeInjuryAreas(history).includes(area)) return json({ status: "not_active" });
    const age = ageYears(prof?.date_of_birth ?? null, now);
    if (age !== null && age >= 18) {
      const { next, changed } = markAreaHealed(history, area, "self", now.toISOString());
      const up = await admin.from("athlete_context").update({ injury_history: next }).eq("user_id", uid).select("injury_history").single();
      if (up.error) throw up.error;
      if (activeInjuryAreas(up.data.injury_history).includes(area)) throw new Error("Could not confirm the change.");
      return json({ status: "cleared", area, changed });
    }

    // Under 18 (or unknown age): the parent confirms.
    if (pendingFullGoRequest(history, area)) return json({ status: "parent_pending", area });
    const [{ data: waiver }, { data: consent }] = await Promise.all([
      admin.from("teen_waiver_requests").select("parent_email").eq("teen_user_id", uid).not("parent_email", "is", null).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("parent_consents").select("parent_email").eq("child_user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const parentEmail = waiver?.parent_email ?? consent?.parent_email ?? null;
    if (!parentEmail) return json({ status: "no_parent", area });
    const isTest = TEST_ORIGINS.includes(String(body.origin ?? ""));
    const origin = isTest ? TEST_ORIGINS[0] : LIVE;
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const request = { token_hash: await sha256(token), requested_at: now.toISOString(), expires_at: new Date(now.getTime() + LINK_DAYS * 86_400_000).toISOString() };
    const next = (history as unknown[]).map((e) => isActiveInjuryEntry(e, area) ? { ...(e as object), full_go_request: request } : e);
    const up = await admin.from("athlete_context").update({ injury_history: next }).eq("user_id", uid).select("user_id").single();
    if (up.error) throw up.error;
    const key = Deno.env.get("RESEND_API_KEY");
    const link = `${origin}/parent-full-go/${token}`;
    let email = "no_key";
    if (key) {
      const who = esc(prof?.first_name || "Your player");
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: EMAIL_FROM, reply_to: EMAIL_REPLY_TO, to: [isTest ? OWNER_INBOX : parentEmail],
          subject: (isTest ? "[TEST] " : "") + `${prof?.first_name || "Your player"} says their ${area} is healed`,
          html: `<p>Hi,</p><p>${who} told Hammers Modality their ${esc(area)} is healed and they are full go.</p><p>Because they are under 18, a parent or guardian confirms this before their ${esc(area)} limits are removed.</p><p><a href="${link}">Review and confirm</a></p><p>This link works for ${LINK_DAYS} days. If you are not sure, don't confirm. Nothing changes until you do.</p><p>Hammers Modality LLC · 15985 Preserve Marketplace #1154, Odessa, FL 33556</p>`,
        }),
      });
      email = r.ok ? "sent" : "failed";
      if (!r.ok) console.error("[injury-full-go] resend", r.status, (await r.text()).slice(0, 200));
    }
    return json({ status: "parent_requested", area, email, ...(isTest ? { test_link: link } : {}) });
  } catch (e) {
    console.error("[injury-full-go]", e);
    return json({ error: "Couldn't save that. Nothing was changed. Try again." }, 500);
  }
});
