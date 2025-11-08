import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  searchQuery: z.string().trim().max(500, "Search query must be less than 500 characters").optional(),
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-SEARCH-USERS] ${step}${detailsStr}`);
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
      throw new Error("Only owners can search users");
    }

    logStep("Owner verified", { userId: user.id });

    // Validate input
    const body = await req.json();
    const { searchQuery } = requestSchema.parse(body);
    logStep("Search query received", { searchQuery });

    // Get all profiles first
    let profileQuery = supabaseClient
      .from("profiles")
      .select("id, full_name, first_name, last_name");

    // Apply search filter if provided
    if (searchQuery && searchQuery.trim() !== "") {
      const raw = searchQuery.trim();
      const lower = raw.toLowerCase();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw);
      if (isUuid) {
        profileQuery = profileQuery.eq("id", raw);
      } else {
        profileQuery = profileQuery.or(
          `full_name.ilike.%${lower}%,first_name.ilike.%${lower}%,last_name.ilike.%${lower}%`
        );
      }
    }

    const { data: profiles, error: profilesError } = await profileQuery;

    if (profilesError) {
      logStep("Error fetching profiles", { error: profilesError });
      throw profilesError;
    }

    logStep("Profiles fetched", { count: profiles?.length });

    // Get subscriptions separately for these user IDs
    const userIds = profiles?.map(p => p.id) || [];
    const { data: subscriptions, error: subsError } = await supabaseClient
      .from("subscriptions")
      .select("user_id, stripe_customer_id, status, subscribed_modules, module_subscription_mapping, current_period_end")
      .in("user_id", userIds);

    if (subsError) {
      logStep("Error fetching subscriptions", { error: subsError });
      throw subsError;
    }

    logStep("Subscriptions fetched", { count: subscriptions?.length });

    // Create subscription map
    const subscriptionMap = new Map(
      subscriptions?.map(sub => [sub.user_id, sub]) || []
    );

    // Get email addresses from auth.users
    const { data: { users: authUsers }, error: authError } = await supabaseClient.auth.admin.listUsers();
    
    if (authError) {
      logStep("Error fetching auth users", { error: authError });
      throw authError;
    }

    const emailMap = new Map(authUsers.map(u => [u.id, u.email]));

    // Transform data for frontend
    const results = profiles?.map(profile => {
      const subscription = subscriptionMap.get(profile.id);

      return {
        id: profile.id,
        full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
        email: emailMap.get(profile.id) || 'No email',
        stripe_customer_id: subscription?.stripe_customer_id || null,
        status: subscription?.status || 'inactive',
        subscribed_modules: subscription?.subscribed_modules || [],
        module_subscription_mapping: subscription?.module_subscription_mapping || {},
        current_period_end: subscription?.current_period_end || null,
      };
    }) || [];

    logStep("Results prepared", { count: results.length });

    return new Response(JSON.stringify({ users: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Return validation errors with 400 status
    if (error instanceof z.ZodError) {
      logStep("Validation error", { errors: error.errors });
      return new Response(JSON.stringify({ error: "Validation error", details: error.errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // Normalize Supabase/PostgREST errors to readable JSON
    const normalized =
      error && typeof error === "object"
        ? {
            message: (error as any).message || "Unknown error",
            code: (error as any).code,
            details: (error as any).details,
            hint: (error as any).hint,
          }
        : { message: String(error) };

    logStep("ERROR", normalized);
    return new Response(JSON.stringify({ error: normalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});