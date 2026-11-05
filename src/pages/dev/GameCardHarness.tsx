/** Dev-only harness (not routed in production builds) for phone screenshots of the Game card. */
import { GameDayCard, type GameCardDemo } from "@/components/hammer/GameDayCard";
import { emptyLine } from "@/lib/games/gameDayCard";
import type { TrainingProgram } from "../../../supabase/functions/_shared/programAccess";

export default function GameCardHarness() {
  const p = new URLSearchParams(window.location.search);
  const program = (p.get("program") ?? "5tool") as TrainingProgram;
  const sport = (p.get("sport") ?? "baseball") as "baseball" | "softball";
  const state = p.get("state") ?? "before";
  const logged = state === "after";
  const line = logged ? (program === "pitcher"
    ? { ...emptyLine(), pitching: { pitches: 78, battersFaced: 22, innings: 5, outs: 1, strikeouts: 6, walks: 1, firstPitchStrikes: 14, twoBallCounts: 7, soft: 5, medium: 6, hard: 3, runnersOn: 6, stealsAllowed: 1, stealAttempts: 2 } }
    : { ...emptyLine(), position: "SS", chances: 4, errors: 0, steals: 1, runs: 1, atBats: [
        { result: "HR", inning: 1, runners: [2 as const] }, { result: "1B", inning: 3, runners: [3 as const], scored: 1 }, { result: "GO", inning: 5 }, { result: "K_swinging", inning: 7 }] }) : undefined;
  const demo: GameCardDemo = {
    program, sport, nowMinutes: state === "before" ? 9 * 60 : 21 * 60, line,
    game: { id: null, opponent: sport === "softball" ? "Lady Hawks" : "Eagles", time: "18:30", homeAway: "home", venue: "Riverside Field", status: logged ? "final" : "scheduled" },
    startOpen: state === "during", step: Number(p.get("step") ?? 0), pitched: program === "golden2way" ? p.get("pitched") === "1" : null,
  };
  return <main className="mx-auto max-w-md space-y-3 bg-background p-4"><GameDayCard demo={demo} /></main>;
}
