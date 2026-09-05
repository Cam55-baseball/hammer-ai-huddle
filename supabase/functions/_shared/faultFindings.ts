/**
 * Coaching stage — structured fault persistence.
 *
 * The analyzer emits boolean fault flags. Until now nothing turned those into
 * durable, structured taxonomy keys, so nothing downstream could match videos,
 * prescriptions or — critically — notice that the SAME root movement pattern
 * shows up in more than one discipline.
 *
 * This module is the deterministic bridge: flags in, taxonomy rows out. It
 * mirrors `src/lib/analysisFeedbackToTaxonomy.ts` exactly; the two maps must be
 * kept in step. No prose is parsed and nothing is inferred.
 */

export type Domain = "hitting" | "pitching" | "throwing";

interface FaultMapping {
  movement?: string;
  correction?: string;
  says: string;
}

const VIOLATION_MAP: Record<string, Record<string, FaultMapping>> = {
  hitting: {
    early_shoulder_rotation: {
      movement: "shoulders_turning_early",
      correction: "keep_hands_back",
      says: "your shoulders turned before the front foot landed",
    },
    hands_pass_elbow_early: {
      movement: "hands_forward_early",
      correction: "barrel_stays_behind_hands",
      says: "your hands passed the back elbow before the shoulders turned",
    },
    front_shoulder_opens_early: {
      movement: "shoulders_turning_early",
      correction: "staying_inside_the_ball",
      says: "your front shoulder opened early",
    },
  },
  throwing: {
    early_shoulder_rotation: {
      movement: "th_across_body",
      correction: "th_stay_online_finish",
      says: "your shoulders rotated early and pulled the throw across your body",
    },
    shoulders_not_aligned: {
      movement: "th_feet_misaligned",
      correction: "th_align_feet_to_target",
      says: "your shoulders were not aligned to the target at landing",
    },
    back_leg_not_facing_target: {
      movement: "th_feet_misaligned",
      correction: "th_align_feet_to_target",
      says: "your back leg was not facing the target at landing",
    },
  },
  pitching_baseball: {
    early_shoulder_rotation: {
      movement: "bb_trunk_rotation_early",
      correction: "bb_delay_trunk_rotation",
      says: "your trunk rotated before the front foot landed",
    },
    shoulders_not_aligned: {
      movement: "bb_stride_direction_off",
      correction: "bb_stride_to_power_line",
      says: "your shoulders were not aligned to the target at landing",
    },
    back_leg_not_facing_target: {
      movement: "bb_stride_direction_off",
      correction: "bb_stride_to_power_line",
      says: "your back leg was not driving toward the target at landing",
    },
  },
  pitching_softball: {
    early_shoulder_rotation: {
      movement: "sb_shoulders_open_early",
      correction: "sb_stay_closed_through_whip",
      says: "your shoulders opened early in the circle",
    },
    shoulders_not_aligned: {
      movement: "sb_replant_drift",
      correction: "sb_drive_down_power_line",
      says: "your shoulders were not aligned to the target at landing",
    },
    back_leg_not_facing_target: {
      movement: "sb_weak_drive_push",
      correction: "sb_drive_down_power_line",
      says: "your drive leg was not pushing toward the target",
    },
  },
};

/**
 * Fault flag → the one underlying movement pattern it expresses. This is the
 * cross-discipline key: `early_shoulder_rotation` in hitting and the same flag
 * in throwing are the same root problem wearing different clothes.
 *
 * Mirrors `src/lib/analysis/rootPatterns.ts`.
 */
const ROOT_BY_FAULT: Record<string, string> = {
  early_shoulder_rotation: "trunk_rotates_before_front_foot_plant",
  front_shoulder_opens_early: "trunk_rotates_before_front_foot_plant",
  shoulders_not_aligned: "direction_off_the_target_line",
  back_leg_not_facing_target: "direction_off_the_target_line",
  hands_pass_elbow_early: "hands_leak_forward_early",
};

export interface FaultFindingRow {
  user_id: string;
  video_id: string;
  video_analysis_run_id: string | null;
  skill_domain: Domain;
  sport: string | null;
  fault_key: string;
  movement_key: string | null;
  correction_key: string | null;
  root_pattern_key: string | null;
  evidence: string;
  engine_version: string | null;
}

function bucketFor(domain: Domain, sport: string | null | undefined): string {
  if (domain !== "pitching") return domain;
  return sport === "softball" ? "pitching_softball" : "pitching_baseball";
}

function normalizeDomain(module: string | null | undefined): Domain | null {
  if (module === "hitting" || module === "pitching" || module === "throwing") return module;
  return null;
}

/** Deterministic: same violations in, same rows out. */
export function buildFaultFindings(args: {
  userId: string;
  videoId: string;
  runId: string | null;
  module: string | null | undefined;
  sport: string | null | undefined;
  violations: Record<string, unknown> | null | undefined;
  engineVersion?: string | null;
}): FaultFindingRow[] {
  const domain = normalizeDomain(args.module);
  if (!domain) return [];
  const bucket = VIOLATION_MAP[bucketFor(domain, args.sport)] ?? {};
  const violations = args.violations ?? {};

  const rows: FaultFindingRow[] = [];
  for (const [flag, mapping] of Object.entries(bucket)) {
    if (violations[flag] !== true) continue;
    rows.push({
      user_id: args.userId,
      video_id: args.videoId,
      video_analysis_run_id: args.runId,
      skill_domain: domain,
      sport: args.sport ?? null,
      fault_key: flag,
      movement_key: mapping.movement ?? null,
      correction_key: mapping.correction ?? null,
      root_pattern_key: ROOT_BY_FAULT[flag] ?? null,
      evidence: mapping.says,
      engine_version: args.engineVersion ?? null,
    });
  }
  return rows;
}
