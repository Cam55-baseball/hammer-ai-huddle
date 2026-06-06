/**
 * Post-Launch Observability — Funnel Reducer
 *
 * Pure projection over AsbEventRow[]. No writes. No smoothing.
 * Stages with `topic: null` are explicit instrumentation gaps; the reducer
 * surfaces them as `unobservable: true` rather than imputing.
 *
 * Constitutional posture: Phase 60 FC (replay-derived only), RR-9
 * (anti-engagement-optimization). Never feeds ranking or organism truth.
 */

import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export type StagePredicate = {
  /** Canonical topic id, prefix match. null = instrumentation gap. */
  topic: string | null;
  /** Optional payload filter. */
  match?: (row: AsbEventRow) => boolean;
};

export interface FunnelDef {
  name: string;
  cohort: "athlete" | "coach" | "recruiter" | "parent";
  stages: Array<{ stage: string; predicate: StagePredicate }>;
}

export interface StageMetrics {
  stage: string;
  entries: number;
  exits: number;
  completionPct: number;
  abandonmentPct: number;
  medianTimeToNextMs: number | null;
  unobservable: boolean;
  flags: string[];
}

export interface FunnelResult {
  name: string;
  cohort: FunnelDef["cohort"];
  windowStart: string;
  windowEnd: string;
  stages: StageMetrics[];
}

export const FUNNEL_DEFS: FunnelDef[] = [
  {
    name: "athlete",
    cohort: "athlete",
    stages: [
      { stage: "signup", predicate: { topic: "athlete.lifecycle.signup" } },
      { stage: "onboarding", predicate: { topic: "athlete.onboarding.completed" } },
      { stage: "first_session", predicate: { topic: "session.block.modified" } },
      { stage: "first_analysis", predicate: { topic: "athlete.readiness" } },
      { stage: "first_recommendation", predicate: { topic: null } },
      { stage: "second_session", predicate: { topic: "session.block.modified" } },
      { stage: "retained", predicate: { topic: "session.block.modified" } },
    ],
  },
  {
    name: "coach",
    cohort: "coach",
    stages: [
      { stage: "signup", predicate: { topic: "athlete.lifecycle.signup" } },
      { stage: "roster", predicate: { topic: "relational.relationship.confirmed" } },
      { stage: "athlete_review", predicate: { topic: "coach.review.opened" } },
      { stage: "drill_assignment", predicate: { topic: null } },
      { stage: "repeat_usage", predicate: { topic: "coach.review.opened" } },
    ],
  },
  {
    name: "recruiter",
    cohort: "recruiter",
    stages: [
      { stage: "signup", predicate: { topic: "athlete.lifecycle.signup" } },
      { stage: "athlete_discovery", predicate: { topic: "relational.exposure" } },
      { stage: "athlete_review", predicate: { topic: "recruiter.review.opened" } },
      { stage: "evaluation", predicate: { topic: null } },
      { stage: "repeat_usage", predicate: { topic: "recruiter.review.opened" } },
    ],
  },
  {
    name: "parent",
    cohort: "parent",
    stages: [
      { stage: "invite", predicate: { topic: null } }, // parent_invite_dispatches table
      { stage: "acceptance", predicate: { topic: "relational.relationship.confirmed" } },
      {
        stage: "authorization",
        predicate: {
          topic: "relational.exposure.consent_changed",
          match: (r) => {
            const p = r.payload as { actor_role?: string; change_type?: string } | null;
            return p?.actor_role === "parent" && p?.change_type === "grant";
          },
        },
      },
      {
        stage: "continued_engagement",
        predicate: { topic: "relational.exposure.consent_changed" },
      },
    ],
  },
];


function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function topicMatches(row: AsbEventRow, topic: string): boolean {
  return row.topic_id === topic || row.topic_id.startsWith(topic + ".");
}

/**
 * Compute funnel metrics. `userIdField` selects which field identifies
 * the cohort member (athlete_id or actor_id).
 */
export function computeFunnel(
  def: FunnelDef,
  rows: AsbEventRow[],
  opts: { userIdField?: "athlete_id" | "actor_id" } = {},
): FunnelResult {
  const userIdField = opts.userIdField ?? "athlete_id";
  const sorted = [...rows].sort((a, b) =>
    a.occurred_at.localeCompare(b.occurred_at),
  );
  const windowStart = sorted[0]?.occurred_at ?? new Date().toISOString();
  const windowEnd =
    sorted[sorted.length - 1]?.occurred_at ?? new Date().toISOString();

  // For each user, first timestamp they hit each stage.
  const userStageFirst = new Map<string, Map<string, number>>();
  for (const row of sorted) {
    const uid = (row as unknown as Record<string, unknown>)[userIdField] as
      | string
      | null;
    if (!uid) continue;
    for (const { stage, predicate } of def.stages) {
      if (predicate.topic === null) continue;
      if (!topicMatches(row, predicate.topic)) continue;
      if (predicate.match && !predicate.match(row)) continue;
      const m = userStageFirst.get(uid) ?? new Map<string, number>();
      if (!m.has(stage)) m.set(stage, Date.parse(row.occurred_at));
      userStageFirst.set(uid, m);
    }
  }

  const stageResults: StageMetrics[] = [];
  for (let i = 0; i < def.stages.length; i++) {
    const { stage, predicate } = def.stages[i];
    const next = def.stages[i + 1];
    const unobservable = predicate.topic === null;

    if (unobservable) {
      stageResults.push({
        stage,
        entries: 0,
        exits: 0,
        completionPct: 0,
        abandonmentPct: 0,
        medianTimeToNextMs: null,
        unobservable: true,
        flags: ["unobservable"],
      });
      continue;
    }

    let entries = 0;
    let exits = 0;
    const transitions: number[] = [];

    for (const stages of userStageFirst.values()) {
      const t = stages.get(stage);
      if (t === undefined) continue;
      entries += 1;
      if (next && next.predicate.topic) {
        const tNext = stages.get(next.stage);
        if (tNext !== undefined && tNext >= t) {
          exits += 1;
          transitions.push(tNext - t);
        }
      } else if (!next) {
        exits += 1;
      }
    }

    const completionPct = entries ? exits / entries : 0;
    const abandonmentPct = entries ? 1 - completionPct : 0;
    const medianTimeToNextMs = median(transitions);

    const flags: string[] = [];
    if (abandonmentPct >= 0.5 && entries >= 10) flags.push("high_abandonment");
    if (medianTimeToNextMs !== null && medianTimeToNextMs > 7 * 86400 * 1000)
      flags.push("stalled");
    if (entries >= 10 && exits === 0) flags.push("orphaned");

    stageResults.push({
      stage,
      entries,
      exits,
      completionPct: +completionPct.toFixed(3),
      abandonmentPct: +abandonmentPct.toFixed(3),
      medianTimeToNextMs,
      unobservable: false,
      flags,
    });
  }

  return {
    name: def.name,
    cohort: def.cohort,
    windowStart,
    windowEnd,
    stages: stageResults,
  };
}
