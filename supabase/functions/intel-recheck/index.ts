// Learning-loop re-check for the signed-in player only (self data; no other viewer).
// Scores stay on the server: the response carries outcome labels only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { recheckPlayer } from "../_shared/intelligence/recheck.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Create: one open item per area from the drill the player's latest report card already gave them.
    const { data: open } = await sb.from("intelligence_recommendations").select("area").eq("user_id", user.id).is("outcome", null);
    const openAreas = new Set((open ?? []).map((o) => String(o.area).toLowerCase()));
    let created = 0;
    for (const mod of ["hitting", "pitching", "throwing"]) {
      if (openAreas.has(mod)) continue;
      const { data: last } = await sb.from("videos").select("efficiency_score, ai_analysis").eq("user_id", user.id).eq("module", mod)
        .not("efficiency_score", "is", null).order("created_at", { ascending: false }).limit(1);
      const drill = (last?.[0]?.ai_analysis as any)?.drills?.[0];
      if (!drill?.title) continue; // no drill on the report card -> no advice (never invent)
      const doThis = drill.reps_sets ? `${drill.title} (${drill.reps_sets})` : String(drill.title);
      const { error: ie } = await sb.from("intelligence_recommendations").insert({
        user_id: user.id, area: mod[0].toUpperCase() + mod.slice(1), do_this: doThis.slice(0, 200),
        baseline_value: last![0].efficiency_score,
      });
      if (!ie) created++;
    }

    const results = await recheckPlayer(sb, user.id);
    return json({ created, checked: results.length, results });
  } catch (e) {
    console.error("[intel-recheck]", e);
    return json({ error: "Re-check failed" }, 500);
  }
});
