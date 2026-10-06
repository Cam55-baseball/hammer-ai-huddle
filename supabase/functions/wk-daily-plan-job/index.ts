/**
 * Daily plan job — builds today's Hammers Today plan for every started player,
 * on each player's own local day. NOT scheduled; the owner schedules it.
 *
 *   mode "build" (default): build any started player's missing plan for today.
 *   mode "check":           same pass, run later as the safety net — every
 *                           missing plan is retried once and any failure is
 *                           logged to wk_daily_plan_runs.
 *
 * Only plans that do not exist yet are built, so a plan with anything marked
 * is never touched (the planner also refuses to rebuild a marked plan).
 * Safe to call repeatedly: a second call finds every plan already present.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function localDate(tz: string | null, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(URL_, SERVICE);

  const body = (await req.json().catch(() => ({}))) as { mode?: string; limit?: number };
  const mode = body.mode === "check" ? "check" : "build";
  const limit = Math.min(Math.max(Number(body.limit ?? 2000) || 2000, 1), 5000);

  const { data: players, error } = await admin
    .from("profiles")
    .select("id, timezone")
    .not("hammers_today_started_at", "is", null)
    .limit(limit);
  if (error) return json({ error: error.message }, 500);

  const counts = { players: 0, present: 0, built: 0, failed: 0 };
  for (const p of (players ?? []) as Array<{ id: string; timezone: string | null }>) {
    counts.players++;
    const day = localDate(p.timezone);
    const { data: existing } = await admin.from("wk_prescriptions").select("id")
      .eq("user_id", p.id).eq("plan_date", day).limit(1);
    if ((existing ?? []).length > 0) { counts.present++; continue; }

    const attempt = async (): Promise<string | null> => {
      try {
        const r = await fetch(`${URL_}/functions/v1/wk-generate-daily`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}`, apikey: SERVICE },
          body: JSON.stringify({ user_id: p.id, plan_date: day }),
        });
        if (!r.ok) return `HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`;
        return null;
      } catch (e) {
        return String(e).slice(0, 300);
      }
    };
    let err = await attempt();
    if (err && mode === "check") err = await attempt(); // one retry on the safety-net pass
    if (err) counts.failed++; else counts.built++;
    await admin.from("wk_daily_plan_runs").insert({
      user_id: p.id, plan_date: day, mode, outcome: err ? "failed" : "built", error_text: err,
    });
  }
  return json({ ok: true, mode, ...counts });
});
