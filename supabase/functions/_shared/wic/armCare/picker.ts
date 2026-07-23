// Elite Arm Care Picker — ranks catalog rows by sport, throwing phase, training age, family rotation.
// Replaces the legacy static ARM_CARE_SLUGS list. Uses the full seeded catalog.

export interface ArmCarePickInput {
  sport: "baseball" | "softball";
  isPitcher: boolean;
  isCatcher?: boolean;
  isThrowingDay: boolean;
  isRecoveryDay?: boolean;
  isGameDay?: boolean;
  trainingAge: number; // years
  ageYears: number;
  daySeed: number; // day-of-year rotation
  equipmentAvailable?: string[]; // slugs of owned equipment
  fatigueFlag?: "low" | "moderate" | "high";
}

export interface ArmCareCatalogRow {
  slug: string;
  name: string;
  category: string;
  cue?: string;
  why_prescribed?: string | null;
  cns_cost: number;
  min_age_years?: number | null;
  min_training_age_years?: number | null;
  arm_care_category?: string | null;
  throwing_phase?: string | null;
  sport_scope?: string | null;
  source_philosophy?: string | null;
  position_scope?: string[] | null;
  equipment_requirements?: string[] | null;
  training_age_legality?: Record<string, boolean> | null;
  default_sets?: number | null;
  default_reps?: number | null;
  default_tempo?: string | null;
}

const FAMILY_ROTATION = [
  "jaeger_jband",
  "crossover_symmetry",
  "xband",
  "cressey",
  "jobes",
  "driveline",
  "oates",
  "isometric",
  "softball_windmill",
  "forearm_wrist",
  "recovery",
];

function trainingAgeBand(ta: number): "beginner" | "intermediate" | "advanced" | "elite" {
  if (ta < 1) return "beginner";
  if (ta < 3) return "intermediate";
  if (ta < 6) return "advanced";
  return "elite";
}

export function rankArmCareCandidates(
  lib: ArmCareCatalogRow[],
  input: ArmCarePickInput,
): ArmCareCatalogRow[] {
  const band = trainingAgeBand(input.trainingAge);
  const wantPhase = input.isRecoveryDay
    ? "recovery"
    : input.isThrowingDay
      ? "throwing_day"
      : "non_throwing_day";
  const familyLead = FAMILY_ROTATION[input.daySeed % FAMILY_ROTATION.length];

  const eligible = lib.filter((m) => {
    if (m.category !== "arm_care") return false;
    if ((m.min_age_years ?? 0) > input.ageYears) return false;
    if ((m.min_training_age_years ?? 0) > input.trainingAge) return false;
    if (m.training_age_legality && m.training_age_legality[band] === false) return false;
    if (m.sport_scope && m.sport_scope !== "both" && m.sport_scope !== input.sport) return false;
    // Filter softball-only rows on baseball, and vice versa. Windmill drills = softball only.
    if (m.source_philosophy === "softball_windmill" && input.sport !== "softball") return false;
    // Position filter: pitchers can do everything; position players skip pitcher-only rows.
    if (!input.isPitcher && Array.isArray(m.position_scope)) {
      const scope = m.position_scope;
      if (scope.length === 1 && scope[0] === "pitcher") return false;
    }
    // On game day, only low-cost + travel-friendly (handled upstream). Keep CNS ≤ 1.
    if (input.isGameDay && m.cns_cost > 1) return false;
    // Fatigue clamp
    if (input.fatigueFlag === "high" && m.cns_cost > 1) return false;
    return true;
  });

  const scored = eligible.map((m) => {
    let score = 0;
    if (m.throwing_phase === wantPhase) score += 10;
    if (m.throwing_phase === "recovery" && input.isRecoveryDay) score += 15;
    if (m.source_philosophy === familyLead) score += 6;
    if (m.sport_scope === input.sport) score += 3;
    // Prefer beginner-legal patterns for young/low training age
    if (band === "beginner" && m.min_training_age_years === 0) score += 4;
    if (band === "elite" && (m.min_training_age_years ?? 0) >= 3) score += 3;
    // Softball windmill gets massive boost for softball pitchers
    if (input.sport === "softball" && input.isPitcher && m.source_philosophy === "softball_windmill") score += 12;
    // Driveline plyocare for advanced+ baseball pitchers
    if (input.sport === "baseball" && input.isPitcher && band !== "beginner" && m.source_philosophy === "driveline") score += 5;
    // Small deterministic jitter for rotation across days within same family
    const hash = [...m.slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
    score += ((Math.abs(hash + input.daySeed)) % 5) * 0.1;
    return { m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.m);
}

export function pickArmCarePrimary(
  lib: ArmCareCatalogRow[],
  input: ArmCarePickInput,
): ArmCareCatalogRow | undefined {
  return rankArmCareCandidates(lib, input)[0];
}
