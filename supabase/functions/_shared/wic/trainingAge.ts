// supabase/functions/_shared/wic/trainingAge.ts — Phase 7 SERVER MIRROR.
// Shape parity with src/lib/wic/trainingAge.ts. Any change here MUST be
// mirrored in the client file.

export const TRAINING_AGE_VERSION = "wic_ta_v1";

export type TrainingAge =
  | "beginner"
  | "developing"
  | "intermediate"
  | "advanced"
  | "elite"
  | "professional";

export interface RecoveryWindow {
  minHours: number;
  deloadFreqWeeks: number;
}

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
