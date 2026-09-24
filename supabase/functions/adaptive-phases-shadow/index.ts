// Adaptive phases — SHADOW mode (spec §3–§6, §10). Computes and stores each
// athlete's phase plan. Writes ONLY adaptive_phase_credit / adaptive_phase_shadow.
// Never touches wk_prescriptions or any card. Staff/cron only, or one athlete
// re-planning themself after a Tell Hammers save.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  planAthlete, addDays, type WeekRecord, type Discipline, type PhaseKey, type Goal, type ScheduleAnswer, type SeasonState,
} from "../_shared/wic/phases/adaptivePhases.ts";
import { resolveSeasonPhase } from "../_shared/seasonPhase.ts";
import { isSwitchOnFor } from "../_shared/wic/flags/featureSwitches.ts";
import {
  OUTCOMES_VERSION, METRIC_KEYS, LOWER_IS_BETTER, OUTCOME_METRICS, outcomeLinks, stepFeedback, defaultFeedback, painPatterns,
  type OutcomeObs, type PainObs, type FeedbackState, type OutcomeMetric,
} from "../_shared/wic/phases/outcomes.ts";

/** Stage C — outcome links, bounded feedback and pain patterns. Writes ONLY phase_insights. */
async function stageC(admin: any, today: string, ids: string[]) {
  const since = addDays(today, -365);
  const [tests, credit, pains, shadows, prev] = await Promise.all([
    admin.from("vault_performance_tests").select("user_id,test_date,results").gte("test_date", since).order("test_date"),
    admin.from("adaptive_phase_credit").select("user_id,phase,week_start,sessions_done,sessions_prescribed").gte("week_start", since),
    admin.from("schedule_timeline_entries").select("user_id,start_date,payload").eq("tag", "PAIN").is("undone_at", null).gte("start_date", since),
    admin.from("adaptive_phase_shadow").select("user_id,plan_date,plan").gte("plan_date", since),
    admin.from("phase_insights").select("report").eq("scope", "owner").order("computed_on", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const byUser = new Map<string, any[]>();
  for (const t of tests.data ?? []) byUser.set(t.user_id, [...(byUser.get(t.user_id) ?? []), t]);
  const obs: OutcomeObs[] = [];
  for (const [uid, rows] of byUser) {
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1], b = rows[i];
      const cr = (credit.data ?? []).filter((c: any) => c.user_id === uid && c.week_start >= a.test_date && c.week_start < b.test_date);
      const phaseWeeks = new Set(cr.map((c: any) => c.week_start)).size;
      const pres = cr.reduce((s: number, c: any) => s + c.sessions_prescribed, 0);
      const adherence = pres ? cr.reduce((s: number, c: any) => s + c.sessions_done, 0) / pres : 0;
      const spacingDays = phaseWeeks && pres ? (phaseWeeks * 7) / Math.max(1, pres / Math.max(1, new Set(cr.map((c: any) => c.phase)).size)) : 0;
      for (const m of OUTCOME_METRICS) {
        const k = METRIC_KEYS[m].find((key) => typeof a.results?.[key] === "number" && typeof b.results?.[key] === "number" && a.results[key] > 0);
        if (!k) continue;
        let pct = ((b.results[k] - a.results[k]) / a.results[k]) * 100;
        if (LOWER_IS_BETTER[m as OutcomeMetric]) pct = -pct;
        obs.push({ athlete: uid, metric: m as OutcomeMetric, changePct: pct, phaseWeeks, adherence, spacingDays });
      }
    }
  }
  const links = outcomeLinks(obs);
  const prevFb: FeedbackState = prev.data?.report?.feedback ?? defaultFeedback();
  const isMonday = new Date(today + "T00:00:00Z").getUTCDay() === 1;
  // Comparison of adjusted vs default needs athletes who actually trained on adjusted shares; none until the switch is on.
  const feedback = isMonday ? stepFeedback(prevFb, links, { adjustedMeanPct: null, defaultMeanPct: null, n: 0 }, today) : prevFb;

  const phaseOn = (uid: string, d: string) => {
    const s = (shadows.data ?? []).filter((x: any) => x.user_id === uid && x.plan_date <= d).sort((x: any, y: any) => y.plan_date.localeCompare(x.plan_date))[0];
    return s?.plan?.phaseName ?? null;
  };
  const painObs: PainObs[] = (pains.data ?? []).map((p: any) => ({ athlete: p.user_id, date: p.start_date, region: String(p.payload?.region ?? "unspecified"), severity: String(p.payload?.severity ?? ""), phase: phaseOn(p.user_id, p.start_date) }));
  const ownerPatterns = painPatterns(painObs, "owner");
  await admin.from("phase_insights").delete().eq("scope", "owner").eq("computed_on", today);
  await admin.from("phase_insights").insert({ scope: "owner", user_id: null, computed_on: today, version: OUTCOMES_VERSION, report: { links, feedback, painPatterns: ownerPatterns, observations: obs.length } });
  const athleteRows = ids.map((uid) => ({ scope: "athlete", user_id: uid, computed_on: today, version: OUTCOMES_VERSION, report: { painPatterns: painPatterns(painObs.filter((p) => p.athlete === uid), "athlete") } }));
  for (let i = 0; i < athleteRows.length; i += 200) await admin.from("phase_insights").upsert(athleteRows.slice(i, i + 200), { onConflict: "scope,user_id,computed_on" });
  return { links: links.filter((l) => l.confidence !== "not enough data").length, observations: obs.length, feedbackVersion: feedback.version, feedbackEnabled: feedback.enabled, ownerPatterns: ownerPatterns.length };
}

const SLOT_DISC: Record<string, Discipline> = { lift: "lifting", speed: "speed", bat_speed: "bat_speed", throwing: "throwing" };
const BLOCK_PHASE: Record<string, PhaseKey> = { B1: "P1", B2: "P1", B4: "P2", B5: "P3" };
const SEASON_MAP: Record<string, SeasonState> = { off_season: "offseason", preseason: "preseason", in_season: "in_season", post_season: "post_season" };
const REGION_DISC: Record<string, Discipline> = {
  shoulder: "throwing", ucl: "throwing", elbow: "throwing", forearm: "throwing",
  wrist: "bat_speed", hand: "bat_speed",
  hip: "speed", knee: "speed", ankle: "speed", foot: "speed", hamstring: "speed", quad: "speed", groin: "speed", calf: "speed", achilles: "speed",
  back: "lifting",
};

function monday(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(iso, -dow);
}

function goalOf(ctx: any): Goal {
  const s = JSON.stringify([ctx?.goal_summary, ctx?.category_goals, ctx?.goal_priority_rank] ?? "").toLowerCase();
  if (/health|injur|stay/.test(s)) return "stay_healthy";
  if (/throw|velo|pitch/.test(s)) return "throw_harder";
  if (/fast|speed|sprint/.test(s)) return "get_faster";
  if (/hit|bat|exit|power/.test(s)) return "hit_harder";
  return null;
}

async function planOne(admin: any, userId: string, today: string, trigger: string, shares?: Record<"P1" | "P2" | "P3", number>) {
  const since = addDays(today, -26 * 7);
  const [rx, done, mpi, ctx, tl, games, pains, pastGames, pastTl, answers] = await Promise.all([
    admin.from("wk_prescriptions").select("plan_date,slot,why_payload").eq("user_id", userId).gte("plan_date", since).lte("plan_date", today),
    admin.from("hammer_daily_task_completions").select("plan_date").eq("user_id", userId).eq("completed", true).gte("plan_date", since),
    admin.from("athlete_mpi_settings").select("season_status,season_status_manual,preseason_start_date,preseason_end_date,in_season_start_date,in_season_end_date,post_season_start_date,post_season_end_date").eq("user_id", userId).maybeSingle(),
    admin.from("athlete_context").select("goal_summary,category_goals,goal_priority_rank").eq("user_id", userId).maybeSingle(),
    admin.from("schedule_timeline_entries").select("tag,start_date,end_date,summary").eq("user_id", userId).is("undone_at", null).gte("end_date", today),
    admin.from("gp_games").select("game_date").eq("user_id", userId).gt("game_date", today).order("game_date").limit(1),
    admin.from("schedule_timeline_entries").select("id,payload").eq("user_id", userId).eq("tag", "PAIN").is("undone_at", null).gte("start_date", addDays(today, -14)),
    admin.from("gp_games").select("game_date").eq("user_id", userId).lte("game_date", today).order("game_date", { ascending: false }).limit(1),
    admin.from("schedule_timeline_entries").select("end_date").eq("user_id", userId).in("tag", ["GAME", "TOURNAMENT"]).is("undone_at", null).lte("start_date", today).order("start_date", { ascending: false }).limit(5),
    admin.from("schedule_timeline_entries").select("payload,start_date").eq("user_id", userId).eq("tag", "NOTE").is("undone_at", null).gte("start_date", addDays(today, -6)).order("start_date", { ascending: false }).limit(10),
  ]);

  const season = mpi.data ? resolveSeasonPhase(mpi.data as any, today as any) : null;
  const inSeason = season?.phase === "in_season";
  const doneDays = new Set((done.data ?? []).map((r: any) => r.plan_date));

  // Weekly ledger rows (completed history only).
  const agg = new Map<string, WeekRecord & { days: Set<string>; doneSet: Set<string> }>();
  for (const r of rx.data ?? []) {
    const disc = SLOT_DISC[r.slot];
    if (!disc) continue;
    const bk = r.why_payload?.offseason_block?.key;
    const phase: PhaseKey | undefined = bk ? BLOCK_PHASE[bk] : (inSeason ? "P4" : undefined);
    if (!phase) continue;
    const wk = monday(r.plan_date);
    if (wk >= monday(today)) continue; // only finished weeks bank credit
    const k = `${disc}:${phase}:${wk}`;
    const a = agg.get(k) ?? { discipline: disc, phase, weekStart: wk, sessionsDone: 0, sessionsPrescribed: 0, days: new Set(), doneSet: new Set() };
    a.days.add(r.plan_date);
    if (doneDays.has(r.plan_date)) a.doneSet.add(r.plan_date);
    agg.set(k, a);
  }
  const fresh: WeekRecord[] = [...agg.values()].map((a) => ({ discipline: a.discipline, phase: a.phase, weekStart: a.weekStart, sessionsPrescribed: a.days.size, sessionsDone: a.doneSet.size }));
  if (fresh.length) {
    await admin.from("adaptive_phase_credit").upsert(
      fresh.map((f) => ({ user_id: userId, discipline: f.discipline, phase: f.phase, week_start: f.weekStart, sessions_done: f.sessionsDone, sessions_prescribed: f.sessionsPrescribed, updated_at: new Date().toISOString() })),
      { onConflict: "user_id,discipline,phase,week_start" },
    );
  }
  // Ledger is append/upsert only; read the full banked history back.
  const { data: banked } = await admin.from("adaptive_phase_credit").select("discipline,phase,week_start,sessions_done,sessions_prescribed").eq("user_id", userId);
  const records: WeekRecord[] = (banked ?? []).map((b: any) => ({ discipline: b.discipline, phase: b.phase, weekStart: b.week_start, sessionsDone: b.sessions_done, sessionsPrescribed: b.sessions_prescribed }));

  // Hard date = earliest of next game, season start, timeline GAME/TOURNAMENT/EVENT.
  const entries = tl.data ?? [];
  const cands: { d: string; label: string; game: boolean }[] = [];
  if (games.data?.[0]?.game_date) cands.push({ d: games.data[0].game_date, label: "your next game", game: true });
  const iss = (mpi.data as any)?.in_season_start_date;
  if (iss && iss > today) cands.push({ d: iss, label: "the season starts", game: false });
  for (const e of entries) if (["GAME", "TOURNAMENT", "EVENT", "SEASON"].includes(e.tag) && e.start_date > today) cands.push({ d: e.start_date, label: e.summary || e.tag.toLowerCase(), game: e.tag === "GAME" || e.tag === "TOURNAMENT" });
  cands.sort((a, b) => a.d.localeCompare(b.d));
  const hard = cands[0] ?? null;

  // Last game day played (v1.1 §B measures gaps between game days).
  const lastCands = [pastGames.data?.[0]?.game_date, ...(pastTl.data ?? []).map((e: any) => (e.end_date <= today ? e.end_date : null))].filter(Boolean) as string[];
  const lastGameDate = lastCands.sort().reverse()[0] ?? null;

  let offDays = 0;
  let holdToday = false;
  for (const e of entries) {
    if (e.tag !== "HOLD") continue;
    if (e.start_date <= today && e.end_date >= today) holdToday = true;
    if (hard) {
      const s = e.start_date > today ? e.start_date : today;
      const en = e.end_date < hard.d ? e.end_date : addDays(hard.d, -1);
      if (en >= s) offDays += Math.round((Date.parse(en) - Date.parse(s)) / 86400000) + 1;
    }
  }
  // Pain holds one discipline (v1.1 §A); never changes the phase or any pain rule.
  const holds: { discipline: Discipline; reason: string }[] = [];
  for (const p of pains.data ?? []) {
    const disc = REGION_DISC[String(p.payload?.region ?? "")] ?? "lifting";
    if (!holds.some((h) => h.discipline === disc)) holds.push({ discipline: disc, reason: `${p.payload?.regionLabel ?? "Pain"} reported` });
  }
  const answerRow = (answers.data ?? []).find((n: any) => n.payload?.kind === "next_game_answer");
  const scheduleAnswer = (answerRow?.payload?.answer ?? null) as ScheduleAnswer | null;
  const iend = (mpi.data as any)?.in_season_end_date;
  const yearRound = inSeason && (!iend || (iss && Date.parse(iend) - Date.parse(iss) >= 40 * 7 * 86400000));
  const weeksIntoSeason = iss ? Math.max(0, Math.floor((Date.parse(today) - Date.parse(iss)) / (7 * 86400000))) : 0;
  const likely = iss && iss <= today ? addDays(iss, 364) : null;

  const plan = planAthlete({
    today, seasonState: SEASON_MAP[season?.phase ?? "off_season"] ?? "offseason",
    lastGameDate, hardDate: hard?.d ?? null, hardDateLabel: hard?.label ?? null, hardDateIsGame: hard?.game ?? false,
    yearRound: !!yearRound, offDaysInWindow: offDays, holdToday, holds, weeksIntoSeason, records,
    scheduleAnswer, likelyNextGame: likely && likely > today ? likely : null, shares,
    need: { goal: goalOf(ctx.data), benchmarkGapPhase: null, openPain: (pains.data ?? []).length > 0 },
  });
  await admin.from("adaptive_phase_shadow").upsert(
    { user_id: userId, plan_date: today, trigger, engine_version: plan.version, window_weeks: plan.windowWeeks, hard_date: plan.hardDate, plan },
    { onConflict: "user_id,plan_date" },
  );
  return plan;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    // The daily cron calls with the project key; that key may only run the
    // full shadow recompute (writes shadow tables only, never cards).
    const isCron = body.all === true && auth === Deno.env.get("SUPABASE_ANON_KEY");
    const isService = auth === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || isCron;
    let callerId: string | null = null;
    let staff = isService;
    if (!isService) {
      const { data } = await admin.auth.getUser(auth);
      callerId = data.user?.id ?? null;
      if (!callerId) return json({ error: "unauthorized" }, 401);
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
      staff = (roles ?? []).some((r: any) => r.role === "owner" || r.role === "admin");
    }
    if (body.all) {
      if (!staff) return json({ error: "forbidden" }, 403);
      const ids = new Set<string>();
      const { data: a } = await admin.from("athlete_mpi_settings").select("user_id");
      for (const r of a ?? []) ids.add(r.user_id);
      const { data: b } = await admin.from("wk_prescriptions").select("user_id").gte("plan_date", addDays(today, -60));
      for (const r of b ?? []) ids.add(r.user_id);
      const { data: sw } = await admin.from("wk_feature_switches").select("feature_key, mode, allowlist, updated_by").eq("feature_key", "phase_feedback").maybeSingle();
      const { data: lastOwner } = await admin.from("phase_insights").select("report").eq("scope", "owner").order("computed_on", { ascending: false }).limit(1).maybeSingle();
      const fb = lastOwner?.report?.feedback;
      const out: any[] = [];
      for (const id of ids) {
        const shares = fb?.enabled && isSwitchOnFor(sw as any, id) ? fb.shares : undefined;
        try { out.push({ user_id: id, plan: await planOne(admin, id, today, "daily", shares) }); }
        catch (e) { out.push({ user_id: id, error: String(e) }); }
      }
      let stage_c: any = null;
      try { stage_c = await stageC(admin, today, [...ids]); } catch (e) { stage_c = { error: String(e) }; }
      return json({ count: out.length, stage_c, results: out });
    }
    const target = staff && body.user_id ? body.user_id : callerId;
    if (!target) return json({ error: "user_id required" }, 400);
    const plan = await planOne(admin, target, today, body.trigger === "schedule_entry" ? "schedule_entry" : "manual");
    return json({ plan });
  } catch (e) {
    console.error("adaptive-phases-shadow", e);
    return json({ error: String(e) }, 500);
  }
});
