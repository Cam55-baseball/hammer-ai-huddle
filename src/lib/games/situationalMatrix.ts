/**
 * situationalMatrix — canonical base/out states for situational hitting plans.
 *
 * Keys are stable strings so they round-trip cleanly through plan_json,
 * gp_plan_outcomes.recommendation_key, and the AI prompt schema.
 *
 * Why a fixed matrix:
 *  - The AI generates per-state guidance against the SAME keys every time,
 *    so the UI can render the right card the instant the runner state changes.
 *  - gp_plan_outcomes can attribute success ("worked: true") to the exact
 *    situation, feeding gp_planner_priors with correctly-bucketed signal.
 */

export type BaseState =
  | "bases_empty"
  | "runner_1B"
  | "runner_2B"
  | "runner_3B"
  | "runners_1B_2B"
  | "runners_1B_3B"
  | "runners_2B_3B"
  | "bases_loaded";

export type OutState = "0out" | "1out" | "2out";

export interface SituationKey {
  key: string;             // e.g. "runner_2B_0out"
  bases: BaseState;
  outs: OutState;
  label: string;           // human-readable
  /** Default tactical goal the AI should respect when sharper context is missing. */
  default_goal: string;
}

const baseLabel: Record<BaseState, string> = {
  bases_empty: "Bases empty",
  runner_1B: "Runner on 1B",
  runner_2B: "Runner on 2B",
  runner_3B: "Runner on 3B",
  runners_1B_2B: "Runners 1B & 2B",
  runners_1B_3B: "Runners 1B & 3B",
  runners_2B_3B: "Runners 2B & 3B",
  bases_loaded: "Bases loaded",
};

const baseOrder: BaseState[] = [
  "bases_empty",
  "runner_1B",
  "runner_2B",
  "runner_3B",
  "runners_1B_2B",
  "runners_1B_3B",
  "runners_2B_3B",
  "bases_loaded",
];

const outOrder: OutState[] = ["0out", "1out", "2out"];

function goalFor(bases: BaseState, outs: OutState): string {
  // Concise default — the AI may override with pitcher-specific guidance.
  if (bases === "bases_empty") return "Get on. Damage in your zone, no give-away ABs.";
  if (bases === "runner_2B" && outs !== "2out") return "Right side: ground or deep fly to RF/RF-gap to push the runner to 3B.";
  if (bases === "runner_3B" && outs !== "2out") return "Get the run in: deep fly, ground ball middle/away, no infield pop.";
  if (bases === "runners_1B_3B" && outs !== "2out") return "RBI + avoid double play. Stay through middle, line drive over the SS.";
  if (bases === "bases_loaded" && outs !== "2out") return "Hit something hard. Walk works. Pop-up and weak GB to pull side kill the inning.";
  if (outs === "2out") return "Extend the inning: tight zone, work the count, line drive any field.";
  if (bases === "runner_1B") return "Advance the runner. Hit-and-run aware. Don't roll over to 2B.";
  return "Tight zone. Hard contact in your zone. Take what they give.";
}

export const SITUATION_MATRIX: SituationKey[] = baseOrder.flatMap((bases) =>
  outOrder.map<SituationKey>((outs) => ({
    key: `${bases}_${outs}`,
    bases,
    outs,
    label: `${baseLabel[bases]} · ${outs.replace("out", " out")}`,
    default_goal: goalFor(bases, outs),
  }))
);

/** Compute the live base/out state from gp_baserun_events for a given inning. */
export function computeBaseOutKey(args: {
  runnersOnBase: { base: 1 | 2 | 3 }[];
  outs: number;
}): string {
  const bases = new Set(args.runnersOnBase.map((r) => r.base));
  const b: BaseState = (() => {
    const on1 = bases.has(1);
    const on2 = bases.has(2);
    const on3 = bases.has(3);
    if (on1 && on2 && on3) return "bases_loaded";
    if (on2 && on3) return "runners_2B_3B";
    if (on1 && on3) return "runners_1B_3B";
    if (on1 && on2) return "runners_1B_2B";
    if (on3) return "runner_3B";
    if (on2) return "runner_2B";
    if (on1) return "runner_1B";
    return "bases_empty";
  })();
  const o: OutState = args.outs >= 2 ? "2out" : args.outs === 1 ? "1out" : "0out";
  return `${b}_${o}`;
}

export function findSituation(key: string): SituationKey | undefined {
  return SITUATION_MATRIX.find((s) => s.key === key);
}

/** Canonical count grid (0-0 through 3-2) — used by CountPlanGrid + AI prompt. */
export const COUNT_KEYS = [
  "0-0", "0-1", "0-2",
  "1-0", "1-1", "1-2",
  "2-0", "2-1", "2-2",
  "3-0", "3-1", "3-2",
] as const;
export type CountKey = (typeof COUNT_KEYS)[number];
