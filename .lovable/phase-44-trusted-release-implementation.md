# Phase 44 — Trusted Release Implementation

**Status:** audit + decision matrix (no code changes)
**Predecessors:** Phase 42B (D-POSE Build Authority), Phase 43 (Trust-First Measurement Release Audit)
**Scope:** define the Release-1 athlete-facing measurement package that contains *only* metrics traceable to landmarks, anchors, detectors, or deterministic biomechanical math.

---

## §1 Measurement-Backed Metric Inventory

Metrics whose values are produced (or can be produced today) by the canonical
pose → anchor → detector → metric → evidence chain. Each entry cites the
derivation file and notes wiring state.

| Metric key | Discipline | Derivation path | Wiring state |
| --- | --- | --- | --- |
| `tempo_sec` | BP / throwing (excluded) | `src/lib/biomech/pipeline/tempoPipeline.ts` → `anchors/peakLegLift.ts` + `anchors/frontFootStrike.ts` (uses `detectors/plantDetector.ts`) → `metrics/tempoSec.ts` → `evidence/tempoEvidence.ts` | Fully wired, deterministic. Produces real value once `pose_frames` are provided by Phase 42B `poseRunner.ts`. |
| `shoulder_tilt_deg` | BP / throwing | Computable from BlazePose landmarks 11/12 (shoulders) at the release anchor. Pose-derivable; no LLM dependency required. | Pose-derivable, downstream metric module not yet authored — but the *input* is landmark-based, not LLM-estimated. |
| `head_vertical_movement_pct` | BP / throwing | Vertical delta of landmark 0 (nose) across setup→release window, expressed against landmark-derived torso length. Scale-invariant. | Pose-derivable; downstream metric module not yet wired. |
| `premature_shoulder_open_deg` | BP / throwing | Shoulder-line orientation (landmarks 11–12) at the `front_foot_strike` anchor frame. Anchor exists today. | Pose-derivable on top of existing anchor. |
| `energy_angle_deg` | BP only | Angle between plant-foot midpoint and front hip (landmarks 23/24, 27/28) at the `peak_leg_lift` anchor. Anchor exists today. | Pose-derivable on top of existing anchor. |
| `head_at_release_deg` | BP / throwing | Head-to-target-line offset at release anchor. Pose-derivable but requires a release anchor that does not yet exist as a deterministic detector. | Pose-derivable in principle; gated on release anchor (today supplied by LLM). |
| `lift_thrust_deg` | BP only | Drive-leg angle at push-off, derivable from landmarks 23/25/27. | Pose-derivable; downstream metric not wired. |
| `p2_timing_pass` | BH | Boolean from comparing hand-load anchor frame to pitcher peak-knee-lift anchor frame. Both are anchorable from pose. | Pose-derivable in principle, currently LLM-estimated. **Not Release-1 trusted.** |
| `sequencing_ok` | BH | Pure ordering of pose-derivable anchors. | Pose-derivable in principle; today LLM-estimated. **Not Release-1 trusted.** |

**Release-1 trusted (fully wired today, landmark-backed end-to-end):**
- `tempo_sec` (BP)

**Release-1 trusted (landmark-backed *input*, requires the trivial downstream
calculation module that consumes BlazePose output already produced by
`poseRunner.ts`; no new detectors, no new doctrine):**
- `shoulder_tilt_deg`, `head_vertical_movement_pct`, `premature_shoulder_open_deg`,
  `energy_angle_deg`, `lift_thrust_deg` (BP)

Everything else in `bp.contract.ts` / `bh.contract.ts` / `throwing.contract.ts`
is currently produced by the LLM (see §2) and is *not* a Release-1 candidate.

---

## §2 Non-Measurement Metric Inventory

Every athlete-facing metric whose value today is parsed from the LLM JSON
tool-call output produced by the prompts in
`src/lib/reportCard/reportCardContracts.ts` and the per-metric `prompt` strings
in the discipline contracts. The LLM is doing *visual estimation*, not
measurement — there is no detector, no anchor, no calibration, and no landmark
geometry behind the number.

