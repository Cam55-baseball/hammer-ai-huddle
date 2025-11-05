import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 🔹 Initialize Supabase
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🔹 Auth check (optional, but logged for context)
    let requestingUserId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      requestingUserId = user?.id ?? null;
    }

    // 🔹 Parse filters from request body
    const { sport, module } = await req.json().catch(() => ({ sport: null, module: null }));

    console.log("Fetching rankings with filters:", { sport, module, requestingUserId });

    // 🔹 Check if rankings are enabled in app settings
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "rankings_visible")
      .maybeSingle();

    const rankingsEnabled = settingsData?.setting_value?.enabled ?? true;
    if (!rankingsEnabled) {
      console.log("Rankings disabled by app owner");
      return new Response(
        JSON.stringify({ disabled: true, message: "Rankings are currently disabled", data: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔹 Query user progress table for rankings
    let query = supabase
      .from("user_progress")
      .select("user_id, sport, module, videos_analyzed, average_efficiency_score, last_activity")
      .order("average_efficiency_score", { ascending: false, nullsFirst: false });

    if (sport && sport !== "all") query = query.eq("sport", sport);
    if (module && module !== "all") query = query.eq("module", module);

    const { data, error } = await query;

    // ✅ Defensive guard: check for query errors
    if (error) {
      console.error("Error fetching rankings:", error);
      throw error;
    }

    // ✅ Defensive guard: handle no data found
    if (!data || data.length === 0) {
      console.warn("No ranking data found");
      return new Response(
        JSON.stringify({
          message: "No players found for the given filters",
          data: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 🔹 Exclude owners (not part of player rankings)
    const { data: ownerRoles, error: ownerError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner");

    if (ownerError) console.error("Error fetching owner roles:", ownerError);

    const ownerIds = new Set(ownerRoles?.map(o => o.user_id) || []);
    const filtered = data.filter((item: any) => !ownerIds.has(item.user_id));

    if (filtered.length === 0) {
      console.warn("No non-owner players available for rankings");
      return new Response(
        JSON.stringify({
          message: "No eligible players to rank",
          data: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 🔹 Fetch player names from profiles table
    const userIds = Array.from(new Set(filtered.map((i: any) => i.user_id)));
    let profileMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles for rankings:", profilesError);
      } else {
        profileMap = (profilesData || []).reduce((acc, p: any) => {
          acc[p.id] = p.full_name || "Anonymous";
          return acc;
        }, {} as Record<string, string>);
      }
    } else {
      console.log("No user IDs to fetch profiles for");
    }

    // 🔹 Final formatted response
    const formatted = filtered.map((i: any) => ({
      user_id: i.user_id,
      full_name: profileMap[i.user_id] || "Anonymous",
      sport: i.sport,
      module: i.module,
      videos_analyzed: i.videos_analyzed ?? 0,
      last_activity: i.last_activity ?? null,
    }));

    console.log(`Returning ${formatted.length} ranked players`);

    return new Response(JSON.stringify(formatted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Unhandled error in get-rankings:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        data: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
