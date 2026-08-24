# Hammer Report Card System — Verbatim Reference

Compiled by reading the actual source files directly (not by asking another AI to summarize them). Every quoted block below is copied exactly from the file named above it. Read on 2026-08-24 from the live project.

**What this covers:** `release1.ts`, `contracts/shared.ts`, `contracts/bp.contract.ts`, `contracts/bh.contract.ts`, `contracts/throwing.contract.ts`, `disciplines/bp.ts`, `disciplines/bh.ts`, `grade.ts`, and the section map of `docs/asb/report-card-constitution.md`.

**What this does NOT cover yet** (not read verbatim this pass — flagging honestly rather than guessing): `types.ts`, `index.ts`, `metricReaders.ts`, `v1/hittingV1Schema.ts`, the server-side mirror `supabase/functions/_shared/reportCardContracts.ts` (worth a direct read-vs-read comparison against the client contracts below, given the codebase has a documented history of client/server drift elsewhere), the `analyze-video`/`recompute-report-card` edge functions, the UI components, and the UHRC aggregate layer. The constitution doc itself is ~173,000 characters (roughly 25,000+ words) — its section map is included at the end; its full text was not reproduced here.

---

## 1. Why hitting is off — verbatim doctrine (`release1.ts`)

> Phase 45 — Release-1 Trust Lock.
>
> Single source of truth for which athlete-facing metrics are visible in Release-1. Carries the classification decided by Phase 44 §3.
>
> Doctrine:
> - VISIBLE → landmark-backed end-to-end, may render and contribute to scores.
> - HIDDEN → LLM-derived; MUST NOT appear in any athlete-facing surface, trend, recommendation, pillar contribution, or coaching output.
> - SHOWCASE_FUTURE → pose-derivable in principle but blocked on calibration / object tracking / release anchor that does not yet exist. Suppressed in Release-1 but reversible without new doctrine.
>
> Hitting is suppressed in its entirety for Release-1 because every BH metric is HIDDEN today. The suppression is a single flag flip (`RELEASE1_HITTING_SUPPRESSED`).

**VISIBLE (6):** `tempo_sec`, `energy_angle_deg`, `lift_thrust_deg`, `premature_shoulder_open_deg`, `shoulder_tilt_deg`, `head_vertical_movement_pct` — all pitching, all real.

**HIDDEN (17)** — LLM watched the video and estimated these; never shown:
`bat_speed_contact_mph`, `time_to_contact_ms`, `on_plane_pct`, `bat_path_score_100`, `hip_stability_score_100`, `hand_load_score_100`, `eyes_track_score_100`, `heel_plant_score_100`, `connection_barrel_delivery_score_100`, `hitters_move_score_100`, `shoulder_plane_steadiness_score_100`, `finish_balance_score_100`, `p2_timing_pass`, `sequencing_ok`, `hands_outside_shoulders_at_landing_pass`, `shoulder_to_shoulder_hold_pass`, `front_shoulder_leak_before_contact`

**SHOWCASE_FUTURE (7)** — built, blocked on calibration/tracking that doesn't exist yet:
`stride_pct_of_height`, `glove_drift_outside_frame_in`, `head_at_release_deg`, `p3_release_offset_ms`, `stride_dir_deg_off_square`, `front_shoulder_leak_pct_of_window`, `shoulder_to_shoulder_hold_pct_to_contact`

`RELEASE1_HITTING_SUPPRESSED = true` is the single flag controlling all of BH.

---

## 2. Metric value contract — verbatim (`contracts/shared.ts`)

> ```
> export type MetricValue =
>   | {
>       value: number | boolean;
>       /** 0..1 — measurement quality, NOT athlete quality. */
>       confidence: number;
>       missing?: false;
>     }
>   | {
>       missing: true;
>       missing_reason: string;
>       confidence?: 0;
>     };
> ```

Comment in the file: *"Shared metric contract types used by BOTH the client tile compute and the server AI metrics extractor. Single source of truth — drift-impossible."* (Worth verifying against the actual server file — see gap note above — since "drift-impossible" is an intent, not something guaranteed by two separately-maintained files in two different runtimes.)

---

