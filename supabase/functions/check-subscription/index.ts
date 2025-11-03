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

    // Fetch ALL active subscriptions (not just 1) - users can have multiple modules
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 100,  // Get all active subscriptions (Stripe max is 100)
      expand: ['data.latest_invoice', 'data.discount'],  // Expand to get full subscription data including current_period_end
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscribedModules: string[] = [];
    let subscriptionEnd: string | null = null;
    let latestEndDate: number = 0;  // Track the furthest expiration timestamp
    let stripeSubscriptionIds: string[] = [];  // Track all subscription IDs
    let hasDiscount = false;
    let discountPercent: number | null = null;
    let couponCode: string | null = null;
    let couponName: string | null = null;
    const moduleMapping: Record<string, any> = {};  // NEW: Track module details

    if (hasActiveSub) {
      logStep("Processing multiple subscriptions", { count: subscriptions.data.length });
      
      // Process ALL active subscriptions to get all modules
      for (const subscription of subscriptions.data) {
        stripeSubscriptionIds.push(subscription.id);
        logStep("Processing subscription", { subscriptionId: subscription.id });
      
        // Retrieve full subscription details to ensure we have all fields including current_period_end
        const fullSubscription = await stripe.subscriptions.retrieve(subscription.id);
        logStep("Full subscription retrieved", { 
          subscriptionId: fullSubscription.id,
          hasCurrentPeriodEnd: !!fullSubscription.current_period_end,
          currentPeriodEnd: fullSubscription.current_period_end,
          status: fullSubscription.status
        });

        // Check for discount and extract coupon details (keep the first one found)
        if (!hasDiscount && fullSubscription.discount) {
          hasDiscount = true;
          const coupon = fullSubscription.discount.coupon;
          if (coupon.percent_off) {
            discountPercent = coupon.percent_off;
          }
          couponCode = coupon.id;
          couponName = coupon.name || coupon.id;
          logStep("Discount found on subscription", { percent: discountPercent, code: couponCode, name: couponName });
        }

        // Handle 100% off coupons - check invoice level if no subscription discount found
        if (!hasDiscount && fullSubscription.latest_invoice) {
          try {
            const invoiceId = typeof fullSubscription.latest_invoice === 'string' 
              ? fullSubscription.latest_invoice 
              : fullSubscription.latest_invoice.id;
            
            const invoice = await stripe.invoices.retrieve(invoiceId, {
              expand: ['discount', 'total_discount_amounts']
            });
            
            logStep("Checking invoice for discounts", { 
              invoiceId, 
              hasDiscount: !!invoice.discount,
              totalDiscountAmounts: invoice.total_discount_amounts 
            });

            if (invoice.discount && invoice.discount.coupon) {
              hasDiscount = true;
              const coupon = invoice.discount.coupon;
              couponCode = coupon.id;
              couponName = coupon.name || coupon.id;
              if (coupon.percent_off) {
                discountPercent = coupon.percent_off;
              }
              logStep("Discount found on invoice", { percent: discountPercent, code: couponCode, name: couponName });
            }

            // Check for promotional codes
            if (!hasDiscount && invoice.total_discount_amounts && invoice.total_discount_amounts.length > 0) {
              logStep("Total discount amounts found on invoice", { amounts: invoice.total_discount_amounts });
              hasDiscount = true;
            }
          } catch (invoiceError) {
            const errorMessage = invoiceError instanceof Error ? invoiceError.message : String(invoiceError);
            logStep("Error checking invoice for discounts", { error: errorMessage });
          }
        }
        
        // Track the latest subscription end date across all subscriptions
        try {
          if (fullSubscription.current_period_end && typeof fullSubscription.current_period_end === 'number') {
            if (fullSubscription.current_period_end > latestEndDate) {
              latestEndDate = fullSubscription.current_period_end;
              subscriptionEnd = new Date(fullSubscription.current_period_end * 1000).toISOString();
            }
          } else {
            logStep("Warning: Invalid or missing current_period_end", { 
              value: fullSubscription.current_period_end,
              type: typeof fullSubscription.current_period_end 
            });
          }
        } catch (dateError) {
          const errorMessage = dateError instanceof Error ? dateError.message : String(dateError);
          logStep("Error converting date", { 
            error: errorMessage, 
            rawValue: fullSubscription.current_period_end 
          });
        }
        
        logStep("Active subscription found", { subscriptionId: fullSubscription.id, endDate: subscriptionEnd });
        
        // Extract modules from line items by fetching product metadata separately
        for (const item of fullSubscription.items.data) {
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
          
          // Extract sport and module from product metadata with robust normalization
          let sport: string | null = null;
          let module: string | null = null;
          
          // Helper to normalize metadata values
          const normalizeValue = (value: string | undefined): string | null => {
            if (!value) return null;
            return value.trim().toLowerCase();
          };
          
          // Helper to try mapping weird key/value pairs like { "softball": "pitching" } or { "sport=softball": "module=pitching" }
          const extractFromWeirdKv = (meta: Record<string, string | undefined>) => {
            const validModules = ['hitting', 'pitching', 'throwing'];
            for (const [rawK, rawV] of Object.entries(meta || {})) {
              const k = normalizeValue(rawK as string) || '';
              const v = normalizeValue(rawV as string | undefined) || '';

              // Direct sport name used as key
              if (!sport && (k === 'softball' || k === 'baseball')) {
                sport = k;
                // value could be a module name
                if (!module) {
                  for (const m of validModules) {
                    if (v.includes(m)) { module = m; break; }
                  }
                }
              }

              // Keys or values that look like key=value
              if (k.includes('=')) {
                const [lhs, rhs] = k.split('=');
                const key = (lhs || '').trim().toLowerCase();
                const val = (rhs || '').trim().toLowerCase();
                if (!sport && key === 'sport' && (val === 'softball' || val === 'baseball')) sport = val;
                if (!module && key === 'module') {
                  for (const m of validModules) { if (val.includes(m)) { module = m; break; } }
                }
              }
              if (v.includes('=')) {
                const [lhs, rhs] = v.split('=');
                const key = (lhs || '').trim().toLowerCase();
                const val = (rhs || '').trim().toLowerCase();
                if (!sport && key === 'sport' && (val === 'softball' || val === 'baseball')) sport = val;
                if (!module && key === 'module') {
                  for (const m of validModules) { if (val.includes(m)) { module = m; break; } }
                }
              }
            }
          };
          
          // Try product metadata first (both lowercase and capitalized keys)
          sport = normalizeValue(product.metadata?.sport) || normalizeValue(product.metadata?.Sport);
          module = normalizeValue(product.metadata?.module) || normalizeValue(product.metadata?.Module);
          
          // If still missing, try to extract from odd key/value patterns
          if (!sport || !module) {
            extractFromWeirdKv(product.metadata as Record<string, string | undefined>);
          }
          
          // Try inferring sport from product name if still missing
          if (!sport) {
            const name = (product.name || '').toLowerCase();
            if (name.includes('softball')) sport = 'softball';
            else if (name.includes('baseball')) sport = 'baseball';
          }
          
          logStep("Product metadata extracted", { 
            productId, 
            rawMetadata: product.metadata,
            extractedSport: sport,
            extractedModule: module 
          });
          
          // Fallback to price metadata if product metadata is missing
          if (!sport || !module) {
            try {
              const priceId = typeof item.price.id === 'string' ? item.price.id : item.price.id;
              const priceCacheKey = `price:${priceId}`;
              let priceData = getCached(priceCacheKey);
              
              if (!priceData) {
                priceData = await stripe.prices.retrieve(priceId);
                cache.set(priceCacheKey, { data: priceData, timestamp: Date.now() });
              }
              
              if (!sport) {
                sport = normalizeValue(priceData.metadata?.sport) || normalizeValue(priceData.metadata?.Sport);
              }
              if (!module) {
                module = normalizeValue(priceData.metadata?.module) || normalizeValue(priceData.metadata?.Module);
              }
              
              // Heuristics for odd price metadata, if still missing
              if ((!sport || !module) && priceData?.metadata) {
                extractFromWeirdKv(priceData.metadata as Record<string, string | undefined>);
              }
              
              // If still no sport, infer from the product name again as a last resort
              if (!sport) {
                const name = (product.name || '').toLowerCase();
                if (name.includes('softball')) sport = 'softball';
                else if (name.includes('baseball')) sport = 'baseball';
              }
              
              logStep("Price metadata fallback used", { 
                priceId, 
                priceMetadata: priceData.metadata,
                finalSport: sport,
                finalModule: module 
              });
            } catch (priceError) {
              const errorMessage = priceError instanceof Error ? priceError.message : String(priceError);
              logStep("Error retrieving price metadata", { error: errorMessage });
            }
          }
          
          // Validate and map sport
          const validSports = ['baseball', 'softball'];
          if (sport && !validSports.includes(sport)) {
            logStep("Invalid sport value, defaulting to baseball", { invalidSport: sport });
            sport = 'baseball';
          }
          if (!sport) {
            sport = 'baseball'; // default for backward compatibility
            logStep("No sport found, defaulting to baseball");
          }
          
          // Validate and map module
          const validModules = ['hitting', 'pitching', 'throwing'];
          if (module) {
            // Handle cases like "softball pitching" -> "pitching"
            for (const validModule of validModules) {
              if (module.includes(validModule)) {
                const mappedModule = validModule;
                if (module !== mappedModule) {
                  logStep("Mapped module value", { original: module, mapped: mappedModule });
                }
                module = mappedModule;
                break;
              }
            }
            
            // Final validation
            if (!validModules.includes(module)) {
              logStep("Invalid module value after mapping", { invalidModule: module });
              module = null;
            }
          }
          
          // Fallback: Try to infer module from product name if still null
          if (!module) {
            const productName = product.name?.toLowerCase() || '';
            if (productName.includes('hitting')) {
              module = 'hitting';
            } else if (productName.includes('pitching')) {
              module = 'pitching';
            } else if (productName.includes('throwing')) {
              module = 'throwing';
            }
            if (module) {
              logStep("Inferred module from product name", { productName, inferredModule: module });
            }
          }
          
          logStep("Final resolved metadata", { sport, module, productId });
          
          if (module) {
            // Store in sport_module format for sport-specific locking
            const sportModule = `${sport}_${module}`;
            
            // NEW: Build module mapping
            moduleMapping[sportModule] = {
              subscription_id: fullSubscription.id,
              status: fullSubscription.status,
              current_period_end: fullSubscription.current_period_end 
                ? new Date(fullSubscription.current_period_end * 1000).toISOString() 
                : null,
              cancel_at_period_end: fullSubscription.cancel_at_period_end || false,
              price_id: item.price.id,
              canceled_at: fullSubscription.canceled_at 
                ? new Date(fullSubscription.canceled_at * 1000).toISOString() 
                : null
            };
            
            // Only add if not already in the array (avoid duplicates from multiple subscriptions)
            if (!subscribedModules.includes(sportModule)) {
              subscribedModules.push(sportModule);
              logStep("Added subscribed module", { sportModule });
            }
          } else {
            logStep("WARNING: Could not determine module for product", { 
              productId, 
              productName: product.name,
              metadata: product.metadata 
            });
          }
        }
      }
      
      // If no end date was found across all subscriptions, use a fallback
      if (!subscriptionEnd) {
        subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        logStep("No valid end date found, using 30-day fallback");
      }
      
      logStep("Determined subscribed modules", { subscribedModules });

      // Check for pending cancellations
      const hasPendingCancellations = Object.values(moduleMapping)
        .some((m: any) => m.cancel_at_period_end);

      // UPSERT subscription record in database with coupon information
      await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'active',
          subscribed_modules: subscribedModules,
          module_subscription_mapping: moduleMapping,  // NEW
          has_pending_cancellations: hasPendingCancellations,  // NEW
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscriptionIds.join(','),  // Store all IDs
          current_period_end: subscriptionEnd,
          coupon_code: couponCode,
          coupon_name: couponName,
          discount_percent: discountPercent
        }, {
          onConflict: 'user_id'
        });

      // Auto-assign player role if user has active subscription but no role
      if (subscribedModules.length > 0) {
        logStep("Checking for player role assignment");
        
        // Check if user already has a role
        const { data: existingRoles, error: roleCheckError } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1);
        
        if (roleCheckError) {
          logStep("Error checking for existing roles", { error: roleCheckError.message });
        } else if (!existingRoles || existingRoles.length === 0) {
          // User has no role but has active subscription - auto-assign player role
          logStep("Auto-assigning player role for subscribed user without role");
          
          const { error: roleInsertError } = await supabaseClient
            .from('user_roles')
            .insert([{
              user_id: user.id,
              role: 'player',
              status: 'active'
            }]);
          
          if (roleInsertError) {
            logStep("Error auto-assigning player role", { error: roleInsertError.message });
          } else {
            logStep("Successfully auto-assigned player role");
          }
        } else {
          logStep("User already has role assigned", { roles: existingRoles });
        }
      }

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
      
      // UPSERT subscription record (set to inactive)
      await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'inactive',
          subscribed_modules: [],
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          current_period_end: null
        }, {
          onConflict: 'user_id'
        });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      modules: subscribedModules,
      module_details: moduleMapping,  // NEW
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
    
    // Fallback to database state on error (like rate limiting)
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseClient.auth.getUser(token);
        const user = userData.user;
        
        if (user) {
          const { data: subscription } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (subscription) {
            logStep("Returning cached subscription from database");
            const isActive = subscription.status === 'active';
            return new Response(JSON.stringify({
              subscribed: isActive,
              modules: subscription.subscribed_modules || [],
              subscription_end: subscription.current_period_end,
              has_discount: !!subscription.coupon_code,
              discount_percent: subscription.discount_percent
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        }
      }
    } catch (fallbackError) {
      logStep("Fallback also failed", { error: fallbackError });
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
