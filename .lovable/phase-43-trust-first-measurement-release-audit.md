# Phase 43 — Trust-First Measurement Release Audit

**Status:** Audit only. No code, detector, metric, doctrine, architecture, or implementation change.
**Inputs:** Phase 39 (real-evidence acquisition), Phase 40 (report-card reality failure), Phase 41 (measurement-engine recovery), Phase 42 / 42B (D-POSE production reality), `confidence-source-trace.md`, `canonical-measurement-architecture.md`, `src/lib/reportCard/contracts/{bp,bh,throwing}.contract.ts`, `src/lib/biomech/metrics/missingness.ts`, `src/lib/biomech/videoAcceptance.ts`, `src/lib/biomech/pose/poseRunner.ts`, real-world testing observations supplied by the operator (broadcast CF baseball, zoom variance, inconsistent bat-speed, inconsistent time-to-contact, missing outputs on some videos).

---

## §1 Executive Summary

The current system is **not** suffering primarily from measurement failure. Phase 42B promoted `LANDMARK_MODEL_VERSION` from `blazepose_full@0.0.0-stub` to a real MediaPipe Tasks Vision `PoseLandmarker` invocation that produces 33 BlazePose landmarks per frame, and the deterministic tempo pipeline now consumes real anchor data end-to-end. Pose-derived relative-angle metrics work.

The system is suffering from **two compounding failures**:

1. **Capture-environment mismatch.** Several athlete-facing metrics in `bp.contract.ts` and `bh.contract.ts` are defined as if the athlete fills the frame on a side-view tripod. On broadcast center-field clips, the athlete occupies <15 % of frame height, the bat-tip / ball / glove pixel features are below pose-quality thresholds, and depth-axis motion (toward camera) compresses the very axis that hitting and pitching metrics measure. The detectors do not fail loudly — they emit values that look authoritative but are not anchored to recoverable pixel evidence.
2. **Confidence-surface failure.** Per `confidence-source-trace.md`, the per-tile `confidence` number is the **model's self-reported confidence**, not a frame-coverage or pose-visibility signal. It is **not deterministic** across re-runs of identical bytes. The warn-dot threshold (< 0.5) is the only visible affordance, and it does not distinguish "model is uncertain" from "the capture cannot support this metric at all." Low-trust outputs can therefore appear as authoritative measurements with no warning.

**Classification:** capture-environment mismatch **+** confidence-surface failure. Not measurement-engine failure, not metric misuse in definition.

**Implication for Release 1:** Trust ≠ metric count. The release-ready set is the metrics whose definitions are **scale-invariant, relative, and pose-only** — they survive broadcast CF as long as BlazePose can find the athlete. Everything that depends on object detection, absolute physical units, or pixel calibration is **not** release-ready today.

---

## §2 Capture Environment Inventory

The following capture environments have been observed entering the pipeline today. `videoAcceptance.ts` only gates on fps, resolution, duration, and dropped-frame ratio — it does **not** classify capture type, so all of the below currently reach the detectors:

| Capture Type                  | Athlete frame share | Side-on? | Both feet visible | Bat tip resolvable | Ball resolvable | Pixel→length reference                |
| ----------------------------- | ------------------- | -------- | ----------------- | ------------------ | --------------- | ------------------------------------- |
| Broadcast center field        | 5–15 %              | No (depth axis to camera) | Sometimes (pitcher), rarely (hitter) | No | Inconsistent | None                                  |
| Broadcast behind-pitcher / behind-plate | 10–20 %     | No        | Rarely            | No                 | Inconsistent    | None                                  |
| Side-view tripod (training)   | 40–80 %             | Yes       | Yes               | Yes (≥60 fps)      | Sometimes       | Athlete height (if standing reference frame exists) |
| Showcase capture (multi-angle, pro rigs) | 30–70 %  | Often (one of the angles) | Yes | Yes              | Often           | Calibrated rigs (not currently parsed) |
| Cage / bullpen tripod         | 50–90 %             | Yes       | Yes               | Yes                | No (net occlusion) | Athlete height          |
| Game footage (parent phone, dugout) | 15–40 %       | Variable  | Variable          | Rare               | Rare            | None                                  |
| Zoomed clip (post-trimmed)    | 40–90 %             | Inherits source | Inherits | Inherits      | Inherits        | None (scale ref often cropped out)    |

**Observation:** The pipeline currently has no `capture_class` field on `video_analysis_runs`. Detectors see all of these as the same input shape. This is the single largest contributor to the observed inconsistency on bat-speed and time-to-contact.

---

## §3 Metric Observability Audit

