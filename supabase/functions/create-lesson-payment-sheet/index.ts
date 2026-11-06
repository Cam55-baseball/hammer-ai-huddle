// Owner-approved Nov 6: native iPhone Apple Pay / card sheet (Stripe PaymentSheet) for Hammers Online ×4.
// Real-time one-to-one lessons may use other payment methods (App Review Guideline 3.1.3(d)).
import Stripe from "npm:stripe@18.5.0";
import { z } from "npm:zod@3.23.8";
import { corsHeaders, json, admin, requireUser, PRODUCTS } from "../_shared/addons/server.ts";
import { checkBuy } from "../_shared/addons/buyCheck.ts";

const Body = z.object({ athleteId: z.string().uuid().optional() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const me = await requireUser(req);
    if (!me) return json({ error: "Not signed in" }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const athleteId = parsed.data.athleteId ?? me.user.id;
    const db = admin();
    const gate = await checkBuy(db, me.user.id, athleteId, "online_lessons");
    if (!gate.ok) return json({ error: gate.error }, 409);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const email = me.user.email ?? undefined;
    const found = email ? await stripe.customers.list({ email, limit: 1 }) : { data: [] as any[] };
    const customer = found.data[0] ?? (await stripe.customers.create({ email }));
    const ephemeralKey = await stripe.ephemeralKeys.create({ customer: customer.id }, { apiVersion: "2025-08-27.basil" });
    const intent = await stripe.paymentIntents.create({
      amount: PRODUCTS.online_lessons.priceCents,
      currency: "usd",
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      description: PRODUCTS.online_lessons.name,
      metadata: { addon_product: "online_lessons", athlete_id: athleteId, payer_id: me.user.id, price_id: PRODUCTS.online_lessons.stripePriceId },
    });
    return json({
      paymentIntentId: intent.id,
      paymentIntentClientSecret: intent.client_secret,
      customerId: customer.id,
      customerEphemeralKeySecret: ephemeralKey.secret,
      publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY") ?? null,
    });
  } catch (e) {
    console.error("create-lesson-payment-sheet", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
