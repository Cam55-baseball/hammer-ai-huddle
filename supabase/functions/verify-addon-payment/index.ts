// Owner-approved Nov 6: confirms a Stripe add-on payment, records it once, and delivers it
// (early recap → shared recap generator; lessons → booking). Also: status + retry_delivery.
import Stripe from "npm:stripe@18.5.0";
import { z } from "npm:zod@3.23.8";
import {
  corsHeaders, json, admin, requireUser, purchaseStore, deliverEarlyRecap, generatorAs, openLessonBooking,
  athleteFacts, hasActivePlan, recapAnchor, boughtBlocks, notify, ownerIds,
} from "../_shared/addons/server.ts";
import { recordPurchaseOnce } from "../_shared/addons/apple.ts";
import { earlyRecapEligibility, purchaseGate } from "../_shared/addons/rules.ts";

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
      const recap = earlyRecapEligibility({ hasActivePlan: await hasActivePlan(db, uid), anchor: await recapAnchor(db, uid), now: new Date(), boughtBlockStarts: await boughtBlocks(db, uid) });
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
    const product = md.addon_product as "early_recap" | "online_lessons";
    if (!["early_recap", "online_lessons"].includes(product) || md.payer_id !== uid) return json({ error: "not_your_payment" }, 403);

    const rec = await recordPurchaseOnce(purchaseStore(db), {
      user_id: md.athlete_id, payer_user_id: uid, product, channel: "stripe",
      external_id: `stripe:${pi.id}`, amount_cents: pi.amount_received ?? pi.amount, block_start: md.block_start || null,
    });
    if (rec.status === "block_already_bought") {
      await notify(db, await ownerIds(db), "Early recap paid twice for one block", `Payment ${pi.id} needs owner review.`, "/owner");
      return json({ error: "already_bought" }, 409);
    }
    if (md.athlete_id !== uid) {
      await db.from("addon_parent_requests").update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("athlete_user_id", md.athlete_id).eq("parent_user_id", uid).eq("product", product).eq("status", "pending");
    }
    if (product === "online_lessons") {
      const bookingId = await openLessonBooking(db, rec.purchase as any);
      return json({ ok: true, product, bookingId });
    }
    if (md.athlete_id === uid) await deliverEarlyRecap(db, rec.purchase as any, generatorAs(me.auth));
    else await notify(db, [md.athlete_id], "Early recap paid", "Your parent bought your Early 6-Week Recap. Open the app to see it.", "/dashboard");
    return json({ ok: true, product });
  } catch (e) {
    console.error("verify-addon-payment", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
