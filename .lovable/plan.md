## Phase 43 — Trust-First Measurement Release Audit

Create exactly one file: `.lovable/phase-43-trust-first-measurement-release-audit.md`.

This is a pure audit deliverable — no code, no detectors, no metrics, no architecture changes. The document is sourced from existing evidence in the repo (Phase 39–42B docs, contracts, detectors, missingness reasons, confidence-source trace) plus the real-world testing observations the user reported (broadcast CF clips, zoom variance, inconsistent bat-speed / TTC outputs).

### Exploration before writing
Read (no edits):
- `.lovable/phase-42b-d-pose-build-authority.md`, `phase-41-*.md`, `phase-42-*.md`, `confidence-source-trace.md`, `bat-path-vs-on-plane-definitions.md`, `time-to-contact-vs-power.md`, `back-elbow-methodology.md`, `p3-timing-methodology.md`, `finish-and-balance-methodology.md`
- `src/lib/reportCard/contracts/*.contract.ts` (bp, bh, and any other discipline contracts) — full athlete-facing metric inventory
- `src/lib/biomech/metrics/missingness.ts`, `confidence.ts`, `videoAcceptance.ts`, `versions.ts`
- `src/lib/biomech/anchors/*`, `detectors/*` — what each metric actually depends on
- `src/lib/biomech/pose/poseRunner.ts`, `toAnchorFrames.ts` — what D-POSE currently produces

### Document structure (all 12 sections required by the prompt)
1. **Executive Summary** — Classify the failure mode. Evidence points to *capture-environment mismatch + confidence-surface failure*, not pure measurement failure: D-POSE now runs real BlazePose Full (Phase 42B), but landmark quality collapses on broadcast CF footage (athlete <15% frame height, occlusion, motion blur) and per-tile confidence is model-self-reported, not coverage-based (per `confidence-source-trace.md`).
2. **Capture Environment Inventory** — Enumerate observed capture types (broadcast CF, behind-pitcher, side-view tripod, showcase, cage, game footage, zoomed/non-zoomed) with what each preserves/loses (scale ref, both feet, bat tip, ball, depth).
3. **Metric Observability Audit** — Walk every metric in `bp.contract.ts` + `bh.contract.ts` (tempo_sec, energy_angle_deg, stride_pct_of_height, head_vertical_movement_pct, glove_drift, head_at_release, shoulder_tilt, lift_thrust, premature_shoulder_open, plus hitting bat-path / on-plane / TTC / bat-speed). For each: from-any-video / from-some-videos / controlled-capture-only, with the landmark or detector dependency that drives the verdict.
4. **Release-Ready Metric Inventory** — Pose-only metrics with weak scale dependence: `tempo_sec`, `head_vertical_movement_pct` (relative), `shoulder_tilt_deg`, `premature_shoulder_open_deg`, `energy_angle_deg`. These survive broadcast CF.
5. **Conditional Metric Inventory** — Need calibration or specific framing: `stride_pct_of_height` (needs full-body + height ref), `head_at_release_deg` (needs release-frame visibility), `glove_drift_outside_frame_in` (needs pixel→inch calibration), `lift_thrust_deg` (needs rubber visible), `on_plane_pct` / `bat_path_score_100` (needs bat detection at hitter scale).
6. **High-Risk Metric Inventory** — Anything requiring object tracking or absolute physics: `bat_speed_mph`, `exit_velocity_mph`, `pitch_velocity_mph`, ball/bat collision metrics. Current pipeline has no object detector and no calibration; values are model-hallucinated. Recommend suppression until D-OBJECT + D-CAL exist.
7. **Confidence Surface Audit** — Document that `confidence` on tiles is model self-report, not coverage; warn-dot threshold 0.5 can present low-trust outputs as authoritative. No `pose_visibility_score` or `frame_coverage_ratio` is surfaced today.
8. **Universal Analysis Candidate** — Lock the Release-1 package to the §4 list (relative pose-derived angles + tempo).
9. **Showcase Analysis Candidate** — §5 list, with explicit prerequisites: athlete ≥40% frame height, side view ±20°, ≥60fps, full body visible, height/rubber reference in frame.
10. **Release Recommendation** — Three tiers: **Universal Analysis** (ship), **Showcase Analysis** (ship gated by capture checklist + suppress on failure), **Future Validation Analysis** (§6, do not ship).
11. **Release Risk Ranking** — Ordered list, highest risk first: bat_speed / exit_velocity / pitch_velocity → glove_drift_in → stride_pct → head_at_release → on_plane_pct → bat_path_score → lift_thrust → energy_angle → premature_shoulder_open → shoulder_tilt → head_vertical_movement_pct → tempo_sec.
12. **Final Determination** — Evidence-based answer: today the trustworthy cross-upload set is the pose-derived, scale-invariant, relative-angle/time metrics from §4. Everything physics-velocity or pixel-calibrated should not ship to athletes in Release 1.

### Constraints honored
No new metrics, detectors, doctrine, architecture, or implementation. No edits to source. Only the single audit markdown file is produced.

### Deliverable
- `.lovable/phase-43-trust-first-measurement-release-audit.md` (new file, sole output)
