import type { DisciplineContract } from "./shared";

/**
 * Baseball Hitting — 15-tile metric contract, /100 scored meters.
 * Stable keys persist on `videos.ai_analysis.metrics`.
 */
export const bhContract: DisciplineContract = {
  id: "bh",
  label: "Baseball Hitting",
  metrics: [
    // ============ P1 ============
    {
      key: "hip_stability_score_100",
      tileKey: "hip_load",
      label: "P1 Hip Load Stability (0-100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0-100 for STABILITY of the back-hip load through P2. PASS at 70 = no body/head/front-foot drift while pitcher reaches knee lift. ELITE at 90 = stable AND a big, balanced load that stores power. Worked example: if head moves 4% of body height toward pitcher during P2 → ~55. If head and front foot are still and load is balanced and clearly loaded → ~85.",
    },
    // ============ P2 ============
    {
      key: "hand_load_score_100",
      tileKey: "hand_load",
      label: "P2 Hand Load Position (0-100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0-100 for the bat/scap/knob load behind the head AFTER P1 is stable. PASS at 65, ELITE at 88. Worked example: hands clearly loaded behind head with scap pinch and chest square → ~85; hands stay near front shoulder with no scap load → ~45.",
    },
    {
      key: "p2_timing_pass",
      tileKey: "p2_timing",
      label: "P2 timing aligned to pitcher peak knee lift",
      kind: "boolean",
      prompt:
        "TRUE if the hitter's hand load completes within roughly ±150 ms of the pitcher's PEAK KNEE LIFT. FALSE if early (drifts forward) or late (rushed P3). If the pitcher's knee lift is not visible in the frames, set missing=true with reason 'Pitcher knee lift not in frame'.",
    },
    {
      key: "eyes_track_score_100",
      tileKey: "eyes_tracking",
      label: "Eyes / head tracking quality (0-100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0-100 for how steady the head/eyes stay. PASS at 70, ELITE at 90. Lateral head movement TOWARD the pitcher is the biggest deduction. Worked example: head moves >4% of body height laterally → ~50; rock-steady head with eyes tracking the ball → ~92.",
    },
    // ============ P3 ============
    {
      key: "stride_dir_deg_off_square",
      tileKey: "stride_direction",
      label: "Stride direction degrees off square to pitcher",
      kind: "number",
      unit: "degrees",
      range: [-45, 45],
      prompt:
        "Degrees stride deviates from a square line to the pitcher. Positive = stepping out (bucket). Negative = stepping in (across body). |value|<=15° passes.",
    },
    {
      key: "heel_plant_score_100",
      tileKey: "heel_plant",
      label: "P3 Heel Plant / Landing Quality (0-100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0-100 for landing sideways, chest+shoulders square to plate, both feet down, core tensioned, hips NOT turning shoulders open. PASS at 65, ELITE at 88. Worked example: shoulders rotate WITH hips at landing → ~45; sideways landing with shoulders still closed → ~85.",
    },
    {
      key: "p3_timing_pass",
      tileKey: "p3_timing",
      label: "P3 timing aligned to pitcher release",
      kind: "boolean",
      prompt:
        "TRUE if the front foot is down within roughly ±120 ms of the pitcher reaching release point. FALSE if foot is down too early (drifting) or still in flight at release (late). If pitcher release point is not visible, set missing=true with reason 'Pitcher release point not in frame'.",
    },
    {
      key: "hands_outside_shoulders_at_landing_pass",
      tileKey: "hands_outside_shoulders_at_landing",
      label: "Hands outside shoulder line at front-foot landing",
      kind: "boolean",
      prompt:
        "TRUE if at the frame of FRONT-FOOT STRIKE (landing) the hands sit HORIZONTALLY OUTSIDE the line of the back shoulder (i.e., further from the centerline than the back shoulder). FALSE if hands are stacked inside the shoulders or pulled in front of the chest. If hands or back shoulder are not visible in the landing frame, set missing=true with reason 'Hands or back shoulder not visible at landing'.",
    },

    // ============ P4 ============
    {
      key: "sequencing_ok",
      tileKey: "sequencing",
      label: "Sequencing legal",
      kind: "boolean",
      prompt:
        "TRUE if sequence is: Load legs -> Load hands -> Pause -> Stride -> Pause -> Contact. FALSE if rushed or out of order.",
    },
    {
      key: "bat_path_score_100",
      tileKey: "bat_path",
      label: "Bat Path In/Out of Zone (0-100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0-100 for elite bat path: enters behind ball, exits in front, long on-plane window. PASS at 65, ELITE at 88.",
    },
    {
      key: "on_plane_pct",
      tileKey: "on_plane",
      label: "% of swing arc on the pitch plane",
      kind: "number",
      unit: "percent",
      range: [0, 100],
      prompt:
        "Percentage of the swing arc that stays on the plane of the incoming pitch. PASS at 60%, ELITE at 85%. Worked example: barrel comes off plane immediately after contact → ~40%; long on-plane window through and past contact → ~85%.",
    },
    {
      key: "time_to_contact_ms",
      tileKey: "time_to_contact",
      label: "Time from swing start to contact (ms)",
      kind: "number",
      unit: "ms",
      range: [80, 400],
      prompt:
        "Milliseconds from the moment the bat first starts moving forward until ball-barrel contact. PASS ≤175 ms, ELITE ≤150 ms. Estimate from the visible frames using the displayed frame rate context.",
    },
    {
      key: "bat_speed_contact_mph",
      tileKey: "bat_speed_contact",
      label: "Bat speed through contact (mph proxy)",
      kind: "number",
      unit: "mph",
      range: [30, 110],
      prompt:
        "Estimated barrel speed AT contact in mph. PASS ≥65, ELITE ≥75. If no sensor data and motion blur is too high to estimate, set missing=true with reason 'Frame rate too low for bat speed estimate'.",
    },
    {
      key: "back_elbow_past_bb_deg",
      tileKey: "back_elbow_contact",
      label: "Back elbow past belly button at contact (degrees)",
      kind: "number",
      unit: "degrees",
      range: [-45, 60],
      prompt:
        "Degrees back elbow has driven PAST belly button at contact, shoulders square. PASS at ≥0°, ELITE at ≥20°.",
    },
    {
      key: "hitters_move_score_100",
      tileKey: "hitters_move",
      label: "P4 Hitter's Move Quality (0-100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0-100: hands stay back, elbow leads, no casting/early barrel flip, chest stays square, contact made with the hands, barrel catapults last. PASS at 70, ELITE at 92.",
    },
    {
      key: "shoulder_plane_steadiness_score_100",
      tileKey: "shoulder_plane_steadiness",
      label: "Shoulder plane steadiness through P4 (0-100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0-100 for how steady the SHOULDER PLANE remains from the start of shoulder rotation through contact. PASS at 70, ELITE at 90. Worked example: shoulder line wobbles or re-tilts mid-rotation → ~50; same tilt held from rotation start through contact → ~88. Measure the angle of the line between the two shoulders across the rotation window; deduct for any change > a few degrees.",
    },
    {
      key: "shoulder_to_shoulder_hold_pct_to_contact",
      tileKey: "shoulder_to_shoulder_hold",
      label: "Hands-to-back-shoulder spacing held: % of landing→contact window",
      kind: "number",
      unit: "percent",
      range: [0, 100],
      prompt:
        "Percentage of the LANDING→CONTACT window during which the spacing between the hand cluster and the back shoulder is HELD. Method: at the front-foot landing frame, measure the 2D distance between the hand cluster centroid and the back-shoulder joint (call this D0). For every frame from landing to contact, recompute that distance. The spacing is 'held' on a frame when distance ≥ 0.90 * D0. Return the % of frames in the landing→contact window where spacing was held. PASS at ≥50%, ELITE at ≥95% (held essentially all the way to contact). If hands or back shoulder are not trackable across the landing→contact window, set missing=true with the specific reason. NEVER guess.",
    },
    {
      key: "shoulder_to_shoulder_hold_pass",
      tileKey: "shoulder_to_shoulder_hold",
      label: "Hands stayed back through P4 (boolean fallback)",
      kind: "boolean",
      prompt:
        "TRUE only if the spacing between the hand cluster and the back shoulder remained at ≥90% of its landing-frame value across at least 50% of frames from landing to contact. Prefer emitting shoulder_to_shoulder_hold_pct_to_contact instead — only emit this boolean when you cannot estimate a percentage.",
    },
    {
      key: "front_shoulder_leak_before_contact",
      tileKey: "shoulder_to_shoulder_hold",
      label: "Front shoulder flew open / leaked out of sequence before contact",
      kind: "boolean",
      prompt:
        "TRUE if the front shoulder rotates open toward the pitcher BEFORE contact in a way that breaks the hip→shoulder sequence. Operational rule: measure the angle of the line between the two shoulders relative to the line from back shoulder to the pitcher. If that line rotates more than ~15° toward the pitcher before the contact frame (i.e. the front shoulder has flown open ahead of where the hips have rotated), set TRUE. This is the auto-FAIL trigger for the shoulder-to-shoulder hold tile — it nullifies the move regardless of spacing held.",
    },
    {
      key: "front_shoulder_leak_pct_of_window",
      tileKey: "shoulder_to_shoulder_hold",
      label: "At what % of the landing→contact window did the front shoulder leak (if it did)",
      kind: "number",
      unit: "percent",
      range: [0, 100],
      prompt:
        "If front_shoulder_leak_before_contact is TRUE, return the percentage of the landing→contact window at which the leak FIRST crossed the ~15° threshold (e.g. 35 means about a third of the way from landing to contact). If the leak never occurred, set missing=true with reason 'no_leak'.",
    },
  ],
};
