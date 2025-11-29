import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Price IDs for each module ($200/month each) - sport-specific
const MODULE_PRICES: { [key: string]: { [sport: string]: string } } = {
  hitting: {
    baseball: "price_1SLm0qGc5QIzbAH60wry3lSb",
    softball: "price_1SPBvTGc5QIzbAH6hkuqTPOp"
  },
  pitching: {
    baseball: "price_1SKpoEGc5QIzbAH6FlPRhazY",
    softball: "price_1SPBwcGc5QIzbAH6XUKF9dNy"
  },
  throwing: {
    baseball: "price_1SLm1cGc5QIzbAH69slwwgsU",
    softball: "price_1SPBxRGc5QIzbAH6IJfEzqqr"
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is owner - no checkout needed
    const { data: ownerRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle();

    if (ownerRole) {
      logStep("Owner attempted checkout - access already granted");
      return new Response(JSON.stringify({
        owner: true,
        message: 'Owners have free access to all modules'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if user is admin - no checkout needed
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminRole) {
      logStep("Admin attempted checkout - access already granted");
      return new Response(JSON.stringify({
        admin: true,
        message: 'Admins have free access to all modules'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get requested modules and sport from request body
    const { modules, sport } = await req.json();
    
    logStep("Received module request", { modules, sport });
    logStep("Sport selection", { sport, isBaseball: sport === 'baseball', isSoftball: sport === 'softball' });

    // Validate single module selection
    if (!modules || !Array.isArray(modules) || modules.length !== 1) {
      logStep("ERROR: Must select exactly one module");
      return new Response(
        JSON.stringify({ error: 'Must select exactly one module at a time' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Validate sport
    if (!sport || !['baseball', 'softball'].includes(sport)) {
      logStep("ERROR: Invalid or missing sport");
      return new Response(
        JSON.stringify({ error: 'Invalid or missing sport. Must be baseball or softball' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    logStep("Module requested", { modules });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will create during checkout");
    }

    // Build line items for selected modules with sport-specific pricing
    const lineItems = modules.map((module: string) => {
      const priceId = MODULE_PRICES[module]?.[sport];
      if (!priceId) {
        logStep("ERROR: No price found", { module, sport, availableSports: Object.keys(MODULE_PRICES[module] || {}) });
        throw new Error(`No price found for module ${module} and sport ${sport}`);
      }
      logStep("Using sport-specific price", { module, sport, priceId });
      return {
        price: priceId,
        quantity: 1,
      };
    });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?status=cancel`,
      metadata: {
        user_id: user.id
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
