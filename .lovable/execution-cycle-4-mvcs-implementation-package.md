# Execution Cycle 4 — MVCS Implementation Package

**Scope.** Implementation-package definition only. No code. No repository modifications outside this file. No new architecture, doctrine, metrics, detectors, anchors, gates, or requirements. Derived strictly from Phases 1–15, Execution Cycles 1–3, and existing repository conventions.

**MVCS (per `.lovable/execution-cycle-2-mvcs.md`).**
1. D-POSE (landmark model)
2. Finish anchor (`finish_frame`)
3. `finish_balance` metric (`arch §17`)
4. H1 Determinism Harness

---

## 1. MVCS Component Inventory

### 1.1 D-POSE

**Existing repository assets**
- `src/lib/biomech/versions.ts` — `LANDMARK_MODEL_ID = "blazepose_full"`, `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`.
- `supabase/functions/_shared/biomechFingerprint.ts` — Deno mirror of the same pin.
- `src/lib/biomech/fingerprint.ts` — consumes `LANDMARK_MODEL_VERSION` in the canonical cache-fingerprint concatenation.
- `src/lib/biomech/probeVideoMetadata.ts` — deterministic upstream input (video sha256, true FPS, dimensions, orientation).
- `src/lib/biomech/frameExtractionDeterministic.ts` — deterministic frame source.

**Missing repository assets**
- D-POSE extractor module (no `blazepose_full`-bound landmark inference exists).
- 33-landmark stream emitter (per-frame landmarks payload).
- Per-landmark visibility/confidence emitter feeding `arch §Confidence model`.
- Canonical landmarks fixture (`landmarks.jsonl`) for replay.
- Non-stub `LANDMARK_MODEL_VERSION` value.

**Canonical requirements satisfied**
- `arch §2` version-pin participation in fingerprint contract.
- `val §6.1` fingerprint determinism at the version-pin layer.

**Canonical requirements unsatisfied**
- `cal §4` D-POSE residual-envelope calibration (no extractor outputs to calibrate).
- `conf §1.3` monotonic non-increasing confidence propagation (no per-landmark confidence stream).
- `gate Part 1` D-POSE ≥T2 (no measurement artifact).

---

### 1.2 Finish anchor (`finish_frame`)

**Existing repository assets**
- `src/lib/biomech/versions.ts` — `DETECTOR_VERSION = "events@0.0.0-stub"`.
- `supabase/functions/_shared/biomechFingerprint.ts` — Deno mirror.
- `src/lib/biomech/fingerprint.ts` — consumes `DETECTOR_VERSION` in concatenation.
- `.lovable/finish-and-balance-methodology.md` — prose methodology.

**Missing repository assets**
- Anchor extractor (no `finish_frame` detector).
- Frame-index + confidence emitter (≥0.6 floor per `gate Part 2`).
- Canonical events fixture covering Finish.
- Non-stub `DETECTOR_VERSION` value.

**Canonical requirements satisfied**
- `arch §2` version-pin participation in fingerprint contract.
- `val §6.1` fingerprint determinism at the version-pin layer.

**Canonical requirements unsatisfied**
- `cal §5` Finish frame-index residual-envelope calibration.
- `conf §1.3` confidence inheritance from D-POSE ≥T2.
- `gate Part 2` Finish ≥T2.

---

### 1.3 `finish_balance` (`arch §17`)

**Existing repository assets**
- `src/lib/biomech/versions.ts` — `METRIC_ENGINE_VERSION = "metrics@0.0.0-stub"`.
- `supabase/functions/_shared/biomechFingerprint.ts` — Deno mirror.
- `src/lib/biomech/fingerprint.ts` — consumes `METRIC_ENGINE_VERSION` in concatenation.
- `src/lib/reportCard/contracts/bh.contract.ts` — contract surface.
- `src/lib/reportCard/disciplines/bh.ts` — discipline surface.
- `supabase/functions/_shared/reportCardContracts.ts` — edge mirror.
- `.lovable/finish-and-balance-methodology.md` — prose methodology.

