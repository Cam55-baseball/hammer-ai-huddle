/**
 * Analysis feedback → taxonomy keys.
 *
 * The video recommender joins on `video_tag_taxonomy` keys, never on prose.
 * This module is the ONLY bridge between what an analysis run reported and the
 * shared vocabulary. It is deterministic: same analysis in, same keys out.
 *
 * Two structured inputs are read — both machine-emitted, never free text:
 *   1. `violations_detected` — the analyzer's boolean fault flags.
 *   2. `scorecard.regressions[].area` / `scorecard.neutral[].area` — named areas.
 *
 * Drill prose, summary bullets and feedback paragraphs are deliberately NOT
 * parsed. Loose string matching against labels would fabricate alignment.
 *
 * Every emitted key carries the piece of feedback it came from, so the athlete
 * can see WHY a video was recommended.
 */
import type { SkillDomain, TagSport } from './videoRecommendationEngine';
import { mapHIEAreaToMovement } from './analysisToTaxonomy';

export interface FeedbackSignals {
  skillDomain: SkillDomain;
  movementPatterns: string[];
  /** Correction-layer keys the analysis is effectively prescribing. */
  correctionTags: string[];
  /** `layer:key` → the plain-language piece of feedback that produced it. */
  evidence: Record<string, string>;
}

interface FaultMapping {
  movement?: string;
  correction?: string;
  /** Athlete-readable statement of what the analysis found. */
  says: string;
}

type ViolationKey =
  | 'early_shoulder_rotation'
  | 'shoulders_not_aligned'
  | 'back_leg_not_facing_target'
  | 'hands_pass_elbow_early'
  | 'front_shoulder_opens_early';

/**
 * Fault flag → taxonomy keys, per domain. Pitching splits by sport because the
 * overhand and windmill deliveries have separate tag families (bb_ / sb_).
 */
const VIOLATION_MAP: Record<string, Partial<Record<ViolationKey, FaultMapping>>> = {
  hitting: {
    early_shoulder_rotation: {
      movement: 'shoulders_turning_early',
      correction: 'keep_hands_back',
      says: 'your shoulders turned before the front foot landed',
    },
    hands_pass_elbow_early: {
      movement: 'hands_forward_early',
      correction: 'barrel_stays_behind_hands',
      says: 'your hands passed the back elbow before the shoulders turned',
    },
    front_shoulder_opens_early: {
      movement: 'shoulders_turning_early',
      correction: 'staying_inside_the_ball',
      says: 'your front shoulder opened early',
    },
  },
  throwing: {
    early_shoulder_rotation: {
      movement: 'th_across_body',
      correction: 'th_stay_online_finish',
      says: 'your shoulders rotated early and pulled the throw across your body',
    },
    shoulders_not_aligned: {
      movement: 'th_feet_misaligned',
      correction: 'th_align_feet_to_target',
      says: 'your shoulders were not aligned to the target at landing',
    },
    back_leg_not_facing_target: {
      movement: 'th_feet_misaligned',
      correction: 'th_align_feet_to_target',
      says: 'your back leg was not facing the target at landing',
    },
  },
  pitching_baseball: {
    early_shoulder_rotation: {
      movement: 'bb_trunk_rotation_early',
      correction: 'bb_delay_trunk_rotation',
      says: 'your trunk rotated before the front foot landed',
    },
    shoulders_not_aligned: {
      movement: 'bb_stride_direction_off',
      correction: 'bb_stride_to_power_line',
      says: 'your shoulders were not aligned to the target at landing',
    },
    back_leg_not_facing_target: {
      movement: 'bb_stride_direction_off',
      correction: 'bb_stride_to_power_line',
      says: 'your back leg was not driving toward the target at landing',
    },
  },
  pitching_softball: {
    early_shoulder_rotation: {
      movement: 'sb_shoulders_open_early',
      correction: 'sb_stay_closed_through_whip',
      says: 'your shoulders opened early in the circle',
    },
    shoulders_not_aligned: {
      movement: 'sb_replant_drift',
      correction: 'sb_drive_down_power_line',
      says: 'your shoulders were not aligned to the target at landing',
    },
    back_leg_not_facing_target: {
      movement: 'sb_weak_drive_push',
      correction: 'sb_drive_down_power_line',
      says: 'your drive leg was not pushing toward the target',
    },
  },
};

/**
 * Movement key → the correction that answers it. Only pairs we can state
 * honestly are listed; an unmapped movement contributes a movement match only.
 */
