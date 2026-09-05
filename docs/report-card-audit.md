# Report Card Audit — hitting, pitching, throwing

Date: 2026-09-05. Audit only. Nothing in this pass was fixed, hidden, or changed.

## How to read the "source" column

- **measured (deterministic)** — computed in our own code from pose/frame data, not a model opinion.
- **model estimate** — a number the vision LLM returned in its structured tool call (`analyze-video` → `return_analysis.metrics`). It is an opinion shaped like a measurement.
- **hard-coded constant** — a literal in our source.
- **default** — a fallback used when nothing real arrived.
- **user-entered** — typed by the athlete.
- **not rendered** — the tile exists in code but is filtered out before it reaches a screen.

Everything under `metrics` on an analysis is produced by the model. There is one exception in the entire report card system: pitching Tempo.

---

## 1. Pitching (Baseball) — `src/lib/reportCard/disciplines/bp.ts`

Nine tiles are defined. Release-1 filtering (`src/lib/reportCard/release1.ts`, `release1Tiles`, bottom of `bp.ts`) removes any tile whose metric is HIDDEN or SHOWCASE_FUTURE. **Two tiles survive to an athlete's screen: Tempo and Shoulder Tilt at Release.**

| Tile | Metric key | Source | Produced by | Rendered today |
|---|---|---|---|---|
| Tempo | `tempo_sec_deterministic` / frame anchors | **measured (deterministic)** | `computeDeterministicTempoTile` in `bp.ts` → `computeTempoSec` in `src/lib/biomech/metrics/tempoSec.ts`; anchors from `src/lib/biomech/anchors/*` | **yes** |
| Shoulder Tilt at Release | `shoulder_tilt_deg` | **model estimate** | `analyze-video/index.ts` tool schema `buildMetricsSchema(bpContract)`, parsed ~line 2310 | **yes** |
| Energy Angle | `energy_angle_deg` | model estimate — audited as a constant (same value on every clip) | same | no (HIDDEN) |
| Hip / Shoulder Separation | `premature_shoulder_open_deg` | model estimate — 20° on 7 of 8 clips, i.e. pinned to the threshold | same | no (HIDDEN) |
| Head Stability | `head_vertical_movement_pct` | model estimate — returned `missing` on 12 of 12 clips | same | no (HIDDEN) |
| Lift & Thrust | `lift_thrust_deg` | model estimate — 20° on 6 of 6 clips, zero variance | same | no (HIDDEN) |
| Stride Length | `stride_pct_of_height` | model estimate; needs calibration we do not have | same | no (SHOWCASE_FUTURE) |
| Glove / Front Side | `glove_drift_outside_frame_in` | model estimate; needs calibration | same | no (SHOWCASE_FUTURE) |
| Head at Release | `head_at_release_deg` | model estimate; needs a release anchor that does not exist | same | no (SHOWCASE_FUTURE) |

Thresholds on every pitching tile (18°, 1.05s, 90%, 2%, 15°, 10°) are **hard-coded constants** in `bp.ts`. They are coaching standards, not derived from data, and are not validated against any dataset in this repo.

## 2. Throwing — `src/lib/reportCard/disciplines/throwing.ts`

Throwing is Baseball Pitching minus Energy Angle, Tempo and Lift & Thrust. It takes `bpReportCard.tiles`, i.e. the **already-filtered** list.

Result: after filtering, the throwing card keeps `hip_shoulder_separation`, `stride_length`, `head_stability`, `glove_control`, `head_at_release`, `shoulder_tilt_release` — but five of those six are already removed upstream. **The throwing report card renders exactly one tile: Shoulder Tilt at Release, a model estimate.** Tempo, the only measured tile in the system, is deliberately excluded from throwing.

Softball throwing is the same object with a different label (`src/lib/reportCard/index.ts`).

## 3. Hitting (Baseball and Softball) — `src/lib/reportCard/disciplines/bh.ts`

**Nothing renders.** `RELEASE1_HITTING_SUPPRESSED = true` in `release1.ts`. `BhCategoryPanels.tsx` shows a "not yet released" notice instead of tiles, and `UhrcAthleteSection.tsx` strips "hitting" from the disciplines before the report is built.

If the flag were flipped tomorrow, this is what would appear and where each number comes from — all 18 are model estimates:

