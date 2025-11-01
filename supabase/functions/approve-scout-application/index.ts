import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is owner
    const { data: ownerCheck } = await supabaseClient
      .rpc("has_role", { _user_id: user.id, _role: "owner" });

    if (!ownerCheck) {
      return new Response(JSON.stringify({ error: "Unauthorized - Owner access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { application_id, action } = await req.json();

    if (!application_id || !action || !["approve", "deny"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch application
    const { data: application, error: fetchError } = await supabaseClient
      .from("scout_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (fetchError || !application) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (application.status !== "pending") {
      return new Response(JSON.stringify({ error: "Application already reviewed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle approval
    if (action === "approve") {
      // Create scout role
      const { error: roleError } = await supabaseClient
        .from("user_roles")
        .insert({
          user_id: application.user_id,
          role: "scout",
          status: "active",
        });

      if (roleError) {
        console.error("Error creating scout role:", roleError);
        return new Response(JSON.stringify({ error: "Failed to create scout role" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update application status
      const { error: updateError } = await supabaseClient
        .from("scout_applications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", application_id);

      if (updateError) {
        console.error("Error updating application:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update application" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Application approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle denial
    if (action === "deny") {
      const { error: updateError } = await supabaseClient
        .from("scout_applications")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", application_id);

      if (updateError) {
        console.error("Error updating application:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update application" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Application denied" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in approve-scout-application:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