## 3. Grading algorithm — verbatim (`grade.ts`)

> - Each measured tile contributes pass=100 / warn=70 / fail=0.
> - Score = average of contributions across MEASURED tiles.
> - Any non-negotiable failure caps the score at 60 (D).
> - Two or more non-negotiable failures cap at 40 (F).
> - Missing tiles do not pull the average down but appear in the "X of Y measured" chip so the user sees the gap.

Letter bands: A ≥90, B ≥80, C ≥70, D ≥60, else F.

---

## 4. Pitching (BP) — 9 metrics, complete

Each entry: the exact AI extraction prompt (from `bp.contract.ts`), then the exact pass/elite standard and athlete-facing explainer (from `disciplines/bp.ts`).

### Energy Angle — `energy_angle_deg`
- **Range:** 0–60°. **Standard:** 18° or more (elite 25°). Non-negotiable: no.
- **AI prompt (verbatim):** *"Angle from the center mass of the plant foot to the front hip at PEAK LEG LIFT. Measure in degrees. 18° passes; 25° is elite. If you cannot see the plant foot and front hip simultaneously, mark missing."*
- **What/why (verbatim):** *"The angle from the center mass of your plant foot to your front hip at peak leg lift. Elite target is 25°. Leading with your glute toward home plate marks an appropriate coil that kicks off a powerful, fast, efficient delivery."*
- **How to improve (verbatim):** *"Pause at peak leg lift in a mirror. Feel the glute load. Hip-hinge mobility, lateral leg lifts against a wall, and tempo-controlled wind-up drills build the awareness."*
- **Encouragement (verbatim):** *"The game is hard. Stack small wins — your delivery is a habit, not a moment."*

### Hip/Shoulder Separation — `premature_shoulder_open_deg`
- **Range:** −30–60°. **Standard:** shoulders still closed at landing (≤0°). **Non-negotiable: yes.**
- **AI prompt:** *"Degrees the throwing-side shoulder has already rotated toward the target BEFORE the front foot lands. 0 or negative = shoulders still closed at landing (PASS). Positive = early opening (FAIL)."*
- **What/why:** *"Your hips fire while your shoulders stay closed. Opening the shoulders before front foot strike leaks power and stresses the elbow. This is the single biggest velocity multiplier in pitching."*
- **How to improve:** *"Towel drills with a closed front shoulder. Med-ball rotational throws emphasizing 'hips first'. Slow-motion video review of your own delivery vs. an elite reference."*
- **Encouragement:** *"Separation is earned through patient reps. Keep the front shoulder closed and the velo finds you."*

### Tempo — `tempo_sec`
- **Range:** 0.4–2.0s. **Standard:** ≤1.05s.
- **AI prompt:** *"Time in seconds from peak leg lift to front foot strike. <=1.05s passes."*
- **What/why:** *"Time from peak leg lift to front foot strike. Mass × acceleration. Slow tempo loses perceived velocity even with a strong arm."*
- **How to improve:** *"Metronome-paced bullpens. Down-mound work with explicit count cues. 'Fast hips, late hands' verbal cue between pitches."*
- **Encouragement:** *"Tempo is a decision. Decide to go."*

### Stride Length — `stride_pct_of_height` *(SHOWCASE_FUTURE — built, not yet live)*
- **Range:** 40–130%. **Standard:** ≥90% of height.
- **AI prompt:** *"Stride length (back ankle at lift → front ankle at landing) as a PERCENTAGE of the athlete's standing height. >=90% passes. If athlete height cannot be approximated from the frames, mark missing."*
- **What/why:** *"Back-ankle-at-foot-raise to front-ankle-at-landing as a percentage of your height. Every foot of release extension plays ~3 mph faster in perceived velocity."*
- **How to improve:** *"Lateral lunge ladders, hip mobility flows, towel-drag stride drills. Mark your landing spot every pitch and aim for consistency before length."*
- **Encouragement:** *"Stretch the distance — your arm gets a free upgrade."*

