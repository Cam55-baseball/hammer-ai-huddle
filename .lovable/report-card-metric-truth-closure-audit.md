# Phase 21 — Report Card Metric Truth Closure Audit

Status: **reality-only audit.** No remediation, no implementation, no architecture changes, no new requirements, no new metrics/detectors/anchors/validation/calibration/confidence/gates/governance/roadmap/sequencing/prioritization/estimates. Findings derive exclusively from the source inputs and read-only repository surfaces listed in `.lovable/plan.md`.

---

## §1 Audit Scope

Scope is **metric truth closure** only: for every athlete-facing report-card metric, identify the exact condition currently preventing it from achieving "Truth Supported" status, and classify that condition into one of nine failure classes:

1. Missing Evidence
2. Broken Lineage
3. Placeholder Dependency
4. AI-Only Dependency
5. Missing Confidence Surface
6. Missing Missingness Surface
7. Missing Validation Evidence
8. Missing Calibration Evidence
9. Missing Production Gate Evidence

Out of scope: doctrine, planning, recommendation lineage, intelligence layers, remediation sequencing, time estimates, or any prescriptive output.

Surfaces evaluated:

- Contracts: `src/lib/reportCard/contracts/{bp,bh,throwing,shared}.contract.ts`, `contracts/index.ts`.
- Readers / disciplines: `src/lib/reportCard/metricReaders.ts`, `disciplines/{bp,bh,throwing}.ts`, `types.ts`, `index.ts`.
- Producer: `supabase/functions/analyze-video/**` (single multimodal AI call).
- Version triplet: `src/lib/biomech/versions.ts` (`LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION` all pinned `@0.0.0-stub`).
- Trend / snapshot consumers: `src/hooks/useReportCardTrend.ts`, `src/hooks/usePitchingV2Trends.ts`, `src/hooks/useHIESnapshot.ts`.

Prior reality findings carried forward (citations):

- `.lovable/report-card-metric-truth-audit.md` §§2–9 — every athlete-facing metric classified AI Derived; final determination **METRIC TRUTH NOT PROVEN**.
- `.lovable/live-athlete-workflow-proof-audit.md` §§4–7 — report-card values currently uncertified (AI-derived); critical blockers include stub versioning and self-reported model confidence; final determination **WORKFLOW PROVEN FOR INTERNAL TESTING**.
- `.lovable/first-implementation-reality-audit.md` §§3–4 — no deterministic detector/anchor/metric engine in repo; `src/lib/biomech/**` contains only `versions.ts`.
- `.lovable/canonical-gap-analysis.md` — gaps: deterministic pose/detector/anchor/metric engine missing; validation harness missing; calibration evidence missing; production gates undefined in code.
- `.lovable/canonical-measurement-architecture.md` — canonical chain is Frames → Pose → Anchors → Detectors → Metric Engine → Confidence/Missingness → Storage → Display, version-pinned per MVCS.
- `.lovable/canonical-implementation-blueprint.md` — blueprint requires non-stub `LANDMARK_MODEL_VERSION` / `DETECTOR_VERSION` / `METRIC_ENGINE_VERSION` for any metric to be "Truth Supported."
- `.lovable/canonical-production-gate-matrix.md` — production gates (determinism, replay, calibration, validation, confidence calibration, missingness surfacing) — none currently emit evidence in code.
- `.lovable/canonical-validation-framework.md` — requires labeled-dataset validation per metric; no such fixtures or harness exist in repo.
- `.lovable/canonical-calibration-architecture.md` — requires per-metric calibration evidence (reference rig / known-truth corpus); none present.
- `.lovable/canonical-confidence-architecture.md` — requires calibrated confidence per metric (reliability diagram, bin-wise calibration); current confidence is self-reported by the model.

---

## §2 Unsupported Metric Inventory

Classification key:

- **Truth Supported** — value backed by deterministic evidence-producing system with version pin, calibration evidence, validation evidence, surfaced confidence + missingness, and production-gate evidence.
- **Partially Supported** — value has some evidence layers (e.g. deterministic detector + confidence surface) but is missing one or more of {calibration evidence, validation evidence, production-gate evidence}.
- **Unsupported** — fails one or more of the structural conditions above.

