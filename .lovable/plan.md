## Execution Cycle 4 — MVCS Implementation Package

Create exactly one new file: `.lovable/execution-cycle-4-mvcs-implementation-package.md`. No code, no repository modifications, documentation only. Derived strictly from Phases 1–15, Execution Cycles 1–3, and existing repository conventions.

### File outline

**1. MVCS Component Inventory** — per component (D-POSE, Finish, `finish_balance`, H1):
- Existing repository assets (cite exact paths: `src/lib/biomech/versions.ts`, `supabase/functions/_shared/biomechFingerprint.ts`, `src/lib/biomech/fingerprint.ts`, `src/lib/reportCard/contracts/bh.contract.ts`, `src/lib/reportCard/disciplines/bh.ts`, `supabase/functions/_shared/reportCardContracts.ts`, `.lovable/finish-and-balance-methodology.md`, `scripts/replay/verify-determinism.ts`, `src/lib/biomech/probeVideoMetadata.ts`, `src/lib/biomech/frameExtractionDeterministic.ts`, `src/lib/biomech/__tests__/fingerprint.test.ts`).
- Missing repository assets (extractor modules, emitters, fixtures, pipeline harness wiring).
- Canonical requirements satisfied vs unsatisfied (cite Phase 10–15 §refs: `arch §2`, `arch §17`, `arch §Confidence model`, `gate Part 1/2`, `val §1.3`, `val §6.1`, `cal §4/§5/§6`, `conf §1.3`, `reality §4 #17`).

**2. Implementation Specification** — per component, list only:
- Required inputs (side-on rear-camera capture ≥30 fps T-low; D-POSE 33-landmark stream for Finish; D-POSE+Finish for `finish_balance`; canonical landmarks/events/metrics fixtures for H1).
- Required outputs (33-landmark stream; `finish_frame` index + confidence ≥0.6; `finish_balance` numeric value + canonical missingness + tile confidence; byte-identical hash triplet).
- Required persistence artifacts (per existing fingerprint contract in `src/lib/biomech/fingerprint.ts` and its Deno mirror — no new artifacts).
- Required confidence artifacts (four-factor product per `arch §Confidence model`, monotonic non-increasing per `conf §1.3`).
- Required missingness artifacts (canonical missingness per `reality §4 #17`, Partial-AI-only).
- Required fingerprint bindings (simultaneous transition of `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION` off `@0.0.0-stub` via the existing fingerprint concatenation contract — gated by unresolved B-UPC).

**3. Repository Placement Map** — derived only from existing conventions:
- Extractor placement under `src/lib/biomech/` (mirrors `versions.ts`, `fingerprint.ts`, `probeVideoMetadata.ts`, `frameExtractionDeterministic.ts`).
- Edge mirrors under `supabase/functions/_shared/` (mirrors `biomechFingerprint.ts`, `reportCardContracts.ts`).
- Metric surface alignment with `src/lib/reportCard/disciplines/bh.ts` + `contracts/bh.contract.ts`.
- H1 harness extension under `scripts/replay/` (mirrors `verify-determinism.ts`).
- Fixtures under existing test conventions (mirrors `src/lib/biomech/__tests__/`).
- No new directories, no new interfaces.

**4. Verification Package** — citing existing requirements only:
- Verification evidence: cache-fingerprint contract coverage in `src/lib/biomech/__tests__/fingerprint.test.ts`.
- Determinism evidence: H1 byte-identical reruns over canonical fixture covering D-POSE→Finish→`finish_balance` per `val §1.3` / `val §6.1`.
- Replay evidence: identical landmarks/events/metrics hashes across N runs (current `verify-determinism.ts` header explicitly defers this to Phase 2–4).
- Calibration evidence: `cal §4` D-POSE residual envelope; `cal §5` Finish frame-index residual envelope; `cal §6` `finish_balance` scale-free certificate.
- Confidence evidence: four-factor product per `arch §Confidence model`; monotonic non-increasing per `conf §1.3`; Partial-AI confidence ceiling per `reality §4 #17`.

**5. Gate Advancement Analysis** — Phase 9 only:
- Movable: D-POSE ≥T2, Finish ≥T2, #17 `finish_balance` ≥T2, Phase Percentages (1/N).
- Reachable trust classes: Partial-AI only for `finish_balance` per `reality §4 #17`; T2 for D-POSE/Finish.
- Issuable artifacts: first non-stub cache fingerprint triplet; first H1 pipeline determinism certificate; first calibration certificates for D-POSE/Finish/`finish_balance`; first four-factor confidence evaluation.
- Remaining blocked: all gates dependent on additional anchors/metrics/detectors and on B-UPC resolution.

**6. Implementation Readiness Determination**:
- **IMPLEMENTATION PACKAGE INCOMPLETE.**
- Justification: package can be fully specified from existing canonical requirements and repository conventions, but two prerequisites prevent it from being a complete, executable implementation package:
  (a) **B-UPC unresolved** (per `.lovable/execution-cycle-1-baseline.md`) — no Phase 1–15 artifact binds version-pin bumps to maturity gates or declares the first legal non-stub triplet, so the fingerprint binding step in §2 has no governing rule.
  (b) **No canonical fixture corpus exists** for landmarks/events/metrics — H1 pipeline coverage is explicitly deferred in `scripts/replay/verify-determinism.ts`, and `val §1.3`/`§6.1` cannot be satisfied without it.
- All other package elements (inventory, spec, placement, verification, gate forecast) are fully derivable from existing repository assets and canonical requirements without introducing new architecture, doctrine, metrics, detectors, anchors, gates, or requirements.

### Constraints honored
No code. No implementation. No architecture. No doctrine. No new metrics/detectors/anchors/gates/requirements. Exactly one new file.
