/** Owner-authored program policy. Inputs must be sourced; this module never creates a training day. */
import { BUNT_TYPES, type BuntSide, type BuntType } from './buntingMastery.ts';
export { BUNT_TYPES, BUNT_WORDING, type BuntSide, type BuntType } from './buntingMastery.ts';
export type BuntOutcome = { side: BuntSide; type: BuntType; attempts: number; successes: number };
export function validBuntOutcome(outcome: BuntOutcome): boolean {
  return ["R", "L"].includes(outcome.side) && BUNT_TYPES.includes(outcome.type) &&
    Number.isInteger(outcome.attempts) && outcome.attempts > 0 && Number.isInteger(outcome.successes) &&
    outcome.successes >= 0 && outcome.successes <= outcome.attempts;
}
export interface BuntingFacts {
  sport: "baseball" | "softball";
  modules: readonly string[];
  bats: "R" | "L" | "S" | null;
  /** Explicit current player evidence, not an inferred speed/power threshold. */
  speedy?: boolean; lacksPower?: boolean; leftPower?: boolean; powerGoal?: boolean;
  lowAverage?:number;
  /** Canonical game counts. Missing or invalid counts never mean a low average. */
  battingGames?: readonly { hits: number; atBats: number }[];
  /** Latest completed data window; presence supersedes legacy game samples, including unknown. */
  battingWindow?: {start:number;end:number;hits:number;atBats:number;homeRuns:number;sourceIds:readonly string[]}|null;
  outcomes?: readonly BuntOutcome[];
  /** Existing legal training weekdays only, 0=Sunday. Rest and game days excluded by caller. */
  legalWeekdays: readonly number[];
  restDay: boolean; gameDay: boolean;
  opponentThrows?: "L" | "R" | null;
}
export function buntingProgram(facts: BuntingFacts) {
  const included = facts.modules.some(module => [`${facts.sport}_5tool`, `${facts.sport}_golden2way`].includes(module));
  const games = (facts.battingGames ?? []).filter(game => Number.isInteger(game.hits) && Number.isInteger(game.atBats) && game.atBats > 0 && game.hits >= 0 && game.hits <= game.atBats);
  const atBats = games.reduce((sum, game) => sum + game.atBats, 0);
  const hits = games.reduce((sum, game) => sum + game.hits, 0);
  // Repeated below-.300 observations, always exposed with game/AB sample size. No universal sample sufficiency claim.
  const window = facts.battingWindow;
  const validWindow = window != null && Number.isInteger(window.start) && window.start >= 1 &&
    Number.isInteger(window.end) && window.end >= window.start && Number.isInteger(window.atBats) &&
    window.atBats === window.end-window.start+1 && Number.isInteger(window.hits) && window.hits >= 0 && window.hits <= window.atBats;
  const lowAverage=facts.lowAverage??.300;
  const under300 = facts.battingWindow !== undefined ? validWindow && window.hits / window.atBats < lowAverage : games.length >= 2 && games.every(game => game.hits / game.atBats < lowAverage);
  const sides: BuntSide[] = facts.bats === "S" ? ["R", "L"] : facts.bats ? [facts.bats] : [];
  const wantedSessions = facts.speedy === true || facts.lacksPower === true ? 3 : 2;
  const weekdays = [...new Set(facts.legalWeekdays)].filter(day => Number.isInteger(day) && day >= 0 && day <= 6).sort((a,b) => a-b).slice(0, 6);
  const scheduled = included && sides.length ? weekdays.slice(0, wantedSessions) : [];
  const dose = (side: BuntSide, type: BuntType) => {
    const floor = under300 || side === "L" && (facts.leftPower === true || facts.powerGoal === true) ? 7 : 5;
    const logs = (facts.outcomes ?? []).filter(outcome => outcome.side === side && outcome.type === type && validBuntOutcome(outcome));
    const attempts = logs.reduce((sum, log) => sum + log.attempts, 0);
    const successes = logs.reduce((sum, log) => sum + log.successes, 0);
    return { reps: attempts ? Math.min(20, floor + Math.round((20 - floor) * (1 - successes / attempts))) : floor,
      floor, attempts, successes, successRate: attempts ? successes / attempts : null };
  };
  const typesFor = (side: BuntSide) => BUNT_TYPES.filter(type => type !== "push" || facts.opponentThrows === "L" && !(side === "L" && facts.bats === "S"));
  return { included, sides, scheduled, wantedSessions, constrained: scheduled.length < wantedSessions,
    canTrainToday: included && sides.length > 0 && !facts.restDay && !facts.gameDay,
    battingSample: { games: games.length, atBats:validWindow?window.atBats:atBats, hits:validWindow?window.hits:hits, average:validWindow?window.hits/window.atBats:atBats?hits/atBats:null, under300, window:validWindow?window:null }, dose, typesFor };
}