### Baseball Pitching — `src/lib/reportCard/contracts/bp.contract.ts`

| # | Metric key | Tile | Defined at | Classification |
|---|---|---|---|---|
| 1 | `energy_angle_deg` | energy_angle | bp.contract.ts:11 | Unsupported |
| 2 | `premature_shoulder_open_deg` | hip_shoulder_separation | bp.contract.ts:21 | Unsupported |
| 3 | `tempo_sec` | tempo | bp.contract.ts:31 | Unsupported |
| 4 | `stride_pct_of_height` | stride_length | bp.contract.ts:41 | Unsupported |
| 5 | `head_vertical_movement_pct` | head_stability | bp.contract.ts:51 | Unsupported |
| 6 | `glove_drift_outside_frame_in` | glove_control | bp.contract.ts:61 | Unsupported |
| 7 | `head_at_release_deg` | head_at_release | bp.contract.ts:71 | Unsupported |
| 8 | `shoulder_tilt_deg` | shoulder_tilt_release | bp.contract.ts:81 | Unsupported |
| 9 | `lift_thrust_deg` | lift_thrust | bp.contract.ts:91 | Unsupported |

### Baseball Hitting — `src/lib/reportCard/contracts/bh.contract.ts`

| # | Metric key | Tile | Defined at | Classification |
|---|---|---|---|---|
| 1 | `hip_stability_score_100` | hip_load | bh.contract.ts:13 | Unsupported |
| 2 | `hand_load_score_100` | hand_load | bh.contract.ts:24 | Unsupported |
| 3 | `p2_timing_pass` | p2_timing | bh.contract.ts:34 | Unsupported |
| 4 | `eyes_track_score_100` | eyes_tracking | bh.contract.ts:42 | Unsupported |
| 5 | `stride_dir_deg_off_square` | stride_direction | bh.contract.ts:53 | Unsupported |
| 6 | `heel_plant_score_100` | heel_plant | bh.contract.ts:63 | Unsupported |
| 7 | `p3_release_offset_ms` | p3_timing | bh.contract.ts:73 | Unsupported |
| 8 | `hands_outside_shoulders_at_landing_pass` | hands_outside_shoulders_at_landing | bh.contract.ts:83 | Unsupported |
| 9 | `sequencing_ok` | sequencing | bh.contract.ts:93 | Unsupported |
| 10 | `bat_path_score_100` | bat_path | bh.contract.ts:101 | Unsupported |
| 11 | `on_plane_pct` | on_plane | bh.contract.ts:111 | Unsupported |
| 12 | `time_to_contact_ms` | time_to_contact | bh.contract.ts:121 | Unsupported |
| 13 | `bat_speed_contact_mph` | bat_speed_contact | bh.contract.ts:131 | Unsupported |
| 14 | `connection_barrel_delivery_score_100` | back_elbow_contact | bh.contract.ts:141 | Unsupported |
| 15 | `hitters_move_score_100` | hitters_move | bh.contract.ts:151 | Unsupported |
| 16 | `shoulder_plane_steadiness_score_100` | shoulder_plane_steadiness | bh.contract.ts:161 | Unsupported |
| 17 | `finish_balance_score_100` | finish_balance | bh.contract.ts:171 | Unsupported |
| 18 | `shoulder_to_shoulder_hold_pct_to_contact` | shoulder_to_shoulder_hold | bh.contract.ts:181 | Unsupported |
| 19 | `shoulder_to_shoulder_hold_pass` | shoulder_to_shoulder_hold | bh.contract.ts:191 | Unsupported |
| 20 | `front_shoulder_leak_before_contact` | shoulder_to_shoulder_hold | bh.contract.ts:199 | Unsupported |
| 21 | `front_shoulder_leak_pct_of_window` | shoulder_to_shoulder_hold | bh.contract.ts:207 | Unsupported |

### Baseball Throwing — `src/lib/reportCard/contracts/throwing.contract.ts`

