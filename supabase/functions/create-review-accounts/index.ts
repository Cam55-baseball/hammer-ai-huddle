// Owner-only: creates/refreshes the two Apple App Review demo accounts (allowlist
// below, never any other account). Both are system accounts: hidden from scouts,
// rankings, search and analytics, and opted out of the anonymous training store.
// Passwords are generated here and emailed ONLY to the owner inbox; they are
// never returned in the response or written to the database in plain text.
// Body: {} → create/refresh both, rotate passwords, email the owner.
//       { session: "adult" | "child" } → one-time session for the owner to check it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const OWNER_INBOX = "hammersmodality@hammersmodality.org";
const MODULES = ["baseball_hitting", "baseball_pitching", "baseball_throwing"];

const ACCOUNTS = {
  adult: { email: "hammersmodality+applereview@gmail.com", name: "TEST Apple Review Player", first: "TEST", last: "Reviewer", dob: "1995-03-15", child: false },
  child: { email: "hammersmodality+applereview12@gmail.com", name: "TEST Apple Review Child (12)", first: "TEST", last: "Child", dob: "2014-06-01", child: true },
} as const;

function password() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(b, (x) => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x % 55]).join("") + "-7a";
}

async function findUser(admin: any, email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const hit = data?.users?.find((x: any) => x.email === email);
    if (hit) return hit.id;
    if (!data?.users?.length || data.users.length < 1000) break;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing Authorization" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isOwner } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "owner" });
    if (!isOwner) return json({ error: "Owner only" }, 403);
    const body = await req.json().catch(() => ({}));

    if (body?.session === "adult" || body?.session === "child") {
      const a = ACCOUNTS[body.session as "adult" | "child"];
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: a.email });
      if (error) return json({ error: error.message }, 500);
      const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
      const { data: v, error: ve } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: data.properties.hashed_token });
      if (ve || !v.session) return json({ error: ve?.message ?? "session failed" }, 500);
      return json({ email: a.email, access_token: v.session.access_token, refresh_token: v.session.refresh_token, expires_at: v.session.expires_at, token_type: "bearer", user: v.session.user });
    }

    const out: Record<string, { user_id: string; email: string }> = {};
    const creds: string[] = [];
    const now = new Date().toISOString();
    const yearOut = new Date(Date.now() + 365 * 86400000).toISOString();
    for (const [key, a] of Object.entries(ACCOUNTS)) {
      const pw = password();
      let id = await findUser(admin, a.email);
      if (!id) {
        const { data, error } = await admin.auth.admin.createUser({
          email: a.email, password: pw, email_confirm: true,
          user_metadata: { full_name: a.name, test_account: true, apple_review: true },
        });
        if (error) return json({ error: error.message }, 500);
        id = data.user!.id;
      } else {
        const { data: prof } = await admin.from("profiles").select("is_system_account").eq("id", id).maybeSingle();
        const { data: au } = await admin.auth.admin.getUserById(id);
        if (prof?.is_system_account !== true && au?.user?.user_metadata?.apple_review !== true) return json({ error: `Refusing: ${key} exists and is not a system account` }, 409);
        const { error } = await admin.auth.admin.updateUserById(id, { password: pw });
        if (error) return json({ error: error.message }, 500);
      }
      const errs: string[] = [];
      const pr = await admin.from("profiles").update({
        full_name: a.name, first_name: a.first, last_name: a.last, date_of_birth: a.dob,
        is_system_account: true, anon_training_opt_out: true, account_paused_at: null, paused_reason: null,
        parent_controlled: a.child, parent_consent_ok: a.child,
        hammers_today_started_at: now, position: "SS", positions: ["SS"],
        primary_throwing_hand: "R", primary_batting_side: "R", tutorial_completed: true,
      }).eq("id", id);
      if (pr.error) errs.push("profile: " + pr.error.message);
      await admin.from("athlete_mpi_settings").upsert({
        user_id: id, sport: "baseball", date_of_birth: a.dob, primary_position: "SS",
        primary_throwing_hand: "R", primary_batting_side: "R", league_tier: "rec", season_status: "off_season",
        season_status_manual: false, admin_ranking_excluded: true, ranking_eligible: false,
      }, { onConflict: "user_id" });
      const { data: sub } = await admin.from("subscriptions").select("id").eq("user_id", id).maybeSingle();
      const subRow = { plan: "free", status: "active", tier: "golden2way", subscribed_modules: MODULES, current_period_end: yearOut };
      if (sub) await admin.from("subscriptions").update(subRow).eq("user_id", id);
      else await admin.from("subscriptions").insert({ user_id: id, ...subRow });
      if (a.child) {
        const { data: pc } = await admin.from("parent_consents").select("id").eq("child_user_id", id).limit(1).maybeSingle();
        if (!pc) {
          const ci = await admin.from("parent_consents").insert({
            child_user_id: id, parent_full_name: "TEST Demo Parent", relationship: "parent",
            parent_birthdate: "1980-01-01", parent_is_adult: true, parent_email: "hammersmodality+applereviewparent@gmail.com",
            child_display_name: "TEST Child", typed_name: "TEST Demo Parent", signature_path: "apple-review/none",
            promise_version: 1, notice_version: 1,
            promise_text: "TEST ACCOUNT for Apple App Review — not a real parent consent.",
            payment_confirmed_at: now, training_opt_in: false,
          });
          if (ci.error) errs.push("consent: " + ci.error.message);
        }
      }
      out[key] = { user_id: id!, email: a.email, errors: errs } as any;
      creds.push(`${key === "adult" ? "Adult demo player" : "Under-13 parent-controlled demo child"}\nEmail: ${a.email}\nPassword: ${pw}`);
    }

    const resend = Deno.env.get("RESEND_API_KEY");
    let emailed = false, emailError: string | null = null;
    if (resend) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Hammers Modality <noreply@hammersmodality.org>", to: [OWNER_INBOX],
          subject: "[PRIVATE] Apple App Review demo account sign-ins",
          text: `Paste these into App Store Connect → App Review Information. Keep this email private.\nRunning the tool again replaces these passwords.\n\n${creds.join("\n\n")}\n`,
        }),
      });
      emailed = r.ok; if (!r.ok) emailError = (await r.text()).slice(0, 300);
    } else emailError = "no email key";
    return json({ accounts: out, emailed_to_owner: emailed, email_error: emailError });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
