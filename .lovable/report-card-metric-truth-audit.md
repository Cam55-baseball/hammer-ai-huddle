# Phase 20 — Report Card Metric Truth Audit

Status: **reality-only audit.** No remediation, no new metrics, no code, no architecture, no doctrine, no validation/calibration/confidence/gate/governance/roadmap work. Citations only.

---

## §1 Audit Scope

Athlete-facing report-card metrics evaluated for **truth of measurement** only — i.e. whether the displayed value is supported by a real evidence-producing system traceable to a measurable input.

Surfaces in scope:

- Contract definitions: `src/lib/reportCard/contracts/bp.contract.ts`, `bh.contract.ts`, `throwing.contract.ts`, `shared.ts`.
- Discipline computes: `src/lib/reportCard/disciplines/bp.ts`, `bh.ts`, `throwing.ts`.
- Reader / grader: `src/lib/reportCard/metricReaders.ts`, `src/lib/reportCard/grade.ts`, `src/lib/reportCard/types.ts`.
- Producer: `supabase/functions/analyze-video/index.ts` (single AI vision call, lines ~2435–2470 emit `ai_analysis`).
- Storage: `videos.ai_analysis.metrics` (consumed by hooks below).
- Consumers: `src/hooks/useReportCardTrend.ts`, `src/hooks/usePitchingV2Trends.ts`, `src/hooks/useHIESnapshot.ts`; tile renderer `src/components/report-card/hammer/ReportCardTile.tsx`.
- Version pins: `src/lib/biomech/versions.ts` (`LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION` all `@0.0.0-stub`).

Out of scope: doctrine, planning, recommendations, intelligence layers (except where they consume the metrics below).

---

## §2 Metric Inventory

Producing system for every metric below is the AI vision call in `supabase/functions/analyze-video/index.ts` (the only path that writes `videos.ai_analysis.metrics`). Consuming surface is the corresponding tile in `src/lib/reportCard/disciplines/{bp,bh,throwing}.ts` rendered by `ReportCardTile.tsx`. Current status is **live in UI**; classification is **AI Derived** for every metric per `analysis-truth-audit.md §3` and `first-implementation-reality-audit.md §4` (no deterministic detector/anchor/metric engine exists; `versions.ts` triplet still `@0.0.0-stub`).

### Baseball Pitching (`bp.contract.ts`, 9 metrics)

| Metric key | Tile | Source | Class |
|---|---|---|---|
| `energy_angle_deg` | energy_angle | bp.contract.ts:11 | AI Derived |
| `premature_shoulder_open_deg` | hip_shoulder_separation | bp.contract.ts:21 | AI Derived |
| `tempo_sec` | tempo | bp.contract.ts:31 | AI Derived |
| `stride_pct_of_height` | stride_length | bp.contract.ts:41 | AI Derived |
| `head_vertical_movement_pct` | head_stability | bp.contract.ts:51 | AI Derived |
| `glove_drift_outside_frame_in` | glove_control | bp.contract.ts:61 | AI Derived |
| `head_at_release_deg` | head_at_release | bp.contract.ts:71 | AI Derived |
| `shoulder_tilt_deg` | shoulder_tilt_release | bp.contract.ts:81 | AI Derived |
| `lift_thrust_deg` | lift_thrust | bp.contract.ts:91 | AI Derived |

### Baseball Hitting (`bh.contract.ts`, 20 metric fields across 15 tiles)

P1–P4 metrics (lines 11–215): `hip_stability_score_100`, `hand_load_score_100`, `p2_timing_pass`, `eyes_track_score_100`, `stride_dir_deg_off_square`, `heel_plant_score_100`, `p3_release_offset_ms`, `hands_outside_shoulders_at_landing_pass`, `sequencing_ok`, `bat_path_score_100`, `on_plane_pct`, `time_to_contact_ms`, `bat_speed_contact_mph`, `connection_barrel_delivery_score_100`, `hitters_move_score_100`, `shoulder_plane_steadiness_score_100`, `finish_balance_score_100`, `shoulder_to_shoulder_hold_pct_to_contact`, `shoulder_to_shoulder_hold_pass`, `front_shoulder_leak_before_contact`, `front_shoulder_leak_pct_of_window`. All AI Derived.

### Baseball Throwing (`throwing.contract.ts`)

Inherits BP minus `energy_angle_deg`, `tempo_sec`, `lift_thrust_deg` (throwing.contract.ts:5). All AI Derived.

### Softball

