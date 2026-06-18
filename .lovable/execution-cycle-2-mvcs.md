# Execution Cycle 2 — Minimum Viable Canonical Slice (MVCS)

Reality-only synthesis of Phases 10–15 and Execution Cycle 1. No
implementation, no code, no architecture, no doctrine, no new
metrics, detectors, anchors, gates, harnesses, or requirements.
Every selection is justified by repository evidence cited from
existing canonical artifacts.

**Citation shortcuts**
- `arch`     → `.lovable/canonical-measurement-architecture.md`
- `bp`       → `.lovable/canonical-implementation-blueprint.md`
- `gap`      → `.lovable/canonical-gap-analysis.md`
- `val`      → `.lovable/canonical-validation-framework.md`
- `cal`      → `.lovable/canonical-calibration-architecture.md`
- `conf`     → `.lovable/canonical-confidence-architecture.md`
- `gate`     → `.lovable/canonical-production-gate-matrix.md`
- `reality`  → `.lovable/canonical-implementation-reality-audit.md`
- `build`    → `.lovable/canonical-build-plan.md`
- `verify`   → `.lovable/canonical-verification-audit.md`
- `ready`    → `.lovable/canonical-production-readiness-audit.md`
- `exec`     → `.lovable/canonical-implementation-execution-audit.md`
- `auth`     → `.lovable/canonical-execution-authorization.md`
- `cycle1`   → `.lovable/execution-cycle-1-baseline.md`
- `audit`    → `.lovable/analysis-truth-audit.md`

---

## 1. Canonical Dependency Analysis

Derived strictly from `build §2–§4`, `gate Part 1–Part 3`, and
`val §2–§5`. Each row identifies the entry within its canonical
surface with the strict-minimum upstream dependency set.

### 1.1 Detector with fewest upstream dependencies → **D-POSE**

- `build §2 D-POSE` lists no upstream detector dependency; D-POSE is
  the substrate every other detector consumes per
  `arch §Canonical detector stack`.
- `gate Part 1 D-POSE` row has zero detector prerequisites.
- All six remaining detectors (D-HANDS, D-BAT, D-BALL, D-CONTACT,
  D-PLANT, D-RELEASE) per `build §2` and `gate Part 1` require either
  the same pose substrate or additional sensors/streams.
- Repository state: D-POSE pin is `LANDMARK_MODEL_VERSION =
  "blazepose_full@0.0.0-stub"` in `src/lib/biomech/versions.ts`
  (mirrored in `supabase/functions/_shared/biomechFingerprint.ts`)
  per `audit S3`, `reality §2`, `cycle1 Blocker #1`.

### 1.2 Anchor with fewest upstream dependencies → **Finish (`finish_frame`)**

- `gate Part 2 Finish` requires only `D-POSE ≥T2`.
- `arch §Event anchors` row `finish_frame` is sourced from a single
  detector (D-POSE stillness), min confidence 0.6, fallback
  `anchor_not_detected`.
- All other anchors require multiple detectors:
  - Launch (`swing_initiation`) — D-POSE + D-BAT (`gate Part 2`).
  - Heel Plant — D-POSE + D-PLANT (`gate Part 2`).
  - Contact — D-POSE + D-BAT + D-CONTACT (`gate Part 2`).
  - Release — D-RELEASE (+ D-POSE where pose-assisted)
    (`gate Part 2`).
- Finish is the unique single-detector anchor in `gate Part 2`.

### 1.3 Metric with fewest upstream dependencies → **`finish_balance` (`arch §17`)**

- `build §4 #17` lists dependency set `{D-POSE, Finish}` only.
- `cal §6 finish_balance` declares the metric scale-free → no
  pixel-to-inch calibration required.
- `arch §17` requires no T-high frame density and no event anchors
  beyond Finish.
