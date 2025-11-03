import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-CANCEL-USER-SUBS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Verify owner role
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Only owners can cancel user subscriptions");
    }

    logStep("Owner verified", { ownerId: user.id });

    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");

    logStep("Target user", { userId });

    // Get user's subscription data
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id, subscribed_modules, module_subscription_mapping")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      logStep("Error fetching subscription", { error: subError });
      throw subError;
    }

    if (!subscription?.stripe_customer_id) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "User has no active Stripe subscriptions" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Subscription found", { customerId: subscription.stripe_customer_id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get all active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: subscription.stripe_customer_id,
      status: "active",
    });

    logStep("Active Stripe subscriptions found", { count: subscriptions.data.length });

    // Cancel all active subscriptions immediately
    const cancellationResults = [];
    for (const stripeSub of subscriptions.data) {
      try {
        const canceled = await stripe.subscriptions.cancel(stripeSub.id);
        cancellationResults.push({
          subscription_id: stripeSub.id,
          status: "canceled",
          canceled_at: canceled.canceled_at,
        });
        logStep("Subscription canceled", { subscriptionId: stripeSub.id });
      } catch (cancelError) {
        logStep("Error canceling subscription", { 
          subscriptionId: stripeSub.id, 
          error: cancelError 
        });
        cancellationResults.push({
          subscription_id: stripeSub.id,
          status: "error",
          error: cancelError instanceof Error ? cancelError.message : String(cancelError),
        });
      }
    }

    // Update database
    const { error: updateError } = await supabaseClient
      .from("subscriptions")
      .update({
        status: "canceled",
        subscribed_modules: [],
        module_subscription_mapping: {},
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      logStep("Error updating database", { error: updateError });
      throw updateError;
    }

    logStep("Database updated successfully");

    return new Response(JSON.stringify({ 
      success: true,
      message: `Canceled ${cancellationResults.length} subscription(s)`,
      details: cancellationResults,
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
