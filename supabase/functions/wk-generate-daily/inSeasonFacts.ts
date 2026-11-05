// Owner Nov 5 round 3, Group B: reads this week's games/saved sprints for the in-season sprint plan.
// Self-scoped reads (the athlete's own user_id). Any read failure → read_failed and a conservative
// day (game rules + flush), never invented credit.
import {
  gameCredit, dayCredit, inSeasonSprintDay, postGameTopup, countsAsRunningSession, speedEligible, topupEligible,
  ownBasesPerPa, dayLoadScore, DEFAULT_IN_SEASON_STANDARDS, type GameCredit, type InSeasonStandards,
} from "../_shared/wic/conditioning/inSeasonSprints.ts";
import { sessionBases } from "../_shared/wic/conditioning/positionSprints.ts";

export class InSeasonDone extends Error {}

const shift = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const mondayOf = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`).getUTCDay(); return shift(iso, -((d + 6) % 7)); };

export interface InSeasonPlan {
  kind: string; bases: number; maxIntent: boolean; flush: boolean; because: string; sprintPrep?: boolean; ownBasesPerPa?: number | null;
  postGame?: { bases: number; because: string } | null; credit?: GameCredit | null;
  weekBases: number; weekSessions: number; readFailed: boolean;
}

export async function planInSeasonSprints(o: {
  admin: any; userId: string; planDate: string; capacity: number; sport: "baseball" | "softball";
  gameOn: (d: string) => boolean; lowReadiness: boolean; withRoute: (r: any) => any; std?: InSeasonStandards;
}): Promise<InSeasonPlan> {
  const { admin, userId, planDate, capacity, sport, gameOn } = o;
  const std = o.std ?? DEFAULT_IN_SEASON_STANDARDS;
  const mon = mondayOf(planDate);
  const yesterday = shift(planDate, -1);
  // Owner r4: read the last 7 days too, so "the heaviest game" is judged across a full week of games.
  const weekAgo = shift(planDate, -7);
  const from = mon < weekAgo ? mon : weekAgo;
  let readFailed = false;
  const credits: GameCredit[] = [];
  // Owner r4: the morning at-bats estimate uses the player's OWN bases per plate appearance once
  // they have enough logged plate appearances (last 120 days, logged games only); else the default.
  let own: number | null = null;
  try {
    const since = shift(planDate, -120);
    const og = await admin.from("gp_games").select("id").eq("user_id", userId).is("deleted_at", null).eq("ignored_for_training", false).gte("game_date", since).lt("game_date", planDate).limit(300);
    const oids = ((og.data ?? []) as any[]).map((x) => x.id);
    if (!og.error && oids.length) {
      const [oab, obr] = await Promise.all([
        admin.from("gp_at_bats").select("result").eq("user_id", userId).in("game_id", oids).limit(3000),
        admin.from("gp_baserun_events").select("event_type, base_from, base_to").eq("user_id", userId).in("game_id", oids).limit(3000),
      ]);
      if (!oab.error && !obr.error) own = ownBasesPerPa(((oab.data ?? []) as any[]).map((r) => r.result), (obr.data ?? []) as any[], std);
    }
  } catch { own = null; }
  const g = await admin.from("gp_games").select("id, game_date, self_reported_at_bats")
    .eq("user_id", userId).is("deleted_at", null).eq("ignored_for_training", false)
    .gte("game_date", from).lt("game_date", planDate).limit(50);
  if (g.error) readFailed = true;
  const games = (g.data ?? []) as any[];
  if (games.length) {
    const ids = games.map((x) => x.id);
    const [ab, br, df] = await Promise.all([
      admin.from("gp_at_bats").select("game_id, result").eq("user_id", userId).in("game_id", ids).limit(1000),
      admin.from("gp_baserun_events").select("game_id, event_type, base_from, base_to").eq("user_id", userId).in("game_id", ids).limit(1000),
      admin.from("gp_defense_plays").select("game_id, position").eq("user_id", userId).in("game_id", ids).limit(2000),
    ]);
    if (ab.error || br.error || df.error) readFailed = true;
    for (const x of games) credits.push(gameCredit({
      date: x.game_date,
      atBatResults: ((ab.data ?? []) as any[]).filter((r) => r.game_id === x.id).map((r) => r.result),
      baserun: ((br.data ?? []) as any[]).filter((r) => r.game_id === x.id),
      defenseChances: ((df.data ?? []) as any[]).filter((r) => r.game_id === x.id).length,
      defensePositions: ((df.data ?? []) as any[]).filter((r) => r.game_id === x.id).map((r) => r.position ?? null),
      selfReportedAtBats: x.self_reported_at_bats ?? null,
      ownBasesPerPa: own,
    }, std));
  }
  // Scheduled-but-unlogged game yesterday → unknown credit (treated as heavy for recovery).
  if (gameOn(yesterday) && !credits.some((c) => c.date === yesterday)) credits.push({ date: yesterday, bases: 0, source: "unknown" });

  const saved = await admin.from("wk_prescriptions").select("plan_date, slot, movement_slug, sets, reps, distance_feet, why_payload")
    .eq("user_id", userId).gte("plan_date", from).lt("plan_date", planDate).in("slot", ["speed", "conditioning"]).limit(500);
  if (saved.error) readFailed = true;
  const rows = ((saved.data ?? []) as any[]);
  let weekBases = 0, weekSessions = 0, speedDone = false;
  const hardDay = (d: string) => {
    const own = rows.filter((r) => r.plan_date === d);
    return own.some((r) => r.why_payload?.position_sprints?.day_kind === "speed") || sessionBases(own.map(o.withRoute), sport) >= Math.ceil(capacity * 0.75);
  };
  for (let d = mon; d < planDate; d = shift(d, 1)) {
    const own = rows.filter((r) => r.plan_date === d);
    const total = sessionBases(own.map(o.withRoute), sport) + (dayCredit(credits, d)?.bases ?? 0);
    weekBases += total;
    if (countsAsRunningSession(total, std)) weekSessions++;
    if (own.some((r) => r.why_payload?.position_sprints?.day_kind === "speed")) speedDone = true;
  }
  const yGame = dayCredit(credits, yesterday);
  const sunday = shift(mon, 6);
  const laterDays: string[] = [];
  for (let d = shift(planDate, 1); d < sunday; d = shift(d, 1)) laterDays.push(d);
  const laterIdeal = laterDays.filter((d) => speedEligible({ gameToday: gameOn(d), gameTomorrow: gameOn(shift(d, 1)), yesterdayGame: null, hardYesterday: false, lowReadiness: false }, capacity, std) === "ideal");
  const laterSpeed = laterIdeal.length;
  const laterTop = laterDays.filter((d) => topupEligible({ gameToday: gameOn(d), gameTomorrow: gameOn(shift(d, 1)), yesterdayGame: null }, capacity, std)).length;
  // Owner r4: speed goes on the week's LIGHTEST day, never the day after the heaviest game.
  const todayLoad = dayLoadScore(gameOn(yesterday), gameOn(shift(planDate, 1)));
  const laterLighter = laterIdeal.filter((d) => dayLoadScore(gameOn(shift(d, -1)), gameOn(shift(d, 1))) < todayLoad).length;
  const weekCredits = credits.filter((c) => c.date >= weekAgo && c.date < planDate);
  const heaviest = weekCredits.length ? Math.max(...weekCredits.map((c) => c.source === "unknown" ? Infinity : c.bases)) : -1;
  const yesterdayWasHeaviest = !!yGame && (yGame.source === "unknown" ? true : yGame.bases >= heaviest);

  const facts = {
    gameToday: gameOn(planDate), gameTomorrow: gameOn(shift(planDate, 1)), yesterdayGame: yGame,
    hardYesterday: hardDay(yesterday), lowReadiness: o.lowReadiness, weekBases, weekRunningSessions: weekSessions,
    speedDoneThisWeek: speedDone || readFailed, laterSpeedChances: laterSpeed, laterTopupChances: laterTop,
    yesterdayWasHeaviestGame: yesterdayWasHeaviest, laterLighterSpeedDays: laterLighter,
  };
  const day = inSeasonSprintDay(capacity, facts, std);
  const postGame = facts.gameToday ? postGameTopup(capacity, weekSessions, std) : null;
  return { ...day, postGame, credit: yGame, weekBases, weekSessions, readFailed, ownBasesPerPa: own };
}
