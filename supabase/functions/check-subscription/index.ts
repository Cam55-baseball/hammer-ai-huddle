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
        subscription_end: null,
        has_discount: false,
        discount_percent: null
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
        subscription_end: null,
        has_discount: false,
        discount_percent: null
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
        subscription_end: null,
        has_discount: false,
        discount_percent: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Fetch subscriptions without deep expand to avoid 4-level limit
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscribedModules: string[] = [];
    let subscriptionEnd: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let hasDiscount = false;
    let discountPercent: number | null = null;
    let couponCode: string | null = null;
    let couponName: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      
      // Check for discount and extract coupon details
      if (subscription.discount) {
        hasDiscount = true;
        const coupon = subscription.discount.coupon;
        if (coupon.percent_off) {
          discountPercent = coupon.percent_off;
        }
        couponCode = coupon.id;
        couponName = coupon.name || coupon.id;
        logStep("Discount found", { percent: discountPercent, code: couponCode, name: couponName });
      }
      
      // Safe date conversion with validation and error handling
      try {
        if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
          subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        } else {
          logStep("Warning: Invalid or missing current_period_end", { 
            value: subscription.current_period_end,
            type: typeof subscription.current_period_end 
          });
          // Set to 30 days from now as fallback
          subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
      } catch (dateError) {
        const errorMessage = dateError instanceof Error ? dateError.message : String(dateError);
        logStep("Error converting date", { 
          error: errorMessage, 
          rawValue: subscription.current_period_end 
        });
        // Fallback: 30 days from now
        subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Extract modules from line items by fetching product metadata separately
      for (const item of subscription.items.data) {
        const productId = typeof item.price.product === 'string' 
          ? item.price.product 
          : item.price.product.id;
        
        // Check cache first to reduce API calls
        const productCacheKey = `product:${productId}`;
        let product = getCached(productCacheKey);
        
        if (!product) {
          try {
            product = await stripe.products.retrieve(productId);
            cache.set(productCacheKey, { data: product, timestamp: Date.now() });
            logStep("Retrieved product from Stripe", { productId, productName: product.name });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logStep("Error retrieving product", { productId, error: errorMessage });
            continue;
          }
        }
        
        // Extract sport and module from product metadata
        let sport: string = 'baseball'; // default to baseball for backward compatibility
        let module: string | null = null;
        
        if (product.metadata?.sport) {
          sport = product.metadata.sport.toLowerCase();
        }
        
        if (product.metadata?.module) {
          module = product.metadata.module.toLowerCase();
        } else {
          // Fallback: Try to infer module from product name
          const productName = product.name?.toLowerCase() || '';
          if (productName.includes('hitting')) {
            module = 'hitting';
          } else if (productName.includes('pitching')) {
            module = 'pitching';
          } else if (productName.includes('throwing')) {
            module = 'throwing';
          }
        }
        
        if (module) {
          // Store in sport_module format for sport-specific locking
          subscribedModules.push(`${sport}_${module}`);
        }
      }
      logStep("Determined subscribed modules", { subscribedModules });

      // UPSERT subscription record in database with coupon information
      await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'active',
          subscribed_modules: subscribedModules,
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscriptionId,
          current_period_end: subscriptionEnd,
          coupon_code: couponCode,
          coupon_name: couponName,
          discount_percent: discountPercent
        }, {
          onConflict: 'user_id'
        });

      // Auto-create coupon metadata entry if this is a new coupon
      if (couponCode) {
        logStep("Creating coupon metadata entry", { couponCode });
        const { error: metadataError } = await supabaseClient
          .from('coupon_metadata')
          .upsert({
            coupon_code: couponCode,
            custom_name: couponName || couponCode,
            description: `Auto-detected from Stripe subscription`,
            is_ambassador: false
          }, {
            onConflict: 'coupon_code',
            ignoreDuplicates: true
          });
          
        if (metadataError && metadataError.code !== '23505') {
          logStep("Error creating coupon metadata", { error: metadataError.message });
        } else {
          logStep("Coupon metadata created/verified", { couponCode });
        }
      }
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
      subscription_end: subscriptionEnd,
      has_discount: hasDiscount,
      discount_percent: discountPercent
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    
    // If we hit a rate limit, try to return the last known state from the database
    if (errorMessage.includes('rate') || errorMessage.includes('too many')) {
      logStep("Rate limit detected, falling back to database state");
      
      try {
        const authHeader = req.headers.get("Authorization");
        if (authHeader) {
          const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { persistSession: false } }
          );
          
          const token = authHeader.replace("Bearer ", "");
          const { data: userData } = await supabaseClient.auth.getUser(token);
          
          if (userData?.user) {
            const { data: subData } = await supabaseClient
              .from('subscriptions')
              .select('status, subscribed_modules, current_period_end')
              .eq('user_id', userData.user.id)
              .maybeSingle();
            
            if (subData) {
              logStep("Returning cached subscription state from database");
              return new Response(JSON.stringify({
                subscribed: subData.status === 'active',
                modules: subData.subscribed_modules || [],
                subscription_end: subData.current_period_end,
                has_discount: false,
                discount_percent: null
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              });
            }
          }
        }
      } catch (fallbackError) {
        logStep("Fallback to database failed", { error: String(fallbackError) });
      }
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
