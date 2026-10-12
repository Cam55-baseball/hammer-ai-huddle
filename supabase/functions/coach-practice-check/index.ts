// Coach schedules a practice for one player or a whole team (Plan v3.1 §4).
// mode "check": per-player safety result. mode "schedule": re-checks, then
// schedules only the players who pass. Service role is used, so every player
// must be linked to the caller (is_linked_coach) AND pass recruitingGate.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { recruitingGate } from "../_shared/recruitingGate.ts";
import { ageFromDob } from "../_shared/age/ageFromDob.ts";
import { nextThrowDate } from "../_shared/wic/phases/nextThrowDate.ts";
import { checkPracticeSafety, type PracticeIntensity } from "../_shared/coach/practiceSafety.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const shift = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS: Record<string, string> = { team_session: "team", lesson: "lesson", live_abs: "team", solo_work: "individual" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Not signed in" }, 401);
    const me = u.user.id;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "schedule" ? "schedule" : "check";
    const s = body.session ?? {};
    const ids: string[] = Array.isArray(body.player_ids) ? [...new Set(body.player_ids.map(String))].slice(0, 60) as string[] : [];
    const date = String(s.scheduled_date ?? "");
    const intensity = (["light", "standard", "high"].includes(s.intensity) ? s.intensity : "standard") as PracticeIntensity;
    const throwing = s.throwing === true;
    const today = new Date().toISOString().slice(0, 10);
    if (!ids.length || !DATE.test(date)) return json({ error: "Pick players and a date" }, 400);
    if (date < today) return json({ error: "Pick today or a future date" }, 400);

    // Access: linked to the caller, then the child-safety gate.
    const linked = await Promise.all(ids.map(async (id) => {
      const { data, error } = await admin.rpc("is_linked_coach", { p_coach_id: me, p_player_id: id });
      return !error && data === true ? id : null;
    }));
    const allowedLinked = linked.filter(Boolean) as string[];
    const gate = await recruitingGate(admin, me, allowedLinked, "metrics");
    const allowed = allowedLinked.filter((id) => gate.get(id) === "visible");

    const from = shift(date, -14), to = shift(date, 14);
    const results = await Promise.all(allowed.map(async (pid) => {
      const [{ data: prof }, { data: ac }, { data: mpi }, { data: cal }, { data: gp }, { data: arm }] = await Promise.all([
        admin.from("profiles").select("full_name, date_of_birth").eq("id", pid).maybeSingle(),
        admin.from("athlete_context").select("competition_level").eq("user_id", pid).maybeSingle(),
        admin.from("athlete_mpi_settings").select("season_status").eq("user_id", pid).maybeSingle(),
        admin.from("calendar_events").select("event_date, event_type").eq("user_id", pid).is("deleted_at", null)
          .gte("event_date", date).lte("event_date", to).in("event_type", ["rest", "game", "tournament", "scrimmage"]).limit(200),
        admin.from("gp_games").select("game_date").eq("user_id", pid).is("deleted_at", null).gte("game_date", date).lte("game_date", to)
          .not("status", "in", "(canceled,cancelled,rescheduled)").limit(200),
        admin.from("arm_ledger_entries").select("entry_date, source, throw_type, count, status").eq("user_id", pid)
          .gte("entry_date", from).lte("entry_date", today).limit(2000),
      ]);
      const rest = new Set<string>(), games = new Set<string>();
      for (const e of (cal ?? []) as any[]) (e.event_type === "rest" ? rest : games).add(String(e.event_date));
      for (const g of (gp ?? []) as any[]) games.add(String(g.game_date));
      const age = ageFromDob((prof as any)?.date_of_birth ?? null, today);
      const ntd = nextThrowDate(age, (ac as any)?.competition_level ?? null, (arm ?? []) as any[], today);
      let open: string | null = null;
      for (let i = 1; i <= 14 && !open; i++) { const d = shift(date, i); if (!rest.has(d) && !games.has(d)) open = d; }
      const r = checkPracticeSafety({
        date, intensity, throwing,
        isRestDay: rest.has(date), gameOnDate: games.has(date), gameNextDay: games.has(shift(date, 1)),
        inSeason: (mpi as any)?.season_status === "in_season", nextThrowDate: ntd,
      }, open);
      return { player_id: pid, name: (prof as any)?.full_name ?? "Player", ...r };
    }));
    const refused = ids.filter((id) => !allowed.includes(id)).map((id) => ({ player_id: id, reason: "You can't schedule for this player." }));

    if (mode === "check") return json({ results, refused });

    const ok = results.filter((r) => r.ok).map((r) => r.player_id);
    if (ok.length) {
      const kind = KINDS[String(s.session_type)] ?? "team";
      const minutes = Number.isFinite(Number(s.duration_minutes)) ? Math.max(15, Math.min(240, Math.round(Number(s.duration_minutes)))) : null;
      const rows = ok.map((pid) => ({
        user_id: pid, created_by: me, coach_id: me,
        session_module: String(s.session_module ?? "hitting").slice(0, 40),
        session_type: String(s.session_type ?? "team_session").slice(0, 40),
        title: String(s.title ?? "Practice").slice(0, 120),
        description: [throwing ? "Includes throwing." : "No throwing.", s.description ? String(s.description).slice(0, 1000) : ""].filter(Boolean).join(" "),
        scheduled_date: date, start_time: s.start_time || null, end_time: s.end_time || null,
        sport: s.sport === "softball" ? "softball" : "baseball",
        team_id: s.team_id || null, organization_id: s.organization_id || null,
        assignment_scope: s.team_id ? "team" : (s.organization_id ? "organization" : "individual"),
        team_name: s.team_name ? String(s.team_name).slice(0, 80) : null,
        practice_kind: kind, intensity, duration_minutes: minutes,
        status: "pending_approval", requires_approval: true,
      }));
      const { error } = await admin.from("scheduled_practice_sessions").insert(rows);
      if (error) return json({ error: "Could not schedule" }, 500);
    }
    return json({ scheduled: ok, results, refused });
  } catch (_e) {
    return json({ error: "Something went wrong" }, 500);
  }
});