| Tile | Metric key | Source |
|---|---|---|
| Hip Load Stability (non-negotiable) | `hip_stability_score_100` | model estimate |
| Hand Load | `hand_load_score_100` | model estimate |
| P2 Timing → Knee Lift | `p2_timing_pass` | model estimate |
| Eyes / Head Tracking | `eyes_track_score_100` | model estimate |
| Stride Direction | `stride_dir_deg_off_square` | model estimate |
| Heel Plant / Landing | `heel_plant_score_100` | model estimate |
| P3 Timing → Release | `p3_release_offset_ms` | model estimate |
| Hands Outside Shoulders at Landing | `hands_outside_shoulders_at_landing_pass` | model estimate |
| Sequencing (non-negotiable) | `sequencing_ok` | model estimate |
| Bat Path In/Out of Zone | `bat_path_score_100` | model estimate — no bat detector exists |
| On-Plane % | `on_plane_pct` | model estimate — no bat detector exists |
| Time to Contact | `time_to_contact_ms` | model estimate — no contact anchor exists |
| Bat Speed Through Contact | `bat_speed_contact_mph` | model estimate — **a speed in mph with no calibration and no object tracking; pure invention** |
| Connection & Barrel Delivery | `connection_barrel_delivery_score_100` | model estimate |
| Hitter's Move Quality (non-negotiable) | `hitters_move_score_100` | model estimate |
| Shoulder Plane Steadiness | `shoulder_plane_steadiness_score_100` | model estimate |
| Finish & Balance | `finish_balance_score_100` | model estimate |
| Shoulder-to-Shoulder Hold (non-negotiable) | `front_shoulder_leak_before_contact` + `shoulder_to_shoulder_hold_pass` + `..._pct_to_contact` | model estimate |

There is a second hitting surface, `src/lib/reportCard/v1/hittingV1Schema.ts` (four P1–P4 categories). It is pure text content — every drill list, video list and roadmap step in it is empty by design and renders as "pending". No numbers.

## 4. Softball Pitching — `src/lib/reportCard/disciplines/sp.ts`

Thirteen tiles (`windup_trunk_tibia`, `windup_hip_square`, `windup_knee_over_foot`, `windup_foot_power_line`, `stride_triple_extension`, `sfc_foot_angle`, `sfc_arm_path`, `sfc_trunk_alignment`, `sfc_knee_ankle`, `sfc_hip_shoulder_rotation`, `accel_arm_path`, `ft_knee_ankle`, `stride_profile`). **Every one of their metric keys is on the SHOWCASE_FUTURE list**, so the whole softball pitching card is suppressed. All would be model estimates if unsuppressed.

## 5. Numbers outside the tiles that an athlete still sees

| Thing shown | Source | Produced by |
|---|---|---|
| Efficiency score (the big number on an analysis) | **model estimate with a hard-coded default of 75** | `analyze-video/index.ts` — `let efficiency_score = 75` (line 2279) and `Math.round(analysisArgs.efficiency_score \|\| 75)` (line 2310). If the model omits it, or returns 0, the athlete sees 75. |
| Letter grade A–F on a card | derived from tile pass/fail | `gradeFromTiles` in `src/lib/reportCard/grade.ts`. Pass=100, warn=70, fail=0, averaged over measured tiles only; 90/80/70/60 cutoffs are hard-coded. With one measured tile, one tile decides the grade. |
| "X of Y signals · confidence N" on UHRC pillars | counts + inherited confidence | `src/components/report-card/UhrcReportCard.tsx`, built by `src/lib/uhrc/buildReport.ts` |
| UHRC composite score | weighted average of pillars | `buildUhrcReport`; weights are hard-coded in `src/lib/uhrc/pillars.ts` |
| PIE V2 confidence values (60 / 80 / 92) | **hard-coded constants**, not computed | `confidenceFor` in `src/lib/pieV2/scoring.ts` — "manual" always 60, "video_derived" always 80, "sensor_derived" always 92 |
| Tile "confidence" percentages | model self-reported | the model returns its own confidence in the same tool call; we display it unmodified |
| Reference distance | **user-entered, with a default** | `ReferenceDistanceStep.tsx` / `DEFAULT_DISTANCE_FT` in `src/lib/capture/referenceDistance.ts` |
| Capture frame rate | **measured** from the camera track / probed file | `src/lib/capture/highFpsCapture.ts`, `probeVideoMetadata.ts` |

## 6. What would go blank tomorrow if every fabricated or placeholder value were removed

Removing model estimates, hard-coded defaults and unvalidated constants:

