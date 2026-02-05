import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    // Check idempotency
    const { data: existingEvent } = await supabaseClient
      .from('processed_webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed", { eventId: event.id });
      return new Response(JSON.stringify({ message: "Event already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Record this event
    await supabaseClient
      .from('processed_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        details: { type: event.type }
      });

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event, supabaseClient, stripe);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event, supabaseClient, stripe);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event, supabaseClient, stripe);
        break;
      
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleSubscriptionEvent(
  event: Stripe.Event,
  supabaseClient: any,
  stripe: Stripe
) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;
  
  logStep("Processing subscription event", { 
    eventType: event.type, 
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status
  });

  // Get customer email
  const customer = await stripe.customers.retrieve(customerId);
  const email = (customer as Stripe.Customer).email;
  
  if (!email) {
    logStep("No email found for customer", { customerId });
    return;
  }

  // Get user from Supabase
  const { data: userData } = await supabaseClient.auth.admin.listUsers();
  const user = userData.users.find((u: any) => u.email === email);
  
  if (!user) {
    logStep("No user found for email", { email });
    return;
  }

  // Fetch all active subscriptions for this customer
  const allSubscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
    expand: ['data.latest_invoice', 'data.discount'],  // Expand to get full subscription data
  });

  const moduleMapping: Record<string, any> = {};
  const activeModules: string[] = [];

  for (const sub of allSubscriptions.data) {
    // Skip canceled subscriptions that are past their period end
    if (sub.status === 'canceled' && sub.current_period_end * 1000 < Date.now()) {
      continue;
    }

    // Retrieve full subscription details to ensure we have all fields including current_period_end
    const fullSub = await stripe.subscriptions.retrieve(sub.id);
    const subscriptionItem = fullSub.items.data[0];
    logStep("Full subscription retrieved in webhook", { 
      subscriptionId: fullSub.id,
      hasCurrentPeriodEnd: !!subscriptionItem?.current_period_end,
      currentPeriodEnd: subscriptionItem?.current_period_end,
      status: fullSub.status
    });

    for (const item of fullSub.items.data) {
      const productId = typeof item.price.product === 'string' 
        ? item.price.product 
        : item.price.product.id;
      
      const product = await stripe.products.retrieve(productId);
      
      // Extract sport and module
      let sport = product.metadata?.sport?.toLowerCase();
      let module = product.metadata?.module?.toLowerCase();
      
      if (!sport || !module) {
        const name = product.name.toLowerCase();
        if (name.includes('softball')) sport = 'softball';
        else if (name.includes('baseball')) sport = 'baseball';
        
        if (name.includes('hitting')) module = 'hitting';
        else if (name.includes('pitching')) module = 'pitching';
        else if (name.includes('throwing')) module = 'throwing';
      }

      if (!sport || !module) continue;

      const sportModule = `${sport}_${module}`;
      
      moduleMapping[sportModule] = {
        subscription_id: fullSub.id,
        status: fullSub.status,
        current_period_end: item.current_period_end 
          ? new Date(item.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: fullSub.cancel_at_period_end || false,
        price_id: item.price.id,
        canceled_at: fullSub.canceled_at ? new Date(fullSub.canceled_at * 1000).toISOString() : null
      };

      // Add to active modules if subscription is active or canceled but still within period
      if (fullSub.status === 'active' || 
          (fullSub.status === 'canceled' && fullSub.current_period_end * 1000 > Date.now())) {
        activeModules.push(sportModule);
      }
    }
  }

  logStep("Built module mapping", { 
    moduleCount: Object.keys(moduleMapping).length,
    activeModuleCount: activeModules.length,
    mapping: moduleMapping 
  });

  // Calculate latest end date
  const endDates = Object.values(moduleMapping)
    .map((m: any) => new Date(m.current_period_end).getTime())
    .filter(d => !isNaN(d));
  const latestEnd = endDates.length > 0 
    ? new Date(Math.max(...endDates)).toISOString() 
    : null;

  // Get all subscription IDs
  const subIds = allSubscriptions.data
    .filter((s: Stripe.Subscription) => s.status !== 'canceled' || s.current_period_end * 1000 > Date.now())
    .map((s: Stripe.Subscription) => s.id);

  // Check for pending cancellations
  const hasPendingCancellations = Object.values(moduleMapping)
    .some((m: any) => m.cancel_at_period_end);

  // Update database
  await supabaseClient
    .from('subscriptions')
    .upsert({
      user_id: user.id,
      status: activeModules.length > 0 ? 'active' : 'inactive',
      subscribed_modules: activeModules,
      module_subscription_mapping: moduleMapping,
      has_pending_cancellations: hasPendingCancellations,
      stripe_customer_id: customerId,
      stripe_subscription_id: subIds.join(','),
      current_period_end: latestEnd
    }, {
      onConflict: 'user_id'
    });

  logStep("Database updated", { 
    userId: user.id,
    activeModules,
    hasPendingCancellations
  });
}

async function handlePaymentSuccess(
  event: Stripe.Event,
  supabaseClient: any,
  stripe: Stripe
) {
  const invoice = event.data.object as Stripe.Invoice;
  
  if (!invoice.subscription) return;
  
  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );
  
  logStep("Payment succeeded, updating subscription", { 
    subscriptionId: subscription.id 
  });
  
  // Trigger full subscription update
  await handleSubscriptionEvent(
    { ...event, data: { object: subscription } } as Stripe.Event,
    supabaseClient,
    stripe
  );
}

async function handlePaymentFailed(
  event: Stripe.Event,
  supabaseClient: any,
  stripe: Stripe
) {
  const invoice = event.data.object as Stripe.Invoice;
  
  logStep("Payment failed", { invoiceId: invoice.id });
  
  if (!invoice.subscription) return;
  
  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );
  
  // Update subscription status to reflect payment failure
  await handleSubscriptionEvent(
    { ...event, data: { object: subscription } } as Stripe.Event,
    supabaseClient,
    stripe
  );
}