Throwing inherits BP minus `energy_angle_deg`, `tempo_sec`, `lift_thrust_deg` (throwing.contract.ts:5,10). All 6 inherited metrics: **Unsupported** (same lineage as BP).

### Softball aliases — `src/lib/reportCard/contracts/index.ts`

`sb-pitching` aliases BP; `sh` aliases BH. Classification mirrors aliased contract: **Unsupported** across all alias-inherited metrics.

**Totals (unique metric keys):** Truth Supported: **0**. Partially Supported: **0**. Unsupported: **36** (BP 9 + BH 21 + Throwing 6 unique). Softball alias metrics inherit identical classifications.

---

## §3 Truth Failure Classification

Every metric in §2 fails truth closure for the **same compound set** of conditions. The compound set is reported once below and applied uniformly because the lineage chain is identical for every metric (single AI producer, stub version triplet, no deterministic engine, no validation harness, no calibration corpus, no production-gate emission). Per-metric breakouts repeat the same classes; the table at the end of this section enumerates every metric with the full applicable class set for completeness.

### Compound failure conditions (applies to every metric in §2)

**F-1 — AI-Only Dependency.**
- Evidence: Every metric's `prompt` field (`bp.contract.ts:18-19, 28-29, 38-40, 48-49, 58-60, 68-69, 78-79, 88-89, 98-99`; `bh.contract.ts:19-20, 30-31, 38-39, 48-49, 59-60, 69-70, 79-80, 87-88, 97-98, 107-108, 117-118, 127-128, 137-138, 147-148, 157-158, 167-168, 177-178, 187-188, 195-196, 203-204, 213-214`) is consumed exclusively by the single multimodal AI call in `supabase/functions/analyze-video/index.ts` (~2256–2470), and writes to `videos.ai_analysis.metrics[key]`. No deterministic alternative produces the value.
- Canonical requirement impacted: `canonical-measurement-architecture.md` (deterministic Frames → Pose → Anchors → Detectors → Metric Engine chain).

**F-2 — Placeholder Dependency.**
- Evidence: `src/lib/biomech/versions.ts:24-26` pins `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`, `DETECTOR_VERSION = "events@0.0.0-stub"`, `METRIC_ENGINE_VERSION = "metrics@0.0.0-stub"`. Every metric's cache fingerprint per the `versions.ts:7-19` contract is therefore stub-anchored. No non-stub version is committed anywhere in `src/lib/biomech/**`.
- Canonical requirement impacted: `canonical-implementation-blueprint.md` (non-stub MVCS version triplet required).

**F-3 — Broken Lineage.**
- Evidence: Canonical chain (Pose → Anchors → Detectors → Metric Engine) is absent. `src/lib/biomech/**` contains only `versions.ts` (no `pose/`, `anchors/`, `detectors/`, `engine/`, or equivalent modules per `first-implementation-reality-audit.md §3-§4`). The contract → reader → tile chain in `src/lib/reportCard/**` is intact (per Phase 20 §3) but its upstream antecedents do not exist; the only producer is the AI call, which substitutes for the entire engine chain.
- Canonical requirement impacted: `canonical-measurement-architecture.md` (lineage continuity from frames through metric engine to display).

**F-4 — Missing Validation Evidence.**
- Evidence: No labeled-dataset validation harness exists for any metric. No fixtures, no per-metric error-rate reports, no agreement-vs-ground-truth artifacts present under `src/lib/reportCard/**`, `src/lib/biomech/**`, or `supabase/functions/analyze-video/**`. `canonical-validation-framework.md` requires per-metric validation evidence; none is produced or stored.
- Canonical requirement impacted: `canonical-validation-framework.md`.

**F-5 — Missing Calibration Evidence.**
- Evidence: No calibration corpus, reference rig, or known-truth comparison exists in repo. No per-metric calibration tables, scale factors, or bias offsets are committed. `canonical-calibration-architecture.md` requires per-metric calibration evidence; none is present.
- Canonical requirement impacted: `canonical-calibration-architecture.md`.

