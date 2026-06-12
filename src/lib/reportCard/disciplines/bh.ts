import type { ReportCardSpec, ReportCardTileSpec } from "../types";
import { readNumber, readBool, readScore100, missingState, scoreMeterState } from "../metricReaders";

/**
 * Baseball Hitting — 15-tile contract mapped to the P1–P4 doctrine.
 *
 * P1 — Hip Load Stability (non-negotiable PASS gate)
 * P2 — Hand Load · P2 Timing to Knee Lift · Eyes / Head Tracking
 * P3 — Stride Direction · Heel Plant · P3 Timing to Release
 * P4 — Sequencing (NN) · Bat Path · On-Plane % · Time-to-Contact ·
 *      Bat Speed · Back Elbow at Contact · Hitter's Move (NN) · Finish & Balance
 */
const tiles: ReportCardTileSpec[] = [
  // ============ P1 ============
  {
    key: "hip_load",
    name: "Hip Load Stability",
    mode: "score_meter",
    standard: "Stable through P2 — no body / head / front-foot drift",
    thresholdChip: "Acceptable 70 · Elite 90",
    phase: "P1 Hip Load",
    nonNegotiable: true,
    explainer: {
      whatWhy:
        "P1 is about STABILITY. You pass by NOT drifting forward (body, head, or front foot) while the pitcher reaches knee lift. A bigger, balanced back-hip load on top of stability earns elite. Bigger load = more stored swing power.",
      howToImprove:
        "Mirror loads. Pause at peak hip load while a partner mimics a pitcher's leg lift — your head and front foot should freeze. Catch-play with intent on hip-first timing.",
      encouragement: "Stay still. Stay loaded. Let the pitcher come to you.",
    },
    compute: (a) => {
      const m = readScore100(a, "hip_stability_score_100", "hip_load_score_10");
      if (!m) return missingState(a, "hip_stability_score_100");
      return scoreMeterState(m.value, m.confidence, 70, 90);
    },
  },

  // ============ P2 ============
  {
    key: "hand_load",
    name: "Hand Load",
    mode: "score_meter",
    standard: "Loads behind head AFTER P1 is stable; chest stays square",
    thresholdChip: "Acceptable 65 · Elite 88",
    phase: "P2 Hand Load",
    explainer: {
      whatWhy:
        "Bat / scap / knob load behind the head AFTER P1 is stable. A clean P2 creates the centerline that lets your head stay still through P3 and sets up an X-factor stretch.",
      howToImprove: "Slow-tempo dry cuts. Scap-pinch drills. Knob-to-back-hip checkpoint.",
      encouragement: "Quiet hands behind the head. Centerline locked.",
    },
    compute: (a) => {
      const m = readScore100(a, "hand_load_score_100", "hand_load_score_10");
      if (!m) return missingState(a, "hand_load_score_100");
      return scoreMeterState(m.value, m.confidence, 65, 88);
    },
  },
  {
    key: "p2_timing",
    name: "P2 Timing → Knee Lift",
    mode: "pass_fail",
    standard: "Hand load completes within ±150 ms of pitcher peak knee lift",
    phase: "P2 Hand Load",
    explainer: {
      whatWhy:
        "P2 should resolve right as the pitcher hits peak knee lift. Early = drifts forward; late = rushed P3.",
      howToImprove: "Front-toss with a partner who calls 'knee up' — sync your hand load to that cue.",
      encouragement: "Match the pitcher. Hands set when his knee peaks.",
    },
    compute: (a) => {
      const m = readBool(a, "p2_timing_pass");
      if (!m) return missingState(a, "p2_timing_pass");
      return { status: m.value ? "pass" : "fail", confidence: m.confidence };
    },
  },
  {
    key: "eyes_tracking",
    name: "Eyes / Head Tracking",
    mode: "score_meter",
    standard: "Eyes track the ball, head does not chase it",
    thresholdChip: "Acceptable 70 · Elite 90",
    phase: "P2 Hand Load",
    explainer: {
      whatWhy:
        "Lateral head movement toward the pitcher is a major contact disruptor. Eyes work; head stays.",
      howToImprove: "Tee work with eyes-on-impact cue. Slow-mo side review of head path across the swing.",
      encouragement: "Eyes on the ball. Head on its post.",
    },
    compute: (a) => {
      const m = readNumber(a, "eyes_track_score_100");
      if (!m) return missingState(a, "eyes_track_score_100");
      return scoreMeterState(m.value, m.confidence, 70, 90);
    },
  },

  // ============ P3 ============
  {
    key: "stride_direction",
    name: "Stride Direction",
    mode: "pass_fail",
    standard: "Within 15° of square to pitcher (either way)",
    phase: "P3 Stride / Landing",
    explainer: {
      whatWhy:
        "Stride direction relative to a square line at the pitcher. Stepping out (bucket) or stepping in (across body) both leak power. Within 15° either way keeps the chain efficient.",
      howToImprove: "Tape a stride line. Slow tempo tee work focused only on stride direction.",
      encouragement: "Square stride, square chance. Trust the line.",
    },
    compute: (a) => {
      const m = readNumber(a, "stride_dir_deg_off_square");
      if (!m) return missingState(a, "stride_dir_deg_off_square");
      return { status: Math.abs(m.value) <= 15 ? "pass" : "fail", confidence: m.confidence };
    },
  },
  {
    key: "heel_plant",
    name: "Heel Plant / Landing",
    mode: "score_meter",
    standard: "Sideways landing, both feet down, hips do NOT turn shoulders",
    thresholdChip: "Acceptable 65 · Elite 88",
    phase: "P3 Stride / Landing",
    explainer: {
      whatWhy:
        "Land SIDEWAYS, chest + shoulders square to the plate, both feet down, core max-tensioned. Turning shoulders WITH hips at landing creates a longer, more miss-prone swing.",
      howToImprove: "Heel-plant pause drills. Mirror landings. Slow-mo side-view review.",
      encouragement: "Land it square. Hips stay loaded. Then explode.",
    },
    compute: (a) => {
      const m = readScore100(a, "heel_plant_score_100", "heel_plant_score_10");
      if (!m) return missingState(a, "heel_plant_score_100");
      return scoreMeterState(m.value, m.confidence, 65, 88);
    },
  },
  {
    key: "p3_timing",
    name: "P3 Timing → Release",
    mode: "pass_fail",
    standard: "Front foot strike within ±120 ms of pitcher release",
    phase: "P3 Stride / Landing",
    explainer: {
      whatWhy:
        "Front foot should be down right as the pitcher reaches release. That sets your direction and gives you the longest possible look at the ball.",
      howToImprove: "Live BP with a count cue: 'release' = foot down. Adjust load tempo to match.",
      encouragement: "Foot down at release. Now you're a hitter, not a guesser.",
    },
    compute: (a) => {
      const m = readBool(a, "p3_timing_pass");
      if (!m) return missingState(a, "p3_timing_pass");
      return { status: m.value ? "pass" : "fail", confidence: m.confidence };
    },
  },

  // ============ P4 ============
  {
    key: "sequencing",
    name: "Sequencing",
    mode: "pass_fail",
    standard: "Legs → Hands → Pause → Stride → Pause → Contact",
    phase: "P4 Hitter's Move",
    nonNegotiable: true,
    explainer: {
      whatWhy:
        "Load legs → Load hands → Pause → Step / Stride → Pause → Contact. Out-of-order or rushed sequences collapse timing.",
      howToImprove: "Pause-pause tee rounds. Front-toss with sequence call-outs.",
      encouragement: "Two pauses, one swing. Slow is smooth, smooth is fast.",
    },
    compute: (a) => {
      const m = readBool(a, "sequencing_ok");
      if (!m) return missingState(a, "sequencing_ok");
      return { status: m.value ? "pass" : "fail", confidence: m.confidence };
    },
  },
  {
    key: "bat_path",
    name: "Bat Path In/Out of Zone",
    mode: "score_meter",
    standard: "Enters behind ball, exits in front, long on-plane window",
    thresholdChip: "Acceptable 65 · Elite 88",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "Elite bat path enters the zone behind the ball and exits in front — a long, on-plane window that maximizes contact and damage.",
      howToImprove: "Tee work behind/under/in-front-of the ball. PVC plane constraint drills.",
      encouragement: "Long path through the zone — short path to the ball.",
    },
    compute: (a) => {
      const m = readScore100(a, "bat_path_score_100", "bat_path_score_10");
      if (!m) return missingState(a, "bat_path_score_100");
      return scoreMeterState(m.value, m.confidence, 65, 88);
    },
  },
  {
    key: "on_plane",
    name: "On-Plane %",
    mode: "score_meter",
    standard: "Percentage of the swing that stays on the pitch plane",
    thresholdChip: "Acceptable 60 · Elite 85",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "How long the barrel stays on the plane of the incoming pitch. Higher % = more margin for timing error.",
      howToImprove: "Tilt-tee drills (high pitch / low pitch). Constraint band on the bat to feel plane.",
      encouragement: "Stay on it longer. The ball finds the barrel.",
    },
    compute: (a) => {
      const m = readNumber(a, "on_plane_pct");
      if (!m) return missingState(a, "on_plane_pct");
      return scoreMeterState(m.value, m.confidence, 60, 85);
    },
  },
  {
    key: "time_to_contact",
    name: "Time to Contact",
    mode: "raw_pass_fail",
    standard: "Time from swing start to contact",
    thresholdChip: "Acceptable ≤175 ms · Elite ≤150 ms",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "How long from the moment the bat starts moving until ball-barrel contact. Faster = better commitment window.",
      howToImprove: "Short-load tee work. Heavy-bat / light-bat alternation. React drills.",
      encouragement: "Quick decision, quick barrel.",
    },
    compute: (a) => {
      const m = readNumber(a, "time_to_contact_ms");
      if (!m) return missingState(a, "time_to_contact_ms");
      const elite = m.value <= 150;
      const pass = m.value <= 175;
      return {
        status: elite ? "elite" : pass ? "pass" : "fail",
        value: `${Math.round(m.value)}ms`,
        confidence: m.confidence,
      };
    },
  },
  {
    key: "bat_speed_contact",
    name: "Bat Speed Through Contact",
    mode: "raw_passed",
    standard: "Acceleration through the ball (mph proxy)",
    thresholdChip: "Acceptable ≥65 · Elite ≥75",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "Barrel speed AT impact, not before. Elite hitters are still accelerating through contact.",
      howToImprove: "Overload / underload bat work. Med-ball rotational throws. Contact-point isolation drills.",
      encouragement: "Accelerate through the ball, not at it.",
    },
    compute: (a) => {
      const m = readNumber(a, "bat_speed_contact_mph");
      if (!m) return missingState(a, "bat_speed_contact_mph");
      const elite = m.value >= 75;
      const pass = m.value >= 65;
      return {
        status: elite ? "elite" : pass ? "pass" : "fail",
        value: `${m.value.toFixed(0)} mph`,
        confidence: m.confidence,
      };
    },
  },
  {
    key: "back_elbow_contact",
    name: "Back Elbow at Contact",
    mode: "raw_passed",
    standard: "Past belly button, shoulders square",
    thresholdChip: "Acceptable ≥0° past BB · Elite ≥20°",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "Back elbow drives past the belly button while the chest stays square as long as possible. This unlocks rotational extension after contact and keeps your barrel in the zone longer.",
      howToImprove: "Catch-the-ball drills with both hands. Knob-to-back-hip then meet-the-ball.",
      encouragement: "Both hands to the ball, both hands through it.",
    },
    compute: (a) => {
      const m = readNumber(a, "back_elbow_past_bb_deg");
      if (!m) return missingState(a, "back_elbow_past_bb_deg");
      const elite = m.value >= 20;
      const pass = m.value >= 0;
      return {
        status: elite ? "elite" : pass ? "pass" : "fail",
        value: `${Math.round(m.value)}°`,
        confidence: m.confidence,
      };
    },
  },
  {
    key: "hitters_move",
    name: "Hitter's Move Quality",
    mode: "score_meter",
    standard: "Hands back, elbow leads, contact with hands, barrel last",
    thresholdChip: "Acceptable 70 · Elite 92",
    phase: "P4 Hitter's Move",
    nonNegotiable: true,
    explainer: {
      whatWhy:
        "Knob = fulcrum. Back elbow drives forward FIRST. Hands stay back to get in line with the ball, shoulders stay closed as long as possible, barrel catapults through last. Contact lines up with the hands; extension is a post-contact byproduct.",
      howToImprove: "Pause-at-launch tees. Front-arm post drills. Catch-the-ball-with-both-hands cue.",
      encouragement: "Trust the load. Let the elbow run. Catch the ball with your hands.",
    },
    compute: (a) => {
      const m = readScore100(a, "hitters_move_score_100", "hitters_move_score_10");
      if (!m) return missingState(a, "hitters_move_score_100");
      return scoreMeterState(m.value, m.confidence, 70, 92);
    },
  },
  {
    key: "finish_balance",
    name: "Finish & Balance",
    mode: "score_meter",
    standard: "Post-contact balance, no fall-off, two-hand finish",
    thresholdChip: "Acceptable 65 · Elite 88",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "A balanced finish proves the swing was rotational, not linear. Falling off line wastes power and disrupts the next pitch.",
      howToImprove: "Hold-the-finish tee rounds. Single-leg balance drills. Mirror finish review.",
      encouragement: "Finish like a statue. Power stays in the swing.",
    },
    compute: (a) => {
      const m = readNumber(a, "finish_balance_score_100");
      if (!m) return missingState(a, "finish_balance_score_100");
      return scoreMeterState(m.value, m.confidence, 65, 88);
    },
  },
];

export const bhReportCard: ReportCardSpec = {
  disciplineLabel: "Baseball Hitting",
  groupByPhase: true,
  tiles,
};