For each athlete-facing metric in the two shipped contracts, classify by **observability** (what kind of capture can produce a recoverable value), not by definition quality.

Legend:
- **A** = Observable from any reasonable upload that passes `videoAcceptance.ts` (athlete detected by BlazePose).
- **S** = Observable only from **some** uploads — depends on athlete frame size, view angle, or both feet visible.
- **C** = Observable **only** under controlled capture (side-on tripod, calibrated rig, ≥60 fps, full body visible, scale reference in frame).
- **N** = **Not** observable today by the production pipeline regardless of capture (no D-OBJECT, no D-CAL, no absolute physical scale).

### Baseball Pitching (`bp.contract.ts`)

| Metric                              | Class | Why                                                                                         |
| ----------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| `tempo_sec`                         | **A** | Two pose-derived anchors (peak leg lift, front-foot strike) ÷ `fps_true`. Scale-invariant. Already wired end-to-end (Phase 42B). |
| `shoulder_tilt_deg`                 | **A** | Angle between two shoulder landmarks vs horizontal. Pose-only, scale-invariant.             |
| `head_vertical_movement_pct`        | **A** | Relative head-y range ÷ pose-derived torso length. Scale-invariant.                         |
| `premature_shoulder_open_deg`       | **A** | Relative shoulder-line rotation at landing frame. Pose-only.                                |
| `energy_angle_deg`                  | **S** | Requires both plant foot **and** front hip simultaneously visible at peak leg lift. Broadcast CF often loses one. |
| `head_at_release_deg`               | **S** | Needs pitcher release frame correctly anchored; release-frame anchor is not yet a canonical D-ANCHOR (no `PITCHER_RELEASE_FRAME_MISSING` route in `tempoPipeline`). |
| `lift_thrust_deg`                   | **C** | Requires rubber/mound geometry visible to define the lift+thrust reference plane.           |
| `stride_pct_of_height`              | **C** | Requires the athlete's full standing height to be recoverable in pixels — almost never true in broadcast CF or in zoomed/cropped clips. |
| `glove_drift_outside_frame_in`      | **C** | Requires **inches** — a physical unit. No pixel→inch calibration exists in `src/lib/biomech/calibration/`. Output today is unit-fabricated. |

### Baseball Hitting (`bh.contract.ts`)

| Metric                                              | Class | Why                                                                                                                 |
| --------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------- |
| `hip_stability_score_100`                           | **S** | Relative head/foot drift through P2 — works if hitter is large enough in frame; broadcast CF degrades it.           |
| `hand_load_score_100`                               | **S** | Hand cluster vs head, pose-relative; degraded by motion blur and depth-axis foreshortening.                         |
| `p2_timing_pass`                                    | **S** | Needs pitcher knee-lift visible **and** hitter hand-load finish in the same clip. Often one is cropped.             |
| `eyes_track_score_100`                              | **S** | Lateral head movement vs body height — pose-relative but degraded at small athlete size.                            |
| `stride_dir_deg_off_square`                         | **S** | Foot-vector angle vs body-line. Pose-only but ankle landmarks degrade rapidly under occlusion / small frame share.  |
| `heel_plant_score_100`                              | **S** | Relative shoulder-line / hip-line synchronization at landing. Pose-only.                                            |
| `p3_release_offset_ms`                              | **S** | Needs **both** pitcher release **and** hitter front-foot-down in the same clip — broadcast CF often misses one.     |
| `hands_outside_shoulders_at_landing_pass`           | **S** | Pose-only horizontal comparison; degrades at small frame share.                                                     |
| `sequencing_ok`                                     | **A** | Ordering of pose events only.                                                                                       |
| `bat_path_score_100`                                | **N** | Requires **bat tracking** (D-OBJECT). Not present in pipeline.                                                       |
| `on_plane_pct`                                      | **N** | Requires bat-barrel and incoming-pitch-plane tracking. Not present.                                                  |
| `time_to_contact_ms`                                | **N** | Requires **swing-start frame** (bat moves forward — bat detection) **and** **contact frame** (ball-on-bat — ball detection). Neither detector exists. Current outputs are model self-reported and not reproducible — matches the operator's observed inconsistency. |
| `bat_speed_contact_mph`                             | **N** | Requires bat-tip tracking in calibrated px→ft. Neither exists. Output is fabricated absolute physics. |
| `connection_barrel_delivery_score_100`              | **C** | Requires barrel-delivery anchor (bat-detector-derived) and clear side-on view.                                       |
| `hitters_move_score_100`                            | **S** | Pose-relative scoring; degrades on broadcast CF.                                                                     |
| `shoulder_plane_steadiness_score_100`               | **A** | Shoulder-line angle stability through rotation. Pose-only, scale-invariant.                                          |
| `finish_balance_score_100`                          | **S** | Pose-only; needs the finish frame in the clip (commonly trimmed).                                                    |
| `shoulder_to_shoulder_hold_pct_to_contact`          | **C** | Requires contact frame (ball detection) to bound the window. Without ball detection, "contact" is model-guessed.    |
| `front_shoulder_leak_before_contact`                | **C** | Same — bounded by contact frame.                                                                                     |

