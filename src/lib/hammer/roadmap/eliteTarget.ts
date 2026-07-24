/**
 * Elite Target Model — the "north star" the roadmap builds toward.
 *
 * Pure data, no I/O. Referenced by the ladder + explainer UI so athletes see
 * exactly what capacity level the program is building toward.
 *
 * Numbers are conservative real-world reference points for the top of pro
 * baseball (MLB) and pro softball (AUSL) 6-high-level-games-per-week loads.
 * They are used as descriptive endpoints — the plan engine never rewrites
 * organism truth from these values.
 */

export type EliteSport = "baseball" | "softball";

export interface EliteTarget {
  readonly sport: EliteSport;
  readonly league: string;
  readonly gamesPerWeekHigh: number;
  readonly weeklyThrowsCeiling: number;   // healthy sustained cap
  readonly liftSessionsPerWeek: number;
  readonly speedSessionsPerWeek: number;
  readonly batSpeedSessionsPerWeek: number;
  readonly notes: string;
}

export const ELITE_TARGETS: Record<EliteSport, EliteTarget> = {
  baseball: {
    sport: "baseball",
    league: "MLB",
    gamesPerWeekHigh: 6,
    weeklyThrowsCeiling: 250,
    liftSessionsPerWeek: 3,
    speedSessionsPerWeek: 2,
    batSpeedSessionsPerWeek: 4,
    notes:
      "MLB position players sustain 6 high-level games/week for months. The plan builds you toward that capacity — heavier and faster only when your training-age and recovery clock earn it.",
  },
  softball: {
    sport: "softball",
    league: "AUSL",
    gamesPerWeekHigh: 6,
    weeklyThrowsCeiling: 220,
    liftSessionsPerWeek: 3,
    speedSessionsPerWeek: 2,
    batSpeedSessionsPerWeek: 4,
    notes:
      "AUSL position players face a compressed 6-game week. Arm capacity, bat-speed density, and short-burst speed are the endpoints the program builds you toward.",
  },
};

export function resolveEliteTarget(sport: string | null): EliteTarget {
  return sport === "softball" ? ELITE_TARGETS.softball : ELITE_TARGETS.baseball;
}
