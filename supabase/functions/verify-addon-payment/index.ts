// Owner-approved Nov 6: confirms a Stripe add-on payment, records it once, and delivers it
// (early recap → shared recap generator; lessons → booking). Also: status + retry_delivery.
// Nov 12 (build 13): saving goes through the one step stripe-webhook also uses
// (_shared/addons/stripeAddonCore.ts), and a locked recap reports when it opens (opensAt).
import Stripe from "npm:stripe@18.5.0";
import { z } from "npm:zod@3.23.8";
import {
  corsHeaders, json, admin, requireUser, deliverEarlyRecap, generatorAs,
  athleteFacts, hasActivePlan, recapAnchor, boughtBlocks,
} from "../_shared/addons/server.ts";
import { earlyRecapEligibility, purchaseGate } from "../_shared/addons/rules.ts";
import { recapOpensAt } from "../_shared/addons/recapOpens.ts";
import { recordStripeAddonPayment } from "../_shared/addons/stripeAddonCore.ts";
import { addonPaymentDeps } from "../_shared/addons/stripeAddonPayment.ts";

const Body = z.union([
  z.object({ action: z.literal("confirm"), sessionId: z.string().min(5).max(255).optional(), paymentIntentId: z.string().min(5).max(255).optional() }),
  z.object({ action: z.literal("status") }),
  z.object({ action: z.literal("retry_delivery") }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const me = await requireUser(req);
    if (!me) return json({ error: "Not signed in" }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "bad_request" }, 400);
    const db = admin();
    const uid = me.user.id;

    // Retry any undelivered early recap for this player (no new charge, ever).
    const retry = async () => {
      const { data } = await db.from("addon_purchases").select("*").eq("user_id", uid).eq("product", "early_recap").neq("delivery_status", "delivered");
      for (const p of data ?? []) await deliverEarlyRecap(db, p as any, generatorAs(me.auth));
    };

    if (parsed.data.action === "retry_delivery") { await retry(); return json({ ok: true }); }

    if (parsed.data.action === "status") {
      await retry();
      const facts = await athleteFacts(db, uid);
      const anchor = await recapAnchor(db, uid);
      const now = new Date();
      const elig = earlyRecapEligibility({ hasActivePlan: await hasActivePlan(db, uid), anchor, now, boughtBlockStarts: await boughtBlocks(db, uid) });
      const recap = !elig.ok && elig.reason === "too_early" ? { ...elig, opensAt: recapOpensAt(anchor, now) } : elig;
      const { data: purchases } = await db.from("addon_purchases").select("id, product, block_start, delivery_status, created_at").eq("user_id", uid).order("created_at", { ascending: false });
      const { data: requests } = await db.from("addon_parent_requests").select("id, product, status, created_at").eq("athlete_user_id", uid).eq("status", "pending");
      return json({ gate: purchaseGate({ under18: facts.under18, hasLinkedParent: facts.parentIds.length > 0 }), parentIds: facts.parentIds, recap, purchases: purchases ?? [], requests: requests ?? [] });
    }

    // confirm
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    let piId = parsed.data.paymentIntentId ?? null;
    if (parsed.data.sessionId) {
      const s = await stripe.checkout.sessions.retrieve(parsed.data.sessionId);
      if (s.payment_status !== "paid") return json({ error: "not_paid" }, 402);
      piId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null;
    }
    if (!piId) return json({ error: "missing_payment" }, 400);
    const pi = await stripe.paymentIntents.retrieve(piId);
    if (pi.status !== "succeeded") return json({ error: "not_paid" }, 402);
    const md = pi.metadata ?? {};
    if (!["early_recap", "online_lessons"].includes(md.addon_product) || md.payer_id !== uid) return json({ error: "not_your_payment" }, 403);

    const res = await recordStripeAddonPayment(pi as any, addonPaymentDeps(db, generatorAs(me.auth)));
    if (res.status === "not_paid") return json({ error: "not_paid" }, 402);
    if (res.status === "already_bought") return json({ error: "already_bought" }, 409);
    if (res.status !== "saved") return json({ error: "not_your_payment" }, 403);
    if (res.product === "online_lessons") return json({ ok: true, product: res.product, bookingId: res.bookingId });
    return json({ ok: true, product: res.product });
  } catch (e) {
    console.error("verify-addon-payment", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