---

## §4 Release-Ready Metric Inventory (Class A)

Metrics that can be trusted across the **widest** range of uploads — pose-only, scale-invariant, no object detection required, no absolute physical units, no calibration required.

| Metric                                  | Discipline | Trust basis                                                                              |
| --------------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `tempo_sec`                             | BP         | Phase 42B wired the real D-POSE → D-ANCHOR → D-METRIC → D-EVIDENCE chain end-to-end.     |
| `shoulder_tilt_deg`                     | BP         | Pure pose-relative angle.                                                                |
| `head_vertical_movement_pct`            | BP         | Ratio of pose-derived measurements.                                                      |
| `premature_shoulder_open_deg`           | BP         | Pose-relative rotation at a pose-anchored frame.                                         |
| `sequencing_ok`                         | BH         | Pose-event ordering only.                                                                |
| `shoulder_plane_steadiness_score_100`   | BH         | Shoulder-line angle stability through a pose-anchored rotation window.                   |

This is the **Universal Analysis** candidate package.

---

## §5 Conditional Metric Inventory (Class S / Class C)

Metrics that work, but only when the capture meets explicit conditions. They should ship only with capture-class gating.

| Metric                                              | Prerequisites                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `energy_angle_deg`                                  | Side view ±20°; both plant foot and front hip visible at peak leg lift; athlete ≥30 % frame height.   |
| `head_at_release_deg`                               | Pitcher release frame in clip; head landmark visible at that frame.                                   |
| `stride_pct_of_height`                              | Athlete's full standing height must appear in at least one frame as a calibration reference.          |
| `lift_thrust_deg`                                   | Rubber visible; side view ±20°; athlete ≥40 % frame height.                                           |
| `glove_drift_outside_frame_in`                      | A pixel→inch calibration (does not exist in `src/lib/biomech/calibration/` today). **Until calibration ships, the `in` unit must be suppressed**, not displayed. |
| `hip_stability_score_100`, `hand_load_score_100`, `eyes_track_score_100`, `stride_dir_deg_off_square`, `heel_plant_score_100`, `hands_outside_shoulders_at_landing_pass`, `hitters_move_score_100`, `finish_balance_score_100` | Hitter ≥40 % frame height; side view ±20°; ≥30 fps; both feet visible across the swing window. |
| `p2_timing_pass`, `p3_release_offset_ms`            | Clip must contain **both** the pitcher delivery and the hitter swing. (Rarely true in single-player clips — usually requires showcase capture.) |
| `connection_barrel_delivery_score_100`              | Side-on hitter ≥40 % frame height; ≥60 fps; bat detection (not yet present). Therefore today: **C, blocked on D-OBJECT**. |
| `shoulder_to_shoulder_hold_pct_to_contact`, `front_shoulder_leak_before_contact`, `front_shoulder_leak_pct_of_window` | Contact-frame anchor required. Without ball detection, contact is model-guessed → outputs are not replay-stable. Blocked on D-OBJECT. |

---

## §6 High-Risk Metric Inventory

Metrics that should **not** be displayed unless strict capture conditions **and** missing detectors are satisfied. Evidence: the operator observed inconsistent bat-speed and inconsistent time-to-contact across re-uploads of the same video class. The codebase explains why: there is no bat detector, no ball detector, no pixel→physical-unit calibration. Any absolute-physics output on a tile today is **model fabrication**, not measurement.

| Metric                          | Why it is high risk                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `bat_speed_contact_mph`         | No bat-tip tracker; no px→ft scale; unit `mph` is a physical claim the system cannot back. Output is non-deterministic.  |
| `time_to_contact_ms`            | Requires swing-start frame **and** contact frame; both currently model-guessed. Matches the observed inconsistency.       |
| `bat_path_score_100`            | Requires bat tracking. Absent. Score today is interpretive narrative dressed as measurement.                              |
| `on_plane_pct`                  | Same as above plus pitch-plane reconstruction. Doubly absent.                                                             |
| `glove_drift_outside_frame_in`  | Physical unit (`in`) with no calibration source. Unit claim is unbacked.                                                  |
| `connection_barrel_delivery_score_100` | Requires barrel-delivery / extension-start anchors that depend on bat detection.                                  |
| (Future) `pitch_velocity_mph`, `exit_velocity_mph`, ball-collision metrics — **not currently in the contracts** but are the natural next requests; they must remain in this tier until D-OBJECT + D-CAL are real. |