### BH (hitting) — LLM-only physics & bat metrics
Source: `src/lib/reportCard/contracts/bh.contract.ts:101–139`,
consumed by `src/lib/reportCard/disciplines/bh.ts:225,245,265,291`.

| Metric | Why it is LLM-only |
| --- | --- |
| `bat_path_score_100` | No bat detector. Score is the LLM's qualitative 0–100 judgement of barrel path through the zone. |
| `on_plane_pct` | No bat-plane geometry tracker. Percentage is the LLM's visual estimate. |
| `time_to_contact_ms` | No "swing start" or "contact" detector. The prompt explicitly asks the LLM to "estimate from the visible frames". |
| `bat_speed_contact_mph` | No bat tracking, no hand proxy, no calibration. The prompt assumes a 33-inch bat as a ruler. Labelled "mph proxy" in the contract. |

### BH (hitting) — LLM-scored 0–100 judgement tiles
All of the following are LLM 0–100 scores with no landmark derivation
(`bh.contract.ts:13–49, 63–70, 141–215`):
`hip_stability_score_100`, `hand_load_score_100`, `eyes_track_score_100`,
`heel_plant_score_100`, `connection_barrel_delivery_score_100`,
`hitters_move_score_100`, `shoulder_plane_steadiness_score_100`,
`finish_balance_score_100`, `shoulder_to_shoulder_hold_pct_to_contact`,
`shoulder_to_shoulder_hold_pass`, `front_shoulder_leak_before_contact`,
`front_shoulder_leak_pct_of_window`, `hands_outside_shoulders_at_landing_pass`,
`p3_release_offset_ms`, `p2_timing_pass`, `sequencing_ok`,
`stride_dir_deg_off_square`.

### BP (pitching) — LLM-estimated until pose pipeline lands
Same story for every BP metric *not* listed in §1 as landmark-backed:
`stride_pct_of_height` (needs height calibration that does not exist),
`glove_drift_outside_frame_in` (needs pixel→inch calibration that does not
exist). Source: `bp.contract.ts:53–60, 73–81`.

### Dependency chain (identical for every LLM metric)
```
reportCardContracts.ts (prompt + JSON tool schema)
  → LLM JSON tool call
  → ai_analysis.metrics[<key>]
  → disciplines/{bh,bp,throwing}.ts tile reader
  → UhrcReportCard / BhCategoryPanels tile
```

---

## §3 Release-1 Visibility Matrix

Rule of decision:
- **VISIBLE** → metric is landmark/anchor/detector-derivable today *and* its
  downstream pillar contribution can stand on its own.
- **HIDDEN** → metric is LLM-estimated *and* falsely presents as a physical
  measurement (velocities, bat geometry, calibrated distances). Removing it
  protects athlete trust.
- **SHOWCASE FUTURE** → metric *could* be pose-derived in principle but is
  blocked on a measurement system that does not yet exist (calibration,
  bat/object tracking, fps verification, release-anchor detector).