### Head Stability — `head_vertical_movement_pct`
- **Range:** 0–15%. **Standard:** ≤2% vertical movement. **Non-negotiable: yes.**
- **AI prompt:** *"Vertical bounce of the head from setup to release as a percentage of athlete height. <=2% passes."*
- **What/why:** *"Head on a stable line through delivery. Vertical bounce wrecks command — your release point chases your head, not the catcher's mitt."*
- **How to improve:** *"Wall-sit posture holds. Slow tempo dry-throws filmed from the side. Verbal cue 'eyes ride the rail'."*
- **Encouragement:** *"Quiet head, loud strikes. Hold the line."*

### Glove / Front Side — `glove_drift_outside_frame_in` *(SHOWCASE_FUTURE)*
- **Range:** −12–24in. **Standard:** stays inside shoulder frame (≤0).
- **AI prompt:** *"Inches the glove drifts OUTSIDE the shoulder frame during delivery. 0 or negative (stays inside) passes. If the glove leaves the visible frame, mark missing."*
- **What/why:** *"Throwing is a fascial activity. The glove works back toward your body in a straight line from open-to-target to pinky-side-to-body. Swinging the glove outside the shoulder frame causes command issues."*
- **How to improve:** *"Glove-tuck drills with a partner holding your glove side. Mirror work focused on the glove path. 'Stick the glove' verbal cue."*
- **Encouragement:** *"Boring glove = elite command. Keep it inside the shoulders."*

### Head at Release — `head_at_release_deg` *(SHOWCASE_FUTURE)*
- **Range:** ±45°. **Standard:** ≤15° off target line.
- **AI prompt:** *"Absolute degrees the head is offset from the target line at ball release. <=15° passes."*
- **What/why:** *"Your head should be in line with the target at release — under 15° left or right of your belly button. Every degree past 15 doubles head weight and shortens your extension by about 2 inches."*
- **How to improve:** *"Eye-on-target tee work. Long-toss with a visible target line. Dry deliveries filmed from behind to spot the cock-off."*
- **Encouragement:** *"Eyes on the mitt, ball to the mitt. Simple. Hard. Worth it."*

### Shoulder Tilt at Release — `shoulder_tilt_deg`
- **Range:** ±45°. **Standard:** ≤10° from horizontal.
- **AI prompt:** *"Absolute degrees of shoulder tilt from horizontal at ball release. <=10° passes."*
- **What/why:** *"Shoulders should be near horizontal at release with eyes level. Excess tilt drifts your arm slot and bleeds command."*
- **How to improve:** *"Wall-shadow checks. Posture-locked dry-throws. Camera behind the mound to monitor tilt every bullpen."*
- **Encouragement:** *"Level eyes, level shoulders, level command."*

### Lift & Thrust — `lift_thrust_deg`
- **Range:** 0–60°. **Standard:** ≥18°.
- **AI prompt:** *"Combined lift-and-thrust drive angle off the rubber. >=18° passes."*
- **What/why:** *"The combined lift-and-thrust angle off the rubber. 18° or more means you are using the ground to drive forward, not just lifting and falling."*
- **How to improve:** *"Med-ball drive drills. Single-leg RDLs. Slide-board push-offs to feel the back-leg load."*
- **Encouragement:** *"Push the earth backward. The ball will go forward."*

**Throwing (non-pitcher):** identical contract, minus Energy Angle, Tempo, and Lift & Thrust (no rubber, no leg lift) — 6 metrics.

**Note on Mustard overlap:** several of these thresholds and phrases (energy angle 18–25°, tempo ≤1.05s, stride ≥90% of height, head-at-release "every degree past 15 doubles head weight... shortens extension by about 2 inches") match Mustard's own published article almost word for word, not just the underlying concept. Worth knowing plainly as this code gets touched again.

---

## 5. Hitting (BH) — 21 metric keys mapped to 17 tiles, complete

The file header describes this as a "17-tile contract" grouped as: **P1** Hip Load Stability (non-negotiable) · **P2** Hand Load, P2 Timing, Eyes/Head Tracking · **P3** Stride Direction, Heel Plant, P3 Timing, Hands Outside Shoulders at Landing · **P4** Sequencing (NN), Bat Path, On-Plane %, Time-to-Contact, Bat Speed, Connection & Barrel Delivery, Hitter's Move (NN), Shoulder Plane Steadiness, Finish & Balance, Shoulder-to-Shoulder Hold (NN).