**Survives**
- Pitching Tempo (only when frame anchors and a true fps exist — see §7, they usually do not).
- Capture frame rate and the honesty warnings built on it.
- Reference distance, because the athlete typed it.

**Goes blank**
- The entire throwing report card (its one remaining tile is a model estimate).
- Pitching Shoulder Tilt at Release — leaving pitching with Tempo alone.
- The efficiency score on every analysis (default 75).
- Every letter grade, because it has no measured tiles left to average.
- All 18 hitting tiles (already suppressed).
- All 13 softball pitching tiles (already suppressed).
- PIE V2 confidence numbers, and anything that displays them.
- Any UHRC pillar whose contributions came from those signals; the composite would be null or near-null.

Blunt version: **one tile in the product is a real measurement of the athlete's body, and it is pitching Tempo.** Everything else with a number on it is either a language model's opinion formatted as a metric, or a constant.

---

## 7. Status on the three things you cannot see in the database

### Coaching stage — **not done**

Plainly: not done, not merely untested. There is no code anywhere in this repo that inserts into `video_coaching_runs`. The table and the `coaching_run_id` foreign key exist only in the migration (`supabase/migrations/20260615141906_*.sql`) and in generated types. `recordAnalysisRun.ts` accepts a `coaching_run_id` field, and every caller in `analyze-video` leaves it unset. So `video_coaching_runs = 0` and `coaching_run_id IS NULL` on all 95 runs is the correct, expected state of the code as written.

What I did change last turn was different and smaller: `analyze-video` now returns `violations_detected` in its response, and `AnalyzeVideo.tsx` unwraps cache-hit responses so those fault keys reach the recommendation matcher. That is the path recommendations actually use. It is **untested against a live run** — no analysis has been executed since.

### HighFpsCapture.tsx and ReferenceDistanceStep.tsx — wired, but landmarks still are not persisted

- `HighFpsCapture.tsx` (553 lines) requests the highest camera frame rate the device will give (ideal 120, floor 60), measures what actually came back, records, uploads, generates a thumbnail, and reports the achieved rate honestly before recording. It is imported and rendered in `src/pages/AnalyzeVideo.tsx` (line 1522), so it is in the real flow.
- `ReferenceDistanceStep.tsx` (170 lines) collects the camera-to-athlete distance with sport presets and a manual entry, gated behind owner/admin checks for the ball-speed option. Rendered at `AnalyzeVideo.tsx` line 1356, and the value is sent with the analysis request (line 939) alongside the probed capture fps.
- **Landmarks are not persisted.** `AnalyzeVideo.tsx` line 743 inserts the landmark run with `landmarks_storage_path: null` explicitly — only a sha256 of the evidence and a diagnostics blob including the first frame's landmarks are stored. `NOT NULL` on that column was dropped in a later migration specifically to allow this. So `landmarks_storage_path` being NULL on all 24 runs is by construction, not a failure.
- **The metric engine is still a stub**, and it is honest about it: `METRIC_ENGINE_VERSION = "metrics@0.0.0-stub"` and `LANDMARK_MODEL_VERSION` end in `@0.0.0-stub` (`src/lib/biomech/versions.ts`), and the anchor detectors (`peakLegLift.ts`, `plantDetector.ts`) short-circuit to a missingness result when the model version ends in `-stub`. Which means the one measured tile, Tempo, will usually report "not measured" rather than a value until a real pose model is swapped in. Two tests assert the stub is gone; they fail on purpose as a tripwire.

### Test suite — 1133 passed, 4 failed (133 files, 129 passed, 4 failed; 60s)

The four failures, verified by re-running the whole suite just now:

1. `src/lib/biomech/__tests__/tempoPipeline.test.ts` — expects missingness reason `pose_model_is_stub`, gets `pose_not_detected`. Wrong reason string, same underlying stub condition.
2. `src/lib/uhrc/__tests__/buildReport.test.ts` — "includes hitting phases when hitting discipline requested"; expected true, got false. This is the Release-1 hitting suppression doing its job against a test written before it.
3. `src/lib/pieV2/__tests__/scoring.test.ts` — energy angle tier boundary: expected `major`, got `critical`.
4. `src/test/engine-invariants.test.ts` — MLB benchmark validation: expected 3 to be ≤ 2.

Note the earlier `peakLegLift`/`frontFootStrike` stub-tripwire assertions are inside files that otherwise pass; the four above are the whole failing set. None are new from this turn's work, and I did not fix any of them.
