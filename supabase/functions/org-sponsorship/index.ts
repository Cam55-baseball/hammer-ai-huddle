// v3.1 Phase 11 — an organization admin sponsors, pauses, resumes or cancels a player's plan.
// Body: { action: "sponsor", organization_id, player_id, sport, tier }
//     | { action: "pause" | "resume" | "cancel", sponsorship_id }
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { SPONSOR_PRICES, graceUntil, notifyPlayer, refreshSponsoredAccess } from "../_shared/sponsorship.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const PLAN_NAMES: Record<string, string> = { pitcher: "Complete Pitcher", "5tool": "5Tool Player", golden2way: "The Golden 2Way" };
const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    const user = u.user;
    if (!user?.email) return json({ error: "Please sign in first." }, 401);
    const body = await req.json().catch(() => ({}));
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    if (body.action === "sponsor") {
      const { organization_id, player_id, sport, tier } = body;
      if (!UUID.test(organization_id ?? "") || !UUID.test(player_id ?? "")) return json({ error: "Pick a player." }, 400);
      const price = SPONSOR_PRICES[tier]?.[sport];
      if (!price) return json({ error: "Pick a plan and sport." }, 400);
      const { data: isAdmin } = await admin.rpc("is_org_admin", { _org: organization_id, _user: user.id });
      if (!isAdmin) return json({ error: "Only an admin of this organization can sponsor players." }, 403);
      const { data: member } = await admin.from("organization_members").select("id").eq("organization_id", organization_id)
        .eq("user_id", player_id).eq("role_in_org", "player").eq("status", "active").is("removed_at", null).maybeSingle();
      if (!member) return json({ error: "This player isn't in your organization." }, 403);
      const { data: live } = await admin.from("org_sponsorships").select("id").eq("player_id", player_id)
        .in("status", ["pending", "scheduled", "active", "paused"]).maybeSingle();
      if (live) return json({ error: "This player is already sponsored." }, 409);
      const { data: prof } = await admin.from("profiles").select("full_name").eq("id", player_id).maybeSingle();
      const playerName = prof?.full_name || "Player";

      // Player who already pays: their own plan ends at the end of the paid period; org billing starts then.
      const { data: own } = await admin.from("subscriptions").select("module_subscription_mapping").eq("user_id", player_id).maybeSingle();
      const ownSubs = new Map<string, number>();
      for (const e of Object.values<any>(own?.module_subscription_mapping ?? {})) {
        const sid = String(e?.subscription_id ?? "");
        if (sid.startsWith("sub_") && ["active", "trialing", "past_due"].includes(e.status) && e.current_period_end) {
          ownSubs.set(sid, Math.max(ownSubs.get(sid) ?? 0, new Date(e.current_period_end).getTime()));
        }
      }
      const ownEnd = ownSubs.size ? Math.max(...ownSubs.values()) : 0;

      const { data: sp, error: insErr } = await admin.from("org_sponsorships").insert({
        organization_id, player_id, sponsored_by: user.id, sport, tier, status: "pending",
        player_own_sub_ends_at: ownEnd ? new Date(ownEnd).toISOString() : null,
      }).select("id").single();
      if (insErr) return json({ error: "Could not start the sponsorship." }, 500);

      const found = await stripe.customers.list({ email: user.email, limit: 1 });
      const customerId = found.data[0]?.id;
      const meta = { sponsorship_id: sp.id, sponsored_player_id: player_id, organization_id, user_id: user.id };
      const raw = req.headers.get("origin") || "";
      const origin = /^https?:\/\//i.test(raw) ? raw : "https://hammersmodality.org";
      const subData: Record<string, unknown> = { metadata: meta, description: `Sponsorship — ${playerName} (${PLAN_NAMES[tier]}, ${sport})` };
      if (ownEnd > Date.now() + 60_000) {
        // No charge until the player's paid period ends.
        subData.billing_cycle_anchor = Math.floor(ownEnd / 1000);
        subData.proration_behavior = "none";
      }
      const session = await stripe.checkout.sessions.create({
        customer: customerId, customer_email: customerId ? undefined : user.email, client_reference_id: user.id,
        mode: "subscription", line_items: [{ price, quantity: 1 }], allow_promotion_codes: true,
        payment_method_collection: "if_required", metadata: meta, subscription_data: subData as any,
        success_url: `${origin}/organization?sponsor=success`, cancel_url: `${origin}/organization?sponsor=cancel`,
      });
      return json({ url: session.url, sponsorship_id: sp.id, starts_after_own_plan: ownEnd > Date.now() });
    }

    if (["pause", "resume", "cancel"].includes(body.action)) {
      if (!UUID.test(body.sponsorship_id ?? "")) return json({ error: "Pick a sponsorship." }, 400);
      const { data: s } = await admin.from("org_sponsorships").select("*").eq("id", body.sponsorship_id).maybeSingle();
      if (!s) return json({ error: "Sponsorship not found." }, 404);
      const { data: isAdmin } = await admin.rpc("is_org_admin", { _org: s.organization_id, _user: user.id });
      if (!isAdmin) return json({ error: "Only an admin of this organization can change this sponsorship." }, 403);
      if (!s.stripe_subscription_id) return json({ error: "This sponsorship hasn't been paid for yet." }, 409);
      const now = new Date().toISOString();
      let patch: Record<string, unknown>; let msg: string;
      if (body.action === "pause") {
        if (s.status === "paused") return json({ ok: true });
        await stripe.subscriptions.update(s.stripe_subscription_id, { pause_collection: { behavior: "void" } });
        patch = { status: "paused", paid_through: s.current_period_end };
        msg = `Your organization paused its sponsorship of your plan. You keep full access until ${String(s.current_period_end ?? "").slice(0, 10) || "the end of the paid period"}. After that you can pay for your plan yourself, or wait for your organization to resume.`;
      } else if (body.action === "resume") {
        await stripe.subscriptions.update(s.stripe_subscription_id, { pause_collection: "" as any });
        patch = { status: "active", paid_through: null };
        msg = "Your organization resumed sponsoring your plan. Your access is back on.";
      } else {
        await stripe.subscriptions.cancel(s.stripe_subscription_id);
        patch = { status: "canceled", grace_until: graceUntil() };
        msg = "Your organization ended its sponsorship of your plan. You keep full access for 14 days. To keep going after that, choose your own plan on the Pricing page — all your history stays.";
      }
      await admin.from("org_sponsorships").update({ ...patch, updated_at: now }).eq("id", s.id);
      await refreshSponsoredAccess(admin, s.player_id);
      await notifyPlayer(admin, s.player_id, user.id, msg);
      return json({ ok: true });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    console.error("[org-sponsorship]", e instanceof Error ? e.message : e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
