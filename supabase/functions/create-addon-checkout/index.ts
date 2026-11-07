// Owner-approved Nov 6: Stripe one-time Checkout (Apple Pay in Safari) for the two add-ons on the web.
import Stripe from "npm:stripe@18.5.0";
import { z } from "npm:zod@3.23.8";
import { corsHeaders, json, admin, requireUser, PRODUCTS } from "../_shared/addons/server.ts";
import { checkBuy } from "../_shared/addons/buyCheck.ts";

const Body = z.object({ product: z.enum(["early_recap", "online_lessons"]), athleteId: z.string().uuid().optional() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const me = await requireUser(req);
    if (!me) return json({ error: "Not signed in" }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { product } = parsed.data;
    const athleteId = parsed.data.athleteId ?? me.user.id;
    const db = admin();
    const gate = await checkBuy(db, me.user.id, athleteId, product);
    if (!gate.ok) return json({ error: gate.error, message: (gate as any).message }, 409);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const email = me.user.email ?? undefined;
    const customers = email ? await stripe.customers.list({ email, limit: 1 }) : { data: [] as any[] };
    const origin = req.headers.get("origin") ?? "https://hammersmodality.org";
    const metadata = { addon_product: product, athlete_id: athleteId, payer_id: me.user.id, block_start: gate.blockStart ?? "" };
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customers.data[0]?.id,
      customer_email: customers.data[0] ? undefined : email,
      line_items: [{ price: PRODUCTS[product].stripePriceId, quantity: 1 }],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/addons/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("create-addon-checkout", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
