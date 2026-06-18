# Execution Cycle 3 — MVCS Implementation Readiness Audit

Scope: reality-only repository audit of the MVCS identified in `execution-cycle-2-mvcs.md` (D-POSE + Finish Anchor + `finish_balance` Metric + H1 Determinism Harness). No architecture, doctrine, planning expansion, or implementation introduced.

---

## 1. MVCS Repository Asset Audit

### D-POSE (BlazePose landmark extractor)
- **Existing files / code paths / stubs:**
  - `src/lib/biomech/versions.ts` — `LANDMARK_MODEL_ID = "blazepose_full"`, `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`.
  - `supabase/functions/_shared/biomechFingerprint.ts` — Deno mirror of the same stub.
  - `src/lib/biomech/fingerprint.ts` — consumes `LANDMARK_MODEL_VERSION` in `buildCacheFingerprint`.
- **Existing adjacent dependencies (input plumbing only):**
  - `src/lib/frameExtraction.ts`, `src/lib/biomech/frameExtractionDeterministic.ts`, `src/lib/biomech/probeVideoMetadata.ts`, `src/lib/biomech/videoAcceptance.ts`.
- **Missing dependencies:** any pose-landmark extractor module, any 33-landmark stream emitter, any BlazePose runtime binding, any `landmarks.jsonl` producer, any non-stub `LANDMARK_MODEL_VERSION` value.

### Finish Anchor (`finish_frame`)
- **Existing files / code paths / stubs:**
  - `src/lib/biomech/versions.ts` — `DETECTOR_VERSION = "events@0.0.0-stub"`.
  - Downstream contract references only: `src/lib/reportCard/contracts/bh.contract.ts`, `src/lib/reportCard/disciplines/bh.ts`, `supabase/functions/_shared/reportCardContracts.ts`.
- **Existing dependencies:** none beyond the version pin and the downstream contract shape.
- **Missing dependencies:** Finish anchor extractor module, `finish_frame` frame-index emitter, anchor confidence emitter, anchor-event schema implementation.

### `finish_balance` Metric
- **Existing files / code paths / stubs:**
  - `src/lib/biomech/versions.ts` — `METRIC_ENGINE_VERSION = "metrics@0.0.0-stub"`.
  - Contract surface in `src/lib/reportCard/contracts/bh.contract.ts`, `src/lib/reportCard/disciplines/bh.ts`, `supabase/functions/_shared/reportCardContracts.ts`.
  - Methodology doc `.lovable/finish-and-balance-methodology.md`.
- **Existing dependencies:** none beyond the version pin, the contract surfaces, and the prose methodology doc.
- **Missing dependencies:** numeric metric engine, canonical missingness emitter, tile-confidence emitter, four-factor confidence-product implementation.

### H1 Determinism Harness
- **Existing files / code paths / stubs:**
  - `scripts/replay/verify-determinism.ts` — H1-shaped runner; today exercises only `buildCacheFingerprint` and `sha256OfCanonicalJson` over inline fixtures. Its own header explicitly states: "Once Phase 2–4 land, this script will additionally re-run the landmark→event→metric pipeline against a fixed landmarks.jsonl fixture and assert byte-identical events_sha256_hex / metrics_sha256_hex."
  - `src/lib/biomech/__tests__/fingerprint.test.ts`.
- **Missing dependencies:** canonical `landmarks.jsonl` fixture, canonical events fixture, canonical metrics fixture, pipeline runner wiring D-POSE → Finish → `finish_balance` outputs into the H1 byte-identity check.

---

## 2. Buildability Assessment

- **D-POSE — NOT BUILDABLE.** Only a version pin exists in `src/lib/biomech/versions.ts`; no extractor file is present anywhere under `src/lib/biomech/` or `supabase/functions/`.
- **Finish — NOT BUILDABLE.** Only `DETECTOR_VERSION` stub and downstream contract surfaces; no anchor extractor file exists.
- **`finish_balance` — NOT BUILDABLE.** Only `METRIC_ENGINE_VERSION` stub, contract surfaces, and a methodology doc; no metric engine file exists.
- **H1 — PARTIALLY BUILDABLE.** `scripts/replay/verify-determinism.ts` covers the fingerprint layer only; pipeline coverage required by MVCS is explicitly deferred by the script's own header and depends on the three NOT BUILDABLE components above.

---

## 3. Dependency Gap Analysis

Missing artifacts preventing MVCS implementation (no proposed solutions):

