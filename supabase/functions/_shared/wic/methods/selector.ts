// Elite Training Methods Engine v1 — deterministic method selector.
//
// Selection law (in order, no exceptions):
//   1. Day type veto      — game / travel / recovery / RTP / heavy-practice days
//                           never carry a method.
//   2. Readiness veto     — any active reduction, CNS clamp, or reported pain.
//   3. Engine legality    — the method must declare this engine.
//   4. Quarter legality   — the method must be legal in this quarter.
//   5. Athlete gating     — training age, chronological age, strength floor.
//   6. Structure gating   — the block must actually supply the stations.
//   7. Frequency ceiling  — rolling 7-day count from prior prescriptions.
//   8. Priority + seed    — deterministic tie-break. Same inputs, same method.
//
// A veto is never a downgrade in quality: the plain block is always a complete,
// certified session on its own. The method is additive structure, or nothing.

import {
  METHOD_PRIORITY,
  METHODS_BY_ID,
  TRAINING_AGE_RANK,
  type MethodDef,
  type MethodEngine,
  type TrainingAgeClass,
} from "./catalog.ts";
import { normalizeDoctrinePhase } from "../dosage/doctrine.ts";

export interface MethodDayContext {
  /** Resolved day type from the training context. */
  dayType: string | null | undefined;
  isGameDay: boolean;
  isTravelDay: boolean;
  isHeavyPracticeDay: boolean;
  isRecoveryDay: boolean;
  isReturnToPlay: boolean;
}

export interface MethodAthleteContext {
  trainingAgeClass: TrainingAgeClass;
  ageYears: number | null;
  /** True when the athlete has cleared a relative-strength standard. */
  strengthFloorCleared: boolean;
  /** Reported pain / injury anywhere on the body today. */
  hasActiveInjury: boolean;
  equipment: readonly string[];
}

export interface MethodReadinessContext {
  /** Count of active volume reductions from the daily log. */
  reductionCount: number;
  cnsClamped: boolean;
  /** Self-reported CNS readiness 0-10. */
  cnsReadiness: number | null;
}

export interface MethodBlockShape {
  /** Movement slugs available to the block, in prescription order. */
  hasAnchor: boolean;
  hasPlyometric: boolean;
  hasLoadedExplosive: boolean;
  hasAssisted: boolean;
  hasExpression: boolean;
  /** Number of accessory rows — a tri-set needs three. */
  accessoryCount: number;
}

export interface MethodSelectionInput {
  engine: MethodEngine;
  phase: string | null | undefined;
  day: MethodDayContext;
  athlete: MethodAthleteContext;
  readiness: MethodReadinessContext;
  block: MethodBlockShape;
  /** methodId -> uses in the trailing 7 days. */
  weeklyUsage: Readonly<Record<string, number>>;
  /** Deterministic seed already computed by the generator. */
  seed: string;
}

export interface MethodSelection {
  method: MethodDef | null;
  /** Machine-readable reason a method was not applied. */
  vetoCode: string | null;
  /** Every method considered, with the gate that rejected it. */
  trace: readonly { id: string; outcome: string }[];
}

const NO_METHOD_DAY_TYPES = new Set([
  "game",
  "game_day",
  "tournament",
  "travel",
  "recovery",
  "rest",
  "off",
  "return_to_play",
  "rtp",
  "deload",
]);

