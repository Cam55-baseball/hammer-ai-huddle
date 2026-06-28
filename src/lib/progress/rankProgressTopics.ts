/**
 * rankProgressTopics — deterministic per-athlete ordering of Progress topics.
 * Pure ordering of existing surfaces. Never invents scores.
 */
export type ProgressTopicId = "pitching" | "readiness" | "workload" | "goals";

export interface RankContext {
  readonly isPitcher: boolean;
  readonly hasGameThisWeek: boolean;
  readonly hasEscalation: boolean;
  readonly topGoalCategory: string | null; // e.g. "throwing", "speed"
}

export interface RankedTopic {
  readonly id: ProgressTopicId;
  readonly weight: number;
}

const BASE: Record<ProgressTopicId, number> = {
  pitching: 40,
  readiness: 50,
  workload: 45,
  goals: 35,
};

export function rankProgressTopics(ctx: RankContext): ReadonlyArray<RankedTopic> {
  const w: Record<ProgressTopicId, number> = { ...BASE };
  if (ctx.isPitcher) w.pitching += 40;
  else w.pitching -= 20;
  if (ctx.hasGameThisWeek) {
    w.readiness += 25;
    w.workload += 25;
  }
  if (ctx.hasEscalation) w.goals += 30;
  if (ctx.topGoalCategory === "throwing" || ctx.topGoalCategory === "pitching") {
    w.pitching += 10;
  }
  return (Object.keys(w) as ProgressTopicId[])
    .map((id) => ({ id, weight: w[id] }))
    .sort((a, b) => b.weight - a.weight);
}