**Missing repository assets**
- Metric engine producing `finish_balance` numeric value.
- Canonical missingness emitter (`reality §4 #17`, Partial-AI-only).
- Tile-confidence emitter feeding `arch §Confidence model`.
- Four-factor confidence-product wiring (D-POSE quality × Finish anchor confidence × scale-free metric stability × tile confidence).
- Canonical metrics fixture covering `finish_balance`.
- Non-stub `METRIC_ENGINE_VERSION` value.

**Canonical requirements satisfied**
- `arch §17` metric declared, scale-free, no T-high, no pixel-to-inch.
- `reality §4 #17` Partial-AI-only constraint declared at contract surface.
- `arch §2` version-pin participation in fingerprint contract.

**Canonical requirements unsatisfied**
- `cal §6 finish_balance` scale-free calibration certificate.
- `arch §Confidence model` four-factor product evaluation.
- `conf §1.3` monotonic non-increasing propagation through full chain.
- `gate Part 1` #17 ≥T2.

---

### 1.4 H1 Determinism Harness

**Existing repository assets**
- `scripts/replay/verify-determinism.ts` — H1-shaped runner covering `buildCacheFingerprint` + `sha256OfCanonicalJson` over inline fixtures.
- `src/lib/biomech/fingerprint.ts` — canonical fingerprint + canonical-JSON hashing.
- `src/lib/biomech/__tests__/fingerprint.test.ts` — test-time coverage of fingerprint contract.