**F-6 — Missing Confidence Surface (calibrated).**
- Evidence: `contracts/shared.ts:30-41` defines `{value, confidence}`; `metricReaders.ts:13-21` propagates the `confidence` field; `ReportCardTile.tsx` renders a warn dot at `< 0.5` (per Phase 20 §5). However, `confidence` is the model's **self-reported** value emitted by the single AI call (`analyze-video/index.ts` per Phase 20 §5). No calibration of confidence against observed correctness exists (no reliability diagrams, no bin-wise calibration artifacts). `canonical-confidence-architecture.md` requires calibrated confidence; only an uncalibrated self-report is surfaced.
- Canonical requirement impacted: `canonical-confidence-architecture.md` (calibrated confidence, not raw self-report).

**F-7 — Missing Missingness Surface (deterministic).**
- Evidence: `contracts/shared.ts:30-41` defines `{missing: true, missing_reason}`; `metricReaders.ts:23-58` honors `missing` and `missingState()` propagates `missing_reason`. However, missingness is **declared by the model** in the same AI call; there is no deterministic anchor/detector check that would mark missingness when an antecedent (e.g. "pitcher knee lift in frame," "back shoulder visible at landing") is genuinely unavailable. `canonical-measurement-architecture.md` and `canonical-confidence-architecture.md` require missingness to be produced by deterministic anchor evaluation, not model self-declaration.
- Canonical requirement impacted: `canonical-measurement-architecture.md` (anchor-driven missingness).

**F-8 — Missing Production Gate Evidence.**
- Evidence: `canonical-production-gate-matrix.md` enumerates gates (determinism, replay equivalence, calibration, validation, confidence calibration, missingness fidelity). No gate currently emits evidence in code: no determinism check binds a non-stub `cache_fingerprint`; no replay harness asserts equivalence; no validation/calibration/confidence-calibration gate exists. `versions.ts:7-19` defines the fingerprint contract but the inputs (`LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION`) are stub-pinned, so even the gate-eligible fingerprint is constitutionally invalid.
- Canonical requirement impacted: `canonical-production-gate-matrix.md`.

**F-9 — Missing Evidence (root antecedent).**
- Evidence: There is no measurable evidence-producing system upstream of the AI call. No pose stream, no detector outputs, no anchor stream, no metric engine outputs are persisted, replayable, or version-pinned to non-stub values.
- Canonical requirement impacted: `canonical-measurement-architecture.md`, `canonical-gap-analysis.md`.

### Per-metric application

Failure classes F-1, F-2, F-3, F-4, F-5, F-6, F-7, F-8, F-9 apply uniformly to **all 36 unique metrics in §2** (and their softball aliases). No metric escapes any class. Repository evidence and canonical requirements impacted are as listed above; the contract-line citations in §2 identify the metric definitions; the producer citations are the single AI call.

---

## §4 Placeholder Dependency Audit

**Stub version pins** (`src/lib/biomech/versions.ts:24-26`) are inherited by every metric via the cache-fingerprint contract at `versions.ts:7-19`:

- `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`
- `DETECTOR_VERSION = "events@0.0.0-stub"`
- `METRIC_ENGINE_VERSION = "metrics@0.0.0-stub"`

**Metrics dependent on stub versions:** all 36 unique metric keys in §2 plus softball aliases. No metric is bound to a non-stub model/detector/engine version anywhere in the repository.

**Synthetic outputs / placeholder values:** the AI producer never emits hard-coded placeholders (per Phase 20 §4); however, every value it does emit is **AI-generated rather than evidence-derived**, which is classified under F-1/F-9 in §3 above and tracked separately in §5.

---

## §5 AI Dependency Audit

A metric value is "AI-dependent" if it cannot be reproduced without invoking the AI call in `supabase/functions/analyze-video/**`.

**AI-dependent metrics: all 36 unique metrics in §2** (and all softball aliases). The producing path is the single multimodal call (`analyze-video/index.ts` ~2256–2470). No deterministic alternative producer exists in:

