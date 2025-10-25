import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Simple in-memory cache to reduce Stripe API calls
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const getCached = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
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
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is owner - bypass Stripe entirely
    const { data: ownerRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle();

    if (ownerRole) {
      const allModules = ['hitting', 'pitching', 'throwing'];
      logStep("Owner detected - granting full access", { userId: user.id });
      
      await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'active',
          subscribed_modules: allModules,
          stripe_customer_id: null,
          stripe_subscription_id: null
        }, {
          onConflict: 'user_id'
        });

      return new Response(JSON.stringify({
        subscribed: true,
        modules: allModules,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if user is admin - bypass Stripe entirely
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminRole) {
      const allModules = ['hitting', 'pitching', 'throwing'];
      logStep("Admin detected - granting full access", { userId: user.id });
      
      await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'active',
          subscribed_modules: allModules,
          stripe_customer_id: null,
          stripe_subscription_id: null
        }, {
          onConflict: 'user_id'
        });

      return new Response(JSON.stringify({
        subscribed: true,
        modules: allModules,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check cache first
    const cacheKey = `customer:${user.email}`;
    let customers = getCached(cacheKey);
    
    if (!customers) {
      customers = await stripe.customers.list({ email: user.email, limit: 1 });
      cache.set(cacheKey, { data: customers, timestamp: Date.now() });
    }
    
    if (customers.data.length === 0) {
      logStep("No customer found, upserting unsubscribed state");
      
      // UPSERT subscription record (insert or update)
      await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'inactive',
          subscribed_modules: [],
          stripe_customer_id: null,
          stripe_subscription_id: null
        }, {
          onConflict: 'user_id'
        });

      return new Response(JSON.stringify({ 
        subscribed: false,
        modules: [],
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
      expand: ['data.items.data.price.product']
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscribedModules: string[] = [];
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Extract modules from line items metadata (using expanded data)
      for (const item of subscription.items.data) {
        const product = item.price.product;
        if (typeof product === 'object' && product.metadata?.module) {
          subscribedModules.push(product.metadata.module);
        }
      }
      logStep("Determined subscribed modules", { subscribedModules });

      // UPSERT subscription record in database
      await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'active',
          subscribed_modules: subscribedModules,
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscriptionId,
          current_period_end: subscriptionEnd
        }, {
          onConflict: 'user_id'
        });
    } else {
      logStep("No active subscription found");
      
      // UPSERT subscription record
      await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'inactive',
          subscribed_modules: [],
          stripe_customer_id: customerId,
          stripe_subscription_id: null
        }, {
          onConflict: 'user_id'
        });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      modules: subscribedModules,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
