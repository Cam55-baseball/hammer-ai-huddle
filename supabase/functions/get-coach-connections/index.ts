import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid user");

    // Get all relationships where this user is the player
    const { data: connections, error } = await supabase
      .from("scout_follows")
      .select("id, scout_id, player_id, status, initiated_by, relationship_type, confirmed_at, created_at")
      .eq("player_id", user.id);

    if (error) throw error;

    // Get coach profiles
    const coachIds = (connections || []).map(c => c.scout_id);
    let coachProfiles: Record<string, { full_name: string; avatar_url: string | null }> = {};

    if (coachIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", coachIds);

      if (profiles) {
        for (const p of profiles) {
          coachProfiles[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        }
      }
    }

    const results = (connections || []).map(c => ({
      id: c.id,
      coach_id: c.scout_id,
      coach_name: coachProfiles[c.scout_id]?.full_name ?? "Unknown",
      coach_avatar: coachProfiles[c.scout_id]?.avatar_url,
      status: c.status,
      initiated_by: c.initiated_by,
      relationship_type: c.relationship_type,
      confirmed_at: c.confirmed_at,
      created_at: c.created_at,
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-coach-connections:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
