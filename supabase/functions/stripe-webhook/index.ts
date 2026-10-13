import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { resolveUserId, syncCustomer } from "../_shared/stripeSubscriptionSync.ts";
import { applyStaffSubscription } from "../_shared/staffPlans.ts";
import { sponsorshipFromStripe, refreshSponsoredAccess, notifyPlayer } from "../_shared/sponsorship.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  let claimedEventId: string | null = null;
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe signature found");

    const body = await req.text();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify webhook signature (async)
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Atomic idempotency claim — single insert with on-conflict-do-nothing
    // against UNIQUE(stripe_event_id). Eliminates the read-then-write race
    // where two concurrent webhook deliveries could both observe "not seen"
    // and both proceed. The row IS the claim.
    const { data: claimed, error: claimErr } = await supabaseClient
      .from('processed_webhook_events')
      .upsert(
        {
          stripe_event_id: event.id,
          event_type: event.type,
          details: { type: event.type },
        },
        { onConflict: 'stripe_event_id', ignoreDuplicates: true }
      )
      .select('id');

    if (claimErr) {
      logStep("Idempotency claim failed", { error: claimErr.message });
      throw claimErr;
    }

    // ignoreDuplicates returns an empty array when the conflict was hit —
    // meaning another delivery already owns this event_id. Exit clean.
    if (!claimed || claimed.length === 0) {
      logStep("Event already processed (atomic dedupe)", { eventId: event.id });
      return new Response(JSON.stringify({ message: "Event already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    claimedEventId = event.id;
    let outcome: SyncOutcome = undefined;

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        outcome = await handleSubscriptionEvent(event, supabaseClient, stripe);
        break;

      case 'checkout.session.completed':
        outcome = await handleCheckoutCompleted(event, supabaseClient, stripe);
        break;

      case 'invoice.payment_succeeded':
        outcome = await handlePaymentSuccess(event, supabaseClient, stripe);
        break;

      case 'invoice.payment_failed':
        outcome = await handlePaymentFailed(event, supabaseClient, stripe);
        break;

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    if (outcome && outcome.unmatched) {
      const details = { type: event.type, unmatched: true, customer_id: outcome.customer_id ?? null, reason: outcome.reason ?? null };
      console.error(`[WEBHOOK] UNMATCHED subscription event - ${JSON.stringify({ eventId: event.id, ...details })}`);
      await supabaseClient.from('processed_webhook_events').update({ details }).eq('stripe_event_id', event.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { error: errorMessage });
    // Release the idempotency claim so Stripe's automatic retry reprocesses this event.
    if (claimedEventId) {
      try {
        await supabaseClient.from('processed_webhook_events').delete().eq('stripe_event_id', claimedEventId);
        logStep("Released idempotency claim for retry", { eventId: claimedEventId });
      } catch (relErr) {
        logStep("Failed to release idempotency claim", { error: String(relErr) });
      }
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

type SyncOutcome = { unmatched?: true; customer_id?: string; reason?: string } | void;

async function handleSubscriptionEvent(
  event: Stripe.Event,
  supabaseClient: any,
  stripe: Stripe,
  session?: Stripe.Checkout.Session | null
): Promise<SyncOutcome> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  logStep("Processing subscription event", {
    eventType: event.type,
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status
  });

  // v3.1 Phase 11: a sponsorship subscription updates the sponsored player's access instantly.
  const sponsorshipId = (subscription as any).metadata?.sponsorship_id;
  if (sponsorshipId) {
    await applySponsorshipEvent(supabaseClient, stripe, subscription, customerId, sponsorshipId);
    return;
  }

  const resolved = await resolveUserId({ supabase: supabaseClient, stripe, customerId, subscription, session });
  if (!resolved.userId) {
    return { unmatched: true, customer_id: customerId, reason: resolved.reason ?? "unresolved" };
  }
  logStep("User resolved", { userId: resolved.userId, via: resolved.via });

  await syncCustomer({ supabase: supabaseClient, stripe, customerId, userId: resolved.userId, log: logStep });
  // Plan 4 D: Coach/Organization plans switch on and off from the same event.
  if (await applyStaffSubscription(supabaseClient, resolved.userId, customerId, subscription)) {
    logStep("Staff plan updated", { userId: resolved.userId, status: subscription.status });
  }
}

async function handleCheckoutCompleted(
  event: Stripe.Event,
  supabaseClient: any,
  stripe: Stripe
): Promise<SyncOutcome> {
  const session = event.data.object as Stripe.Checkout.Session;
  logStep("Checkout completed", { sessionId: session.id, customer: session.customer });

  // PHASE 12 — One-off build purchase (program / bundle / consultation).
  if (session.metadata?.build_id) {
    await handleBuildPurchase(session, supabaseClient);
    return;
  }

  if (!session.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  return await handleSubscriptionEvent(
    { ...event, data: { object: subscription } } as Stripe.Event,
    supabaseClient,
    stripe,
    session
  );
}

// PHASE 12 — Persist a one-off build purchase. The `purchases` table has
// stripe_session_id UNIQUE, so re-deliveries are naturally idempotent.
async function handleBuildPurchase(
  session: Stripe.Checkout.Session,
  supabaseClient: any
) {
  const buildId = session.metadata?.build_id ?? "";
  const buildType = session.metadata?.build_type ?? "";
  const userId = session.metadata?.user_id ?? null;
  const email =
    session.customer_details?.email ?? session.customer_email ?? "";
  // Best-effort name from Stripe's expandable line items, if Stripe ever
  // populates it on the session payload; otherwise the success page falls
  // back to a generic "Build {type}" label.
  const lineItem = (session as any).line_items_data?.[0];
  const name = lineItem?.description ?? null;

  if (!buildId || !buildType || !email) {
    logStep("Build purchase missing required fields", {
      hasBuildId: !!buildId,
      hasBuildType: !!buildType,
      hasEmail: !!email,
    });
    return;
  }

  const { error } = await supabaseClient.from("purchases").insert({
    stripe_session_id: session.id,
    build_id: buildId,
    build_type: buildType,
    build_name: name,
    buyer_email: email,
    buyer_user_id: userId,
    amount_cents: session.amount_total ?? null,
    currency: session.currency ?? "usd",
  });

  if (error) {
    // Duplicate (re-delivery) is expected and safe to ignore.
    if (error.code === "23505" || error.message?.includes("duplicate")) {
      logStep("Purchase already recorded (duplicate)", { sessionId: session.id });
    } else {
      logStep("Purchase insert failed", { message: error.message });
    }
  } else {
    logStep("Build purchase recorded", { buildId, buildType, sessionId: session.id });
  }

  // PHASE 13 — Grant access (idempotent on user_id + build_id).
  // Signed-in checkout carries user_id in metadata. Guest checkout resolves the
  // buyer by the email Stripe collected; if no account exists yet the purchase
  // row stands on its own and is claimed at signup via claim_build_purchases().
  let resolvedUserId: string | null = userId;
  if (!resolvedUserId) {
    try {
      for (let page = 1; page <= 20 && !resolvedUserId; page++) {
        const { data: list, error: listErr } = await supabaseClient.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (listErr || !list?.users?.length) break;
        resolvedUserId =
          list.users.find(
            (u: any) => (u.email ?? "").toLowerCase() === email.toLowerCase()
          )?.id ?? null;
        if (list.users.length < 200) break;
      }
      if (resolvedUserId) {
        await supabaseClient
          .from("purchases")
          .update({ buyer_user_id: resolvedUserId })
          .eq("stripe_session_id", session.id);
      }
    } catch (lookupErr) {
      logStep("Guest buyer lookup failed (non-fatal)", { error: String(lookupErr) });
    }
  }

  if (resolvedUserId) {
    const { error: accessErr } = await supabaseClient
      .from("user_build_access")
      .insert({ user_id: resolvedUserId, build_id: buildId, build_type: buildType });

    if (accessErr) {
      if (accessErr.code === "23505" || accessErr.message?.includes("duplicate")) {
        logStep("Access already granted (duplicate)", { userId: resolvedUserId, buildId });
      } else {
        logStep("Access grant failed", { message: accessErr.message });
      }
    } else {
      logStep("Build access granted", { userId: resolvedUserId, buildId, buildType });
    }
  } else {
    logStep("Deferred grant — no account for buyer email yet", { sessionId: session.id });
  }

  // Count the discount redemption, if one was applied at checkout.
  const discountCode = session.metadata?.discount_code;
  if (discountCode) {
    try {
      const { data: code } = await supabaseClient
        .from("bundle_discount_codes")
        .select("id, redeemed_count")
        .ilike("code", discountCode)
        .maybeSingle();
      if (code) {
        await supabaseClient
          .from("bundle_discount_codes")
          .update({ redeemed_count: (code.redeemed_count ?? 0) + 1 })
          .eq("id", code.id);
      }
    } catch (codeErr) {
      logStep("Discount redemption count failed (non-fatal)", { error: String(codeErr) });
    }
  }
}


async function handlePaymentSuccess(
  event: Stripe.Event,
  supabaseClient: any,
  stripe: Stripe
): Promise<SyncOutcome> {
  const invoice = event.data.object as Stripe.Invoice;
  const invoiceSubId = invoiceSubscriptionId(invoice);
  
  if (!invoiceSubId) return;
  
  const subscription = await stripe.subscriptions.retrieve(
    invoiceSubId
  );
  
  logStep("Payment succeeded, updating subscription", { 
    subscriptionId: subscription.id 
  });
  
  // Trigger full subscription update
  return await handleSubscriptionEvent(
    { ...event, data: { object: subscription } } as Stripe.Event,
    supabaseClient,
    stripe
  );
}

async function handlePaymentFailed(
  event: Stripe.Event,
  supabaseClient: any,
  stripe: Stripe
): Promise<SyncOutcome> {
  const invoice = event.data.object as Stripe.Invoice;
  const invoiceSubId = invoiceSubscriptionId(invoice);
  
  logStep("Payment failed", { invoiceId: invoice.id });
  
  if (!invoiceSubId) return;
  
  const subscription = await stripe.subscriptions.retrieve(
    invoiceSubId
  );
  
  // Update subscription status to reflect payment failure
  return await handleSubscriptionEvent(
    { ...event, data: { object: subscription } } as Stripe.Event,
    supabaseClient,
    stripe
  );
}

// Newer Stripe API versions moved invoice.subscription to
// invoice.parent.subscription_details.subscription.
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const a = (invoice as any).subscription;
  const b = (invoice as any).parent?.subscription_details?.subscription;
  const v = a ?? b ?? null;
  if (!v) return null;
  return typeof v === "string" ? v : v.id ?? null;
}

async function applySponsorshipEvent(supabase: any, stripe: Stripe, sub: Stripe.Subscription, customerId: string, sponsorshipId: string) {
  const { data: s } = await supabase.from("org_sponsorships").select("*").eq("id", sponsorshipId).maybeSingle();
  if (!s) { logStep("Sponsorship not found", { sponsorshipId }); return; }
  const patch: Record<string, unknown> = { ...sponsorshipFromStripe(sub, s), stripe_customer_id: customerId, stripe_subscription_id: sub.id, updated_at: new Date().toISOString() };
  const firstStart = s.status === "pending" && ["active", "trialing"].includes(sub.status);
  if (firstStart) {
    patch.billing_starts_at = new Date(((sub as any).billing_cycle_anchor ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
    // Player who already pays: their own plan stops renewing; the org's billing starts when it ends. No refunds, no double charge.
    const { data: own } = await supabase.from("subscriptions").select("module_subscription_mapping").eq("user_id", s.player_id).maybeSingle();
    const ids = new Set<string>();
    for (const e of Object.values<any>(own?.module_subscription_mapping ?? {})) {
      const sid = String(e?.subscription_id ?? "");
      if (sid.startsWith("sub_") && !e.cancel_at_period_end) ids.add(sid);
    }
    for (const id of ids) {
      try { await stripe.subscriptions.update(id, { cancel_at_period_end: true, metadata: { ended_for_sponsorship: sponsorshipId } }); }
      catch (e) { logStep("Could not set player's own plan to end", { id, error: String(e) }); }
    }
    if (patch.status === "active" && s.player_own_sub_ends_at && new Date(s.player_own_sub_ends_at).getTime() > Date.now()) patch.status = "scheduled";
  }
  await supabase.from("org_sponsorships").update(patch).eq("id", sponsorshipId);
  await refreshSponsoredAccess(supabase, s.player_id);
  if (firstStart) {
    const ownMsg = s.player_own_sub_ends_at
      ? ` Your own plan won't renew: it ends on ${String(s.player_own_sub_ends_at).slice(0, 10)}, and your organization pays from then. You won't be charged twice.`
      : "";
    await notifyPlayer(supabase, s.player_id, s.sponsored_by, `Your organization is now sponsoring your plan.${ownMsg}`);
  }
  logStep("Sponsorship updated", { sponsorshipId, status: patch.status });
}