- Comparative minima examined (rejected with reason):
  - `hip_load` (`arch §1`, `build §4 #1`) — D-POSE only, scale-free,
    but binds **no event anchor**, so it cannot exercise the
    detector → anchor → metric closure required by
    `val §1.2 Deterministic-first` + `gate §Evidence-first release law`.
  - `hand_load`, `stride_direction`, `heel_plant`,
    `shoulder_plane_steadiness`, `hands_outside_shoulders_at_landing`
    — either require an anchor with ≥2 detector dependencies (Heel
    Plant ⇒ D-PLANT) or no anchor at all.
  - `time_to_contact`, `bat_speed_contact` — require T-high frame
    density, D-BAT, D-CONTACT, and (for `bat_speed_contact`) a
    pixel-to-inch certificate (`arch §12`, `arch §13`, `cal §6`).
- `finish_balance` is therefore the unique metric whose closed
  evidence chain is `{D-POSE, Finish, finish_balance}` with no
  additional detector, no additional anchor, no calibration scaling,
  and no T-high frame density.

### 1.4 Harness with fewest upstream dependencies → **H1 Determinism Harness**

- `val §6.1` / `bp §H1` H1 requires only (a) a canonical fixture and
  (b) a deterministic pipeline; it requires no labeled corpus, no
  calibration certificate, no confidence-calibration curve, and no
  multi-module replay span.
- `val §1.3` mandates monotone promotion T0 ≤ T1 ≤ T2 ≤ T3 ≤ T4 and
  forbids class skipping; T2 requires H1, so H1 is the precondition
  for every other harness (H2/H3/H4/H5/H6/H7).
- Repository state: an H1-shaped runner already exists at
  `scripts/replay/verify-determinism.ts` (asserts byte-identical
  outputs of `buildCacheFingerprint` and `sha256OfCanonicalJson`
  across `RUNS` iterations on a fixed fixture).

---

## 2. Minimum Viable Canonical Slice (MVCS)

| Slot     | Selection                          | Justification source              |
|----------|------------------------------------|-----------------------------------|
| Detector | **D-POSE**                         | `build §2`, `gate Part 1 D-POSE`  |
| Anchor   | **Finish** (`finish_frame`)        | `gate Part 2 Finish` (D-POSE-only)|
| Metric   | **`finish_balance`** (`arch §17`)  | `build §4 #17`, `cal §6`          |
| Harness  | **H1 Determinism Harness**         | `val §6.1`, `bp §H1`              |

This is the unique quadruple in the repository where every slot's
dependency set is the strict minimum among its peers **and** the
slots form a closed detector → anchor → metric → harness chain
consumable by the cache-fingerprint contract in
`src/lib/biomech/fingerprint.ts`.

Selection invariants honored:
- `auth §Implementation Authority` — derived entirely from Phase 10
  deficits and Phase 11 build inventory.
- `auth §Prohibited Activities` — no new doctrine, architecture,
  metric, detector, anchor, gate, or requirement introduced.
- `cycle1 §Closing Determination` — slice intentionally aggregates
  minimum-viable evidence for B-DET, B-ANC, B-MET, B-HARN
  simultaneously, which `cycle1` identified as the precondition for
  resolving B-UPC.

---

## 3. Dependency Closure Map

Enumerated strictly from existing artifacts.

### 3.1 Required modules

- `src/lib/biomech/versions.ts` — owns the three version pins
  participating in the cache fingerprint per `audit S3`.
- `supabase/functions/_shared/biomechFingerprint.ts` — Deno-port
  mirror of the same constants; must move in lockstep per
  `bp §F2`/`§F4`.
- `src/lib/biomech/fingerprint.ts` — `buildCacheFingerprint` and
  `sha256OfCanonicalJson` callers (already deterministic).
- D-POSE extractor module per `bp §B1` (currently absent / stubbed
  per `reality §2`).
- Finish anchor extractor module per `bp §B` and `arch §Event anchors`
  (currently absent per `reality §3`).
- `finish_balance` engine module per `bp §C` and `arch §17`
  (currently Partial-AI-only per `reality §4 #17`).
- `scripts/replay/verify-determinism.ts` — existing H1-shaped runner
  per `val §6.1`.

### 3.2 Required inputs

- Side-on rear-camera capture at T-low ≥30 fps per
  `arch §Canonical capture envelope` (no T-mid or T-high
  requirement is imposed by Finish or `finish_balance`).