These should be **suppressed** in Release 1, not displayed with a warn dot. A warn dot on a fabricated number is still a number to the athlete.

---

## §7 Confidence Surface Audit

Current state, sourced directly from `confidence-source-trace.md` and `src/lib/biomech/metrics/confidence.ts`:

- The number displayed on a tile is the **model's self-reported** confidence in its own answer. It is **not** a deterministic function of the source video. The same bytes can produce different confidence values across runs.
- The warn-dot threshold is `< 0.5` (`ReportCardTile.tsx`). Above 0.5, **no** affordance distinguishes a high-trust pose-only metric from a fabricated absolute-physics metric.
- The canonical confidence record in `src/lib/biomech/metrics/confidence.ts` supports `calibrated | uncalibrated | missing`, and per `canonical-confidence-architecture.md §1.1` only `calibrated` may surface a numeric confidence. **No metric in either shipped contract has a calibration certificate today.** Every tile should therefore be `uncalibrated` (numeric confidence `null`) by doctrine — but the multimodal model output is being read through `metricReaders.ts` and surfaced as if it were a real confidence value.
- There is **no surface** for: pose visibility per frame, frame coverage of the metric window, athlete frame-share, capture class, or anchor-recoverability. Athletes therefore cannot distinguish "BlazePose found the athlete clearly on every frame" from "the athlete was 8 % of the frame and the metric is structurally unrecoverable."

**Where low-confidence output can appear as authoritative today:**

- Any Class N metric in §3 (`bat_speed_contact_mph`, `time_to_contact_ms`, `bat_path_score_100`, `on_plane_pct`) displaying a number with no warn dot.
- Any Class C metric (`glove_drift_outside_frame_in`, `stride_pct_of_height`, `lift_thrust_deg`) displaying a number on a broadcast clip where the prerequisite reference is absent.
- Any tile where the model self-reported confidence is ≥ 0.5 but the underlying pose visibility was poor — confidence presented is `uncalibrated` per doctrine, displayed as authoritative per UI.

---

## §8 Universal Analysis Candidate

The largest set of metrics that can be trusted for **general** uploads — i.e. that survive broadcast CF, parent phone, dugout angle, and zoomed clips, conditional only on BlazePose locating the athlete:

> `tempo_sec`, `shoulder_tilt_deg`, `head_vertical_movement_pct`, `premature_shoulder_open_deg`, `sequencing_ok`, `shoulder_plane_steadiness_score_100`

These six are the **Release 1 Universal Analysis** candidate. They share four properties:

1. Pose-only — no object detector required.
2. Scale-invariant or relative — no pixel→physical-unit calibration required.
3. Anchored on pose events the BlazePose Full model already provides reliably (knee, ankle, shoulder, head).
4. Survive when the athlete is small in the frame, as long as BlazePose finds the athlete at all.

---

## §9 Showcase Analysis Candidate

Metrics that should require specialized capture. Prerequisites must be displayed **before** analysis runs, and the analysis must **refuse** to emit on capture-class mismatch rather than emit with a warn dot.

**Required capture conditions (must all hold):**

- Side view ±20° of the athlete's frontal plane.
- Athlete ≥40 % frame height.
- ≥30 fps for pose metrics, ≥60 fps for any bat/ball-adjacent metric.
- Both feet visible throughout the measurement window.
- Athlete's full standing height appears in at least one frame (for any height-normalized metric).
- For pitcher/hitter cross-metrics, both deliveries in the same clip.

**Metrics released under Showcase Analysis once gating exists:**

`energy_angle_deg`, `head_at_release_deg`, `lift_thrust_deg`, `stride_pct_of_height`, `hip_stability_score_100`, `hand_load_score_100`, `eyes_track_score_100`, `stride_dir_deg_off_square`, `heel_plant_score_100`, `hands_outside_shoulders_at_landing_pass`, `hitters_move_score_100`, `finish_balance_score_100`, `p2_timing_pass`, `p3_release_offset_ms`.

---

## §10 Release Recommendation

