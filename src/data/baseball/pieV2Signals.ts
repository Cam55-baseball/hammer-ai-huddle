/**
 * PIE V2 — canonical signal definitions (baseball only).
 *
 * Single source of truth for definitions, rubrics, tier boundaries,
 * root-cause catalogs, and teaching progressions. Pinned to
 * PIE_V2_ENGINE_VERSION. Mutation is constitutionally illegal —
 * additive-only evolution permitted via a separate sealed override.
 *
 * See docs/asb/pie-v2-constitution.md.
 */
import type { PieV2SignalId, PieV2SeverityTier } from "@/lib/pieV2/types";

export interface PieV2SignalDefinition {
  id: PieV2SignalId;
  label: string;
  topic_id: string;
  type: "scored" | "tracked_only";
  measurement: string;
  target: string;
  acceptable: string;
  purpose: string;
  questions_engine_answers: string[];
  required_outputs: string[];
  ideal_pattern: string;
  common_deficiencies: string[];
  root_causes: string[];
  teaching_progression: string[];
  /** Composite weight (scored signals only). Sum across scored signals = 100. */
  composite_weight: number;
}

export const PIE_V2_SIGNALS: Record<PieV2SignalId, PieV2SignalDefinition> = {
  energy_angle: {
    id: "energy_angle",
    label: "Energy Angle",
    topic_id: "pitching.v2.energy_angle",
    type: "scored",
    measurement: "Center mass of planted back foot to front hip at peak leg lift",
    target: "25°",
    acceptable: "≥18°",
    purpose: "Coil quality & directional energy loading",
    questions_engine_answers: [
      "Does the athlete create coil?",
      "Does the athlete create usable directional energy?",
      "Is velocity being left on the table?",
    ],
    required_outputs: ["energy_angle_score", "coil_efficiency_score", "velocity_leakage_detection"],
    ideal_pattern: "Lead with the glute; storing energy into back hip before forward move",
    common_deficiencies: ["upright at lift", "early forward drift", "knee collapse"],
    root_causes: ["weak back-side load", "rushed tempo", "vertical-only lift"],
    teaching_progression: ["balance load isolation", "coil mirror work", "load-to-stride patterning", "full delivery integration"],
    composite_weight: 12,
  },
  visual_stability: {
    id: "visual_stability",
    label: "Target Visual Stability",
    topic_id: "pitching.v2.visual_stability",
    type: "scored",
    measurement: "Eyes remain on target at peak leg lift",
    target: "Eyes locked on target through lift",
    acceptable: "No clear break before forward move",
    purpose: "Visual discipline & target acquisition",
    questions_engine_answers: [
      "Does visual instability correlate with command issues?",
      "Does target loss occur during specific pitch types?",
      "Does fatigue increase target instability?",
    ],
    required_outputs: ["visual_stability_score", "command_correlation_score"],
    ideal_pattern: "Soft eyes locked on target through lift",
    common_deficiencies: ["eyes drift to ground", "eyes break to glove", "head spin"],
    root_causes: ["balance issue masked by visual drift", "rushed routine"],
    teaching_progression: ["target-fix drill", "lift-and-hold", "blind-load → eye-open", "live target integration"],
    composite_weight: 7,
  },
  separation: {
    id: "separation",
    label: "Hip/Shoulder Separation Integrity",
    topic_id: "pitching.v2.separation",
    type: "scored",
    measurement: "Hips fire while shoulders remain closed to foot strike",
    target: "Hips lead, shoulders held closed until foot plant",
    acceptable: "No early shoulder opening",
    purpose: "Primary sequencing integrity",
    questions_engine_answers: [
      "Is rotational energy leaking?",
      "Is shoulder opening causing velocity loss?",
      "Is shoulder opening causing command issues?",
    ],
    required_outputs: ["separation_score", "sequencing_score", "velocity_projection_impact", "injury_risk_impact"],
    ideal_pattern: "Hips fire, torso stays closed through foot plant",
    common_deficiencies: ["torso opens with hips", "glove-side pull opens shoulders", "rushed upper half"],
    root_causes: ["weak core sequencing", "front-side pull", "rushed tempo"],
    teaching_progression: ["hip-isolation rotation", "med-ball rotational throws", "towel separation drill", "live separation integration"],
    composite_weight: 14,
  },
  tempo: {
    id: "tempo",
    label: "Leg Lift → Foot Strike Time",
    topic_id: "pitching.v2.tempo",
    type: "scored",
    measurement: "Peak leg lift to front foot strike (seconds)",
    target: "≤1.05 s",
    acceptable: "≤1.20 s",
    purpose: "Acceleration & force application",
    questions_engine_answers: [
      "Is movement explosive?",
      "Is momentum building efficiently?",
      "Is tempo creating velocity loss?",
    ],
    required_outputs: ["tempo_score", "acceleration_score", "explosiveness_score"],
    ideal_pattern: "Lift → controlled drop → explosive stride",
    common_deficiencies: ["slow drop", "stalled lift", "rushed but unloaded"],
    root_causes: ["fear of falling forward", "weak intent", "load-imbalance"],
    teaching_progression: ["tempo metronome", "weighted-ball intent", "downhill stride", "competitive tempo"],
    composite_weight: 10,
  },
  stride: {
    id: "stride",
    label: "Stride Length Efficiency",
    topic_id: "pitching.v2.stride",
    type: "scored",
    measurement: "Back ankle (peak lift) to front ankle (landing) as % of body height",
    target: "≥100% body height",
    acceptable: "≥90%",
    purpose: "Directional force production & extension potential",
    questions_engine_answers: [
      "Is the athlete maximizing distance to release?",
      "Is stride consistent pitch-to-pitch?",
    ],
    required_outputs: ["stride_efficiency_score", "directional_force_score", "extension_projection_score", "consistency_score"],
    ideal_pattern: "Long, controlled, repeatable stride past 100% BH",
    common_deficiencies: ["short stride", "drift without push", "landing variance"],
    root_causes: ["weak posterior chain", "early upper-half firing", "balance loss"],
    teaching_progression: ["stride-line awareness", "med-ball stride drill", "weighted vest stride", "live stride integration"],
    composite_weight: 10,
  },
  head_stability: {
    id: "head_stability",
    label: "Head Stability",
    topic_id: "pitching.v2.head_stability",
    type: "scored",
    measurement: "Vertical head movement as % of body height",
    target: "≤2%",
    acceptable: "≤4%",
    purpose: "Repeatability & command",
    questions_engine_answers: [
      "Is command instability linked to head movement?",
      "Is head movement increasing under fatigue?",
    ],
    required_outputs: ["head_stability_score", "repeatability_score", "command_impact_score"],
    ideal_pattern: "Head travels in straight line toward target",
    common_deficiencies: ["head dives at release", "head rises into stride", "head spin"],
    root_causes: ["weak posture", "early rotation", "balance loss"],
    teaching_progression: ["mirror posture", "head-line wall drill", "stride-with-stable-head", "live head tracking"],
    composite_weight: 8,
  },
  hip_alignment: {
    id: "hip_alignment",
    label: "Hip Alignment",
    topic_id: "pitching.v2.hip_alignment",
    type: "scored",
    measurement: "Hips fully fired toward target with shoulders closed",
    target: "Hips square to target at foot plant; shoulders still closed",
    acceptable: "Within 10° of target line",
    purpose: "Directional energy transfer",
    questions_engine_answers: [
      "Is energy directed at target or leaking laterally?",
    ],
    required_outputs: ["directional_energy_score", "force_transfer_score"],
    ideal_pattern: "Hips square, shoulders coiled, energy lined to target",
    common_deficiencies: ["hips short of square", "hips overshoot", "hips drift glove-side"],
    root_causes: ["weak push-leg", "early upper half", "stride direction issue"],
    teaching_progression: ["hip-rotation isolation", "stride-line alignment", "loaded rotation", "live alignment integration"],
    composite_weight: 9,
  },
  front_side: {
    id: "front_side",
    label: "Front Side Control",
    topic_id: "pitching.v2.front_side",
    type: "scored",
    measurement: "Glove stays inside shoulder frame; sequence Open→Target→Closed→Body",
    target: "Glove never leaves frame; clean sequence",
    acceptable: "Minor sequence deviation",
    purpose: "Sequencing integrity & rotational anchor",
    questions_engine_answers: [
      "Is glove action causing command problems?",
      "Is glove action causing rotational leaks?",
    ],
    required_outputs: ["front_side_control_score", "command_impact_score", "sequencing_impact_score"],
    ideal_pattern: "Glove presents, finds target, closes to body — chest meets glove",
    common_deficiencies: ["glove pulled laterally", "glove drops below ribs", "active glove yank"],
    root_causes: ["weak front side", "compensating for poor separation", "taught bad cue"],
    teaching_progression: ["glove-position awareness", "Open→Target hold", "closed-glove stride", "live front-side integration"],
    composite_weight: 9,
  },
  head_alignment: {
    id: "head_alignment",
    label: "Head Alignment at Release",
    topic_id: "pitching.v2.head_alignment",
    type: "scored",
    measurement: "Head within 15° of belly-button line at release",
    target: "≤15° offset; every degree beyond compounds penalty",
    acceptable: "≤20° (minor)",
    purpose: "Directional stability & extension preservation",
    questions_engine_answers: [
      "Is lateral head movement reducing extension?",
      "Is head alignment correlated with miss direction?",
    ],
    required_outputs: ["head_alignment_score", "extension_preservation_score", "command_impact_score"],
    ideal_pattern: "Head stacked over belly-line at release",
    common_deficiencies: ["head pulls glove-side", "head drops arm-side"],
    root_causes: ["pulling off", "compensating for separation loss", "weak posture"],
    teaching_progression: ["finish-position holds", "stacked-release mirror", "video feedback loop", "live alignment under stress"],
    composite_weight: 7,
  },
  shoulder_level: {
    id: "shoulder_level",
    label: "Shoulder Level at Release",
    topic_id: "pitching.v2.shoulder_level",
    type: "scored",
    measurement: "Horizontal shoulder alignment at release (degrees from level)",
    target: "≤10°",
    acceptable: "≤15°",
    purpose: "True arm slot integrity",
    questions_engine_answers: [
      "Is arm slot drifting from intended?",
      "Are eyes level laterally?",
    ],
    required_outputs: ["shoulder_alignment_score", "release_integrity_score", "arm_slot_consistency_score"],
    ideal_pattern: "Shoulders near level; arm slot matches intent",
    common_deficiencies: ["front shoulder dives", "back shoulder collapses", "shoulder tilt drift"],
    root_causes: ["spine tilt", "early pull", "fatigue compensation"],
    teaching_progression: ["posture work", "tilt-control drill", "slot-repeat reps", "live shoulder-level integration"],
    composite_weight: 7,
  },
  rear_foot_drag: {
    id: "rear_foot_drag",
    label: "Rear Foot Drag Efficiency",
    topic_id: "pitching.v2.rear_foot_drag",
    type: "scored",
    measurement: "Drag length (~2 foot-lengths) and direction (toward target)",
    target: "~2 foot-lengths, directly toward target",
    acceptable: "1.5–2.5 foot-lengths, no out-and-around",
    purpose: "Lower-half directional transfer",
    questions_engine_answers: [
      "Is the back side delivering directional force?",
      "Is the drag going around or through?",
    ],
    required_outputs: ["rear_foot_drag_score", "directional_force_score", "transfer_efficiency_score"],
    ideal_pattern: "Drag straight toward target ~2 foot lengths",
    common_deficiencies: ["out-and-around drag", "drag too short", "drag too long with collapse"],
    root_causes: ["push-leg weakness", "hip-shut early", "stride length mismatch"],
    teaching_progression: ["drag-line awareness", "towel-drag drill", "loaded back-leg push", "live drag integration"],
    composite_weight: 7,
  },
  extension_consistency: {
    id: "extension_consistency",
    label: "Release Extension Consistency",
    topic_id: "pitching.v2.extension_consistency",
    type: "tracked_only",
    measurement: "Release extension distance (ft) — average, variance, trend",
    target: "Tracked-only — never pass/fail",
    acceptable: "—",
    purpose: "Performance signal; feeds AI Hammer, reports, video & drill recs, injury caution lineage",
    questions_engine_answers: [
      "Is extension trending up, down, or stable?",
      "Is variance increasing — possible mechanical drift?",
    ],
    required_outputs: ["extension_avg", "extension_variance", "extension_trend"],
    ideal_pattern: "Stable or improving extension over time",
    common_deficiencies: ["extension drop trend", "high variance pitch-to-pitch"],
    root_causes: ["stride collapse", "posture loss", "early arm fire"],
    teaching_progression: ["extension awareness", "long-toss progressions", "stride-extension integration", "live extension under stress"],
    composite_weight: 0,
  },
  arm_slot_consistency: {
    id: "arm_slot_consistency",
    label: "Arm Slot Consistency",
    topic_id: "pitching.v2.arm_slot_consistency",
    type: "tracked_only",
    measurement: "Arm slot angle — variance, trend, fatigue & pain correlation",
    target: "Tracked-only — never pass/fail",
    acceptable: "—",
    purpose: "Detect drift indicating fatigue, compensation, mechanical change, or injury risk",
    questions_engine_answers: [
      "Is arm slot drifting from baseline?",
      "Does drift correlate with fatigue or athlete-reported pain?",
    ],
    required_outputs: ["arm_slot_avg", "arm_slot_variance", "arm_slot_trend", "fatigue_correlation", "pain_correlation"],
    ideal_pattern: "Stable arm slot session-to-session",
    common_deficiencies: ["progressive slot drop within session", "increasing variance week-over-week"],
    root_causes: ["fatigue", "compensation pattern", "shoulder/elbow stress"],
    teaching_progression: ["slot awareness", "mirror reps", "low-intent slot work", "live slot integration"],
    composite_weight: 0,
  },
};

/** Tier boundaries — pinned to engine version. */
export function tierForScore(score: number | null): PieV2SeverityTier | null {
  if (score === null || Number.isNaN(score)) return null;
  if (score >= 85) return "clean";
  if (score >= 70) return "minor";
  if (score >= 50) return "major";
  return "critical";
}
