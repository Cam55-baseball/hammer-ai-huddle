# Phase 47 — Measurement Engine Existence Audit

Evidence-only. No new implementation, no fixes, no architecture, no
recommendations. Citations are file:line or runtime-query results.

---

## §1 Release-1 Metric Inventory

Source: `src/lib/reportCard/release1.ts` (`RELEASE1_VISIBLE_METRICS`).

1. `tempo_sec`
2. `energy_angle_deg`
3. `lift_thrust_deg`
4. `premature_shoulder_open_deg`
5. `shoulder_tilt_deg`
6. `head_vertical_movement_pct`

All defined in `src/lib/reportCard/contracts/bp.contract.ts`.

---

## §2 Existence Audit

Y = present in repo; N = not present. Evidence after each row.

| Metric | Tile | Contract | Explanation | Detector | Anchor | Metric fn | Pipeline | Persistence | Report-card integration (deterministic source) |
|---|---|---|---|---|---|---|---|---|---|
| `tempo_sec` | Y | Y | Y (prompt in contract) | Y (`plantDetector`) | Y (`peakLegLift`, `frontFootStrike`) | Y (`metrics/tempoSec.ts`) | Y (`pipeline/tempoPipeline.ts`) | N | N |
| `energy_angle_deg` | Y | Y | Y (prompt in contract) | N | N | N | N | N | N |
| `lift_thrust_deg` | Y | Y | Y (prompt in contract) | N | N | N | N | N | N |
| `premature_shoulder_open_deg` | Y | Y | Y (prompt in contract) | N | N | N | N | N | N |
| `shoulder_tilt_deg` | Y | Y | Y (prompt in contract) | N | N | N | N | N | N |
| `head_vertical_movement_pct` | Y | Y | Y (prompt in contract) | N | N | N | N | N | N |

Evidence:

- **Tile / contract / explanation** for all six: `src/lib/reportCard/contracts/bp.contract.ts` (one entry per metric with `key`, `tileKey`, `label`, `prompt`).
- **Anchors** present: `src/lib/biomech/anchors/peakLegLift.ts`, `src/lib/biomech/anchors/frontFootStrike.ts`. No other files in `src/lib/biomech/anchors/`.
- **Detectors** present: `src/lib/biomech/detectors/plantDetector.ts`. Only file in directory.
- **Metric functions** present: `src/lib/biomech/metrics/tempoSec.ts`. Sibling files (`confidence.ts`, `missingness.ts`) are shared helpers, not metric engines.
- **Pipelines** present: `src/lib/biomech/pipeline/tempoPipeline.ts`. Only file in directory.
- **Persistence**: `rg 'from\("video_metric_runs"' src/` returns 0 matches. No client write site exists for `video_metric_runs` for any metric.
- **Report-card deterministic integration**: `src/lib/reportCard/disciplines/bp.ts:56–57` reads `tempo_sec` from `a` (= `ai_analysis` LLM blob) via `readNumber(a, "tempo_sec")`; same path for the other five. `src/lib/biomech/reportCard/tempoTileAdapter.ts` exists but is only referenced by its own test (`__tests__/tempoTileAdapter.test.ts`) — `rg tempoTileAdapter src/` returns no production consumer.
- **Cross-metric exclusion check**: `rg 'energy_angle|lift_thrust|premature_shoulder_open|shoulder_tilt|head_vertical_movement' src/lib/biomech/` returns one incidental hit in `anchors/peakLegLift.ts`. No engine, anchor, detector, pipeline, or evidence file for any of the five non-tempo metrics.

---

## §3 Production Path Audit

Path: `video → landmarks → anchors → detectors → metric calc → persistence → report card`.

| Metric | First break point | Evidence |
|---|---|---|
| `tempo_sec` | Between **metric calc** and **persistence** | `AnalyzeVideo.tsx:411` runs `runTempoPipeline`; result lives in memory only. `AnalyzeVideo.tsx:513–546` writes a `video_landmark_runs` row with `tempo_sec` smuggled inside `diagnostics`, but never writes to `video_metric_runs`. Report card consumes `ai_analysis.metrics.tempo_sec` (LLM), not the deterministic value — `bp.ts:56`. |
| `energy_angle_deg` | At **metric calc** | No metric function in `src/lib/biomech/metrics/`. Upstream landmarks/anchors absent. |
| `lift_thrust_deg` | At **metric calc** | Same. |
| `premature_shoulder_open_deg` | At **metric calc** | Same. |
| `shoulder_tilt_deg` | At **metric calc** | Same. |
| `head_vertical_movement_pct` | At **metric calc** | Same. |

For the five non-tempo metrics every downstream stage (persistence, report-card binding) is also absent; the earliest break is recorded.

---

## §4 Runtime Invocation Audit

Question: is the engine executed on uploaded videos?

| Metric | Call sites in `src/` | Executed on upload? |
|---|---|---|
| `tempo_sec` | `src/pages/AnalyzeVideo.tsx:32` (import), `:336` (typed handle), `:411` (call) | **Yes** — invoked when `analysisEnabled` is true and frame extraction succeeds (`AnalyzeVideo.tsx:338`, `:394–423`). |
| `energy_angle_deg` | 0 | No |
| `lift_thrust_deg` | 0 | No |
| `premature_shoulder_open_deg` | 0 | No |
| `shoulder_tilt_deg` | 0 | No |
| `head_vertical_movement_pct` | 0 | No |