| Metric | Discipline | Classification | Rationale |
| --- | --- | --- | --- |
| `tempo_sec` | BP | **VISIBLE** | Fully wired landmark pipeline (§1). |
| `shoulder_tilt_deg` | BP / throwing | **VISIBLE** | Landmark-only at release; scale-invariant. |
| `head_vertical_movement_pct` | BP / throwing | **VISIBLE** | Landmark-only; scale-invariant. |
| `premature_shoulder_open_deg` | BP / throwing | **VISIBLE** | Landmark-only at existing anchor. |
| `energy_angle_deg` | BP | **VISIBLE** | Landmark-only at existing anchor. |
| `lift_thrust_deg` | BP | **VISIBLE** | Landmark-only. |
| `head_at_release_deg` | BP / throwing | **SHOWCASE FUTURE** | Needs deterministic release anchor. |
| `stride_pct_of_height` | BP / throwing | **SHOWCASE FUTURE** | Needs athlete-height calibration (D-CAL). |
| `glove_drift_outside_frame_in` | BP / throwing | **SHOWCASE FUTURE** | Needs pixel→inch calibration. |
| `bat_speed_contact_mph` | BH | **HIDDEN** | LLM heuristic; presents as mph. Highest trust risk. |
| `time_to_contact_ms` | BH | **HIDDEN** | LLM estimate; presents as ms physics. |
| `on_plane_pct` | BH | **HIDDEN** | LLM visual estimate; presents as geometry. |
| `bat_path_score_100` | BH | **HIDDEN** | LLM qualitative score; no bat geometry. |
| All BH 0–100 judgement tiles (§2) | BH | **HIDDEN** | LLM judgement, not measurement; releasing them as scored tiles claims measurement we cannot defend. |
| BH boolean anchors (`p2_timing_pass`, `sequencing_ok`, `hands_outside_shoulders_at_landing_pass`, `shoulder_to_shoulder_hold_pass`, `front_shoulder_leak_before_contact`) | BH | **HIDDEN** | Pose-derivable in principle; today LLM-only. Move to SHOWCASE FUTURE once anchors land. |
| `p3_release_offset_ms`, `stride_dir_deg_off_square`, `front_shoulder_leak_pct_of_window`, `shoulder_to_shoulder_hold_pct_to_contact` | BH | **SHOWCASE FUTURE** | Pose-derivable with future anchors + fps verification. |

No "undecided" entries.

---

## §4 Report Card Changes

Concrete surfaces affected by §3. Source: `src/components/report-card/` +
`src/lib/uhrc/buildReport.ts` + `src/lib/reportCard/disciplines/bh.ts`.

| Surface | Change required |
| --- | --- |
| `BhCategoryPanels.tsx` | Hide every tile bound to a §3 HIDDEN metric. With BH classified entirely HIDDEN in Release-1, the entire BH panel is suppressed and replaced with a one-line "Hitting analysis not yet released — pitching analysis available now" notice. |
| BP tile grid (`UhrcReportCard.tsx` pillar grid) | Render only the six §1 trusted metrics as tiles. SHOWCASE FUTURE metrics render as a single "Coming with calibration release" placeholder card, not as scored tiles. |
| UHRC pillar contributions (`src/lib/uhrc/buildReport.ts`) | Any pillar contribution whose `signal_id` resolves to a HIDDEN metric must be treated as `missing: true` rather than scored, so the pillar denominator (`contributions.filter(c => !c.missing).length`) does not include suppressed signals. Pillar scores recompute from the remaining trusted contributions. |
| Composite `report.composite` | Recomputes naturally from the reduced contribution set. No new math. |
| `biggest_leak` / `biggest_win` summaries | Must not reference HIDDEN metric keys. Filter the candidate set to VISIBLE signals before selection. |
| Trend charts (`usePitchingV2Trends`, BH trends) | BH trend lines disappear with the panel. BP trend lines render only for VISIBLE metrics. |
| LineageDrilldownButton rows | No change to mechanism; the row set shrinks because suppressed contributions are marked missing. |
| Detailed-analysis expand panel | Render only VISIBLE-metric explanation copy. |

---

## §5 Coaching-System Impact

Coaching/recommendation pathways that today consume metric keys flagged HIDDEN
in §3.

| Pathway | Hidden inputs consumed today | Required Release-1 update |
| --- | --- | --- |
| PIE V2 hitting aggregates (`usePitchingV2Trends` + BH aggregator) | All BH metrics | Suppress BH from the Release-1 aggregator output (do not roll up scores derived from HIDDEN inputs). |
| Hitting drill recommendations keyed off `bat_path_score_100` / `on_plane_pct` / `time_to_contact_ms` / `bat_speed_contact_mph` | All four | Remove BH-derived drill recommendations from Release-1. BP-derived recommendations continue unchanged. |
| HammerDailyPlan remediation anchor ("Work on this in today's plan" CTA, `UhrcReportCard.tsx`) | Today can link to any pillar's biggest leak | Restrict anchor to VISIBLE-metric pillars only. |
| Video-suggestion surfaces (`docs/owner/video-suggestions-surfaces.md`) | BH metric keys | Filter to VISIBLE-metric matches in Release-1. |
| Coach console BH panels | Any HIDDEN metric key | Suppress BH panel mirror of §4. |