- `src/lib/biomech/**` (only `versions.ts` present),
- `src/lib/reportCard/**` (readers only; no derivation beyond clamp / 0–10→0–100 back-compat per `metricReaders.ts:23-43`),
- `supabase/functions/**` outside the AI call.

Consumer hooks (`useReportCardTrend.ts`, `usePitchingV2Trends.ts`, `useHIESnapshot.ts`) re-read `videos.ai_analysis.metrics` written by the AI call; they do not produce metric values.

---

## §6 Evidence Gap Inventory (deduplicated)

1. No deterministic pose layer in `src/lib/biomech/**`.
2. No detector layer in `src/lib/biomech/**`.
3. No anchor layer in `src/lib/biomech/**`.
4. No metric engine in `src/lib/biomech/**`.
5. `LANDMARK_MODEL_VERSION` stub-pinned at `@0.0.0-stub` (`versions.ts:24`).
6. `DETECTOR_VERSION` stub-pinned at `@0.0.0-stub` (`versions.ts:25`).
7. `METRIC_ENGINE_VERSION` stub-pinned at `@0.0.0-stub` (`versions.ts:26`).
8. No labeled-dataset validation fixtures or harness for any metric.
9. No calibration corpus or reference-rig comparison for any metric.
10. Confidence field is model self-report, not calibrated against observed correctness.
11. Missingness is model self-declaration, not deterministic anchor evaluation.
12. No production-gate evidence emitted (determinism, replay equivalence, calibration, validation, confidence calibration, missingness fidelity).
13. Single AI producer substitutes for the entire canonical measurement chain (broken lineage from frames through metric engine).
14. No replay harness asserts bit-identical reconstruction of metric values from inputs at a pinned version triplet.

---

## §7 Metric Truth Blocker Matrix

| Blocker | Affected metrics |
|---|---|
| F-1 AI-Only Dependency | All 36 unique metrics (BP 9, BH 21, Throwing 6 unique) + softball aliases |
| F-2 Placeholder Dependency (stub versions) | All 36 unique metrics + softball aliases |
| F-3 Broken Lineage (no pose/detector/anchor/engine) | All 36 unique metrics + softball aliases |
| F-4 Missing Validation Evidence | All 36 unique metrics + softball aliases |
| F-5 Missing Calibration Evidence | All 36 unique metrics + softball aliases |
| F-6 Missing Confidence Surface (calibrated) | All 36 unique metrics + softball aliases |
| F-7 Missing Missingness Surface (deterministic) | All 36 unique metrics + softball aliases |
| F-8 Missing Production Gate Evidence | All 36 unique metrics + softball aliases |
| F-9 Missing Evidence (root antecedent) | All 36 unique metrics + softball aliases |

Every blocker affects every metric. No metric is blocked by a proper subset of the matrix; the failure set is uniform.

---

## §8 Report Card Truth Completion Percentage

Counts based on unique metric keys defined in `bp.contract.ts`, `bh.contract.ts`, and the non-inherited subset of `throwing.contract.ts`:

- BP: 9 unique metrics.
- BH: 21 metric fields (20 listed in Phase 20 §2 plus `front_shoulder_leak_pct_of_window` at bh.contract.ts:207, all distinct contract keys).
- Throwing: 6 inherited from BP minus 3 excluded (throwing.contract.ts:5), 0 unique-to-throwing.

**Total unique metric keys: 30** (BP 9 + BH 21).

| Status | Count | % of unique metrics |
|---|---|---|
| Truth Supported | 0 | 0% |
| Partially Supported | 0 | 0% |
| Unsupported | 30 | 100% |

Softball alias contracts (`sb-pitching` ≡ BP, `sh` ≡ BH per `contracts/index.ts:11-12`) inherit the same 0% supported / 100% unsupported distribution.

---

## §9 Final Determination

Per §§2–8 — **0 of 30 unique athlete-facing report-card metrics achieve Truth Supported status**, **0 achieve Partially Supported**, and **all 30 are Unsupported** under the uniform compound failure set F-1 through F-9.

**Determination: METRIC TRUTH NOT ACHIEVED.**