**Correction while compiling this:** counting the actual metric keys in the contract gives 21, not 17 — because the last tile (Shoulder-to-Shoulder Hold) is fed by four separate metric keys (`shoulder_to_shoulder_hold_pct_to_contact`, `shoulder_to_shoulder_hold_pass`, `front_shoulder_leak_before_contact`, `front_shoulder_leak_pct_of_window`), not one. 17 tiles is right; 17 metric keys is not — flagging since this is exactly the kind of thing a re-summary could quietly smooth over.

### P1 — Hip Load Stability — `hip_stability_score_100`
- **Standard:** Acceptable 70 · Elite 90. **Non-negotiable: yes.**
- **AI prompt:** *"Score 0-100 for STABILITY of the back-hip load through P2. PASS at 70 = no body/head/front-foot drift while pitcher reaches knee lift. ELITE at 90 = stable AND a big, balanced load that stores power. Worked example: if head moves 4% of body height toward pitcher during P2 → ~55. If head and front foot are still and load is balanced and clearly loaded → ~85."*
- **What/why:** *"P1 is about STABILITY. You pass by NOT drifting forward (body, head, or front foot) while the pitcher reaches knee lift. A bigger, balanced back-hip load on top of stability earns elite. Bigger load = more stored swing power."*
- **How to improve:** *"Hold-the-load drills: load onto the back hip and freeze while a partner mimics a pitcher's leg lift — head, front foot, and centerline cannot drift. Tee work with eyes closed at peak load to feel a quiet centerline. Weighted-bat hip-load holds to build the position. Mirror checks at peak load before every BP round."*
- **Encouragement:** *"Stay still. Stay loaded. Let the pitcher come to you."*

### P2 — Hand Load — `hand_load_score_100`
- **Standard:** Acceptable 65 · Elite 88.
- **AI prompt:** *"Score 0-100 for the bat/scap/knob load behind the head AFTER P1 is stable. PASS at 65, ELITE at 88. Worked example: hands clearly loaded behind head with scap pinch and chest square → ~85; hands stay near front shoulder with no scap load → ~45."*
- **What/why:** *"Bat / scap / knob load behind the head AFTER P1 is stable. A clean P2 creates the centerline that lets your head stay still through P3 and sets up an X-factor stretch."*
- **How to improve:** *"Slow-tempo dry cuts. Scap-pinch drills. Knob-to-back-hip checkpoint."*
- **Encouragement:** *"Quiet hands behind the head. Centerline locked."*

### P2 — Timing → Knee Lift — `p2_timing_pass`
- **Standard:** pass/fail. Early is fine; late is the only fail.
- **AI prompt:** *"TRUE if the hitter's hand load is finished by the time the pitcher reaches PEAK KNEE LIFT. Early is acceptable and must NOT be marked false. FALSE only if the hand load is still unfinished after pitcher peak knee lift. If the hitter finishes early and then drifts forward, do not fail this metric — that belongs to P1 Hip Load Stability. If the pitcher's knee lift is not visible in the frames, set missing=true with reason 'Pitcher knee lift not in frame'."*
- **What/why:** *"Your hand load must be FINISHED by the time the pitcher reaches peak knee lift. Finishing EARLY is acceptable and common — it is not a timing miss. The only failure mode here is finishing LATE... If you finish early and then drift forward while you wait, that drift is a stability problem caught by P1 Hip Load Stability, not a P2 timing problem — don't double-count it against your timing."*
- **How to improve:** *"Be set by the time the pitcher's knee peaks — earlier is fine. Front-toss with a partner who calls 'knee up' — your hands should already be quiet by that cue, not still moving. Slow-mo side review: pause at pitcher peak knee lift and confirm your hands are set."*
- **Encouragement:** *"Be set by his knee peak. Earlier is fine. Late is the miss."*

