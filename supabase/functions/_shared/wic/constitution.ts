// Workout Intelligence Constitution (WIC) — permanent authority for all
// prescription decisions. Encodes the constitutional priority hierarchy
// and the enumerated engine list. This is doctrine — do not mutate
// without a Phase XX amendment.

export const WIC_VERSION = "wic_v1.1";

// Constitutional priority order — evaluated top-down before any exercise
// selection. If a higher layer forbids a modality, no engine below it may
// author for that modality today.
export const WIC_PRIORITY = [
  "athlete_safety",
  "recovery_state",
  "medical_restrictions",
  "schedule_context",
  "seasonal_phase",
  "cns_readiness",
  "development_objective",
  "position_demands",
  "training_age",
  "movement_quality",
  "strength_deficiencies",
  "speed_deficiencies",
  "bat_speed_deficiencies",
  "throwing_hitting_workload",
  "available_equipment",
  "available_time",
] as const;

export type WicPriorityLayer = (typeof WIC_PRIORITY)[number];

// Enumerated independent engines. Each engine owns its own rules; no
// engine may author exercises for another.
export const WIC_ENGINES = [
  "movement_prep",
  "warmup",
  "sprint",
  "bat_speed",
  "strength",
  "power",
  "conditioning",
  "cross_sport",
  "recovery",
  "arm_care",
  "mobility",
  "return_to_play",
] as const;

export type WicEngine = (typeof WIC_ENGINES)[number];

// Every engine block persisted to wk_prescriptions must be tagged with
// an engine + adaptation. Slot mapping keeps backward compatibility with
// the existing wk_prescriptions.slot column.
export const ENGINE_TO_SLOT: Record<WicEngine, string> = {
  movement_prep: "movement_prep",
  warmup: "warmup",
  sprint: "speed",
  bat_speed: "bat_speed",
  strength: "lift",
  power: "lift",
  conditioning: "conditioning",
  cross_sport: "cross_sport",
  recovery: "recovery",
  arm_care: "arm_care",
  mobility: "mobility",
  return_to_play: "return_to_play",
};
