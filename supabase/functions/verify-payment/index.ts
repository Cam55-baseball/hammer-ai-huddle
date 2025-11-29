import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

// Helper to safely convert Unix timestamp to ISO string
const safeToISO = (unixTimestamp: number): string => {
  try {
    const date = new Date(unixTimestamp * 1000);
    // Validate date is not invalid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toISOString();
  } catch (error) {
    logStep("Date conversion failed, using default", { unixTimestamp, error });
    // Return a default date 30 days from now if conversion fails
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    logStep("Session ID received", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product'],
    });
    logStep("Checkout session retrieved", { 
      sessionId: session.id, 
      status: session.payment_status,
      customerId: session.customer 
    });

    // Accept both "paid" and "no_payment_required" (100% off coupons)
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    // Get the customer ID
    const customerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer?.id;

    if (!customerId) {
      throw new Error("No customer ID found in session");
    }

    // Retrieve all active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 100,
    });
    logStep("Retrieved subscriptions", { count: subscriptions.data.length });

    // Build module mapping and active modules list
    const moduleMapping: Record<string, any> = {};
    const activeModules: string[] = [];

    for (const subscription of subscriptions.data) {
      for (const item of subscription.items.data) {
        const productId = typeof item.price.product === 'string' 
          ? item.price.product 
          : item.price.product?.id;

        if (!productId) continue;

        // Fetch product to get metadata
        const product = await stripe.products.retrieve(productId);
        const sport = product.metadata?.sport || '';
        const module = product.metadata?.module || '';

        if (sport && module) {
          const key = `${sport}_${module}`;
          activeModules.push(key);

          moduleMapping[key] = {
            subscription_id: subscription.id,
            status: subscription.status,
            current_period_end: safeToISO(subscription.current_period_end),
            price_id: item.price.id,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
          };
        }
      }
    }

    logStep("Processed modules", { activeModules, moduleMapping });

    // Check if subscription has a coupon
    let couponCode = null;
    let couponName = null;
    let discountPercent = null;

    if (subscriptions.data.length > 0 && subscriptions.data[0].discount) {
      const discount = subscriptions.data[0].discount;
      if (discount.coupon) {
        couponCode = discount.coupon.id;
        couponName = discount.coupon.name || discount.coupon.id;
        discountPercent = discount.coupon.percent_off || null;
      }
    }

    // Update the subscriptions table using service role key
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: existingSub, error: fetchError } = await supabaseService
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw new Error(`Failed to fetch subscription: ${fetchError.message}`);
    }

    const updateData = {
      plan: activeModules.length > 0 ? "premium" : "free",
      status: "active",
      subscribed_modules: activeModules,
      module_subscription_mapping: moduleMapping,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptions.data[0]?.id || null,
      current_period_end: subscriptions.data[0] 
        ? safeToISO(subscriptions.data[0].current_period_end)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      has_pending_cancellations: Object.values(moduleMapping).some((m: any) => m.cancel_at_period_end),
      coupon_code: couponCode,
      coupon_name: couponName,
      discount_percent: discountPercent,
      updated_at: new Date().toISOString(),
    };

    let updateError;
    if (existingSub) {
      const { error } = await supabaseService
        .from("subscriptions")
        .update(updateData)
        .eq("user_id", user.id);
      updateError = error;
    } else {
      const { error } = await supabaseService
        .from("subscriptions")
        .insert({ ...updateData, user_id: user.id });
      updateError = error;
    }

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    logStep("Subscription updated successfully", { activeModules });

    return new Response(JSON.stringify({
      success: true,
      modules: activeModules,
      coupon: couponCode ? { code: couponCode, name: couponName, discount: discountPercent } : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
