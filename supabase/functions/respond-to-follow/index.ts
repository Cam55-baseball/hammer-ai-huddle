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

    const { follow_id, status } = await req.json();

    if (!follow_id || !status) {
      throw new Error("follow_id and status are required");
    }

    if (!["accepted", "rejected"].includes(status)) {
      throw new Error("status must be 'accepted' or 'rejected'");
    }

    // Verify the follow request belongs to this player
    const { data: follow } = await supabase
      .from("scout_follows")
      .select("player_id")
      .eq("id", follow_id)
      .single();

    if (!follow || follow.player_id !== user.id) {
      throw new Error("Follow request not found or unauthorized");
    }

    // Update the follow request status
    const { data, error } = await supabase
      .from("scout_follows")
      .update({ status })
      .eq("id", follow_id)
      .select()
      .single();

    if (error) throw error;

    console.log("Follow request updated:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in respond-to-follow:", error);
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