- D-POSE extractor module under `src/lib/biomech/` — no file exists.
- Non-stub value for `LANDMARK_MODEL_VERSION` in `src/lib/biomech/versions.ts` and its Deno mirror `supabase/functions/_shared/biomechFingerprint.ts`.
- Finish anchor extractor module under `src/lib/biomech/` — no file exists.
- Non-stub value for `DETECTOR_VERSION` in the same two files.
- `finish_balance` engine module under `src/lib/biomech/` — no file exists.
- Non-stub value for `METRIC_ENGINE_VERSION` in the same two files.
- Canonical fixture artifacts referenced by `scripts/replay/verify-determinism.ts` header (landmarks / events / metrics) — no fixture files present in repo.
- H1 pipeline wiring inside `scripts/replay/verify-determinism.ts` covering `events_sha256_hex` / `metrics_sha256_hex` — currently deferred per its own header comment.
- Constitutional binding between version-pin bumps and maturity gates (B-UPC, per `.lovable/execution-cycle-1-baseline.md`) — no Phase 1–15 artifact declares the first legal non-stub triplet.

---

## 4. Earliest Achievable Trust Class (existing validation framework only)

- **D-POSE** — Current: none (stub). Max with current assets: none — no extractor exists to evaluate against `canonical-validation-framework.md`.
- **Finish** — Current: none (stub). Max with current assets: none — no extractor exists to evaluate.
- **`finish_balance`** — Current: none (stub). Max with current assets: none — no engine exists to evaluate.
- **H1** — Current: passing for the fingerprint layer only (`buildCacheFingerprint`, canonical-JSON SHA-256). Max with current assets: fingerprint-layer determinism only; MVCS-chain H1 unreachable because the three upstream producers do not exist.

---

## 5. First Evidence Chain Feasibility

Can the repository produce **D-POSE → Finish → `finish_balance` → H1 proof** without introducing any new architecture?

**NO.**

Justification (repository evidence):
- Three of the four chain links have zero executable modules in the repository — only version stubs (`src/lib/biomech/versions.ts`, `supabase/functions/_shared/biomechFingerprint.ts`), downstream report-card contract surfaces (`src/lib/reportCard/contracts/bh.contract.ts`, `src/lib/reportCard/disciplines/bh.ts`, `supabase/functions/_shared/reportCardContracts.ts`), and one prose methodology doc (`.lovable/finish-and-balance-methodology.md`).
- `scripts/replay/verify-determinism.ts` cannot prove byte-identity over outputs that no module produces; the script's own header marks landmark / event / metric pipeline coverage as Phase 2–4 work not yet landed.
- B-UPC (per `.lovable/execution-cycle-1-baseline.md`) remains unresolved: no Phase 1–15 artifact binds version-pin bumps to maturity gates or declares the first legal non-stub triplet, so the chain cannot be replay-certified even if the modules existed.

---

## 6. Production Gate Movement Forecast (Phase 9 only)

If MVCS were implemented:

- **Gates that would move:**
  - D-POSE detector gate → ≥T2.
  - Finish anchor gate → ≥T2.
  - Metric #17 `finish_balance` gate → ≥T2.
  - Phase Percentages gate → partial (1/N) progress.
- **Gates that would remain blocked:**
  - Detectors D-HANDS, D-BAT, D-BALL, D-CONTACT, D-PLANT, D-RELEASE.
  - Anchors Launch, Heel Plant, Contact, Release.
  - Metrics #1–#16 and #18.
  - Discipline Score.
  - Full Report Card.

---

## 7. Closing Determination

**MVCS IMPLEMENTATION NOT READY.**

Repository evidence:
- Three of four MVCS components (D-POSE, Finish, `finish_balance`) have zero executable assets — only stub version pins in `src/lib/biomech/versions.ts` + `supabase/functions/_shared/biomechFingerprint.ts`, downstream contract surfaces in `src/lib/reportCard/`, and the prose doc `.lovable/finish-and-balance-methodology.md`.
- The H1 harness `scripts/replay/verify-determinism.ts` exists only at the fingerprint layer and explicitly defers pipeline coverage required by MVCS.
- B-UPC (per `.lovable/execution-cycle-1-baseline.md`) remains the dominant blocker: no Phase 1–15 artifact binds version-pin bumps to maturity gates or declares the first legal non-stub triplet, so even constructing the missing modules would not by itself satisfy the canonical evidence chain.

---

## Constraints Satisfied

No code. No implementation. No architecture. No doctrine. No new metrics. No new detectors. No new anchors. No new gates. No new requirements. Exactly one new file: `.lovable/execution-cycle-3-implementation-readiness.md`.