### P2 — Eyes / Head Tracking — `eyes_track_score_100`
- **Standard:** Acceptable 70 · Elite 90.
- **AI prompt:** *"Score 0-100 for how steady the head/eyes stay. PASS at 70, ELITE at 90. Lateral head movement TOWARD the pitcher is the biggest deduction. Worked example: head moves >4% of body height laterally → ~50; rock-steady head with eyes tracking the ball → ~92."*
- **What/why:** *"Lateral head movement toward the pitcher is a major contact disruptor. Eyes work; head stays. A loaded scap AFTER P1 is what locks the head still — the scap pulls the chin and eye line into a fixed post so the eyes can work without the head chasing them."*
- **How to improve:** *"Load the scap immediately after P1 so the head has a fixed post to sit on. Most pros use the 'ball-on-the-load-spot' drill... Tee work with eyes-on-impact cue. Slow-mo side review of head path across the swing."*
- **Encouragement:** *"Scap locks the post. Eyes do the work."*

### P3 — Stride Direction — `stride_dir_deg_off_square` *(SHOWCASE_FUTURE)*
- **Standard:** within 15° of square, either way.
- **AI prompt:** *"Degrees stride deviates from a square line to the pitcher. Positive = stepping out (bucket). Negative = stepping in (across body). |value|<=15° passes."*
- **What/why:** *"Stepping out (bucket) or stepping in (across body) both leak power. Within 15° either way keeps the chain efficient."*
- **How to improve:** *"Tape a stride line. Slow tempo tee work focused only on stride direction."*
- **Encouragement:** *"Square stride, square chance. Trust the line."*

### P3 — Heel Plant / Landing — `heel_plant_score_100`
- **Standard:** Acceptable 65 · Elite 88.
- **AI prompt:** *"Score 0-100 for landing sideways, chest+shoulders square to plate, both feet down, core tensioned, hips NOT turning shoulders open. PASS at 65, ELITE at 88. Worked example: shoulders rotate WITH hips at landing → ~45; sideways landing with shoulders still closed → ~85."*
- **What/why:** *"'Heel plant' is the moment the FULL foot is down — not just the heel — landed sideways with chest and shoulders square to the plate, core max-tensioned... Turning shoulders WITH hips at landing creates a longer, more miss-prone swing — land sideways with the shoulders still closed."*
- **How to improve:** *"Train the step directly: (1) dry power-step reps..., (2) step-and-freeze landing audits..., (3) timing reps against a live arm..., (4) outside-third front toss to punish early opening. If the step is chronically late, start the P1/P2 load sooner..."*
- **Encouragement:** *"Get the foot down early and sideways — then you're free to strike."*

### P3 — Timing → Release — `p3_release_offset_ms` *(SHOWCASE_FUTURE)*
- **Standard:** Acceptable 70 · Elite 90. Custom curve, not a flat pass/fail: ±33ms deadband scores 100; 33→80ms decays to 90; 80→150ms decays to 70; beyond 150ms decays toward 0; early is floored at 85.
- **What/why:** *"Foot-down-at-release is the perfect target because it sets direction while preserving the longest possible look at the ball... Foot down before release is not punished like late timing; if the hitter gets down early and then drifts forward, that drift belongs to P1 Hip Load Stability or landing quality — not this timing score."*
- **How to improve:** *"Live BP with a count cue: 'release' = foot down... If you're consistently late, START P1 EARLIER... Do not create forward drift just to be on time — stability is scored separately."*
- **Encouragement:** *"Foot down at release is perfect. A hair late is okay. Clearly late is the miss."*

### P3 — Hands Outside Shoulders at Landing — `hands_outside_shoulders_at_landing_pass`
- **Standard:** pass/fail.
- **AI prompt:** *"TRUE if at the frame of FRONT-FOOT STRIKE (landing) the hands sit HORIZONTALLY OUTSIDE the line of the back shoulder... FALSE if hands are stacked inside the shoulders or pulled in front of the chest."*
- **What/why:** *"Hands outside = runway for the back elbow to lead the barrel onto the plane and stay there. Hands inside the shoulders force the swing to be steep and short — the barrel has to dive to find the plane, then leaves it almost immediately, which is what produces top-spin contact and inside-out cuts on pitches you should drive."*
- **How to improve:** *"FAILURE-SPECIFIC DRILLS — pick the one that matches your miss: (1) hands drift inside during the stride..., (2) hands collapse inward as the foot lands..., (3) hands never got outside in the load..."*
- **Encouragement:** *"Hands outside the shoulders. Plane unlocked."*

