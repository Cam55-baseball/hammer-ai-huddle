/**
 * Pure projection: latest ASB ledger rows → today's adaptive prescription.
 *
 * Constitutional contract:
 *  - Read-only over canonical events. Never authors organism truth.
 *  - Missingness preserved: when readiness/fatigue/recovery signal absent,
 *    prescription state collapses to "unknown" — NEVER imputed.
 *  - Confidence flows from source events; never amplified, never fabricated.
 *  - Every block & rationale cites a `sourceEventId` for replay drilldown.
 *  - Deterministic given the same inputs at a pinned engine_version.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import {
  latestByTopicPrefix,
  projectLatest,
  type CardProjection,
  type Missingness,
} from "@/lib/command/projections";
import type { RuntimeState } from "@/components/runtime/StateBadge";

export type SessionKind =
  | "lift"
  | "sprint"
  | "throw"
  | "recovery"
  | "hybrid"
  | "rest";

export interface PrescriptionBlock {
  id: string; // stable within a prescription render
  name: string;
  intent: string;
  detail: string;
  cnsDemand: "low" | "moderate" | "high";
}

export interface DailyPrescription {
  state: RuntimeState;
  kind: SessionKind;
  headline: string;
  rationale: string[];
  blocks: PrescriptionBlock[];
  // Trust surface — projected, never authored
  confidence: number | null;
  missingness: Missingness;
  sourceEventIds: string[];
  engineVersion: string | null;
  inputs: {
    readiness: CardProjection<unknown>;
    fatigue: CardProjection<unknown>;
    recovery: CardProjection<unknown>;
    override: AsbEventRow | null;
  };
}

const LIFT_BLOCKS: PrescriptionBlock[] = [
  { id: "warmup", name: "Warm-up", intent: "Prepare CNS + tissue", detail: "8–10 min mobility + activation", cnsDemand: "low" },
  { id: "primary", name: "Primary lift", intent: "Max output", detail: "3×3 @ heavy, full rest", cnsDemand: "high" },
  { id: "accessory", name: "Accessory", intent: "Volume + balance", detail: "3×8 paired sets", cnsDemand: "moderate" },
  { id: "finisher", name: "Finisher", intent: "Capacity", detail: "5 min flow circuit", cnsDemand: "moderate" },
  { id: "downreg", name: "Down-regulate", intent: "Parasympathetic close-out", detail: "4 min breath ladder", cnsDemand: "low" },
];

const SPRINT_BLOCKS: PrescriptionBlock[] = [
  { id: "warmup", name: "Dynamic warm-up", intent: "Elastic readiness", detail: "10 min, progressive", cnsDemand: "low" },
  { id: "primer", name: "Plyo primer", intent: "Elastic activation", detail: "3×3 pogo + bounds", cnsDemand: "moderate" },
  { id: "primary", name: "Max-velocity sprints", intent: "Output", detail: "4×30m, full recovery", cnsDemand: "high" },
  { id: "downreg", name: "Down-regulate", intent: "CNS close-out", detail: "Easy walk + breathing", cnsDemand: "low" },
];

const THROW_BLOCKS: PrescriptionBlock[] = [
  { id: "warmup", name: "Arm care", intent: "Prepare shoulder + rotator", detail: "10 min progressive", cnsDemand: "low" },
  { id: "primer", name: "Submax intent", intent: "Mechanics", detail: "10 throws @ 70%", cnsDemand: "moderate" },
  { id: "primary", name: "Intent throws", intent: "Output", detail: "15–20 throws @ intent", cnsDemand: "high" },
  { id: "downreg", name: "Recovery", intent: "Tissue + breathing", detail: "Bands + 3 min nasal breathing", cnsDemand: "low" },
];

const RECOVERY_BLOCKS: PrescriptionBlock[] = [
  { id: "mobility", name: "Mobility flow", intent: "Restore range", detail: "12 min global mobility", cnsDemand: "low" },
  { id: "soft", name: "Soft tissue", intent: "Tone management", detail: "8 min targeted", cnsDemand: "low" },
  { id: "breath", name: "Breath work", intent: "Parasympathetic", detail: "6 min nasal/extended exhale", cnsDemand: "low" },
];

const HYBRID_BLOCKS: PrescriptionBlock[] = [
  { id: "warmup", name: "Warm-up", intent: "Prepare", detail: "8 min mobility", cnsDemand: "low" },
  { id: "skill", name: "Skill primer", intent: "Submax technical", detail: "10 min focused reps", cnsDemand: "moderate" },
  { id: "capacity", name: "Capacity", intent: "Aerobic base", detail: "12 min steady", cnsDemand: "moderate" },
  { id: "downreg", name: "Down-regulate", intent: "Close-out", detail: "4 min breath ladder", cnsDemand: "low" },
];

function readinessScore(p: CardProjection<unknown>): number | null {
  const v = p.value as Record<string, unknown> | null;
  if (!v) return null;
  const raw =
    (typeof (v as any).score === "number" && (v as any).score) ??
    (typeof (v as any).readiness === "number" && (v as any).readiness) ??
    null;
  return typeof raw === "number" ? raw : null;
}

function fatigueBand(p: CardProjection<unknown>): "low" | "moderate" | "high" | null {
  const v = p.value as Record<string, unknown> | null;
  if (!v) return null;
  const band = (v as any).band ?? (v as any).level ?? null;
  if (band === "low" || band === "moderate" || band === "high") return band;
  const num = typeof (v as any).score === "number" ? (v as any).score : null;
  if (num == null) return null;
  if (num >= 70) return "high";
  if (num >= 40) return "moderate";
  return "low";
}

function recoveryDebt(p: CardProjection<unknown>): number | null {
  const v = p.value as Record<string, unknown> | null;
  if (!v) return null;
  const d = (v as any).debt ?? (v as any).score ?? null;
  return typeof d === "number" ? d : null;
}

function tightenConfidence(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => typeof v === "number");
  if (present.length === 0) return null;
  return Math.min(...present);
}

function tightenMissingness(values: Missingness[]): Missingness {
  if (values.some((v) => v === "no_signal")) return "no_signal";
  if (values.some((v) => v === "stale")) return "stale";
  if (values.some((v) => v === "partial")) return "partial";
  return null;
}

export function buildDailyPrescription(
  rows: AsbEventRow[] | undefined,
): DailyPrescription {
  const readinessRow = latestByTopicPrefix(rows, "athlete.readiness");
  const fatigueRow = latestByTopicPrefix(rows, "athlete.fatigue");
  const recoveryRow = latestByTopicPrefix(rows, "athlete.recovery");
  const overrideRow = latestByTopicPrefix(rows, "prescription.override");

  const readiness = projectLatest(readinessRow, { staleAfterHours: 30 });
  const fatigue = projectLatest(fatigueRow, { staleAfterHours: 30 });
  const recovery = projectLatest(recoveryRow, { staleAfterHours: 36 });

  const sourceEventIds = [
    readiness.sourceEventId,
    fatigue.sourceEventId,
    recovery.sourceEventId,
    overrideRow?.event_id ?? null,
  ].filter((x): x is string => !!x);

  const engineVersion =
    readiness.engineVersion ?? fatigue.engineVersion ?? recovery.engineVersion ?? null;

  const confidence = tightenConfidence([
    readiness.confidence,
    fatigue.confidence,
    recovery.confidence,
  ]);
  const missingness = tightenMissingness([
    readiness.missingness,
    fatigue.missingness,
    recovery.missingness,
  ]);

  // No signal at all → unknown rest day. Constitutional: never fabricate.
  if (!readinessRow && !fatigueRow && !recoveryRow) {
    return {
      state: "unknown",
      kind: "rest",
      headline: "No organism signal yet",
      rationale: [
        "No readiness, fatigue, or recovery events present in the last 30 days.",
        "Today's prescription stays open until you log a signal — nothing is imputed.",
      ],
      blocks: [],
      confidence: null,
      missingness: "no_signal",
      sourceEventIds: [],
      engineVersion: null,
      inputs: { readiness, fatigue, recovery, override: overrideRow },
    };
  }

  const r = readinessScore(readiness);
  const f = fatigueBand(fatigue);
  const d = recoveryDebt(recovery);

  // Active override forces conservative path with explicit lineage citation.
  if (overrideRow) {
    return {
      state: "watch",
      kind: "recovery",
      headline: "Override active — recovery mode",
      rationale: [
        "An active override is on the ledger; runtime defers to it.",
        "Tap the lineage button to see who requested the override and why.",
      ],
      blocks: RECOVERY_BLOCKS,
      confidence,
      missingness,
      sourceEventIds,
      engineVersion,
      inputs: { readiness, fatigue, recovery, override: overrideRow },
    };
  }

  // High fatigue or high recovery debt → recovery, regardless of readiness optimism.
  if (f === "high" || (typeof d === "number" && d >= 60)) {
    return {
      state: "escalate",
      kind: "recovery",
      headline: "Recover today",
      rationale: [
        f === "high" ? "Fatigue band is high." : "Recovery debt is elevated.",
        "Output session would risk survivability — switching to restorative work.",
      ],
      blocks: RECOVERY_BLOCKS,
      confidence,
      missingness,
      sourceEventIds,
      engineVersion,
      inputs: { readiness, fatigue, recovery, override: overrideRow },
    };
  }

  // Green: readiness ≥ 70 and fatigue not high → lift output day.
  if (typeof r === "number" && r >= 70) {
    return {
      state: "calm",
      kind: "lift",
      headline: "Output day — primary lift",
      rationale: [
        `Readiness ${r} with fatigue ${f ?? "—"}.`,
        "Substrate supports a max-output primary lift block.",
      ],
      blocks: LIFT_BLOCKS,
      confidence,
      missingness,
      sourceEventIds,
      engineVersion,
      inputs: { readiness, fatigue, recovery, override: overrideRow },
    };
  }

  // Mid: readiness 50–69 → sprint or throw depending on fatigue.
  if (typeof r === "number" && r >= 50) {
    const kind: SessionKind = f === "moderate" ? "throw" : "sprint";
    const blocks = kind === "throw" ? THROW_BLOCKS : SPRINT_BLOCKS;
    return {
      state: "watch",
      kind,
      headline: kind === "throw" ? "Throwing — mechanics + intent" : "Sprint — max velocity",
      rationale: [
        `Readiness ${r}, fatigue ${f ?? "—"}.`,
        "Substrate supports submax output with bounded volume.",
      ],
      blocks,
      confidence,
      missingness,
      sourceEventIds,
      engineVersion,
      inputs: { readiness, fatigue, recovery, override: overrideRow },
    };
  }

  // Low readiness or partial data → hybrid (lowest survivability cost).
  return {
    state: typeof r === "number" ? "watch" : "unknown",
    kind: "hybrid",
    headline: "Hybrid — keep momentum",
    rationale: [
      typeof r === "number" ? `Readiness ${r} below output threshold.` : "Readiness signal incomplete.",
      "Hybrid skill + capacity preserves continuity without survivability cost.",
    ],
    blocks: HYBRID_BLOCKS,
    confidence,
    missingness,
    sourceEventIds,
    engineVersion,
    inputs: { readiness, fatigue, recovery, override: overrideRow },
  };
}
