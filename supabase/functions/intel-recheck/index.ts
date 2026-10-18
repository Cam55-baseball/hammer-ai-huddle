// Learning-loop re-check for the signed-in player only (self data; no other viewer).
// Scores stay on the server: the response carries outcome labels only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const NO_CHANGE_BAND = 3; // keep equal to src/lib/intelligence/learningLoop.ts

function judge(b: number | null, r: number | null) {
  if (b == null || r == null) return null;
  const d = r - b;
  if (Math.abs(d) < NO_CHANGE_BAND) return "no_change";
  return d > 0 ? "worked" : "got_worse";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: recs, error } = await sb.from("intelligence_recommendations")
      .select("id, area, created_at, baseline_value, followed, outcome")
      .eq("user_id", user.id).eq("followed", true).is("outcome", null).limit(20);
    if (error) throw error;

    const results: { id: string; outcome: string | null }[] = [];
    for (const r of recs ?? []) {
      const mod = String(r.area).toLowerCase();
      let baseline = r.baseline_value == null ? null : Number(r.baseline_value);
      if (baseline == null) { // last scored analysis before the advice
        const { data: b } = await sb.from("videos").select("efficiency_score").eq("user_id", user.id).eq("module", mod)
          .not("efficiency_score", "is", null).lte("created_at", r.created_at).order("created_at", { ascending: false }).limit(1);
        baseline = b?.[0]?.efficiency_score ?? null;
        if (baseline != null) await sb.from("intelligence_recommendations").update({ baseline_value: baseline }).eq("id", r.id);
      }
      const { data: v } = await sb.from("videos").select("efficiency_score").eq("user_id", user.id).eq("module", mod)
        .not("efficiency_score", "is", null).gt("created_at", r.created_at).order("created_at").limit(1);
      const recheck = v?.[0]?.efficiency_score ?? null;
      const outcome = judge(baseline, recheck);
      if (outcome) {
        const { error: e } = await sb.from("intelligence_recommendations")
          .update({ recheck_value: recheck, outcome, checked_at: new Date().toISOString() }).eq("id", r.id);
        if (e) throw e;
      }
      results.push({ id: r.id, outcome });
    }
    return json({ checked: results.length, results });
  } catch (e) {
    console.error("[intel-recheck]", e);
    return json({ error: "Re-check failed" }, 500);
  }
});
