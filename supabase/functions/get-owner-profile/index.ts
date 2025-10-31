import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the owner's user_id from user_roles
    const { data: ownerRole, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner")
      .maybeSingle();

    if (roleError || !ownerRole) {
      return new Response(
        JSON.stringify({ full_name: null, bio: null, avatar_url: null }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get owner's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, bio, avatar_url, social_instagram, social_twitter, social_facebook, social_linkedin, social_youtube, social_website")
      .eq("id", ownerRole.user_id)
      .single();

    if (profileError) throw profileError;

    // Construct full_name from first_name and last_name for backward compatibility
    const responseData = {
      ...profile,
      full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null,
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-owner-profile function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
