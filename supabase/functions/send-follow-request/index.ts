import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const requestSchema = z.object({
  player_id: z.string().uuid("Invalid player ID format"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user");
    }

    // Verify user is a scout or coach
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["scout", "coach"])
      .maybeSingle();

    if (!userRole) {
      throw new Error("User is not a scout or coach");
    }

    console.log("User role verified:", userRole.role);

    // Validate input
    const body = await req.json();
    const { player_id } = requestSchema.parse(body);

    // Check if player exists
    const { data: playerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", player_id)
      .single();

    if (!playerProfile) {
      throw new Error("Player not found");
    }

    // Insert follow request
    const { data, error } = await supabase
      .from("scout_follows")
      .insert({
        scout_id: user.id,
        player_id: player_id,
        status: "pending"
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Follow request already exists");
      }
      throw error;
    }

    console.log("Follow request created:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-follow-request:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});