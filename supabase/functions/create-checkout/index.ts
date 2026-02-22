import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Tier-based pricing (replaces per-module pricing)
const TIER_PRICES: { [tier: string]: { [sport: string]: string } } = {
  pitcher: {
    baseball: "price_1SKpoEGc5QIzbAH6FlPRhazY",
    softball: "price_1SPBwcGc5QIzbAH6XUKF9dNy"
  },
  "5tool": {
    baseball: "PENDING_BASEBALL_5TOOL_PRICE_ID",
    softball: "PENDING_SOFTBALL_5TOOL_PRICE_ID"
  },
  golden2way: {
    baseball: "PENDING_BASEBALL_GOLDEN2WAY_PRICE_ID",
    softball: "PENDING_SOFTBALL_GOLDEN2WAY_PRICE_ID"
  }
};

// Legacy per-module prices (backward compat during migration)
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

    // Check if user is owner/admin - no checkout needed
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin']);

    if (roles && roles.length > 0) {
      logStep("Owner/Admin attempted checkout - access already granted");
      return new Response(JSON.stringify({
        owner: true,
        message: 'Owners/Admins have free access to all tiers'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const body = await req.json();
    const { tier, sport, modules } = body;
    
    logStep("Received request", { tier, sport, modules });

    // Validate sport
    if (!sport || !['baseball', 'softball'].includes(sport)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing sport. Must be baseball or softball' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    let lineItems: { price: string; quantity: number }[];
    let checkoutMetadata: Record<string, string> = { user_id: user.id };

    if (tier) {
      // NEW: Tier-based checkout
      const priceId = TIER_PRICES[tier]?.[sport];
      if (!priceId) {
        throw new Error(`No price found for tier ${tier} and sport ${sport}`);
      }
      logStep("Using tier-based pricing", { tier, sport, priceId });
      lineItems = [{ price: priceId, quantity: 1 }];
      checkoutMetadata.tier = tier;
      checkoutMetadata.sport = sport;
    } else if (modules && Array.isArray(modules) && modules.length > 0) {
      // LEGACY: Per-module checkout (backward compat)
      logStep("Using legacy per-module pricing", { modules, sport });
      lineItems = modules.map((module: string) => {
        const priceId = MODULE_PRICES[module]?.[sport];
        if (!priceId) throw new Error(`No price found for module ${module} and sport ${sport}`);
        return { price: priceId, quantity: 1 };
      });
    } else {
      return new Response(
        JSON.stringify({ error: 'Must provide either a tier or modules array' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/checkout?status=success`,
      cancel_url: `${origin}/checkout?status=cancel`,
      metadata: checkoutMetadata
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