- Cache-fingerprint inputs per `src/lib/biomech/fingerprint.ts`:
  `videoSha256Hex`, `fpsTrue`, `landingTimeSec | null`,
  `directionSign ∈ {-1, 0, 1}`, `calibrationHpx`, plus the three
  pinned versions.

### 3.3 Required outputs

- D-POSE: per-frame 33-landmark stream with per-landmark visibility
  per `val §2 D-POSE T1/T2` and `arch §Landmarks of interest`.
- Finish anchor: `finish_frame` frame index + confidence, min 0.6,
  fallback `anchor_not_detected` per `arch §Event anchors`.
- `finish_balance`: numeric value + canonical missingness reason +
  tile confidence computed per `arch §Confidence model` (four-factor
  product, any factor < 0.5 forces missing).

### 3.4 Required version bindings

- `LANDMARK_MODEL_VERSION` — non-stub per `val §1.4`.
- `DETECTOR_VERSION` — non-stub per `val §1.4`.
- `METRIC_ENGINE_VERSION` — non-stub per `val §1.4`.
- All three currently `@0.0.0-stub` per `cycle1 Blocker #1 (B-UPC)`.
- The three transitions are simultaneous: the cache fingerprint
  concatenates the triplet per `src/lib/biomech/fingerprint.ts`, so
  bumping one without the others breaks replay equivalence for
  downstream consumers per `bp §F2`/`§F5`.

### 3.5 Required verification evidence

- H1 byte-identical reruns over canonical fixture per `val §6.1`,
  executed via `scripts/replay/verify-determinism.ts`, covering:
  D-POSE landmark stream, Finish frame index, `finish_balance`
  numeric value, and the cache fingerprint computed from the pinned
  triplet.
- No H2 / H3 / H4 / H5 evidence required to reach T2 on this slice;
  H5 becomes executable downstream of H1 per `val §1.3`.

### 3.6 Required calibration bindings

- `cal §6 finish_balance` — scale-free; no pixel-to-inch certificate.
- `cal §4 D-POSE` — residual-envelope certificate, scope (segment,
  frame-density, device) per `cal §3.2`.
- `cal §5 Finish` — frame-index residual-envelope certificate per
  `cal §3.2`.
- All three certificates must be unexpired, unrevoked, and scope-
  matching per `gate §Evidence-first release law`.

### 3.7 Required confidence bindings

- `conf §Detector D-POSE` — calibration-bound, monotonic
  non-increasing per `conf §1.3`.
- `conf §Anchor Finish` — calibration-bound, monotonic.
- `conf §Metric finish_balance` — four-factor product per
  `arch §Confidence model`.
- Surface must expose confidence one interaction away per
  `conf §Preamble`.

---

## 4. First Legal Version Transition Path

Per `val §1.4` ("`@0.0.0-stub` placeholders are disqualifying") and
`audit S3`, each version constant in `src/lib/biomech/versions.ts`
(mirrored in `supabase/functions/_shared/biomechFingerprint.ts`) may
legally move beyond `@0.0.0-stub` only when the following
constitutional conditions are simultaneously satisfied. No
Phase 1–15 artifact authorizes any other minimum.

### 4.1 `LANDMARK_MODEL_VERSION`

- D-POSE pinned to a real Blazepose-Full identifier emitting
  per-landmark visibility per `val §2.1 D-POSE T1`.
- H1 Determinism Harness passes over the canonical fixture for that
  pin per `val §2.1 D-POSE T2` and `val §6.1`.
- Missingness routed to `pose_not_detected` per
  `arch §Missingness rules`.

### 4.2 `DETECTOR_VERSION`

- Finish anchor extractor pinned and emits `finish_frame` with
  confidence ≥0.6 and `anchor_not_detected` fallback per
  `arch §Event anchors`.
- H1 passes for the anchor frame index against the pinned pose
  stream per `val §6.1`.

### 4.3 `METRIC_ENGINE_VERSION`

- `finish_balance` engine pinned with deterministic value path
  (model removed from value path per
  `arch §Measurement categories`; AI-only is not a permitted
  production category).
- Tile confidence computed per `arch §Confidence model`.
- Missingness routed to the canonical enum per
  `arch §Missingness rules`.