Search command: `rg -l "runTempoPipeline|computeTempoSec|tempoPipeline" src/` → 13 hits, all under `src/lib/biomech/**` or `src/pages/AnalyzeVideo.tsx`. Equivalent searches for the other five metrics return only the contract file `bp.contract.ts` and `release1.ts`.

---

## §5 Persistence Audit

Question: are deterministic outputs written to database tables?

Runtime (queries from Phase 46, still authoritative):

- `video_landmark_runs` = **0** rows
- `video_event_runs` = **0** rows
- `video_metric_runs` = **0** rows

Client write sites (`rg 'from\("video_metric_runs"|from\(.video_event_runs.|from\(.video_landmark_runs.' src/`):

- `video_metric_runs`: **0 inserts** anywhere in `src/`.
- `video_event_runs`: 0 inserts.
- `video_landmark_runs`: 1 insert site — `src/pages/AnalyzeVideo.tsx:516`. This insert is guarded by `if (poseRun && tempoRun)` (`:513`) and has produced 0 rows in production, indicating the guard is never satisfied for completed analyses (likely because the pose model is stubbed or pose inference fails before the insert; the table is empty).

For `tempo_sec`, the value is written into `video_landmark_runs.diagnostics.tempo_sec` (lines 531–534) — not its canonical `video_metric_runs` table. Even that smuggled path has produced zero rows.

Report card persistence path: report card reads `ai_analysis` (LLM JSON on `videos`). It does not query `video_metric_runs` or `video_landmark_runs`. Confirmed by `rg 'video_metric_runs|video_landmark_runs' src/lib/reportCard/ src/components/report-card/` → 0 matches.

---

## §6 Missing Implementation Inventory

Per metric, components absent from the repo:

- **`tempo_sec`**:
  - Persistence write to `public.video_metric_runs` (no insert site exists).
  - Report-card binding from `video_metric_runs` (current binding reads LLM `ai_analysis`).
  - Labeled validation corpus (`tempoHarness` returns `no_corpus`; threshold is 30 pairs).
  - Live (non-stub) pose dependency producing non-empty `video_landmark_runs`.

- **`energy_angle_deg`** — missing: anchor(s), detector(s), metric function, pipeline, evidence artifact, replay harness, validation harness, persistence, deterministic report-card binding.

- **`lift_thrust_deg`** — same as `energy_angle_deg`.

- **`premature_shoulder_open_deg`** — same as `energy_angle_deg`.

- **`shoulder_tilt_deg`** — same as `energy_angle_deg`.

- **`head_vertical_movement_pct`** — same as `energy_angle_deg`.

---

## §7 Wiring Inventory

"Exists but disconnected?"

| Metric | Implementation exists | Disconnected? |
|---|---|---|
| `tempo_sec` | Yes (engine + anchors + detector + pipeline + replay + validation + tile adapter) | **Yes** — pipeline runs in `AnalyzeVideo.tsx` but (a) result is not written to `video_metric_runs`, (b) `tempoTileAdapter` has no production consumer, (c) report-card binding still reads LLM `ai_analysis`. |
| `energy_angle_deg` | No | n/a (nothing to disconnect) |
| `lift_thrust_deg` | No | n/a |
| `premature_shoulder_open_deg` | No | n/a |
| `shoulder_tilt_deg` | No | n/a |
| `head_vertical_movement_pct` | No | n/a |

---

## §8 Readiness Classification

| Metric | Classification |
|---|---|
| `tempo_sec` | **IMPLEMENTED_NOT_WIRED** |
| `energy_angle_deg` | **NOT_IMPLEMENTED** |
| `lift_thrust_deg` | **NOT_IMPLEMENTED** |
| `premature_shoulder_open_deg` | **NOT_IMPLEMENTED** |
| `shoulder_tilt_deg` | **NOT_IMPLEMENTED** |
| `head_vertical_movement_pct` | **NOT_IMPLEMENTED** |

No metric qualifies as `FULLY IMPLEMENTED` or `PARTIALLY_IMPLEMENTED` under this evidence.

---

## §9 Earliest Shippable Metric

**`tempo_sec`** is the only candidate. Evidence:

- Anchors present (`peakLegLift.ts`, `frontFootStrike.ts`).
- Detector present (`plantDetector.ts`).
- Metric engine present (`metrics/tempoSec.ts`).
- Pipeline present (`pipeline/tempoPipeline.ts`).
- Evidence artifact present (`evidence/tempoEvidence.ts`).
- Replay-equivalence harness present (`replay/tempoReplay.ts`).
- Validation harness present (`validation/tempoHarness.ts`).
- Tile adapter present (`reportCard/tempoTileAdapter.ts`).
- Invoked on upload (`AnalyzeVideo.tsx:411`).

Remaining gaps (already enumerated, not a recommendation): persistence to `video_metric_runs`, report-card binding swap from LLM to deterministic source, ≥30-pair labeled corpus to lift `tempoHarness` from `no_corpus`, and a non-stub pose dependency producing rows.

The other five metrics have no implementation to ship.

---

## §10 Final Determination

**Which Release-1 metrics actually exist as measurement engines today?**

Exactly one: **`tempo_sec`**.

The remaining five (`energy_angle_deg`, `lift_thrust_deg`,
`premature_shoulder_open_deg`, `shoulder_tilt_deg`, `head_vertical_movement_pct`)
exist only as tile contracts and LLM prompts. No anchor, detector, metric
function, pipeline, evidence artifact, replay harness, validation harness,
or persistence path exists for any of them in the current repo.
