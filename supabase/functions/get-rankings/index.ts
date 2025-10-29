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
    let isOwner = false;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (!userError && user) {
        requestingUserId = user.id;
        
        // Check if user is owner
        const { data: ownerRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "owner")
          .maybeSingle();
        
        isOwner = !!ownerRole;
      }
    }

    // Parse filters from request body
    const { sport, module } = await req.json().catch(() => ({ sport: null, module: null }));

    // Build query
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

    if (sport && sport !== "all") {
      query = query.eq("sport", sport);
    }

    if (module && module !== "all") {
      query = query.eq("module", module);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Format data - anonymize names unless owner or current user
    const formattedData = data.map((item: any) => ({
      user_id: item.user_id,
      full_name: isOwner || item.user_id === requestingUserId 
        ? item.profiles.full_name || "Anonymous"
        : `Athlete ${item.user_id.substring(0, 8)}`,
      sport: item.sport,
      module: item.module,
      videos_analyzed: item.videos_analyzed,
      average_efficiency_score: item.average_efficiency_score || 0,
      last_activity: item.last_activity,
    }));

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