- H1 passes for the metric value against the pinned pose + anchor
  per `val §6.1`.

### 4.4 Simultaneity requirement

All three constants must transition in the same change. The cache
fingerprint in `src/lib/biomech/fingerprint.ts` concatenates the
triplet; any partial bump invalidates downstream cache reuse and
breaks the replay equivalence requirement of `bp §F2`/`§F5` and
`val §H5`.

---

## 5. Gate Impact Analysis

Derived from `gate Part 1–Part 4`. MVCS completion does not satisfy
any downstream report-card or discipline gate; it produces the first
legally verifiable, non-stub measurement artifact for a single
detector / anchor / metric chain.

### 5.1 Gates that remain blocked after MVCS completion

- `gate Part 1` — D-HANDS, D-BAT, D-BALL, D-CONTACT, D-PLANT,
  D-RELEASE all remain `Missing` per `reality §2`.
- `gate Part 2` — Launch, Heel Plant, Contact, Release all depend on
  detectors outside MVCS.
- `gate Part 3` — metrics #1–#16 and #18 all require either a
  detector or anchor outside MVCS, T-high frame density (#12, #13),
  or a pixel-to-inch certificate (#13).
- `gate Part 4` — Phase Percentages, Discipline Score, full Report
  Card require all 18 metrics ≥T2 per `build §5`.

### 5.2 Gates that become partially satisfiable after MVCS completion

- `gate Part 1 D-POSE` — first detector reaching ≥T2 evidence shape.
- `gate Part 2 Finish` — first anchor reaching ≥T2 evidence shape.
- `gate Part 3 #17 finish_balance` — first metric reaching ≥T2
  evidence shape.
- `gate Part 4 Phase Percentages` — Finish-phase denominator gains
  its first non-stub member (1/N progress; not closure).

### 5.3 Verification requirements that become executable after MVCS

- `val §6.1 H1` — executable end-to-end against the pinned D-POSE →
  Finish → `finish_balance` chain.
- `val §6.5 H5` Replay Harness — executable for this single chain
  downstream of H1.
- First legal calibration certificate issuance per `cal §3.2` for
  D-POSE, Finish, and `finish_balance`.
- First legal confidence-calibration evaluation per `val §6.3 H3`
  scoped to this single chain.
- `val §6.2 H2` (golden clips), `val §6.4 H4` (missingness audit),
  and `val §6.7` (Version Migration Harness) become **scoped** to
  MVCS components only — not satisfied for any non-MVCS surface.

---

## 6. Closing Determination

**MVCS IDENTIFIED.**

Repository-evidence justification:

1. **D-POSE** is the unique zero-detector-dependency entry in
   `build §2` and `gate Part 1`.
2. **Finish** is the unique single-detector anchor in
   `gate Part 2`.
3. **`finish_balance`** is the unique metric whose dependency set is
   exactly `{D-POSE, Finish}` with no calibration scaling, no T-high
   frame density, and no additional anchors per `build §4 #17`,
   `arch §17`, and `cal §6 finish_balance`.
4. **H1 Determinism Harness** is the unique harness with no upstream
   harness dependency per `val §1.3` and `val §6.1`, and an
   H1-shaped runner already exists at
   `scripts/replay/verify-determinism.ts`.
5. The quadruple forms a closed evidence chain consumable by the
   cache-fingerprint contract in `src/lib/biomech/fingerprint.ts`
   and exercises the version-pin triplet
   (`LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`,
   `METRIC_ENGINE_VERSION`) currently blocked at `@0.0.0-stub` per
   `cycle1 Blocker #1 (B-UPC)`.

No new architecture, doctrine, metric, detector, anchor, gate, or
requirement was introduced. The MVCS is derived exclusively from
Phases 10–15 (`reality`, `build`, `verify`, `ready`, `exec`, `auth`)
and Execution Cycle 1 (`cycle1`).

---

## Constraints honored

- No code.
- No implementation.
- No architecture changes.
- No doctrine changes.
- No new metrics / detectors / anchors / gates / harnesses /
  requirements.
- Exactly one new file created; no other files touched.
