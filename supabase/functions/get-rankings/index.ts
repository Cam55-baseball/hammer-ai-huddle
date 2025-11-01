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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the requesting user
    let requestingUserId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (!userError && user) {
        requestingUserId = user.id;
      }
    }

    // Parse filters from request body
    const { sport, module } = await req.json().catch(() => ({ sport: null, module: null }));

    console.log("Fetching rankings for user:", requestingUserId, "filters:", { sport, module });

    // Query for players with accepted scout follows
    // This query gets all players who have at least one accepted follow from any scout
    let query = supabase
      .from("user_progress")
      .select(`
        user_id,
        sport,
        module,
        videos_analyzed,
        average_efficiency_score,
        last_activity,
        profiles!inner(full_name)
      `)
      .order("average_efficiency_score", { ascending: false });

    // Filter by players who have accepted follows
    const { data: acceptedFollows } = await supabase
      .from("scout_follows")
      .select("player_id")
      .eq("status", "accepted");

    if (!acceptedFollows || acceptedFollows.length === 0) {
      console.log("No accepted follows found");
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const acceptedPlayerIds = acceptedFollows.map(f => f.player_id);
    query = query.in("user_id", acceptedPlayerIds);

    if (sport && sport !== "all") {
      query = query.eq("sport", sport);
    }

    if (module && module !== "all") {
      query = query.eq("module", module);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Format data - NO ANONYMIZATION, all real names shown
    // NOTE: Efficiency scores removed from public rankings
    const formattedData = data.map((item: any) => ({
      user_id: item.user_id,
      full_name: item.profiles.full_name || "Anonymous",
      sport: item.sport,
      module: item.module,
      videos_analyzed: item.videos_analyzed,
      last_activity: item.last_activity,
    }));

    console.log(`Returning ${formattedData.length} ranked players`);

    return new Response(JSON.stringify(formattedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-rankings function:", error);
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
