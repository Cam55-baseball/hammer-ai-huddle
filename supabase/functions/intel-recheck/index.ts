// Learning-loop re-check for the signed-in player only (self data; no other viewer).
// Scores stay on the server: the response carries outcome labels only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { recheckComparablePlayer } from "../_shared/intelligence/comparableRecheck.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Re-check configuration unavailable");
    const sb = createClient(url, key);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Create: one open item per area from the drill the player's latest report card already gave them.
    const { data: open, error: openError } = await sb.from("intelligence_recommendations").select("area").eq("user_id", user.id).is("outcome", null);
    if (openError) throw openError;
    const openAreas = new Set((open ?? []).map((o) => String(o.area).toLowerCase()));
    let created = 0;
    for (const mod of ["hitting", "pitching", "throwing"]) {
      if (openAreas.has(mod)) continue;
      const { data: last, error: clipError } = await sb.from("videos").select("id, efficiency_score, ai_analysis").eq("user_id", user.id).eq("module", mod)
        .not("efficiency_score", "is", null).order("created_at", { ascending: false }).limit(1);
      if (clipError) throw clipError;
      const source = last?.[0];
      const drill = (source?.ai_analysis as any)?.drills?.[0];
      if (!source) continue;
      if (!drill?.title) continue; // no drill on the report card -> no advice (never invent)
      const doThis = drill.reps_sets ? `${drill.title} (${drill.reps_sets})` : String(drill.title);
      const { error: ie } = await sb.from("intelligence_recommendations").insert({
        user_id: user.id, area: mod[0].toUpperCase() + mod.slice(1), do_this: doThis.slice(0, 200),
        baseline_value: source.efficiency_score,
        source_video_id: (source as any).id ?? null,
        drill: drillSnapshot(drill),
      });
      if (ie) throw ie;
      created++;
    }

    const results = await recheckComparablePlayer(sb, user.id);
    return json({ created, checked: results.length, results });
  } catch (e) {
    console.error("[intel-recheck]", e);
    return json({ error: "Re-check failed" }, 500);
  }
});

/** Player-safe drill snapshot: instructions only, never scores or findings. */
function drillSnapshot(d: any) {
  const text = (v: unknown, n = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
  const list = (v: unknown) => Array.isArray(v) ? v.map((x) => text(x, 240)).filter(Boolean).slice(0, 10) : [];
  return { id: text(d?.id ?? d?.drill_id, 150), title: text(d?.title, 150), reps_sets: text(d?.reps_sets, 80), purpose: text(d?.purpose ?? d?.why ?? d?.description), steps: list(d?.steps ?? d?.instructions), cue: text(d?.cue, 200) };
}