No coaching pathway loses BP support. BH coaching is paused for Release-1, not
permanently — it is restored when bat/object tracking + calibration land
(§8).

---

## §6 Universal Analysis Package — Release-1 Athlete Experience

The exact athlete-facing surface contract after §3–§5 execute.

**Disciplines visible:** Baseball Pitching only. (Throwing inherits the same
VISIBLE BP subset minus `energy_angle_deg`, `tempo_sec`, `lift_thrust_deg` per
`throwing.contract.ts:5`.) Softball inherits via `getReportCardSpec`.

**Visible metrics (6, BP):**
1. `tempo_sec` — peak leg lift → front foot strike (seconds).
2. `energy_angle_deg` — plant-foot-to-front-hip angle at peak leg lift.
3. `premature_shoulder_open_deg` — shoulder rotation at front-foot strike.
4. `lift_thrust_deg` — combined drive-leg angle off the rubber.
5. `shoulder_tilt_deg` — shoulder tilt at release.
6. `head_vertical_movement_pct` — vertical head movement setup→release.

**Throwing visible metrics (3):** `premature_shoulder_open_deg`,
`shoulder_tilt_deg`, `head_vertical_movement_pct`.

**Hitting visible metrics:** none in Release-1.

**Visible explanations:** the per-metric `label` + `prompt`-derived pass/elite
thresholds already in `bp.contract.ts`. No new copy.

**Visible recommendations:** drill recommendations keyed to the six VISIBLE
metrics only, drawn from existing recommendation catalogs.

**Visible trends:** 30-day pillar trends for any UHRC pillar that has ≥1
VISIBLE contribution.

**Suppressed surfaces:** entire BH panel; all bat/velocity/time-to-contact
tiles; coaching pathways listed in §5.

---

## §7 Trust Risk Removal

Outputs removed in Release-1 because they cannot be defended as
measurement-backed.

| Removed surface | Trust justification |
| --- | --- |
| BH `bat_speed_contact_mph` tile | Presents a velocity in mph that is an LLM heuristic on an assumed bat length. Athletes will compare to HitTrax / Blast and lose trust on first mismatch. |
| BH `time_to_contact_ms` tile | Presents physics timing in ms with no swing-start or contact detector. |
| BH `on_plane_pct` tile | Presents geometric % with no bat-plane tracker. |
| BH `bat_path_score_100` tile | Presents a quantified path score with no barrel geometry. |
| All BH 0–100 judgement tiles | Presented as measured scores; today are LLM opinion. Athlete trust requires we not score what we did not measure. |
| BH composite / pillar scores derived from any of the above | Cannot be made trustworthy by recomposition; removed wholesale for Release-1. |
| BH coaching recommendations + drill prescriptions | Built on HIDDEN inputs; would prescribe work on unmeasured findings. |
| BP `stride_pct_of_height`, `glove_drift_outside_frame_in`, `head_at_release_deg` tiles (today) | Need calibration / release anchor that does not exist. Routed to SHOWCASE FUTURE, not scored in Release-1. |

---

## §8 Remaining Measurement Gaps (Inventory only — no implementation)