### P4 — Sequencing — `sequencing_ok`
- **Standard:** pass/fail. **Non-negotiable: yes.**
- **AI prompt:** *"TRUE if sequence is: Load legs -> Load hands -> Pause -> Stride -> Pause -> Contact. FALSE if rushed or out of order."*
- **What/why:** *"Sequencing is the ORDER the kinetic chain fires in: back hip → torso/shoulders → back elbow → hands → barrel... A low score here is the single biggest leak you can have, because every later metric... is downstream of it."*
- **How to improve:** *"Pause-pause tee rounds... Load the back hip and let it UNLOAD when P4 fires... Front-toss with a partner calling out the chain."*
- **Encouragement:** *"Hip first. Barrel last. The order is the swing."*

### P4 — Bat Path In/Out of Zone — `bat_path_score_100`
- **Standard:** Acceptable 65 · Elite 88.
- **What/why:** *"Elite bat path enters the zone behind the ball and exits in front — a long, on-plane window that maximizes contact and damage."*
- **How to improve:** *"Tee work behind/under/in-front-of the ball. PVC plane constraint drills."*
- **Encouragement:** *"Long path through the zone — short path to the ball."*

### P4 — On-Plane % — `on_plane_pct`
- **Standard:** Acceptable 60 · Elite 85.
- **AI prompt:** *"Percentage of the swing arc that stays on the plane of the incoming pitch. PASS at 60%, ELITE at 85%. Worked example: barrel comes off plane immediately after contact → ~40%; long on-plane window through and past contact → ~85%."*
- **What/why:** *"How long the barrel stays on the plane of the incoming pitch. Higher % = more margin for timing error."*
- **How to improve:** *"Line the hands up with the ball to 'catch' it — the knob CANNOT compromise forward ahead of the elbow on its own... Drills: knob-stays-back tee work, elbow-leads-the-turn constraint, catch-with-both-hands cue..."*
- **Encouragement:** *"Catch the ball with your hands. Let the elbow do the turning."*

### P4 — Time to Contact — `time_to_contact_ms`
- **Standard:** Acceptable ≤175ms · Elite ≤150ms.
- **AI prompt:** *"Milliseconds from the moment the bat first starts moving forward until ball-barrel contact. PASS ≤175 ms, ELITE ≤150 ms."*
- **What/why:** *"How long from the moment the bat starts moving until ball-barrel contact. Faster = better commitment window."*
- **How to improve:** *"No upper-body movement until the hips have cleared a path of least resistance forward. THEN the back elbow goes forward linearly, taking the barrel to contact — the knob stays back acting as a fulcrum the whole time."*
- **Encouragement:** *"Hips clear the path. Elbow takes the barrel. Knob never leaves."*

### P4 — Bat Speed Through Contact — `bat_speed_contact_mph`
- **Standard:** Acceptable ≥65 · Elite ≥75.
- **AI prompt:** *"Estimated barrel speed AT contact in mph. PASS ≥65, ELITE ≥75. If no sensor data and motion blur is too high to estimate, set missing=true with reason 'Frame rate too low for bat speed estimate'."*
- **What/why:** *"Barrel speed AT impact, not before. Elite hitters are still accelerating through contact."*
- **How to improve:** *"The barrel only accelerates through the ball when the knob stays back as a fulcrum and the back elbow drives forward linearly."*
- **Encouragement:** *"Accelerate THROUGH the ball, not at it."*

### P4 — Connection & Barrel Delivery — `connection_barrel_delivery_score_100`
- **Standard:** Acceptable 70 · Elite 90.
- **AI prompt:** *"Score 0-100 for connection and barrel delivery across the P4 launch → barrel-delivery → contact window, not a single contact-frame elbow angle... Do not use the old 'back elbow past belly button at contact' formula."*
- **What/why:** *"This is a window metric, not a contact-frame elbow snapshot... The blind spot starts when extension starts; the shorter the time from extension-start to contact, the better."*
- **How to improve:** *"Launch-to-contact constraint work: keep the knob back as a fulcrum, let the back elbow drive forward linearly..."*
- **Encouragement:** *"Stay connected. Elbow delivers the barrel. Contact before extension."*