**Missing repository assets**
- Canonical landmarks/events/metrics fixture corpus.
- Pipeline wiring from fixture → D-POSE → Finish → `finish_balance` → byte-identical triplet hashes (explicitly deferred in the script's own header to Phase 2–4).
- N-run pipeline determinism certificate output.

**Canonical requirements satisfied**
- `val §6.1` byte-identical fingerprint reruns at the fingerprint layer.

**Canonical requirements unsatisfied**
- `val §1.3` H1 byte-identical reruns across the full landmark→event→metric chain.
- `val §6.1` pipeline-layer determinism certification.

---

## 2. Implementation Specification

Per component, using existing canonical requirements only.

### 2.1 D-POSE
- **Required inputs.** Side-on rear-camera capture at T-low ≥30 fps; deterministic frames via `frameExtractionDeterministic.ts`; video sha256 + true FPS + orientation via `probeVideoMetadata.ts`.
- **Required outputs.** 33-landmark per-frame stream with per-landmark visibility/confidence at pinned `LANDMARK_MODEL_VERSION`.
- **Required persistence artifacts.** Canonical landmarks payload hashable via `sha256OfCanonicalJson` (existing contract). No new artifact types.
- **Required confidence artifacts.** Per-landmark confidence channel consumable by `arch §Confidence model` factor 1.
- **Required missingness artifacts.** None at the landmark layer beyond per-landmark visibility (no new missingness type introduced).
- **Required fingerprint bindings.** Transition `LANDMARK_MODEL_VERSION` off `@0.0.0-stub` simultaneously with the other two pins via the existing concatenation in `fingerprint.ts` and its Deno mirror.

### 2.2 Finish
- **Required inputs.** D-POSE 33-landmark stream at ≥T2.
- **Required outputs.** `{ finish_frame: { frame_index, confidence ≥ 0.6 } }` at pinned `DETECTOR_VERSION`.
- **Required persistence artifacts.** Canonical events payload hashable via `sha256OfCanonicalJson`.
- **Required confidence artifacts.** Anchor confidence feeding `arch §Confidence model` factor 2; inherits monotonic non-increasing bound from D-POSE per `conf §1.3`.
- **Required missingness artifacts.** Anchor-undetected case via existing canonical-JSON `null` handling (no new field).
- **Required fingerprint bindings.** Transition `DETECTOR_VERSION` off `@0.0.0-stub` jointly with the triplet.

### 2.3 `finish_balance`
- **Required inputs.** D-POSE ≥T2 stream and Finish `finish_frame` ≥0.6.
- **Required outputs.** Numeric `finish_balance` value, scale-free, Partial-AI-only, with canonical missingness and tile confidence at pinned `METRIC_ENGINE_VERSION`.
- **Required persistence artifacts.** Canonical metrics payload hashable via `sha256OfCanonicalJson`; surfaced through existing `bh.contract.ts` / `bh.ts` / `reportCardContracts.ts` shapes — no new contract.
- **Required confidence artifacts.** Four-factor product per `arch §Confidence model` (D-POSE × Finish × metric stability × tile), monotonic non-increasing per `conf §1.3`, ceiling-bound to Partial-AI per `reality §4 #17`.
- **Required missingness artifacts.** Canonical missingness per `reality §4 #17`, emitted whenever any antecedent fails its T2 / ≥0.6 floor.
- **Required fingerprint bindings.** Transition `METRIC_ENGINE_VERSION` off `@0.0.0-stub` jointly with the triplet.

### 2.4 H1
- **Required inputs.** Canonical fixture corpus (landmarks.jsonl + expected events + expected metrics) covering exactly the D-POSE → Finish → `finish_balance` chain.
- **Required outputs.** N-run byte-identical hash set for landmarks, events, and metrics layers, mirroring the existing `Set<string>.size === 1` pattern in `verify-determinism.ts`.
- **Required persistence artifacts.** None beyond the fixture corpus and the existing harness output channel.
- **Required confidence artifacts.** None at the harness layer (H1 is determinism, not confidence).
- **Required missingness artifacts.** None at the harness layer.
- **Required fingerprint bindings.** Validates the triplet binding produced by §2.1–§2.3 under the existing `buildCacheFingerprint` contract.

---

## 3. Repository Placement Map

Using existing repository conventions only; no new directories, no new interface types.

- **D-POSE extractor.** `src/lib/biomech/` (mirrors `versions.ts`, `fingerprint.ts`, `probeVideoMetadata.ts`, `frameExtractionDeterministic.ts`). Edge-side parity under `supabase/functions/_shared/` mirrors `biomechFingerprint.ts`.
- **Finish extractor.** `src/lib/biomech/` (same convention). Edge parity under `supabase/functions/_shared/`.
- **`finish_balance` engine.** `src/lib/biomech/` for the deterministic engine; surfaced via the existing report-card seam at `src/lib/reportCard/contracts/bh.contract.ts` and `src/lib/reportCard/disciplines/bh.ts`. Edge parity via `supabase/functions/_shared/reportCardContracts.ts`. No new contract surface introduced.
- **H1 pipeline harness.** Extend `scripts/replay/verify-determinism.ts` per its own deferral comment (no new script file required), or add a sibling under `scripts/replay/` following the same import shape from `src/lib/biomech/fingerprint.ts`.
- **Fixtures.** `src/lib/biomech/__tests__/` per the existing `fingerprint.test.ts` convention.
- **Version pins.** `src/lib/biomech/versions.ts` + `supabase/functions/_shared/biomechFingerprint.ts` (the only two locations participating in the canonical fingerprint).

**Expected interfaces.** Reuse `CacheFingerprintInputs`, `sha256OfCanonicalJson`, and `sha256Hex` from `src/lib/biomech/fingerprint.ts` (and Deno mirror). No new interfaces.

**Expected dependencies.** D-POSE consumes `probeVideoMetadata.ts` + `frameExtractionDeterministic.ts`. Finish consumes D-POSE output. `finish_balance` consumes D-POSE + Finish. H1 consumes all three plus the fingerprint module.

---

## 4. Verification Package

Citing existing canonical requirements only.

- **Verification evidence.** Cache-fingerprint contract coverage extends from `src/lib/biomech/__tests__/fingerprint.test.ts` to include the triplet-bump invariant (identical inputs at non-stub pins → identical hex; any single pin change → distinct hex).
- **Determinism evidence.** H1 byte-identical reruns over the canonical fixture covering D-POSE → Finish → `finish_balance` per `val §1.3` and `val §6.1`, mirroring the existing `Set<string>.size === 1` assertion pattern.
- **Replay evidence.** Identical `landmarks_sha256_hex`, `events_sha256_hex`, `metrics_sha256_hex` across N runs (the exact deferred contract called out in the header of `scripts/replay/verify-determinism.ts`).
- **Calibration evidence.**
  - `cal §4` — D-POSE residual envelope certificate.
  - `cal §5` — Finish frame-index residual envelope certificate.
  - `cal §6 finish_balance` — scale-free certificate.
- **Confidence evidence.**
  - `arch §Confidence model` — four-factor product evaluated and emitted.
  - `conf §1.3` — monotonic non-increasing propagation from D-POSE → Finish → `finish_balance`.
  - `reality §4 #17` — Partial-AI ceiling enforced on `finish_balance`.

---

## 5. Gate Advancement Analysis

Phase 9 only.

**Gates that move after MVCS implementation.**
- D-POSE ≥T2.
- Finish ≥T2.
- #17 `finish_balance` ≥T2 (Partial-AI ceiling).
- Phase Percentages (1/N progress).

**Trust classes reachable.**
- D-POSE: T2.
- Finish: T2.
- `finish_balance`: Partial-AI only, per `reality §4 #17`.

**Canonical artifacts issuable.**
- First non-stub `(LANDMARK_MODEL_VERSION, DETECTOR_VERSION, METRIC_ENGINE_VERSION)` triplet through the existing `buildCacheFingerprint` contract.
- First H1 pipeline determinism certificate covering the landmarks/events/metrics hash triplet.
- First calibration certificates: D-POSE residual envelope, Finish frame-index residual envelope, `finish_balance` scale-free certificate.
- First four-factor confidence evaluation per `arch §Confidence model`.

**Gates that remain blocked.**
- Every gate depending on detectors/anchors/metrics outside the MVCS.
- Every gate downstream of B-UPC (per `.lovable/execution-cycle-1-baseline.md`) until the version-pin↔maturity binding rule exists.

---

## 6. Implementation Readiness Determination

**IMPLEMENTATION PACKAGE INCOMPLETE.**

Justification, by repository evidence and canonical requirements:

1. **B-UPC unresolved.** Per `.lovable/execution-cycle-1-baseline.md`, no Phase 1–15 artifact binds version-pin bumps to maturity gates or declares the first legal non-stub triplet. The fingerprint binding step required in §2.1 / §2.2 / §2.3 (simultaneous transition of all three pins in `src/lib/biomech/versions.ts` and `supabase/functions/_shared/biomechFingerprint.ts`) therefore has no governing rule, and any package executing it would have to invent one — explicitly forbidden by the constraint set.
2. **No canonical fixture corpus exists.** The header of `scripts/replay/verify-determinism.ts` explicitly defers landmark→event→metric pipeline coverage to Phase 2–4. Without that fixture corpus, `val §1.3` and the pipeline portion of `val §6.1` cannot be satisfied, and H1 cannot emit the determinism certificate identified in §5.

All other package elements (§1 inventory, §2 specification, §3 placement, §4 verification, §5 gate forecast) are fully derivable from existing repository assets — `src/lib/biomech/versions.ts`, `supabase/functions/_shared/biomechFingerprint.ts`, `src/lib/biomech/fingerprint.ts`, `src/lib/biomech/probeVideoMetadata.ts`, `src/lib/biomech/frameExtractionDeterministic.ts`, `src/lib/biomech/__tests__/fingerprint.test.ts`, `src/lib/reportCard/contracts/bh.contract.ts`, `src/lib/reportCard/disciplines/bh.ts`, `supabase/functions/_shared/reportCardContracts.ts`, `.lovable/finish-and-balance-methodology.md`, `scripts/replay/verify-determinism.ts` — and from existing canonical references (`arch §2`, `arch §17`, `arch §Confidence model`, `gate Part 1/2`, `val §1.3`, `val §6.1`, `cal §4/§5/§6`, `conf §1.3`, `reality §4 #17`) without introducing new architecture, doctrine, metrics, detectors, anchors, gates, or requirements.

The package is **specification-complete** but **execution-incomplete** until B-UPC is resolved and a canonical fixture corpus is admitted.
