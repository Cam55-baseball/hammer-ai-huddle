// Prescription double-check log (owner round 2, 2026-10-09).
//  { action: "report", catches: [...] } — any signed-in player records catches the
//     app made while showing THEIR OWN cards (saved under their own id only).
//  { action: "list", days? } — owner only: counts by type + recent catches.
//     Returns slugs, rules and details only — no player names, ids or emails.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const RULES = new Set(["nonpositive_number", "distance_vs_name", "missing_sets", "text_distance_mismatch", "text_time_mismatch", "bad_plural", "missing_direction", "mixed_actions"]);
const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing Authorization" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));

    if (body?.action === "report") {
      const list = Array.isArray(body.catches) ? body.catches.slice(0, 20) : [];
      const rows = list
        .filter((c: any) => RULES.has(String(c?.rule)))
        .map((c: any) => ({
          user_id: u.user.id,
          plan_date: /^\d{4}-\d{2}-\d{2}$/.test(String(c.plan_date)) ? c.plan_date : new Date().toISOString().slice(0, 10),
          rule: `integrity_render:${c.rule}`,
          movement_slug: str(c.movement_slug, 120),
          slot: str(c.slot, 40),
          detail: str(`${c.field ?? ""}: ${c.detail ?? ""}`, 500),
        }));
      if (rows.length) await admin.from("wk_final_check_swaps").insert(rows);
      return json({ saved: rows.length });
    }

    if (body?.action === "list") {
      const { data: isOwner } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "owner" });
      if (!isOwner) return json({ error: "Owner only" }, 403);
      const days = Math.min(90, Math.max(1, Number(body.days) || 14));
      const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await admin.from("wk_final_check_swaps")
        .select("plan_date, rule, movement_slug, slot, detail")
        .like("rule", "integrity%").gte("plan_date", since)
        .order("plan_date", { ascending: false }).limit(1000);
      if (error) return json({ error: error.message }, 500);
      const counts: Record<string, number> = {};
      for (const r of data ?? []) counts[r.rule] = (counts[r.rule] ?? 0) + 1;
      return json({ since, counts, recent: (data ?? []).slice(0, 300) });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
