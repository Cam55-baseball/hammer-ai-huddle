// Owner Nov 5 round 3, Group B: reads this week's games/saved sprints for the in-season sprint plan.
// Self-scoped reads (the athlete's own user_id). Any read failure → read_failed and a conservative
// day (game rules + flush), never invented credit.
import {
  gameCredit, dayCredit, inSeasonSprintDay, postGameTopup, countsAsRunningSession, speedEligible, topupEligible,
  type GameCredit,
} from "../_shared/wic/conditioning/inSeasonSprints.ts";
import { sessionBases } from "../_shared/wic/conditioning/positionSprints.ts";

export class InSeasonDone extends Error {}

const shift = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const mondayOf = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`).getUTCDay(); return shift(iso, -((d + 6) % 7)); };

export interface InSeasonPlan {
  kind: string; bases: number; maxIntent: boolean; flush: boolean; because: string;
  postGame?: { bases: number; because: string } | null; credit?: GameCredit | null;
  weekBases: number; weekSessions: number; readFailed: boolean;
}

export async function planInSeasonSprints(o: {
  admin: any; userId: string; planDate: string; capacity: number; sport: "baseball" | "softball";
  gameOn: (d: string) => boolean; lowReadiness: boolean; withRoute: (r: any) => any;
}): Promise<InSeasonPlan> {
  const { admin, userId, planDate, capacity, sport, gameOn } = o;
  const mon = mondayOf(planDate);
  const yesterday = shift(planDate, -1);
  const from = mon < yesterday ? mon : yesterday;
  let readFailed = false;
  const credits: GameCredit[] = [];
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
      admin.from("gp_defense_plays").select("game_id").eq("user_id", userId).in("game_id", ids).limit(2000),
    ]);
    if (ab.error || br.error || df.error) readFailed = true;
    for (const x of games) credits.push(gameCredit({
      date: x.game_date,
      atBatResults: ((ab.data ?? []) as any[]).filter((r) => r.game_id === x.id).map((r) => r.result),
      baserun: ((br.data ?? []) as any[]).filter((r) => r.game_id === x.id),
      defenseChances: ((df.data ?? []) as any[]).filter((r) => r.game_id === x.id).length,
      selfReportedAtBats: x.self_reported_at_bats ?? null,
    }));
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
    if (countsAsRunningSession(total)) weekSessions++;
    if (own.some((r) => r.why_payload?.position_sprints?.day_kind === "speed")) speedDone = true;
  }
  const yGame = dayCredit(credits, yesterday);
  const sunday = shift(mon, 6);
  const laterDays: string[] = [];
  for (let d = shift(planDate, 1); d < sunday; d = shift(d, 1)) laterDays.push(d);
  const laterSpeed = laterDays.filter((d) => speedEligible({ gameToday: gameOn(d), gameTomorrow: gameOn(shift(d, 1)), yesterdayGame: null, hardYesterday: false, lowReadiness: false }, capacity) === "ideal").length;
  const laterTop = laterDays.filter((d) => topupEligible({ gameToday: gameOn(d), gameTomorrow: gameOn(shift(d, 1)), yesterdayGame: null }, capacity)).length;

  const facts = {
    gameToday: gameOn(planDate), gameTomorrow: gameOn(shift(planDate, 1)), yesterdayGame: yGame,
    hardYesterday: hardDay(yesterday), lowReadiness: o.lowReadiness, weekBases, weekRunningSessions: weekSessions,
    speedDoneThisWeek: speedDone || readFailed, laterSpeedChances: laterSpeed, laterTopupChances: laterTop,
  };
  const day = inSeasonSprintDay(capacity, facts);
  const postGame = facts.gameToday ? postGameTopup(capacity, weekSessions) : null;
  return { ...day, postGame, credit: yGame, weekBases, weekSessions, readFailed };
}
