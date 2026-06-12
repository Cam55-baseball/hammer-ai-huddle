import type { ReportCardSpec, ReportCardTileSpec } from "../types";
import { readNumber, readBool, readScore100, missingState, scoreMeterState } from "../metricReaders";

/**
 * Baseball Hitting — 17-tile contract mapped to the P1–P4 doctrine.
 *
 * P1 — Hip Load Stability (non-negotiable PASS gate)
 * P2 — Hand Load · P2 Timing to Knee Lift · Eyes / Head Tracking
 * P3 — Stride Direction · Heel Plant · P3 Timing to Release · Hands Outside Shoulders at Landing
 * P4 — Sequencing (NN) · Bat Path · On-Plane % · Time-to-Contact ·
 *      Bat Speed · Back Elbow at Contact · Hitter's Move (NN) · Shoulder Plane Steadiness · Finish & Balance
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
        "Hold-the-load drills: load onto the back hip and freeze while a partner mimics a pitcher's leg lift — head, front foot, and centerline cannot drift. Tee work with eyes closed at peak load to feel a quiet centerline. Weighted-bat hip-load holds to build the position. Mirror checks at peak load before every BP round.",
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
        "Lateral head movement toward the pitcher is a major contact disruptor. Eyes work; head stays. A loaded scap AFTER P1 is what locks the head still — the scap pulls the chin and eye line into a fixed post so the eyes can work without the head chasing them.",
      howToImprove:
        "Load the scap immediately after P1 so the head has a fixed post to sit on. Most pros use the 'ball-on-the-load-spot' drill: place a ball where your head sits at peak load, take the swing, then check that your head has returned to that same reference point relative to the ball. Tee work with eyes-on-impact cue. Slow-mo side review of head path across the swing.",
      encouragement: "Scap locks the post. Eyes do the work.",
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
    standard: "Full foot down sideways, both feet planted, hips do NOT turn shoulders",
    thresholdChip: "Acceptable 65 · Elite 88",
    phase: "P3 Stride / Landing",
    explainer: {
      whatWhy:
        "'Heel plant' is the moment the FULL foot is down — not just the heel — landed sideways with chest and shoulders square to the plate, core max-tensioned. The back hip is what controls the stride (a pitcher-style stride that tensions the core). If the scap stays loaded pre-stride, your stride naturally stays sideways as long as the shoulders don't begin to open — meaning you can engage all of P3 at full force without leaking. Turning shoulders WITH hips at landing creates a longer, more miss-prone swing.",
      howToImprove:
        "Heel-plant pause drills with the scap held loaded the whole time. Back-hip-controls-stride dry work (no bat). Mirror landings checking shoulders are still closed. Slow-mo side-view review.",
      encouragement: "Land it square. Scap loaded. Then explode.",
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
  {
    key: "hands_outside_shoulders_at_landing",
    name: "Hands Outside Shoulders at Landing",
    mode: "pass_fail",
    standard: "At front-foot strike, hands sit OUTSIDE the shoulder line horizontally",
    phase: "P3 Stride / Landing",
    explainer: {
      whatWhy:
        "At landing (right before P4 begins), the hands should be horizontally OUTSIDE the shoulder line. This is the position that gives you the runway to get on plane AND stay on plane smoothly. Hands stacked inside the shoulders force a steep, short bat path.",
      howToImprove:
        "Pause-at-landing tee work — freeze at front-foot strike and check hand position relative to the back shoulder. Wall drills with a target outside the shoulder. Mirror reps at landing.",
      encouragement: "Hands outside the shoulders. Plane unlocked.",
    },
    compute: (a) => {
      const m = readBool(a, "hands_outside_shoulders_at_landing_pass");
      if (!m) return missingState(a, "hands_outside_shoulders_at_landing_pass");
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
        "Load legs → Load hands → Pause → Step / Stride → Pause → Contact. The back hip is what drives the front foot to the ground — the step / back hip should be completely maxed out involuntarily by landing, with all VOLUNTARY hip usage spent during the stepping phase. Out-of-order or rushed sequences collapse timing.",
      howToImprove:
        "Pause-pause tee rounds. Back-hip-to-floor dry work — load the back hip and let it drive the step to the floor (no voluntary hip movement after landing). Front-toss with sequence call-outs.",
      encouragement: "Two pauses, one swing. Back hip drops the foot.",
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
      howToImprove:
        "Line the hands up with the ball to 'catch' it — the knob CANNOT compromise forward ahead of the elbow on its own. The elbow is what's responsible for the forward turn to the ball; the hands stay in line and the barrel follows. Drills: knob-stays-back tee work, elbow-leads-the-turn constraint, catch-with-both-hands cue at the contact point, PVC plane reps.",
      encouragement: "Catch the ball with your hands. Let the elbow do the turning.",
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
      howToImprove:
        "No upper-body movement until the hips have cleared a path of least resistance forward. THEN the back elbow goes forward linearly, taking the barrel to contact — the knob stays back acting as a fulcrum the whole time. Drills: pause-at-launch tee, hips-clear-first dry cuts, knob-pinned-to-side reps, partner-holds-the-knob elbow-to-ball.",
      encouragement: "Hips clear the path. Elbow takes the barrel. Knob never leaves.",
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
      howToImprove:
        "The barrel only accelerates through the ball when the knob stays back as a fulcrum and the back elbow drives forward linearly. If the knob compromises forward early, the barrel decelerates into contact. Drills: overload/underload bat work, med-ball rotational throws, contact-point isolation with knob anchored, catch-the-ball-with-both-hands cue.",
      encouragement: "Accelerate THROUGH the ball, not at it.",
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
    standard: "Past belly button, shoulders square, knob still pinned back",
    thresholdChip: "Acceptable ≥0° past BB · Elite ≥20°",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "Back elbow drives past the belly button while the chest stays square as long as possible. The knob MUST stay back / pinned in the loaded position for this to work — the elbow hunts the ball forward while the hands stay loaded behind it. This is what unlocks rotational extension after contact and keeps your barrel in the zone longer.",
      howToImprove:
        "Hunt the ball with the back elbow while the knob stays in the loaded position. Drills: knob-anchored tee reps, partner holds the knob while you drive the back elbow to the ball, catch-the-ball-with-both-hands at contact.",
      encouragement: "Knob pinned, elbow hunts. The ball finds the barrel.",
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
    standard: "Knob back · hips clear · elbow leads · hands in line · barrel last",
    thresholdChip: "Acceptable 70 · Elite 92",
    phase: "P4 Hitter's Move",
    nonNegotiable: true,
    explainer: {
      whatWhy:
        "The Hitter's Move is a strict order: knob stays back as the fulcrum → hips clear a path of least resistance → back elbow leads linearly forward → hands stay in line with the ball to 'catch' it → barrel catapults through last. Contact lines up with the hands; extension is a post-contact byproduct.",
      howToImprove:
        "Pause-at-launch tees (freeze the load, then move in order). Hips-clear-first dry reps with the knob pinned. Front-arm post drills. Catch-the-ball-with-both-hands cue. Partner-holds-the-knob elbow-to-ball reps.",
      encouragement: "Knob back, hips clear, elbow runs, hands catch, barrel last.",
    },
    compute: (a) => {
      const m = readScore100(a, "hitters_move_score_100", "hitters_move_score_10");
      if (!m) return missingState(a, "hitters_move_score_100");
      return scoreMeterState(m.value, m.confidence, 70, 92);
    },
  },
  {
    key: "shoulder_plane_steadiness",
    name: "Shoulder Plane Steadiness",
    mode: "score_meter",
    standard: "Once shoulders begin to rotate in P4, the plane holds steady through contact",
    thresholdChip: "Acceptable 70 · Elite 90",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "When the shoulders begin to rotate in P4, the shoulder plane has to HOLD whatever plane it started on through contact. The steadier the plane, the bigger the contact window for what the eyes have already seen. A wobbling plane shrinks that window and turns barreled-up looks into mis-hits.",
      howToImprove:
        "PVC across the shoulders — rotate while holding the same tilt. Mirror reps watching the back shoulder track on a fixed plane. Tee work focused only on plane-holding through contact, no chasing high or low.",
      encouragement: "Pick your plane. Hold your plane. The ball does the rest.",
    },
    compute: (a) => {
      const m = readScore100(a, "shoulder_plane_steadiness_score_100", "shoulder_plane_steadiness_score_10");
      if (!m) return missingState(a, "shoulder_plane_steadiness_score_100");
      return scoreMeterState(m.value, m.confidence, 70, 90);
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
        "A clean, balanced two-hand finish over a stacked back leg is the PROOF that the swing was rotational and that the sequence held — the knob stayed back long enough, the elbow led, and the rotation finished its job. It also means you're already reset for the next pitch. Falling off line is hard evidence of a linear leak somewhere earlier in P4.",
      howToImprove: "Hold-the-finish tee rounds. Single-leg balance drills. Mirror finish review.",
      encouragement: "Finish like a statue. Proof the swing was right.",
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