### P4 — Hitter's Move Quality — `hitters_move_score_100`
- **Standard:** Acceptable 70 · Elite 92. **Non-negotiable: yes.**
- **What/why:** *"The Hitter's Move is a strict order: knob stays back as the fulcrum → hips clear a path of least resistance → back elbow leads linearly forward → hands stay in line with the ball to 'catch' it → barrel catapults through last."*
- **How to improve:** *"Pause-at-launch tees... Hips-clear-first dry reps with the knob pinned... Catch-the-ball-with-both-hands cue."*
- **Encouragement:** *"Knob back, hips clear, elbow runs, hands catch, barrel last."*

### P4 — Shoulder Plane Steadiness — `shoulder_plane_steadiness_score_100`
- **Standard:** Acceptable 70 · Elite 90.
- **What/why:** *"When the shoulders begin to rotate in P4, the shoulder plane has to HOLD whatever plane it started on through contact... A wobbling plane shrinks that window and turns barreled-up looks into mis-hits."*
- **How to improve:** *"PVC across the shoulders — rotate while holding the same tilt. Mirror reps watching the back shoulder track on a fixed plane."*
- **Encouragement:** *"Pick your plane. Hold your plane. The ball does the rest."*

### P4 — Finish & Balance — `finish_balance_score_100`
- **Standard:** Acceptable 65 · Elite 88.
- **What/why:** *"The goal is NOT 'hold a two-hand finish.' The goal is to MAINTAIN connection with two hands through contact and all the way through extension — until the ball is gone... Note: the measurable definition of this metric is being reviewed separately to better reflect the connection-through-extension intent."*
- **How to improve:** *"Connected-extension tee rounds — both hands stay on through full extension... Single-leg balance work as a downstream check."*
- **Encouragement:** *"Stay connected through the ball. The finish is the proof, not the goal."*

### P4 — Shoulder-to-Shoulder Hold — 4 metric keys, 1 tile
- **Standard:** held ≥50% of landing→contact = pass; ≥95% = elite. **Non-negotiable: yes.** Auto-fail overrides the percentage if the front shoulder leaks open.
- **What/why:** *"Holding the spacing is proof there's no hand-push at the ball... This is often misread as an 'arm bar' — it isn't. The hands' job is to LINE UP with the ball, not move forward to it... AUTO-FAIL: if the front shoulder flies open / leaks out of sequence before contact, the spacing move is nullified — you must know this is why, even if the rest looked good."*
- **How to improve:** *"Pause-at-landing tee work... Knob-pinned-to-the-side reps... Front-shoulder discipline drills..."*
- **Encouragement:** *"Hands back. Elbow leads. Catch the ball — don't chase it."*

---

## 6. Constitution document — section map (not full text)

`docs/asb/report-card-constitution.md`, version v0.13, opened 2026-06-08. Status line from the file: *"§0 RATIFIED — §16 FULLY CLOSED (V1) — §17 V1 RATIFIED (BP+BH) — IMPLEMENTATION AUTHORIZED FOR V1."* Full section list: Preamble; §0 Report Card Psychology & Purpose (with 29 sub-sections); §1 Report Card Philosophy; §2 Athlete Experience Flow; §3 Universal Report Card Laws; §4 Pitching Architecture (ratified); §5 Hitting Architecture (ratified); §6 Throwing Architecture (proposal, not yet ratified); §7–§13 Drill/Video/Roadmap/Coach-Hammer/Progress/Parent/Recruiting integration architectures (not yet built per the render-site removal); §14 Report Card Scoring Architecture; §15 Category Explanation Architecture; §16 Questions Requiring Owner Ratification (A–K); §17 Per-category schema; §18 Exit criteria.

**Softball, fielding, catching, baserunning:** per the discipline-coverage matrix, softball pitching/hitting reuse the baseball tiles with a relabel (no independent measurement set), and fielding/catching/baserunning have no report card at all yet.
