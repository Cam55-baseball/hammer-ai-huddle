/**
 * GP → Roadmap deltas — interpretive overlay only.
 *
 * Compares the rolling 7-day Game Performance signal against the prior
 * 7-day window and surfaces named milestone deltas:
 *   • new_weakness   — a metric crossed into a flagged range
 *   • improvement    — a metric crossed back out of a flagged range
 *   • cluster_emerged — a defensive miscue cluster newly appeared
 *   • cluster_cleared — a previous cluster is now empty
 *
 * Replay-safe: pure derivation. Never authors organism truth, never
 * mutates the ledger, never overrides survivability. The General + the
 * Hammer Daily Plan render these as advisory chips.
 */
import type { GpSignal } from "@/hooks/useGpSignal";

export type RoadmapDeltaKind =
  | "new_weakness"
  | "improvement"
  | "cluster_emerged"
  | "cluster_cleared";

export interface RoadmapDelta {
  readonly kind: RoadmapDeltaKind;
  readonly metric: "chasePct" | "whiffPct" | "kRate" | "miscue";
  readonly label: string;
  readonly detail: string;
  readonly priorValue: number | null;
  readonly currentValue: number | null;
  /** Target editor for one-tap "reconcile" — used by drift markers too. */
  readonly cta?: { label: string; href: string };
}

interface DeltaInput {
  readonly chasePct: number | null;
  readonly whiffPct: number | null;
  readonly kRate: number | null;
  readonly miscueClusters: ReadonlyArray<{ position: string; errors: number }>;
}

const FLAG = { chase: 32, whiff: 28, k: 28 } as const;

function flagged(metric: "chase" | "whiff" | "k", v: number | null): boolean {
  if (v == null) return false;
  if (metric === "chase") return v >= FLAG.chase;
  if (metric === "whiff") return v >= FLAG.whiff;
  return v >= FLAG.k;
}

function pctDelta(prior: number | null, current: number | null): string {
  if (prior == null || current == null) return "";
  const d = current - prior;
  const sign = d > 0 ? "+" : "";
  return ` (${sign}${d}pp vs prior 7d)`;
}

export function computeRoadmapDeltas(
  current: DeltaInput,
  prior: DeltaInput | null,
): ReadonlyArray<RoadmapDelta> {
  const out: RoadmapDelta[] = [];
  if (!prior) return out;

  // Chase
  if (flagged("chase", current.chasePct) && !flagged("chase", prior.chasePct)) {
    out.push({
      kind: "new_weakness",
      metric: "chasePct",
      label: "New: chase rate climbed",
      detail: `Chase ${current.chasePct}%${pctDelta(prior.chasePct, current.chasePct)} — pitch-recognition prioritized.`,
      priorValue: prior.chasePct,
      currentValue: current.chasePct,
      cta: { label: "Train pitch recognition", href: "/training/tex-vision" },
    });
  } else if (!flagged("chase", current.chasePct) && flagged("chase", prior.chasePct)) {
    out.push({
      kind: "improvement",
      metric: "chasePct",
      label: "Improving: chase rate dropped",
      detail: `Chase ${current.chasePct ?? "—"}%${pctDelta(prior.chasePct, current.chasePct)}. Hold the discipline focus.`,
      priorValue: prior.chasePct,
      currentValue: current.chasePct,
    });
  }

  // Whiff
  if (flagged("whiff", current.whiffPct) && !flagged("whiff", prior.whiffPct)) {
    out.push({
      kind: "new_weakness",
      metric: "whiffPct",
      label: "New: whiff% climbed on swings",
      detail: `Whiff ${current.whiffPct}%${pctDelta(prior.whiffPct, current.whiffPct)} — bat-path / contact reps biased up.`,
      priorValue: prior.whiffPct,
      currentValue: current.whiffPct,
      cta: { label: "Open hitting plan", href: "/hammer" },
    });
  } else if (!flagged("whiff", current.whiffPct) && flagged("whiff", prior.whiffPct)) {
    out.push({
      kind: "improvement",
      metric: "whiffPct",
      label: "Improving: whiff% dropped",
      detail: `Whiff ${current.whiffPct ?? "—"}%${pctDelta(prior.whiffPct, current.whiffPct)}.`,
      priorValue: prior.whiffPct,
      currentValue: current.whiffPct,
    });
  }

  // K rate
  if (flagged("k", current.kRate) && !flagged("k", prior.kRate)) {
    out.push({
      kind: "new_weakness",
      metric: "kRate",
      label: "New: K rate elevated",
      detail: `K-rate ${current.kRate}%${pctDelta(prior.kRate, current.kRate)} — review at-bat plan + 2-strike approach.`,
      priorValue: prior.kRate,
      currentValue: current.kRate,
      cta: { label: "Game IQ — two-strike", href: "/training/game-iq" },
    });
  }

  // Defensive clusters
  const priorPositions = new Set(prior.miscueClusters.map((c) => c.position));
  const currentPositions = new Set(current.miscueClusters.map((c) => c.position));
  for (const c of current.miscueClusters) {
    if (!priorPositions.has(c.position)) {
      out.push({
        kind: "cluster_emerged",
        metric: "miscue",
        label: `New miscue cluster at ${c.position}`,
        detail: `${c.errors} errors at ${c.position} in last 7d (none prior week) — defensive block prioritized.`,
        priorValue: 0,
        currentValue: c.errors,
        cta: { label: "Defensive block", href: "/hammer" },
      });
    }
  }
  for (const c of prior.miscueClusters) {
    if (!currentPositions.has(c.position)) {
      out.push({
        kind: "cluster_cleared",
        metric: "miscue",
        label: `Cleared: no recent errors at ${c.position}`,
        detail: `${c.errors} prior errors at ${c.position} — none in the last 7d.`,
        priorValue: c.errors,
        currentValue: 0,
      });
    }
  }

  return out;
}

/** Convenience adapter from the live GpSignal. */
export function deltasFromSignals(
  current: GpSignal,
  prior: GpSignal | null,
): ReadonlyArray<RoadmapDelta> {
  return computeRoadmapDeltas(
    {
      chasePct: current.chasePct,
      whiffPct: current.whiffPct,
      kRate: current.kRate,
      miscueClusters: current.miscueClusters,
    },
    prior
      ? {
          chasePct: prior.chasePct,
          whiffPct: prior.whiffPct,
          kRate: prior.kRate,
          miscueClusters: prior.miscueClusters,
        }
      : null,
  );
}