function seedRank(seed: string, id: string): number {
  let h = 2166136261;
  const s = `${seed}:${id}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function structureSatisfied(m: MethodDef, block: MethodBlockShape): boolean {
  if (m.structure === "giant_set") return block.accessoryCount >= 3;
  if (m.stations.length === 0) return block.hasAnchor;
  for (const st of m.stations) {
    if (st.source === "anchor" && !block.hasAnchor) return false;
    if (st.source === "plyometric" && !block.hasPlyometric) return false;
    if (st.source === "loaded_explosive" && !block.hasLoadedExplosive) return false;
    if (st.source === "assisted" && !block.hasAssisted) return false;
    if (st.source === "expression" && !block.hasExpression) return false;
  }
  return true;
}

export function selectMethod(input: MethodSelectionInput): MethodSelection {
  const trace: { id: string; outcome: string }[] = [];

  // ---- 1. Day-type veto ----------------------------------------------------
  const dt = String(input.day.dayType ?? "").toLowerCase();
  if (
    input.day.isGameDay || input.day.isTravelDay || input.day.isRecoveryDay ||
    input.day.isReturnToPlay || input.day.isHeavyPracticeDay ||
    NO_METHOD_DAY_TYPES.has(dt)
  ) {
    return { method: null, vetoCode: "method_veto_day_type", trace };
  }

  // ---- 2. Readiness veto ---------------------------------------------------
  if (input.readiness.cnsClamped) {
    return { method: null, vetoCode: "method_veto_cns_clamped", trace };
  }
  if (input.readiness.reductionCount > 0) {
    return { method: null, vetoCode: "method_veto_readiness", trace };
  }
  if (typeof input.readiness.cnsReadiness === "number" && input.readiness.cnsReadiness < 6) {
    return { method: null, vetoCode: "method_veto_low_readiness", trace };
  }
  if (input.athlete.hasActiveInjury) {
    return { method: null, vetoCode: "method_veto_injury", trace };
  }

  const phase = normalizeDoctrinePhase(input.phase);
  const athleteRank = TRAINING_AGE_RANK[input.athlete.trainingAgeClass] ?? 0;
  const equipment = new Set(input.athlete.equipment.map((e) => String(e).toLowerCase()));

  const candidates: MethodDef[] = [];
  for (const id of METHOD_PRIORITY) {
    const m = METHODS_BY_ID[id];
    if (!m) continue;
    if (!m.engines.includes(input.engine)) {
      trace.push({ id, outcome: "engine_mismatch" });
      continue;
    }
    const rule = m.phases[phase];
    if (!rule?.legal) {
      trace.push({ id, outcome: "phase_illegal" });
      continue;
    }
    if (athleteRank < TRAINING_AGE_RANK[m.minTrainingAge]) {
      trace.push({ id, outcome: "training_age_gate" });
      continue;
    }
    if (input.athlete.ageYears != null && input.athlete.ageYears < m.minAgeYears) {
      trace.push({ id, outcome: "age_gate" });
      continue;
    }
    if (m.requiresStrengthFloor && !input.athlete.strengthFloorCleared) {
      trace.push({ id, outcome: "strength_floor_gate" });
      continue;
    }
    if (m.equipment.some((e) => !equipment.has(e.toLowerCase()))) {
      trace.push({ id, outcome: "equipment_missing" });
      continue;
    }
    if (!structureSatisfied(m, input.block)) {
      trace.push({ id, outcome: "structure_unavailable" });
      continue;
    }
    if ((input.weeklyUsage[id] ?? 0) >= rule.maxPerWeek) {
      trace.push({ id, outcome: "weekly_ceiling" });
      continue;
    }
    trace.push({ id, outcome: "eligible" });
    candidates.push(m);
  }

  if (candidates.length === 0) {
    return { method: null, vetoCode: "method_none_eligible", trace };
  }

  // ---- 8. Deterministic pick ----------------------------------------------
  // Priority order dominates; the seed only breaks ties inside the same family
  // so the same athlete does not run the identical structure every single week.
  const topFamily = candidates[0].family;
  const sameFamily = candidates.filter((c) => c.family === topFamily);
  let best = sameFamily[0];
  let bestScore = -Infinity;
  for (const c of sameFamily) {
    const priorityBonus = (METHOD_PRIORITY.length - METHOD_PRIORITY.indexOf(c.id)) * 10;
    const used = input.weeklyUsage[c.id] ?? 0;
    const score = priorityBonus - used * 5 + seedRank(input.seed, c.id);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return { method: best, vetoCode: null, trace };
}

/** Rolling 7-day usage map, read from prior prescription why_payloads. */
export function buildWeeklyMethodUsage(
  rows: readonly { why_payload?: unknown }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const wp = r?.why_payload as Record<string, unknown> | null | undefined;
    const id = wp && typeof wp === "object" ? (wp as any).training_method_id : null;
    if (typeof id === "string" && id) out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}
