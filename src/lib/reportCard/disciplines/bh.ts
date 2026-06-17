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
    standard: "Hand load is finished by the time the pitcher reaches peak knee lift. Early is fine; late is the only fail.",
    phase: "P2 Hand Load",
    explainer: {
      whatWhy:
        "Your hand load must be FINISHED by the time the pitcher reaches peak knee lift. Finishing EARLY is acceptable and common — it is not a timing miss. The only failure mode here is finishing LATE, which forces a rushed P3 and a late foot down. If you finish early and then drift forward while you wait, that drift is a stability problem caught by P1 Hip Load Stability, not a P2 timing problem — don't double-count it against your timing.",
      howToImprove: "Be set by the time the pitcher's knee peaks — earlier is fine. Front-toss with a partner who calls 'knee up' — your hands should already be quiet by that cue, not still moving. Slow-mo side review: pause at pitcher peak knee lift and confirm your hands are set.",
      encouragement: "Be set by his knee peak. Earlier is fine. Late is the miss.",
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
    standard: "Front foot is down at pitcher release (perfect). Slightly late is acceptable; clearly late fails.",
    phase: "P3 Stride / Landing",
    explainer: {
      whatWhy:
        "Foot-down-at-release is the ideal target — that sets your direction and gives you the longest possible look at the ball. A small amount later is acceptable (the current tile treats anything inside its tolerance window as a pass). Foot down BEFORE release is also acceptable from a timing standpoint, though it may signal other issues that get caught elsewhere. The only true failure here is foot down clearly AFTER release — you lost your look at the ball. Note: this tile is currently binary (pass/fail). A graded version that scores how close you are to perfect is queued for the metric-review phase — see .lovable/p3-timing-methodology.md.",
      howToImprove: "Live BP with a count cue: 'release' = foot down. Earlier is okay — just don't be late. Adjust load tempo (start the load sooner) if you're consistently late.",
      encouragement: "Foot down at release. A hair late is okay. Late is the miss.",
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
        "At landing (the moment right before P4 begins), the hands should sit horizontally OUTSIDE the back-shoulder line, not stacked inside it. Hands outside = runway for the back elbow to lead the barrel onto the plane and stay there. Hands inside the shoulders force the swing to be steep and short — the barrel has to dive to find the plane, then leaves it almost immediately, which is what produces top-spin contact and inside-out cuts on pitches you should drive.",
      howToImprove:
        "FAILURE-SPECIFIC DRILLS — pick the one that matches your miss: (1) If your hands drift INSIDE during the stride: pause-at-landing tee work, freeze at front-foot strike and physically check hand position behind the back shoulder before swinging. (2) If your hands COLLAPSE inward as the foot lands: wall-behind drill — stand with the back of your hands inches from a wall at landing, the wall fails you if the hands move toward the shoulders. (3) If your hands NEVER got outside in the load: reset the load itself — scap-load plus elbow-up dry reps before adding the stride.",
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
        "Sequencing is the ORDER the kinetic chain fires in: back hip → torso/shoulders → back elbow → hands → barrel. Each segment loads the next; nothing fires until the segment behind it has done its job. Pass means the order held. Fail means a segment jumped the line — usually shoulders firing with the hips, or hands pushing before the elbow led — which steals power from everything downstream and shortens the contact window. A low score here is the single biggest leak you can have, because every later metric (bat path, on-plane, time to contact, bat speed) is downstream of it.",
      howToImprove:
        "Pause-pause tee rounds (load → pause → stride → pause → swing). Back-hip-to-floor dry work — load the back hip and let IT drive the foot down, no voluntary hip after landing. Front-toss with a partner calling out the chain ('hip — shoulder — elbow — hand — barrel') so you feel the order, not just the swing.",
      encouragement: "Hip first. Barrel last. The order is the swing.",
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
    name: "Connection & Barrel Delivery (P4 → Contact)",
    mode: "raw_passed",
    standard: "Connection held through launch → barrel delivered by the elbow → contact made BEFORE extension starts (blind spot minimized)",
    thresholdChip: "Window metric: launch (P4) → barrel delivery → contact",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "This is NOT a single-frame elbow check at contact. It evaluates connection and barrel delivery across the entire P4 launch → contact window, plus how long that window lasts. The elbow makes it easier to slot the bat, but slotting the bat is really about getting the hands on plane with the ball while the knob stays toward the catcher. If the elbow goes forward, the barrel turns forward without the hands losing position. Then the body uses energy from hips → shoulder → knob to power through the ball because everything stayed in a powerful kinematic position. Cues: shoulders stay as square as possible as long as possible while the back hip works aggressively; connection (elbow-to-torso tightness) holds through launch; sequencing into the barrel is intact (elbow leads, barrel follows). Blind spot starts when extension starts. Ideally you make contact FIRST and then release into extension — the time between extension starting and contact being made is the blind spot, and minimizing it is the whole point of the hitter's move.",
      howToImprove:
        "Train the move, not the pose. Connection drills with a towel or ball pinned to the back side through launch. Slot-the-bat dry reps emphasizing knob-to-catcher while the elbow leads the barrel. Shoulders-stay-closed work against a wall or alignment stick. Tee work focused on contact-before-extension — feel the barrel meet the ball with the elbow still working, and only THEN release into extension. Slow-mo side video to check that extension does not begin before contact.",
      encouragement: "Connection through launch. Elbow leads the barrel. Contact, then extension.",
    },
    compute: (a) => {
      // Measurement under review. The legacy back_elbow_past_bb_deg field samples
      // the wrong frame (contact, after the elbow/barrel relationship has flipped).
      // Until the new window-based measurement ships (see .lovable/back-elbow-methodology.md),
      // this tile reports missing rather than fabricating a score from the wrong frame.
      return missingState(a, "connection_barrel_delivery_window");
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
    standard: "Stayed connected with two hands through contact and extension until the ball was gone",
    thresholdChip: "Acceptable 65 · Elite 88",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "The goal is NOT 'hold a two-hand finish.' The goal is to MAINTAIN connection with two hands through contact and all the way through extension — until the ball is gone. The two-hand finish is just the visible byproduct of that connection holding. A swing that lets go early, rolls over, or releases the top hand before the ball clears extension is leaking power and barrel control at the most important moment of the swing. Falling off line afterward is downstream evidence of a linear leak earlier in P4. Note: the measurable definition of this metric is being reviewed separately to better reflect the connection-through-extension intent.",
      howToImprove: "Connected-extension tee rounds — both hands stay on through full extension, hold connection until well past contact. Single-leg balance work as a downstream check. Mirror review with a focus on hand connection through extension, not the final pose.",
      encouragement: "Stay connected through the ball. The finish is the proof, not the goal.",
    },
    compute: (a) => {
      const m = readNumber(a, "finish_balance_score_100");
      if (!m) return missingState(a, "finish_balance_score_100");
      return scoreMeterState(m.value, m.confidence, 65, 88);
    },
  },
  // ----- Shoulder-to-Shoulder Hold (P4 Pass/Fail) -----
  {
    key: "shoulder_to_shoulder_hold",
    name: "Shoulder-to-Shoulder Hold",
    mode: "pass_fail",
    standard: "Hands-to-back-shoulder spacing held ≥50% of landing → contact; elite = held all the way to contact",
    phase: "P4 Hitter's Move",
    nonNegotiable: true,
    explainer: {
      whatWhy:
        "At landing (end of P3) you create separation: the hands sit behind the back shoulder. Your job is to HOLD that spacing — shoulder to shoulder — as long as possible into P4, ideally all the way to contact. Holding the spacing is proof there's no hand-push at the ball: the hands stayed back so the back elbow could take the bat to the ball for maximum quickness and, if the hip-to-shoulder sequence stays intact, maximum power without manipulation. This is often misread as an 'arm bar' — it isn't. The hands' job is to LINE UP with the ball, not move forward to it. The longer you can hold the shoulder-to-shoulder spacing, the more elite the move. AUTO-FAIL: if the front shoulder flies open / leaks out of sequence before contact, the spacing move is nullified — you must know this is why, even if the rest looked good.",
      howToImprove:
        "Drills: pause-at-landing tee work then check that the hands stay PUT while the elbow leads the turn. Knob-pinned-to-the-side reps. Partner holds the knob through P4 while you drive the back elbow to the ball. 'Catch the ball with both hands' cue at the contact point. Front-shoulder discipline drills: PVC across the shoulders, slow turn keeping the front shoulder closed until the elbow has already led, then let the rotation finish on its own.",
      encouragement: "Hands back. Elbow leads. Catch the ball — don't chase it.",
    },
    compute: (a) => {
      const leak = readBool(a, "front_shoulder_leak_before_contact");
      const passM = readBool(a, "shoulder_to_shoulder_hold_pass");
      const pctM = readNumber(a, "shoulder_to_shoulder_hold_pct_to_contact");

      // Auto-FAIL: front shoulder leaked out of sequence before contact —
      // this nullifies the move regardless of spacing held. Tell the hitter why.
      if (leak && leak.value === true) {
        const leakPctM = readNumber(a, "front_shoulder_leak_pct_of_window");
        const where =
          leakPctM && Number.isFinite(leakPctM.value)
            ? `at ~${Math.round(leakPctM.value)}% of the landing→contact window`
            : "before contact";
        const heldNote =
          pctM && Number.isFinite(pctM.value)
            ? ` (spacing held ~${Math.round(pctM.value)}% — nullified)`
            : "";
        const conf = Math.min(
          leak.confidence,
          pctM?.confidence ?? leak.confidence,
        );
        return {
          status: "fail",
          confidence: conf,
          note: `Auto-FAIL: front shoulder leaked out of sequence ${where} — nullifies the shoulder-to-shoulder hold${heldNote}.`,
        };
      }

      // Pass/fail derived from pct held (≥50% of window) when available;
      // fall back to the boolean key when the model only emitted that.
      if (pctM) {
        const pct = Math.max(0, Math.min(100, pctM.value));
        const pass = pct >= 50;
        const elite = pct >= 95; // elite = held essentially all the way to contact
        return {
          status: elite ? "elite" : pass ? "pass" : "fail",
          value: `${Math.round(pct)}% held`,
          confidence: pctM.confidence,
        };
      }
      if (passM) {
        return { status: passM.value ? "pass" : "fail", confidence: passM.confidence };
      }
      return missingState(a, "shoulder_to_shoulder_hold_pct_to_contact");
    },
  },
];

export const bhReportCard: ReportCardSpec = {
  disciplineLabel: "Baseball Hitting",
  groupByPhase: true,
  tiles,
};
