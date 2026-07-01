// src/lib/wic/trainingAge.ts — Phase 7.
//
// CONSTITUTIONAL AUTHORITY FOR TRAINING AGE.
//
// Training age is a first-class variable — independent of chronological age.
// Every future engine (Lift, Speed, Bat Speed, Conditioning, Cross-Sport,
// Recovery, Warm-Up, Arm-Care, ...) MUST consume the same `TrainingAgeContext`
// object produced by `resolveTrainingAge`.
//
// This phase defines the classifier and placeholder lookup tables. It does NOT
// rewrite prescriptions. Existing engines continue to run untouched; the
// resolved context is stamped into every prescription's `why_payload` so the
// next implementation wave can consume it deterministically.
//
// Shape parity with: supabase/functions/_shared/wic/trainingAge.ts

export const TRAINING_AGE_VERSION = "wic_ta_v1";

export type TrainingAge =
  | "beginner"
  | "developing"
  | "intermediate"
  | "advanced"
  | "elite"
  | "professional";

export interface RecoveryWindow {
  /** Minimum hours between high-CNS sessions before repeat is allowed. */
  minHours: number;
  /** Recommended deload cadence (weeks between deloads). Placeholder. */
  deloadFreqWeeks: number;
}

/**
 * Load-tolerance envelope. Structural placeholder — values remain `null` until
 * the next implementation wave populates them. Every future engine consumes
 * this object; today, no engine reads it beyond diagnostics.
 */
export interface LoadTolerance {
  volume: number | null;
  intensity: number | null;
  frequency: number | null;
  eccentric: number | null;
  elastic: number | null;
  power: number | null;
}

export interface TrainingAgeContext {
  readonly training_age_version: string;
  readonly classification: TrainingAge;
  readonly training_age_years: number;
  readonly is_pro_prospect: boolean;
  readonly recovery_window: RecoveryWindow;
  readonly load_tolerance: LoadTolerance;
  readonly rationale: string;
}

// Placeholder recovery windows — deliberate conservative defaults. Future
// phases will populate authoritative values driven by workload history.
export const RECOVERY_WINDOW_LOOKUP: Record<TrainingAge, RecoveryWindow> = {
  beginner:     { minHours: 72, deloadFreqWeeks: 4 },
  developing:   { minHours: 60, deloadFreqWeeks: 4 },
  intermediate: { minHours: 48, deloadFreqWeeks: 5 },
  advanced:     { minHours: 48, deloadFreqWeeks: 6 },
  elite:        { minHours: 36, deloadFreqWeeks: 6 },
  professional: { minHours: 36, deloadFreqWeeks: 8 },
};

export function classifyTrainingAge(input: {
  yearsLifting: number;
  isProProspect: boolean;
  competitiveLevel?: string | null;
}): TrainingAge {
  const y = Math.max(0, input.yearsLifting || 0);
  const level = (input.competitiveLevel ?? "").toLowerCase();
  if (input.isProProspect || level.includes("pro")) return "professional";
  if (level.includes("college") && y >= 3) return "elite";
  if (y >= 5) return "elite";
  if (y >= 3) return "advanced";
  if (y >= 2) return "intermediate";
  if (y >= 1) return "developing";
  return "beginner";
}

export function resolveTrainingAge(input: {
  yearsLifting: number;
  isProProspect: boolean;
  competitiveLevel?: string | null;
}): TrainingAgeContext {
  const classification = classifyTrainingAge(input);
  const recovery = RECOVERY_WINDOW_LOOKUP[classification];
  return Object.freeze({
    training_age_version: TRAINING_AGE_VERSION,
    classification,
    training_age_years: Math.max(0, input.yearsLifting || 0),
    is_pro_prospect: !!input.isProProspect,
    recovery_window: Object.freeze({ ...recovery }),
    load_tolerance: Object.freeze({
      volume: null, intensity: null, frequency: null,
      eccentric: null, elastic: null, power: null,
    }),
    rationale: `Classified as ${classification} from ${input.yearsLifting || 0}y training age${
      input.isProProspect ? " (pro prospect)" : ""
    }.`,
  }) as TrainingAgeContext;
}