`sb-pitching` aliases BP, `sh` aliases BH (`contracts/index.ts:11–12`). Same classifications.

**No Evidence-Derived, Rule-Derived, Hybrid, Placeholder, or Missing categories are populated.** Every athlete-facing report-card metric resolves to AI Derived.

---

## §3 Metric Lineage Audit

Single lineage chain applies to every metric in §2:

```
Input        → uploaded video frames (videos.storage_path)
Processing   → single multimodal AI call (analyze-video/index.ts:~2256–2435,
                using prompt strings from the metric's `prompt` field in
                contracts/{bp,bh,throwing}.contract.ts)
Output       → { value, confidence } | { missing: true, missing_reason }
                per contracts/shared.ts:30–41
Storage      → videos.ai_analysis.metrics[key]  (analyze-video/index.ts:2435–2470)
Display      → metricReaders.read{Number,Bool,Score100} →
                disciplines/*.ts compute() → ReportCardTile.tsx
Trend store  → useReportCardTrend.ts:30–75 re-reads videos.ai_analysis
```

Findings:

- **No orphaned metrics** — every contract key has a tile consumer in `disciplines/*.ts` (`compute` references match).
- **No rule-derived branch** — `metricReaders.ts` does no derivation beyond clamp/back-compat for `score100`.
- **All metrics are AI-only.** No deterministic pose layer, no detector layer, no anchor layer, no metric engine exists in `src/lib/biomech/**`; only `versions.ts` and `videoAcceptance.ts` are present, both stubbed (`@0.0.0-stub`).
- **Broken lineage from canonical contract:** `canonical-measurement-architecture.md` and `canonical-implementation-blueprint.md` require Input → Frames → Pose → Detectors → Anchors → Metric Engine → Tile with version-pinned MVCS. Current chain skips Pose → Detectors → Anchors → Metric Engine entirely (`first-implementation-reality-audit.md §4`, `analysis-truth-audit.md §3`).
- **Synthetic metric risk:** all values originate from the same uncertified AI tool call, including scores nominally "0–100" that the model self-assigns from its own prompt rubric (e.g. `hip_stability_score_100`, `connection_barrel_delivery_score_100`).

---

## §4 Measurement Truth Audit

| Class | Count | Examples | Citation |
|---|---|---|---|
| Directly measured | 0 | — | no deterministic detector/anchor/metric path exists (`src/lib/biomech/` lacks pose/detector/anchor/engine modules; `versions.ts:24–27` all stubbed) |
| Inferred from evidence | 0 | — | inference would require deterministic pose evidence; not present |
| Estimated | 0 | — | no rule-based estimator in `metricReaders.ts` or `disciplines/*.ts` |
| AI generated | All (BP 9 + BH 20 + Throwing 6 unique) | every metric in §2 | producer is the single AI call at `analyze-video/index.ts:~2256–2470`; prompts at `contracts/{bp,bh}.contract.ts` |
| Placeholder generated | 0 | — | nothing returns a hard-coded value; rows missing structured metrics surface as `grade: null` (`useReportCardTrend.ts:53–62`) |

Net: 100% of athlete-facing report-card metric values are **AI generated** under the current implementation.

---

## §5 Confidence and Missingness Audit

Per `contracts/shared.ts:30–41` every metric carries either `{ value, confidence }` or `{ missing: true, missing_reason }`. Readers honor both (`metricReaders.ts:13–55`).

| Property | State | Citation |
|---|---|---|
| Exposes confidence | Yes (per-metric `confidence` field surfaced to tile state) | `metricReaders.ts:19`, `types.ts:31`, `ReportCardTile.tsx` warn-dot at `state.confidence < 0.5` |
| Exposes missingness | Yes (`missing_reason` flows to tile `missing` state) | `metricReaders.ts:47–55` (`missingState`) |
| Hides uncertainty | **Yes, partially** — confidence is shown only as a low-confidence warn dot (`< 0.5`); the numeric confidence is not surfaced to the athlete, and value/score display is identical regardless of confidence | `ReportCardTile.tsx ~line 103` per `.lovable/confidence-source-trace.md` |
| Fabricates certainty | **Yes, structurally** — the `confidence` value is the **model's self-reported confidence in its own measurement**, not a calibrated or frame-coverage signal; non-deterministic across re-runs of identical bytes | `.lovable/confidence-source-trace.md` ("What the number IS NOT"), `analysis-truth-audit.md §5` |

