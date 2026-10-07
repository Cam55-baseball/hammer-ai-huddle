// phase-state — the device asks; the server answers. ONE SYSTEM, ONE PHASE.
// If today's plan is built, its saved phase_state wins (plan never contradicts
// itself). Otherwise the same resolver the builder uses answers live.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolvePhaseState } from "../_shared/phaseState.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const auth = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.date ?? "")) ? String(body.date) : new Date().toISOString().slice(0, 10);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: saved } = await admin.from("wk_prescriptions")
    .select("why_payload").eq("user_id", user.id).eq("plan_date", date).limit(20);
  const stamped = ((saved ?? []) as any[]).map((r) => r?.why_payload?.phase_state).find((p) => p && p.version);
  if (stamped) return json({ phase_state: stamped, from: "plan" });

  const [{ data: s }, { data: h }] = await Promise.all([
    admin.from("athlete_mpi_settings").select("season_status, season_status_manual, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date").eq("user_id", user.id).maybeSingle(),
    admin.from("athlete_height_checks").select("measured_on, inches").eq("user_id", user.id).lte("measured_on", date).order("measured_on").limit(60),
  ]);
  const ps = resolvePhaseState({
    settings: s as any, date,
    heights: ((h ?? []) as any[]).map((x) => ({ date: x.measured_on, inches: Number(x.inches) })),
  });
  return json({ phase_state: ps, from: "live" });
});
