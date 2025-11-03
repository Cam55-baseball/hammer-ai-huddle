import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESUME-MODULE] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { sport, module } = await req.json();
    
    if (!sport || !module) {
      throw new Error("Sport and module are required");
    }

    logStep("User authenticated", { userId: user.id, sport, module });

    // Get user's subscription record
    const { data: subData, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('module_subscription_mapping, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    logStep("Subscription query result", { 
      hasData: !!subData, 
      hasError: !!subError,
      errorMessage: subError?.message 
    });

    if (subError) {
      throw new Error(`Database error: ${subError.message}`);
    }

    if (!subData) {
      throw new Error("No subscription found for user. Please check your subscription status.");
    }

    const sportModule = `${sport}_${module}`;
    const moduleInfo = subData.module_subscription_mapping?.[sportModule];

    if (!moduleInfo) {
      throw new Error(`Module ${sportModule} not found in subscriptions`);
    }

    logStep("Found module subscription", { 
      subscriptionId: moduleInfo.subscription_id 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Remove cancel_at_period_end flag (un-cancel)
    await stripe.subscriptions.update(moduleInfo.subscription_id, {
      cancel_at_period_end: false
    });

    logStep("Subscription cancellation removed", { 
      subscriptionId: moduleInfo.subscription_id 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${sport} ${module} subscription will continue`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
