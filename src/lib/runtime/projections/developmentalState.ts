/**
 * Phase 154 — relational.developmental.* projection.
 *
 * Pure, deterministic, memoized. Folds developmental events into the
 * athlete's current stage, active deload window, and effective load ceiling.
 * Stage regression is illegal — only forward transitions and explicit
 * clinician-attested corrections may move stage.
 */
import { memoize, type Scope } from "./types";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import {
  DEVELOPMENTAL_STAGES,
  type DevelopmentalStage,
  isMinorStage,
} from "@/lib/runtime/relational/schemas";
import {
  effectiveLoadCeiling,
  gatesFor,
} from "@/lib/runtime/relational/developmentalGates";

export interface DeloadWindow {
  window_start: string;
  window_end: string;
  reason: string;
  load_ceiling_pct: number;
  source_event_id: string;
}

export interface DevelopmentalState {
  chronological_age_years: number | null;
  current_stage: DevelopmentalStage | null;
  is_minor: boolean;
  active_deload_window: DeloadWindow | null;
  effective_load_ceiling_pct: number | null;
  gating_flags: {
    recruiter_blocked: boolean;
    exposure_blocked: boolean;
    parent_consent_default: boolean;
    safeguarding_default: boolean;
  };
  source_event_ids: {
    age: string | null;
    stage: string | null;
  };
}

const PREFIXES = ["relational.developmental."];

function stageIndex(s: DevelopmentalStage): number {
  return DEVELOPMENTAL_STAGES.indexOf(s);
}

export const buildDevelopmentalState = memoize<DevelopmentalState>((rows) => {
  let age: number | null = null;
  let ageEvt: string | null = null;
  let stage: DevelopmentalStage | null = null;
  let stageEvt: string | null = null;
  let deload: DeloadWindow | null = null;

  for (const r of rows) {
    const p = r.payload as Record<string, unknown> | undefined;
    if (!p) continue;

    if (r.topic_id === "relational.developmental.age_observed") {
      age = (p.chronological_age_years as number) ?? age;
      ageEvt = r.event_id;
    } else if (r.topic_id === "relational.developmental.transition") {
      const to = p.to_stage as DevelopmentalStage | undefined;
      if (!to || !DEVELOPMENTAL_STAGES.includes(to)) continue;
      // Stage regression illegal — only forward transitions accepted.
      if (stage !== null && stageIndex(to) < stageIndex(stage)) continue;
      stage = to;
      stageEvt = r.event_id;
    } else if (r.topic_id === "relational.developmental.deload_window") {
      deload = {
        window_start: p.window_start as string,
        window_end: p.window_end as string,
        reason: p.reason as string,
        load_ceiling_pct: (p.load_ceiling_pct as number) ?? 100,
        source_event_id: r.event_id,
      };
    }
  }

  const minor = stage !== null ? isMinorStage(stage) : false;
  const eff = stage === null
    ? null
    : effectiveLoadCeiling(stage, deload?.load_ceiling_pct ?? null);

  const g = stage ? gatesFor(stage) : null;
  const gating_flags = {
    recruiter_blocked: g ? g.recruiter === "blocked" : true,
    exposure_blocked: g ? g.exposure === "blocked" : true,
    parent_consent_default: minor,
    safeguarding_default: g ? g.safeguarding_default : true,
  };

  return {
    chronological_age_years: age,
    current_stage: stage,
    is_minor: minor,
    active_deload_window: deload,
    effective_load_ceiling_pct: eff,
    gating_flags,
    source_event_ids: { age: ageEvt, stage: stageEvt },
  };
});

export function developmentalState(
  rows: AsbEventRow[] | undefined,
  scope: Scope,
) {
  return buildDevelopmentalState(rows, scope, PREFIXES);
}