| Gap | Unlocks (from §3 SHOWCASE FUTURE / HIDDEN) |
| --- | --- |
| **Bat tracking (D-OBJECT bat)** | `bat_path_score_100`, `on_plane_pct`, `bat_speed_contact_mph`, BH connection / barrel delivery tiles. |
| **Ball / object tracking** | `time_to_contact_ms`, pitch-release anchor for hitting, `p3_release_offset_ms`. |
| **Velocity systems** (sensor-fusion or calibrated optical) | `bat_speed_contact_mph`, future pitch / exit velocity. |
| **Pixel → physical calibration (D-CAL)** | `stride_pct_of_height`, `glove_drift_outside_frame_in`, any inches/mph metric. |
| **Athlete-height calibration** | `stride_pct_of_height`, any "% of body height" metric. |
| **True-fps verification** (`videos.fps_true`) | All time-domain metrics in ms / seconds at finer-than-frame resolution; `time_to_contact_ms`, `p3_release_offset_ms`. |
| **Deterministic release anchor** | `head_at_release_deg`, `shoulder_tilt_deg` certified at release frame. |
| **Hitting anchor detectors** (swing-start, contact, hand-load, heel-plant) | All BH boolean and timing metrics currently LLM-judged. |

Inventory only. No phase here builds any of the above.

---

## §9 Release Readiness Determination

**Question:** Can Hammers launch a trustworthy biomechanics-only product after
these changes?

**Answer:** **Yes**, conditional on three preconditions, each of which is
already in scope of work already shipped or in flight:

1. **D-POSE produces real landmarks on uploaded videos.** Phase 42B
   (`src/lib/biomech/pose/poseRunner.ts`) ships BlazePose Full and emits
   `PoseFrameRow[]`. The §1 trusted pipeline (`runTempoPipeline`) consumes
   exactly that input shape. Precondition is satisfied as soon as the
   `AnalyzeVideo` upload path passes `poseRunner` output into the existing
   pipeline.
2. **HIDDEN metrics are removed, not merely visually suppressed.** §4 routes
   suppressed contributions through `missing: true` so the UHRC composite is
   recomputed from the trusted subset. This is a code change, not a CSS
   change. No HIDDEN metric may appear in pillar math, trend math,
   recommendation math, or biggest-leak/biggest-win selection.
3. **UHRC pillar math tolerates a reduced contribution set.** `buildReport.ts`
   already exposes
   `contributions.filter(c => !c.missing).length / contributions.length` as
   the denominator and surfaces `missingness.missing_signal_ids` on the card.
   No new math is required; the existing missingness machinery is the lever.

If those three hold, every number on the athlete-facing report card in
Release-1 traces back to a BlazePose landmark or a deterministic anchor over
landmarks. That is a defensible measurement claim.

---

## §10 Final Release Inventory

Authoritative Release-1 athlete-facing measurement package.

| # | Metric key | Discipline(s) | Unit | Source pipeline | Surface |
| - | --- | --- | --- | --- | --- |
| 1 | `tempo_sec` | BP | seconds | `runTempoPipeline` (real anchors → real detector → real metric → evidence) | BP report-card tile, BP trend, UHRC contribution |
| 2 | `energy_angle_deg` | BP | degrees | `peak_leg_lift` anchor + landmark-derived plant-foot/front-hip angle | BP tile, UHRC contribution |
| 3 | `lift_thrust_deg` | BP | degrees | Landmark-derived drive-leg angle at push-off | BP tile, UHRC contribution |
| 4 | `premature_shoulder_open_deg` | BP, throwing | degrees | Shoulder-line orientation at `front_foot_strike` anchor | BP/throwing tile, UHRC contribution |
| 5 | `shoulder_tilt_deg` | BP, throwing | degrees | Shoulder-line orientation at release window | BP/throwing tile, UHRC contribution |
| 6 | `head_vertical_movement_pct` | BP, throwing | percent (of torso length) | Landmark 0 vertical delta normalized by landmark-derived torso length | BP/throwing tile, UHRC contribution |

**Release-1 disciplines:** Baseball Pitching, Baseball Throwing (subset).
Softball Pitching / Throwing inherit per `getReportCardSpec`.

**Release-1 hitting:** *not shipped.* BH panel is suppressed with an explicit
"not yet released" message. BH returns in a later release once §8 measurement
gaps close.

This list is the lock for Release-1.
