## Deliverable

Create exactly one file:

- `.lovable/execution-cycle-2-mvcs.md`

No other files created, modified, or deleted. No code, architecture, doctrine, metrics, detectors, anchors, gates, or requirements introduced. Reality-only synthesis of Phases 10–15 + Execution Cycle 1.

---

## Document Outline (sections, all citation-only)

### 1. Canonical Dependency Analysis

For each canonical surface, identify the entry with the smallest upstream dependency set using `canonical-build-plan.md §2–§4`, `canonical-production-gate-matrix.md Part 1–Part 3`, and `canonical-validation-framework.md §2–§5`.

- **Detector with fewest upstream dependencies → D-POSE.**
  Evidence: `build-plan §2 D-POSE` lists no upstream detector dependency; every other detector (D-HANDS, D-BAT, D-BALL, D-CONTACT, D-PLANT, D-RELEASE) inherits the same pose substrate per `arch §Canonical detector stack`. D-POSE is the only detector whose `gate Part 1` row has zero detector prerequisites.
- **Anchor with fewest upstream dependencies → Finish (`finish_frame`).**
  Evidence: `gate Part 2 Finish` requires only `D-POSE ≥T2`; Launch requires D-POSE + D-BAT, Heel Plant requires D-POSE + D-PLANT, Contact requires D-POSE + D-BAT + D-CONTACT, Release requires D-RELEASE (+ D-POSE). Finish is the unique single-detector anchor.
- **Metric with fewest upstream dependencies → `finish_balance` (`arch §17`).**
  Evidence: `build-plan §4 #17` lists only D-POSE + Finish anchor; scale-free per `cal §6 finish_balance`; no D-BAT, no D-CONTACT, no D-RELEASE, no T-high frame density, no pixel-to-inch certificate. (Note: `hip_load` requires D-POSE only but binds no event anchor; selecting `finish_balance` produces a closed detector → anchor → metric evidence chain, which is required by `val §1.2 Deterministic-first` and `gate §Evidence-first release law`.)
- **Harness with fewest upstream dependencies → H1 Determinism Harness (`bp §H1` / `val §6.1`).**
  Evidence: H1 requires only a canonical fixture and deterministic pipeline; it does not require a labeled corpus (H2), confidence calibration curve (H3), missingness audit (H4), or replay-equivalence proof spanning multiple modules (H5). H1 is the precondition for every higher harness per `val §1.3` (no class skipping).

### 2. Minimum Viable Canonical Slice (MVCS)

Selection, justified solely by repository evidence:

| Slot | Selection | Justification source |
|---|---|---|
| Detector | **D-POSE** | `build-plan §2`, `gate Part 1 D-POSE` |
| Anchor | **Finish** (`finish_frame`) | `gate Part 2 Finish` (D-POSE-only) |
| Metric | **`finish_balance`** (`arch §17`) | `build-plan §4 #17` (D-POSE + Finish only, scale-free) |
| Harness | **H1 Determinism Harness** | `val §6.1`, `bp §H1` (no upstream harness) |

This is the only quadruple in the repository where every slot's dependency set is the strict minimum among its peers AND the slots form a closed detector → anchor → metric → harness chain.

### 3. Dependency Closure Map

Enumerated strictly from existing artifacts:

- **Required modules:** `src/lib/biomech/versions.ts` (version pins per `audit S3`); D-POSE extractor module per `bp §B1`; Finish anchor extractor per `bp §B`; `finish_balance` engine per `bp §C`; `scripts/replay/verify-determinism.ts` (existing H1-shaped harness).
- **Required inputs:** side-on rear-camera capture at T-low ≥30 fps per `arch §Canonical capture envelope` (no T-high requirement); video bytes + true FPS + landing-time + direction-sign + calibration-h-px feeding `buildCacheFingerprint` per `src/lib/biomech/fingerprint.ts`.
- **Required outputs:** D-POSE per-frame 33-landmark stream with per-landmark visibility (`val §2 D-POSE T1/T2`); Finish frame index + confidence (`arch §Event anchors finish_frame`, min conf 0.6); `finish_balance` numeric value + canonical missingness + tile confidence per `arch §17` and `arch §Confidence model`.
- **Required version bindings:** `LANDMARK_MODEL_VERSION` non-stub per `val §1.4`; `DETECTOR_VERSION` non-stub (Finish anchor extractor); `METRIC_ENGINE_VERSION` non-stub (`finish_balance` engine). All three currently `@0.0.0-stub` per Execution Cycle 1 Blocker #1 (B-UPC).
- **Required verification evidence:** H1 byte-identical reruns over canonical fixture per `val §6.1` and existing `scripts/replay/verify-determinism.ts`; covers D-POSE landmark stream, Finish frame index, `finish_balance` numeric value.
- **Required calibration bindings:** scale-free metric → no pixel-to-inch certificate required (`cal §6 finish_balance`); residual-envelope certificates per `cal §4 D-POSE`, `cal §5 Finish`, `cal §6 finish_balance` with scope (segment, frame-density, device) per `cal §3.2`.
- **Required confidence bindings:** `conf §Detector D-POSE`, `conf §Anchor Finish`, `conf §Metric finish_balance`, monotonic non-increasing per `conf §1.3`, computed via the four-factor product in `arch §Confidence model`.