const MOVEMENT_TO_CORRECTION: Record<string, string> = {
  // hitting
  hands_forward_early: 'keep_hands_back',
  early_extension: 'maintain_posture',
  head_pull_off: 'seeing_the_ball_well',
  late_barrel: 'getting_to_contact_clean',
  flat_path: 'match_plane_early',
  steep_attack_angle: 'match_plane_early',
  over_rotation: 'direction_through_contact',
  under_rotation: 'driving_the_ball',
  weight_stuck_back: 'landing_balanced',
  weight_leak_forward: 'landing_balanced',
  landing_unbalanced: 'landing_balanced',
  shoulders_turning_early: 'keep_hands_back',
  // throwing
  arm_lag: 'clean_arm_path',
  th_across_body: 'th_stay_online_finish',
  th_feet_misaligned: 'th_align_feet_to_target',
  th_long_arm_action: 'th_shorten_arm_circle',
  th_slow_transfer: 'th_glove_to_chest_transfer',
  th_no_crow_hop: 'th_crow_hop_through_target',
  // pitching (baseball)
  bb_trunk_rotation_early: 'bb_delay_trunk_rotation',
  bb_front_side_flyout: 'bb_stay_closed_longer',
  bb_stride_direction_off: 'bb_stride_to_power_line',
  bb_front_leg_collapse: 'bb_block_with_front_leg',
  bb_release_point_drift: 'bb_repeat_release_point',
  bb_poor_deceleration: 'bb_decelerate_through_finish',
  bb_hip_shoulder_sep_loss: 'bb_stay_closed_longer',
  // pitching (softball)
  sb_shoulders_open_early: 'sb_stay_closed_through_whip',
  sb_plant_leg_collapse: 'sb_block_with_plant_leg',
  sb_snap_late: 'sb_snap_out_front',
  sb_k_position_late: 'sb_hold_k_position',
  sb_replant_drift: 'sb_drive_down_power_line',
  sb_weak_drive_push: 'sb_drive_down_power_line',
  sb_brush_contact_missed: 'sb_finish_brush_contact',
};

function violationBucket(skillDomain: SkillDomain, sport: TagSport | null | undefined): string {
  if (skillDomain !== 'pitching') return skillDomain;
  return sport === 'softball' ? 'pitching_softball' : 'pitching_baseball';
}

export interface AnalysisLike {
  violations_detected?: Record<string, unknown> | null;
  scorecard?: {
    regressions?: Array<{ area?: string | null }> | null;
    neutral?: Array<{ area?: string | null }> | null;
  } | null;
}

/** Turn one analysis run into taxonomy keys plus the feedback behind each. */
export function analysisFeedbackToTaxonomy(
  analysis: AnalysisLike | null | undefined,
  skillDomain: SkillDomain,
  sport?: TagSport | null,
): FeedbackSignals {
  const movement = new Set<string>();
  const correction = new Set<string>();
  const evidence: Record<string, string> = {};

  const bucket = VIOLATION_MAP[violationBucket(skillDomain, sport)] ?? {};
  const violations = (analysis?.violations_detected ?? {}) as Record<string, unknown>;
  for (const [flag, mapping] of Object.entries(bucket)) {
    if (violations[flag] !== true || !mapping) continue;
    if (mapping.movement) {
      movement.add(mapping.movement);
      evidence[`movement_pattern:${mapping.movement}`] = mapping.says;
    }
    if (mapping.correction) {
      correction.add(mapping.correction);
      evidence[`correction:${mapping.correction}`] = mapping.says;
    }
  }

  const areas = [
    ...(analysis?.scorecard?.regressions ?? []),
    ...(analysis?.scorecard?.neutral ?? []),
  ]
    .map(a => a?.area)
    .filter((a): a is string => typeof a === 'string' && a.length > 0);

  for (const area of areas) {
    const key = mapHIEAreaToMovement(area);
    if (!key) continue;
    movement.add(key);
    evidence[`movement_pattern:${key}`] ??= `your scorecard flagged ${area.replace(/_/g, ' ')}`;
    const corr = MOVEMENT_TO_CORRECTION[key];
    if (corr) {
      correction.add(corr);
      evidence[`correction:${corr}`] ??= `your scorecard flagged ${area.replace(/_/g, ' ')}`;
    }
  }

  // Any violation-derived movement also pulls its paired correction.
  for (const m of [...movement]) {
    const corr = MOVEMENT_TO_CORRECTION[m];
    if (corr && !correction.has(corr)) {
      correction.add(corr);
      evidence[`correction:${corr}`] ??= evidence[`movement_pattern:${m}`] ?? 'your analysis flagged this pattern';
    }
  }

  return {
    skillDomain,
    movementPatterns: [...movement],
    correctionTags: [...correction],
    evidence,
  };
}
