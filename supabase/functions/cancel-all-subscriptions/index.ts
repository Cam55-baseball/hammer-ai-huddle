import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-ALL] ${step}${detailsStr}`);
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id });

    // Get user's subscription record
    const { data: subData, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('module_subscription_mapping')
      .eq('user_id', user.id)
      .single();

    if (subError || !subData) {
      throw new Error("No subscription found for user");
    }

    const moduleMapping = subData.module_subscription_mapping || {};
    const subscriptionIds = Object.values(moduleMapping).map((m: any) => m.subscription_id);

    if (subscriptionIds.length === 0) {
      throw new Error("No active subscriptions to cancel");
    }

    logStep("Found subscriptions to cancel", { count: subscriptionIds.length });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Cancel all subscriptions at period end
    const cancelResults = [];
    for (const subId of subscriptionIds) {
      try {
        await stripe.subscriptions.update(subId, {
          cancel_at_period_end: true
        });
        cancelResults.push({ subscriptionId: subId, success: true });
        logStep("Subscription set to cancel", { subscriptionId: subId });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep("Failed to cancel subscription", { subscriptionId: subId, error: errorMessage });
        cancelResults.push({ subscriptionId: subId, success: false, error: errorMessage });
      }
    }

    const successCount = cancelResults.filter(r => r.success).length;

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${successCount} module(s) will be canceled at period end`,
      count: successCount,
      total: subscriptionIds.length,
      details: cancelResults
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
