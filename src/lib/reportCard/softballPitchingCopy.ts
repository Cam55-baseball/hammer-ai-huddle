/**
 * Athlete-facing softball windmill copy. Coach language, no numbers, softball
 * terms only (circle, windmill, stride foot, drive leg). Every standard keeps
 * its SOURCED / PROPOSED marking in the label the athlete sees.
 * Research citations live in docs/SOFTBALL-PITCHING-DOCTRINE.md, never here.
 */
import type { SpKey, SpBasis } from "../biomech/metrics/softballPitchingTiles";

export const SP_BASIS_LABEL: Record<SpBasis, string> = {
  SOURCED: "Research-based standard",
  SOURCED_BAND: "Research-based standard (published range)",
  SOURCED_CORRELATION: "Research-based — recorded, never graded",
  PROPOSED: "Proposed starting standard — not yet published",
};

export const SP_PRO_LINE = "Worth showing this to your coach or a qualified pitching or medical professional.";

export const SP_CARD_INTRO = "This windmill card is built from published softball pitching research. Some standards come straight from that research; others are our proposed starting points and are labelled that way. It is not a medical check.";

export const SOFTBALL_PITCHING_COPY: Record<SpKey, { name: string; standard: string; coach: string; missing: string }> = {
  stride_profile: {
    name: "Stride Through the Circle",
    standard: "Stride length compared with your height, checked at the back of the circle, at stride foot contact and at release. Research-based standard; the pass window is a proposed starting point. Graded only for a fastball with your age group known.",
    coach: "Drive off the rubber and let the stride carry you toward the plate. Your stride changes with the pitch you throw, so we only grade it on your fastball.",
    missing: "We couldn't see both feet clearly through the stride on this clip.",
  },
  stride_triple_extension: {
    name: "Drive Leg Push",
    standard: "Hip, knee and ankle of the drive leg all extend as you push off, chest stays facing the plate. Research-based; the pass line is proposed. Needs a side-on clip and a plate-line clip of the same pitch before it can be graded.",
    coach: "Push hard off the drive leg like a sprinter leaving the blocks, and keep your chest toward the plate as you go.",
    missing: "We need both a side-on clip and a clip from the plate line of the same pitch to check this one.",
  },
  trunk_flexion: {
    name: "Forward Lean Toward the Plate",
    standard: "Recorded only, never graded. Research on young pitchers links more forward lean with more speed, so more lean is never marked as a fault.",
    coach: "Staying over your front side as you come through is a good thing — it's shown here so you and your coach can track it.",
    missing: "We couldn't see your hips and shoulders clearly at the key moments.",
  },
  sfc_foot_angle: {
    name: "Stride Foot Landing Angle",
    standard: "Stride foot lands pointed straight or turned toward your throwing-arm side, within the published range. Research-based standard (published range). Needs a clip from the plate line or overhead.",
    coach: "Land with your stride foot pointed at the plate or turned slightly toward your throwing side so your hips can open on time.",
    missing: "This one needs a clip filmed from the plate line.",
  },
  arm_path: {
    name: "Arm Stays Close Around the Circle",
    standard: "Throwing arm stays close to the body from stride foot contact through release. Research-based; the line is a proposed starting point. Needs a clip from the plate line.",
    coach: "Keep the circle tight and brush past your hip — a wide circle leaks speed and control.",
    missing: "This one needs a clip filmed from the plate line.",
  },
  windup_knee_valgus_flag: {
    name: "Drive Knee Caving In at the Load (safety flag, not graded)",
    standard: "Safety flag only, never part of a grade. Needs a clip from the plate line.",
    coach: `Your drive knee looked like it caved inward as you loaded. Research links that to less stable hips and more stress on the leg. ${SP_PRO_LINE}`,
    missing: "This one needs a clip filmed from the plate line.",
  },
  sfc_knee_valgus_flag: {
    name: "Stride Knee Caving In at Landing (safety flag, not graded)",
    standard: "Safety flag only, never part of a grade. Needs a clip from the plate line.",
    coach: `Your stride knee looked like it caved inward when your foot landed. Research links that to less stable hips and more stress on the leg. ${SP_PRO_LINE}`,
    missing: "This one needs a clip filmed from the plate line.",
  },
};
