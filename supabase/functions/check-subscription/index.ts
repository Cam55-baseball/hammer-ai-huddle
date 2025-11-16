import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError) {
      logStep("ERROR: Authentication failed", { error: userError.message, code: userError.code });
      return new Response(
        JSON.stringify({ error: "Authentication failed", message: userError.message || "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    if (!user?.id || !user.email) {
      logStep("ERROR: User not authenticated or email missing");
      return new Response(
        JSON.stringify({ error: "User not authenticated or email not available" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("User authenticated successfully", { userId: user.id, email: user.email });

    // Owner/Admin bypass
    const { data: roles } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"])
      .eq("status", "active");

    if (roles && roles.length > 0) {
      logStep("Owner detected - granting full access", { userId: user.id });
      return new Response(
        JSON.stringify({
          subscribed: true,
          modules: ["hitting", "pitching", "throwing"],
          subscription_end: null,
          has_discount: false,
          discount_percent: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Read from subscriptions table
    const { data: subscription } = await serviceClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const isActive = (subscription?.status ?? "inactive") === "active";

    return new Response(
      JSON.stringify({
        subscribed: isActive,
        modules: subscription?.subscribed_modules ?? [],
        module_details: subscription?.module_subscription_mapping ?? null,
        subscription_end: subscription?.current_period_end ?? null,
        has_discount: !!subscription?.coupon_code,
        discount_percent: subscription?.discount_percent ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logStep("ERROR in check-subscription", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});


