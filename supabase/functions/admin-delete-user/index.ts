import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-DELETE-USER] ${step}${detailsStr}`);
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
      throw new Error("Only owners can delete user accounts");
    }

    logStep("Owner verified", { ownerId: user.id });

    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");

    // Prevent owner from deleting themselves
    if (userId === user.id) {
      throw new Error("Cannot delete your own account");
    }

    logStep("Target user", { userId });

    const deletionLog = [];

    // Step 1: Cancel all Stripe subscriptions first
    try {
      const { data: subscription } = await supabaseClient
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (subscription?.stripe_customer_id) {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });

        const subscriptions = await stripe.subscriptions.list({
          customer: subscription.stripe_customer_id,
          status: "active",
        });

        for (const stripeSub of subscriptions.data) {
          await stripe.subscriptions.cancel(stripeSub.id);
          logStep("Canceled Stripe subscription", { subscriptionId: stripeSub.id });
        }
        deletionLog.push({ table: "stripe_subscriptions", count: subscriptions.data.length });
      }
    } catch (stripeError) {
      logStep("Error canceling Stripe subscriptions", { error: stripeError });
      deletionLog.push({ table: "stripe_subscriptions", error: String(stripeError) });
    }

    // Step 2: Delete from videos table
    const { error: videosError, count: videosCount } = await supabaseClient
      .from("videos")
      .delete()
      .eq("user_id", userId);
    
    if (videosError) logStep("Error deleting videos", { error: videosError });
    deletionLog.push({ table: "videos", count: videosCount || 0, error: videosError?.message });

    // Step 3: Delete from user_progress table
    const { error: progressError, count: progressCount } = await supabaseClient
      .from("user_progress")
      .delete()
      .eq("user_id", userId);
    
    if (progressError) logStep("Error deleting user_progress", { error: progressError });
    deletionLog.push({ table: "user_progress", count: progressCount || 0, error: progressError?.message });

    // Step 4: Delete from scout_follows table (both as scout and player)
    const { error: scoutFollowsError1, count: scoutFollowsCount1 } = await supabaseClient
      .from("scout_follows")
      .delete()
      .eq("scout_id", userId);
    
    const { error: scoutFollowsError2, count: scoutFollowsCount2 } = await supabaseClient
      .from("scout_follows")
      .delete()
      .eq("player_id", userId);
    
    if (scoutFollowsError1 || scoutFollowsError2) {
      logStep("Error deleting scout_follows", { error: scoutFollowsError1 || scoutFollowsError2 });
    }
    deletionLog.push({ 
      table: "scout_follows", 
      count: (scoutFollowsCount1 || 0) + (scoutFollowsCount2 || 0), 
      error: scoutFollowsError1?.message || scoutFollowsError2?.message 
    });

    // Step 5: Delete from scout_applications table (as applicant)
    const { error: applicationsError, count: applicationsCount } = await supabaseClient
      .from("scout_applications")
      .delete()
      .eq("user_id", userId);
    
    if (applicationsError) logStep("Error deleting scout_applications", { error: applicationsError });
    deletionLog.push({ table: "scout_applications", count: applicationsCount || 0, error: applicationsError?.message });

    // Step 5b: Nullify scout_applications reviewed_by (as reviewer)
    const { error: reviewerError, count: reviewerCount } = await supabaseClient
      .from("scout_applications")
      .update({ reviewed_by: null })
      .eq("reviewed_by", userId);
    
    if (reviewerError) logStep("Error nullifying scout_applications reviewer", { error: reviewerError });
    deletionLog.push({ 
      table: "scout_applications (reviewed_by)", 
      count: reviewerCount || 0, 
      error: reviewerError?.message 
    });

    // Step 6: Delete from subscriptions table
    const { error: subscriptionsError, count: subscriptionsCount } = await supabaseClient
      .from("subscriptions")
      .delete()
      .eq("user_id", userId);
    
    if (subscriptionsError) logStep("Error deleting subscriptions", { error: subscriptionsError });
    deletionLog.push({ table: "subscriptions", count: subscriptionsCount || 0, error: subscriptionsError?.message });

    // Step 7: Delete from user_roles table
    const { error: rolesError, count: rolesCount } = await supabaseClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    
    if (rolesError) logStep("Error deleting user_roles", { error: rolesError });
    deletionLog.push({ table: "user_roles", count: rolesCount || 0, error: rolesError?.message });

    // Step 8: Delete from profiles table
    const { error: profilesError, count: profilesCount } = await supabaseClient
      .from("profiles")
      .delete()
      .eq("id", userId);
    
    if (profilesError) logStep("Error deleting profiles", { error: profilesError });
    deletionLog.push({ table: "profiles", count: profilesCount || 0, error: profilesError?.message });

    // Step 9: Finally, delete from auth.users
    const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(userId);
    
    if (authDeleteError) {
      logStep("Error deleting auth user", { error: authDeleteError });
      deletionLog.push({ table: "auth.users", error: authDeleteError.message });
      throw new Error(`Failed to delete user from authentication: ${authDeleteError.message}`);
    }

    deletionLog.push({ table: "auth.users", success: true });
    logStep("User deleted successfully", { userId });

    return new Response(JSON.stringify({ 
      success: true,
      message: "User account deleted successfully",
      deletionLog,
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