`confidence_summary_jsonb` on `video_analysis_runs` (`supabase/migrations/20260615141906_*.sql:188`, `_shared/recordAnalysisRun.ts:22`) persists the same self-reported numbers; no independent calibration source exists.

---

## §6 Athlete Risk Audit

Descriptive only.

1. **AI-only metrics presented as measurements.** Every tile value an athlete sees originates from a single multimodal vision call without deterministic pose/anchor/engine backing (`first-implementation-reality-audit.md §4` Critical Blockers 1–5). An athlete cannot distinguish AI estimate from instrumented measurement.
2. **Self-reported confidence visible only as a low-confidence warn dot.** Athletes may interpret the absence of a warn dot as "high confidence" when in fact the number is the model's own opinion of itself, with no calibration (`confidence-source-trace.md`).
3. **Non-determinism risk.** Same video re-uploaded can yield different `value`, different `confidence`, and different `missing` states (`confidence-source-trace.md` "Flagged for determinism evidence package"; `analysis-truth-audit.md §6`). Athlete-visible numbers can change without any change in the underlying performance.
4. **Broken lineage to canonical contract.** Canonical framework requires version-pinned MVCS triplet; current pins are `@0.0.0-stub` (`versions.ts:24–27`), meaning no metric is replay-certifiable.
5. **Self-assigned 0–100 scores treated as rubric scores.** Tiles such as `hip_stability_score_100`, `connection_barrel_delivery_score_100`, `hitters_move_score_100`, etc. derive their PASS/ELITE bands from `scoreMeterState` (`metricReaders.ts:67–84`) applied to a number the AI assigned to itself from its own prompt.
6. **Composite displays without lineage decomposition.** `gradeFromTiles` aggregates tile states into a grade surfaced via `useReportCardTrend` (`useReportCardTrend.ts:60–73`); the grade inherits all AI-origin uncertainty without exposing it.
7. **Missingness suppression risk.** When the AI fails to identify an anchor (e.g. "Pitcher knee lift not in frame" per `bh.contract.ts:39`), the system relies on the same AI to honestly return `missing: true`. There is no independent verifier; silent fabrication of a value cannot be detected at the readback layer.

---

## §7 Truth Coverage Scorecard

Classification applied uniformly because evidence chain is identical (§3, §4).

| Coverage | Metrics | Justification |
|---|---|---|
| Truth Supported | 0 | Would require deterministic pose → detector → anchor → metric engine producing the value, with version-pinned MVCS. None present (`first-implementation-reality-audit.md §4`, `versions.ts:24–27`). |
| Partially Supported | 0 | Would require at least one deterministic input feeding the value (e.g. landing time from anchor engine, fps_true from probe). `fps_true` and `landing_time_sec` are probed/stored but are **not** inputs to any report-card metric — they only seed the cache fingerprint (`versions.ts:8–22`). No metric in §2 consumes them. |
| Unsupported | All metrics in §2 (BP 9 + BH 20 + Throwing 6 unique + softball aliases) | Single AI call is the sole producer; confidence is model self-report; no calibration; non-deterministic across re-runs. |

---

## §8 Report Card Release Readiness

Evidence base: §§2–7.

- **Released Publicly** — Not eligible. 100% Unsupported metrics; self-reported, non-deterministic confidence; broken lineage to canonical contract; stubbed version triplet.
- **Released With Warnings** — Not eligible on metric-truth grounds. The existing warn dot (`< 0.5`) reflects the model's own opinion of itself (per `confidence-source-trace.md`), so a "warning" surface does not communicate the actual truth deficit to athletes; it would amplify the certainty-fabrication risk in §5/§6.
- **Internal Testing Only** — Eligible. The UI renders end-to-end, missingness surfaces honestly when emitted, and staff can exercise the surfaces knowing every value is AI-origin and uncertified. This matches the standing determinations in `first-implementation-reality-audit.md §9` and `live-athlete-workflow-proof-audit.md §9`.

---

## §9 Final Determination

**METRIC TRUTH NOT PROVEN.**

Supported exclusively by §§2–8: every athlete-facing report-card metric (§2) traces to a single AI vision call (§3); zero metrics are directly measured, inferred, or estimated from deterministic evidence (§4); confidence is the model's self-report and certainty is structurally fabricated for the athlete-facing surface (§5); athlete risks include indistinguishable AI estimates, non-determinism, and broken canonical lineage (§6); truth coverage is 0 Supported / 0 Partial / All Unsupported (§7); only Internal Testing Only is supportable on metric-truth grounds (§8).