### 4. First Legal Version Transition Path

Per `val §1.4` ("`@0.0.0-stub` placeholders are disqualifying"), each version constant in `src/lib/biomech/versions.ts` (mirrored in `supabase/functions/_shared/biomechFingerprint.ts`) may legally move beyond `@0.0.0-stub` only when:

- **`LANDMARK_MODEL_VERSION`** — D-POSE is pinned to a real Blazepose-Full identifier emitting per-landmark visibility (`val §2.1 D-POSE T1`) AND H1 passes over the canonical fixture for that pin (`val §2.1 D-POSE T2`).
- **`DETECTOR_VERSION`** — Finish anchor extractor is pinned and emits `finish_frame` with confidence ≥0.6 and `anchor_not_detected` fallback (`arch §Event anchors`), AND H1 passes for the anchor frame index against the pinned pose stream.
- **`METRIC_ENGINE_VERSION`** — `finish_balance` engine is pinned, value-path is deterministic (model removed from value path per `arch §Measurement categories`), tile confidence computed per `arch §Confidence model`, missingness routed to the canonical enum, AND H1 passes for the metric value against the pinned pose + anchor.

All three transitions are simultaneous because the cache fingerprint per `src/lib/biomech/fingerprint.ts` concatenates the three versions; bumping one without the others breaks replay equivalence for downstream consumers per `bp §F2`/`§F5`. No Phase 1–15 artifact authorizes any other minimum.

### 5. Gate Impact Analysis

Using `canonical-production-gate-matrix.md` Parts 1–4:

- **Remain blocked after MVCS completion:**
  - `gate Part 1` D-HANDS, D-BAT, D-BALL, D-CONTACT, D-PLANT, D-RELEASE — none satisfied by MVCS.
  - `gate Part 2` Launch, Heel Plant, Contact, Release — depend on detectors outside MVCS.
  - `gate Part 3` metrics #1–#16 and #18 — every other metric requires a detector or anchor outside MVCS, or T-high frame density (#12, #13), or pixel-to-inch calibration (#13).
  - `gate Part 4` Phase Percentages, Discipline Score, full Report Card — require all 18 metrics ≥T2.
- **Become partially satisfiable after MVCS completion:**
  - `gate Part 1 D-POSE` — first detector reaching ≥T2 evidence shape.
  - `gate Part 2 Finish` — first anchor reaching ≥T2 evidence shape.
  - `gate Part 3 #17 finish_balance` — first metric reaching ≥T2 evidence shape.
  - `gate Part 4 Phase Percentages` — Finish-phase denominator gains its first non-stub member (1/N progress, not closure).
- **Verification requirements that become executable after MVCS completion:**
  - `val §6.1 H1` Determinism Harness — executable end-to-end against pinned D-POSE → Finish → `finish_balance` chain.
  - `val §6.5 H5` Replay Harness — becomes executable for this single chain (downstream of H1).
  - First legal calibration certificate issuance per `cal §3.2` for D-POSE, Finish, `finish_balance`.
  - First legal confidence-calibration evaluation per `val §6.3 H3` for this single chain.

H2 (golden clips), H4 (missingness audit), and the Version Migration Harness (`val §6.7`) become **scoped** to MVCS components only — not satisfied for any non-MVCS surface.

### 6. Closing Determination

**MVCS IDENTIFIED.**

Justification (repository evidence only):
- D-POSE is the unique zero-detector-dependency entry in `build-plan §2` and `gate Part 1`.
- Finish is the unique single-detector anchor in `gate Part 2`.
- `finish_balance` is the unique metric whose dependency set is exactly `{D-POSE, Finish}` with no calibration scaling, no T-high frame density, and no additional anchors (`build-plan §4 #17`, `cal §6 finish_balance`).
- H1 is the unique harness with no upstream harness dependency (`val §1.3`, `val §6.1`).
- The quadruple forms a closed evidence chain consumable by the cache-fingerprint contract in `src/lib/biomech/fingerprint.ts` and the existing harness `scripts/replay/verify-determinism.ts`.

No new architecture, doctrine, metric, detector, anchor, gate, or requirement was introduced. The selection is derived entirely from Phases 10–15 and Execution Cycle 1.

---

## Constraints honored

- No code.
- No implementation.
- No architecture changes.
- No doctrine changes.
- No new metrics / detectors / anchors / gates / harnesses / requirements.
- Exactly one new file; no other files touched.
