/**
 * v1.4 §3 — presentation demo athletes. Computed in the browser from the real
 * engines; never written to the database and never mixed with real athletes.
 */
import { planAthlete, type AthletePhasePlan, type SeasonState } from "../../../supabase/functions/_shared/wic/phases/adaptivePhases";
import {
  throwingProfile, tournamentStatus, tournamentRecoveryDays, ledgerDay, estimateThrows, highIntentPositionAllowed,
  type ThrowAthlete, type ThrowingProfile, type TournamentStatus, type LedgerDay,
} from "../../../supabase/functions/_shared/wic/phases/armLedger";
import type { RampDiscipline } from "../../../supabase/functions/_shared/wic/phases/rampLaw";

export interface DemoAthlete {
  id: string; name: string; label: string;
  athlete: ThrowAthlete;
  seasonState: SeasonState;
  gamesEveryDays: number | null;
  firstGameInDays: number | null;
  throwingDaysOff: number;
  otherDaysOff?: Partial<Record<RampDiscipline, number>>;
  tournament?: { days: number; thrown: number };
  startInDays?: number;
}

export const DEMO_TODAY = "2026-10-05";

export const DEMO_ATHLETES: DemoAthlete[] = [
  { id: "d13", name: "Maya, 13", label: "13-year-old", athlete: { sport: "baseball", role: "position", age: 13 }, seasonState: "offseason", gamesEveryDays: null, firstGameInDays: 60, throwingDaysOff: 10 },
  { id: "d16", name: "Jordan, 16", label: "High school, 16", athlete: { sport: "baseball", role: "pitcher", age: 16 }, seasonState: "preseason", gamesEveryDays: null, firstGameInDays: 21, throwingDaysOff: 35 },
  { id: "dcol", name: "Andre, 20", label: "College player", athlete: { sport: "baseball", role: "position", age: 20 }, seasonState: "in_season", gamesEveryDays: 3, firstGameInDays: 2, throwingDaysOff: 5, otherDaysOff: { lifting: 9 } },
  { id: "dmlb", name: "Luis, 27", label: "MLB, 162 games", athlete: { sport: "baseball", role: "pitcher", age: 27 }, seasonState: "in_season", gamesEveryDays: 1, firstGameInDays: 1, throwingDaysOff: 3, startInDays: 2 },
  { id: "dausl", name: "Kendall, 24", label: "AUSL pitcher", athlete: { sport: "softball", role: "pitcher", age: 24 }, seasonState: "in_season", gamesEveryDays: 2, firstGameInDays: 0, throwingDaysOff: 0, tournament: { days: 3, thrown: 352 } },
  { id: "dsbp", name: "Riley, 17", label: "Softball position player", athlete: { sport: "softball", role: "position", age: 17 }, seasonState: "in_season", gamesEveryDays: 4, firstGameInDays: 3, throwingDaysOff: 8 },
  { id: "d2w", name: "Sam, 17", label: "Two-way athlete", athlete: { sport: "baseball", role: "two_way", age: 17 }, seasonState: "in_season", gamesEveryDays: 4, firstGameInDays: 4, throwingDaysOff: 12, startInDays: 1 },
  { id: "dc", name: "Tess, 18", label: "Catcher", athlete: { sport: "softball", role: "pitcher_catcher", age: 18 }, seasonState: "in_season", gamesEveryDays: 3, firstGameInDays: 2, throwingDaysOff: 9 },
];

const shift = (d: string, n: number) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

export interface DemoView {
  plan: AthletePhasePlan; throwing: ThrowingProfile; today: LedgerDay;
  tournament: (TournamentStatus & { recoveryDays: number }) | null;
  highIntentPositionToday: boolean;
}

/** `postponeDays` simulates a schedule change: the next game moves back. */
export function buildDemo(d: DemoAthlete, postponeDays = 0): DemoView {
  const first = d.firstGameInDays === null ? null : d.firstGameInDays + postponeDays;
  const games: string[] = [];
  if (first !== null) {
    if (d.gamesEveryDays) for (let i = first; i < first + 42; i += d.gamesEveryDays) games.push(shift(DEMO_TODAY, i));
    else games.push(shift(DEMO_TODAY, first));
  }
  const past = d.gamesEveryDays && postponeDays === 0 ? shift(DEMO_TODAY, -d.gamesEveryDays) : null;
  const returned = shift(DEMO_TODAY, -3);
  const rampGap: Partial<Record<RampDiscipline, { daysOff: number; returnedOn: string } | null>> = {
    throwing: d.throwingDaysOff > 2 ? { daysOff: d.throwingDaysOff, returnedOn: returned } : null,
  };
  for (const [k, v] of Object.entries(d.otherDaysOff ?? {})) rampGap[k as RampDiscipline] = { daysOff: v!, returnedOn: returned };
  const pitcher = d.athlete.role !== "position" && d.athlete.role !== "catcher";
  const plan = planAthlete({
    today: DEMO_TODAY, seasonState: d.seasonState, lastGameDate: past, hardDate: games[0] ?? null, hardDateIsGame: games.length > 0,
    yearRound: d.seasonState === "in_season", weeksIntoSeason: d.seasonState === "in_season" ? 6 : 0, offDaysInWindow: 0, holdToday: false,
    records: [], need: { goal: null, openPain: false }, gameDates: games,
    rampGap, rampProfile: { age: d.athlete.age, isPitcher: pitcher, growthMode: (d.athlete.age ?? 99) <= 15, painLast90: {}, firstTime: {}, eliteClean: (d.athlete.age ?? 0) >= 23 },
  } as any);
  const tr = plan.ramps?.find((r) => r.discipline === "throwing");
  const throwing = throwingProfile(d.athlete, { seasonState: plan.seasonState, phase: plan.phase },
    d.throwingDaysOff > 2 ? { daysOff: d.throwingDaysOff, dayIndex: tr?.dayIndex ?? 3 } : null);
  const dayType = d.tournament ? "tournament" : games[0] === DEMO_TODAY ? "game" : "practice";
  return {
    plan, throwing, today: ledgerDay(d.athlete, estimateThrows(d.athlete, dayType)),
    tournament: d.tournament ? { ...tournamentStatus(d.tournament.days, d.tournament.thrown), recoveryDays: tournamentRecoveryDays(d.tournament.thrown) } : null,
    highIntentPositionToday: highIntentPositionAllowed(d.athlete, d.startInDays === undefined ? null : -d.startInDays),
  };
}
