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

    // Decode verified JWT locally to avoid extra network calls
    const decodeJwt = (token: string) => {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        // Pad base64 string
        while (base64.length % 4 !== 0) base64 += '=';
        const json = atob(base64);
        return JSON.parse(json);
      } catch (_) {
        return null;
      }
    };

    const bearer = authHeader.replace(/^Bearer\s+/i, '');
    const claims = decodeJwt(bearer);
    if (!claims || !claims.sub) {
      logStep("ERROR: Authentication failed while decoding JWT");
      return new Response(
        JSON.stringify({ error: "Authentication failed", message: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = { id: claims.sub as string, email: (claims.email || claims.user_metadata?.email || null) as string | null };
    if (!user.id || !user.email) {
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
      logStep("Owner/Admin detected - granting full access", { userId: user.id });
      return new Response(
        JSON.stringify({
          subscribed: true,
          modules: [
            "baseball_hitting", "baseball_pitching", "baseball_throwing",
            "softball_hitting", "softball_pitching", "softball_throwing"
          ],
          module_details: {},
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


