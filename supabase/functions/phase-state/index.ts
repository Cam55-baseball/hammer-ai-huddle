// phase-state — the device asks; the server answers. ONE SYSTEM, ONE PHASE.
// phase_state = today's built plan's saved answer if a plan exists, else live.
// live = the resolver's answer right now (used to detect season edits).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolvePhaseState } from "../_shared/phaseState.ts";
import { seasonWithTimeline } from '../_shared/seasonTimeline.ts';
import { recruitingGate } from '../_shared/recruitingGate.ts';

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
  const athleteId = typeof body.athlete_id === 'string' ? body.athlete_id : user.id;
  const crossAthlete = athleteId !== user.id;
  if (crossAthlete) {
    // Reuse the existing training/connection/consent judge, not the broader profile gate alone.
    const { data: access, error } = await userClient.rpc('coach_athlete_plan', { _athlete: athleteId, _date: date });
    if (error || !access || access.state === 'denied') return json({ error: 'Plan sharing unavailable' }, 403);
    const visibility = await recruitingGate(admin, user.id, [athleteId], 'profile');
    if (visibility.get(athleteId) !== 'visible') return json({ error: 'Plan sharing unavailable' }, 403);
  }

  const { data: saved } = await admin.from("wk_prescriptions")
    .select("why_payload").eq("user_id", athleteId).eq("plan_date", date).limit(20);
  const stamped = ((saved ?? []) as any[]).map((r) => r?.why_payload?.phase_state).find((p) => p && p.version);
  const [{ data: s, error: settingsError }, { data: h }, { data: timeline, error: timelineError }, { data: context }] = await Promise.all([
    admin.from("athlete_mpi_settings").select("season_status, season_status_manual, season_status_manual_at, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date").eq("user_id", athleteId).maybeSingle(),
    crossAthlete ? Promise.resolve({ data: [] }) : admin.from("athlete_height_checks").select("measured_on, inches").eq("user_id", athleteId).lte("measured_on", date).order("measured_on").limit(60),
    admin.from('schedule_timeline_entries').select('id,tag,start_date,end_date,dates,source,payload,summary,created_at,undone_at').eq('user_id', athleteId).eq('tag', 'SEASON').is('undone_at', null).lte('start_date', date).order('created_at', { ascending: false }).limit(1),
    admin.from('athlete_context').select('season_phase').eq('user_id', athleteId).maybeSingle(),
  ]);
  if (timelineError || settingsError) return json({ error: 'Season changes could not be read' }, 503);
  const ps = resolvePhaseState({
    settings: seasonWithTimeline({ ...s, season_status: s?.season_status ?? context?.season_phase }, timeline as any ?? [], date), date,
    heights: ((h ?? []) as any[]).map((x) => ({ date: x.measured_on, inches: Number(x.inches) })),
  });
  // The plan's own answer is what screens show; the live answer lets the app
  // notice a season edit and ask the builder to adjust (unmarked cards only).
  const live = { ...ps, season_end_date: ps.season === 'in_season' ? s?.in_season_end_date ?? null : null };
  // Keep the legacy plan answer for existing clients. Season settings readers use live;
  // authorized coaches receive only the season fields, never height/growth facts or plan stamps.
  if (crossAthlete) return json({ live: { date, season: live.season, season_label: live.season_label, season_end_date: live.season_end_date } });
  return json({ phase_state: stamped ?? ps, live, plan: stamped ?? null, from: stamped ? "plan" : "live" });
});
