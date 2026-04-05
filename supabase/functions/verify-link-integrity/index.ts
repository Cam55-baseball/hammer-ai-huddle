import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Check global session uniqueness invariant
    const { data: violations, error } = await supabase.rpc("check_link_integrity");

    if (error) {
      // Fallback: run raw query via a simple approach
      const { data: creatorSessions } = await supabase
        .from("live_ab_links")
        .select("creator_session_id")
        .not("creator_session_id", "is", null);

      const { data: joinerSessions } = await supabase
        .from("live_ab_links")
        .select("joiner_session_id")
        .not("joiner_session_id", "is", null);

      const allSessions: string[] = [];
      (creatorSessions ?? []).forEach((r: any) => allSessions.push(r.creator_session_id));
      (joinerSessions ?? []).forEach((r: any) => allSessions.push(r.joiner_session_id));

      const counts: Record<string, number> = {};
      allSessions.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });

      const duplicates = Object.entries(counts).filter(([, c]) => c > 1);

      const action = duplicates.length > 0 ? "link_integrity_violation" : "link_integrity_pass";

      await supabase.from("audit_log").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action,
        table_name: "live_ab_links",
        metadata: {
          duplicates: duplicates.map(([id, count]) => ({ session_id: id, count })),
          total_sessions: allSessions.length,
          checked_at: new Date().toISOString(),
        },
      });

      return new Response(
        JSON.stringify({ status: action, duplicates_found: duplicates.length, total_sessions: allSessions.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "link_integrity_pass", violations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
