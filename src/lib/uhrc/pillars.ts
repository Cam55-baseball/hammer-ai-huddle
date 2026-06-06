/**
 * UHRC pillar map — canonical signal → pillar assignment.
 *
 * Every PIE V2 / HIE / athlete-state signal lands in EXACTLY ONE
 * pillar with EXACTLY ONE weight. Sum of weights inside a pillar
 * is 100. The pillar reduction audit (docs/asb/uhrc-pillar-mapping-audit.md)
 * is generated from this file and fails CI if any signal is missing,
 * duplicated, or cross-pillar contaminated.
 *
 * Mutation rules: additive-only. Re-weighting requires a sealed
 * doctrine bump and a corresponding bump of UHRC_ENGINE_VERSION.
 */
import type { UhrcPillarId } from "./types";
import type { PieV2SignalId } from "@/lib/pieV2/types";

export interface PillarAssignment {
  pillar: UhrcPillarId;
  weight: number; // 0..100 inside pillar
  source_system: "pie_v2" | "hie" | "foundation" | "athlete_state";
  explanation: string;
}

/**
 * PIE V2 signal → pillar map. All 13 PIE V2 signals (11 scored + 2
 * tracked-only) appear exactly once. Tracked-only signals (extension,
 * arm slot) land in `durability` because they feed RR-6 caution.
 */
export const PIE_V2_PILLAR_MAP: Record<PieV2SignalId, PillarAssignment> = {
  energy_angle:           { pillar: "mechanics",        weight: 22, source_system: "pie_v2", explanation: "Coil quality & directional energy loading" },
  separation:             { pillar: "mechanics",        weight: 22, source_system: "pie_v2", explanation: "Hip/shoulder separation integrity" },
  stride:                 { pillar: "mechanics",        weight: 18, source_system: "pie_v2", explanation: "Stride length relative to body height" },
  hip_alignment:          { pillar: "mechanics",        weight: 14, source_system: "pie_v2", explanation: "Hips firing toward target" },
  front_side:             { pillar: "mechanics",        weight: 12, source_system: "pie_v2", explanation: "Glove-side stability into release" },
  rear_foot_drag:         { pillar: "mechanics",        weight: 12, source_system: "pie_v2", explanation: "Posterior-chain finish quality" },

  visual_stability:       { pillar: "command",          weight: 50, source_system: "pie_v2", explanation: "Target acquisition discipline" },
  head_alignment:         { pillar: "command",          weight: 50, source_system: "pie_v2", explanation: "Head alignment relative to belly line" },

  tempo:                  { pillar: "movement_quality", weight: 50, source_system: "pie_v2", explanation: "Lift-to-footstrike tempo control" },
  head_stability:         { pillar: "movement_quality", weight: 30, source_system: "pie_v2", explanation: "Head vertical drop control" },
  shoulder_level:         { pillar: "movement_quality", weight: 20, source_system: "pie_v2", explanation: "Shoulder leveling at release" },

  extension_consistency:  { pillar: "durability",       weight: 50, source_system: "pie_v2", explanation: "Release extension consistency (RR-6 watch signal)" },
  arm_slot_consistency:   { pillar: "durability",       weight: 50, source_system: "pie_v2", explanation: "Arm-slot drift (RR-6 watch signal)" },
};

/**
 * HIE hitting doctrine phase → pillar map. Each phase contributes to
 * `mechanics` for hitters (P1=stance, P2=load, P3=swing, P4=contact).
 */
export const HIE_PHASE_PILLAR_MAP: Record<"P1" | "P2" | "P3" | "P4", PillarAssignment> = {
  P1: { pillar: "mechanics", weight: 25, source_system: "hie", explanation: "Stance & setup integrity" },
  P2: { pillar: "mechanics", weight: 25, source_system: "hie", explanation: "Load & rhythm sequencing" },
  P3: { pillar: "stuff",     weight: 60, source_system: "hie", explanation: "Swing power & path" },
  P4: { pillar: "stuff",     weight: 40, source_system: "hie", explanation: "Contact quality & barrel control" },
};

/** Athlete-state contributions (foundation engine + PIE V2 athlete-state delta). */
export const ATHLETE_STATE_PILLAR_MAP = {
  arm_health_caution:  { pillar: "durability" as UhrcPillarId,       weight: 0, source_system: "athlete_state" as const, explanation: "RR-6 injury caution flag" },
  fatigue_signal:      { pillar: "movement_quality" as UhrcPillarId, weight: 0, source_system: "foundation" as const,    explanation: "Foundation fatigue overlay" },
  decision_speed:      { pillar: "decision_quality" as UhrcPillarId, weight: 100, source_system: "hie" as const,         explanation: "Decision speed index from HIE" },
  movement_efficiency: { pillar: "movement_quality" as UhrcPillarId, weight: 0, source_system: "hie" as const,           explanation: "Movement efficiency overlay (additive)" },
};

export const PILLAR_LABELS: Record<UhrcPillarId, string> = {
  mechanics:        "Mechanics",
  command:          "Command",
  stuff:            "Stuff",
  movement_quality: "Movement quality",
  decision_quality: "Decision quality",
  durability:       "Durability",
};

/** Pillar weights into the UHRC composite. Sum = 100. */
export const PILLAR_COMPOSITE_WEIGHTS: Record<UhrcPillarId, number> = {
  mechanics:        30,
  command:          15,
  stuff:            15,
  movement_quality: 15,
  decision_quality: 10,
  durability:       15,
};

/** All PIE V2 signal ids in the order they appear inside a pillar block. */
export function pieV2SignalsForPillar(pillar: UhrcPillarId): PieV2SignalId[] {
  return (Object.entries(PIE_V2_PILLAR_MAP) as Array<[PieV2SignalId, PillarAssignment]>)
    .filter(([, a]) => a.pillar === pillar)
    .map(([id]) => id);
}