| Release Tier                  | Contents                                  | Ship condition                                                                                       |
| ----------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Universal Analysis**        | The §8 set (6 metrics)                    | Ship in Release 1. Survives all currently-accepted capture types.                                    |
| **Showcase Analysis**         | The §9 set                                | Ship gated by a `capture_class` check + a pre-analysis prerequisites checklist. Refuse-to-emit on capture-class mismatch. |
| **Future Validation Analysis** | The §6 set (`bat_speed_contact_mph`, `time_to_contact_ms`, `bat_path_score_100`, `on_plane_pct`, `glove_drift_outside_frame_in`, `connection_barrel_delivery_score_100`, `shoulder_to_shoulder_hold_*`, `front_shoulder_leak_*`, plus all `*_mph` physics tiles whether or not currently in the contract) | **Do not ship to athletes** in Release 1. Requires D-OBJECT (bat + ball tracker) and D-CAL (pixel→physical-unit calibration) to exist and be replay-certified first. |

---

## §11 Release Risk Ranking

Highest risk-to-trust first. A metric ranks high when (a) it is currently emitted as authoritative, and (b) the system cannot back the claim with recoverable pixel evidence.

1. `bat_speed_contact_mph` — fabricated absolute physics, no bat tracker, no calibration.
2. `time_to_contact_ms` — observed inconsistent across re-uploads (operator evidence); no swing-start or contact-frame detector.
3. `bat_path_score_100` — interpretive narrative dressed as a /100 score; no bat tracking.
4. `on_plane_pct` — same as above + missing pitch-plane reconstruction.
5. `glove_drift_outside_frame_in` — physical unit with no calibration source.
6. `connection_barrel_delivery_score_100` — depends on barrel-delivery anchor that depends on bat detection.
7. `shoulder_to_shoulder_hold_pct_to_contact` / `front_shoulder_leak_*` — depend on a contact-frame anchor that is currently model-guessed.
8. `stride_pct_of_height` — needs athlete-height reference rarely available in broadcast CF.
9. `lift_thrust_deg` — needs rubber visible; commonly absent.
10. `head_at_release_deg` — needs release-frame anchor not yet canonical.
11. `p3_release_offset_ms`, `p2_timing_pass` — need both deliveries in one clip.
12. `energy_angle_deg` — needs both plant foot and front hip simultaneously visible.
13. `hip_stability_score_100`, `hand_load_score_100`, `eyes_track_score_100`, `stride_dir_deg_off_square`, `heel_plant_score_100`, `hands_outside_shoulders_at_landing_pass`, `hitters_move_score_100`, `finish_balance_score_100` — Class S; work under good capture, mislead under bad capture.
14. `premature_shoulder_open_deg` — pose-only, low risk.
15. `head_vertical_movement_pct` — pose-only, low risk.
16. `shoulder_plane_steadiness_score_100` — pose-only, low risk.
17. `shoulder_tilt_deg` — pose-only, low risk.
18. `sequencing_ok` — pose-event ordering, low risk.
19. `tempo_sec` — only metric with the full Phase 26–42B chain wired end-to-end; lowest risk.

---

## §12 Final Determination

> **If the product were released today, what measurements can be trusted by athletes across the broadest range of uploads?**

The following six metrics, and only these, are trustworthy across the full range of capture types currently accepted by `videoAcceptance.ts`, supported by execution evidence:

1. `tempo_sec` (BP) — Phase 42B end-to-end chain: real BlazePose Full inference → `findPeakLegLiftFrame` / `findFrontFootStrikeFrame` → `computeTempoSec` → `buildTempoEvidence`. Replay-certifiable, scale-invariant, no calibration required.
2. `shoulder_tilt_deg` (BP) — pose-relative angle, scale-invariant.
3. `head_vertical_movement_pct` (BP) — ratio of pose-derived measurements, scale-invariant.
4. `premature_shoulder_open_deg` (BP) — pose-relative rotation at pose-anchored frame.
5. `sequencing_ok` (BH) — pose-event ordering only.
6. `shoulder_plane_steadiness_score_100` (BH) — shoulder-line angle stability through a pose-anchored window.

Every other athlete-facing metric in the two shipped contracts either (a) requires a detector that does not exist in production (bat, ball, contact frame, release frame as canonical anchor, rubber/mound geometry), (b) requires a calibration that does not exist in production (pixel→inch, pixel→foot, athlete-height reference parsing), or (c) requires a capture class the system does not yet classify or enforce — and is therefore **not** release-ready as a universal-trust metric today.

**Recommendation:** ship Release 1 with the six-metric Universal Analysis above. Defer the Showcase Analysis set behind a capture-class gate. Suppress — do not warn-dot — the Future Validation Analysis set until D-OBJECT and D-CAL exist and carry calibration certificates per `canonical-confidence-architecture.md §1.1`.

This determination is made from execution evidence and existing repo artifacts only. No new metrics, detectors, doctrine, architecture, or implementation are proposed.
