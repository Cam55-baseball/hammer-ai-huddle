# Execution Cycle 5 — Evidence Foundation Audit

Purpose: determine whether existing canonical artifacts already contain
sufficient authority to (a) authorize the first legal non-stub version
triplet and (b) define the minimum canonical fixture corpus required
for H1 determinism validation of the MVCS
(D-POSE → Finish anchor → `finish_balance` → H1).

Reality-only. No code, no implementation, no architecture changes, no
doctrine changes, no new requirements, metrics, detectors, anchors,
gates, or harnesses. Citations are to repository files only.

Source shorthand (from `.lovable/canonical-build-plan.md` header):
- `arch`    = `.lovable/canonical-measurement-architecture.md`
- `bp`      = `.lovable/canonical-implementation-blueprint.md`
- `val`     = `.lovable/canonical-validation-framework.md`
- `cal`     = `.lovable/canonical-calibration-architecture.md`
- `conf`    = `.lovable/canonical-confidence-architecture.md`
- `gate`    = `.lovable/canonical-production-gate-matrix.md`
- `reality` = `.lovable/canonical-implementation-reality-audit.md`
- `audit`   = `.lovable/analysis-truth-audit.md`
- `auth`    = `.lovable/canonical-execution-authorization.md`
- `ver`     = `.lovable/canonical-verification-audit.md`
- `c1`–`c4` = `.lovable/execution-cycle-{1..4}-*.md`

---

## 1. B-UPC Authority Audit

Question A — does any canonical artifact authorize a first legal
non-stub version triplet (concrete values for `LANDMARK_MODEL_VERSION`,
`DETECTOR_VERSION`, `METRIC_ENGINE_VERSION`)?

Evidence:

- `bp §F1` (lines 536–551) defines the **shape** of each pin
  (`LANDMARK_MODEL_VERSION = (pose_model_hash, hands_model_hash,
  backend_id, runtime_version)`; `DETECTOR_VERSION = (bat_model_hash,
  ball_model_hash, contact_config_hash, release_model_hash,
  plant_config_hash, backend_id, runtime_version)`;
  `METRIC_ENGINE_VERSION = (formula_version_per_metric_hash,
  geometry_config_hash, threshold_table_hash)`) and the **negative
  rule** "must move off `@0.0.0-stub` (audit S3)". It does not
  authorize a concrete first non-stub value, nor declare a partial
  triplet legal.
- `val §1.4` (referenced through `val §H1` lines 287–296 and
  `val §6.7` lines 337–351) requires every component to hold "non-stub
  pinned identity" but neither names the first legal value nor
  authorizes a triplet declaration prior to harness coverage.
- `gate §T1→T2` (line 211) requires `val §H2` ground-truth pass +
  `cal §7 T1→T2` certificate + `conf §T1→T2` monotonicity for every
  detector promotion; it does not contain an authorization clause
  that issues the first non-stub value.
- `auth` enumerates Phase 10 deficits as the closed input set (line
  46) and grants no authority to mint version strings.
- `c1` lines 116–134 explicitly records "The canonical non-stub
  version-string scheme is not declared in any sealed phase…they do
  not pin the first concrete values" and "No constitutional binding
  exists in repository between a version bump and the maturity gates".
- `c3` (Cycle 3) and `c4` §B-UPC reaffirm: no Phase 1–15 artifact binds
  version-pin bumps to maturity gates or declares the first legal
  non-stub triplet.

Question B — do existing artifacts define the maturity conditions for
version transitions?

Evidence:

- `bp §F1` (lines 536–551) defines pin **content shape** and the
  failure state "missing pin → ingestion refuses".
- `val §6.7 Version Migration Validation` (lines 337–351) defines the
  **migration** harness: "All §6.1–§6.6 harnesses green under the
  candidate triplet; cache fingerprint changes are explicit and
  documented". This governs transitions **between** non-stub triplets;
  it does not govern the first transition off `@0.0.0-stub`.
- `gate §T1→T2` (line 211) and `gate §T2→T3`/`T3→T4` rows (lines
  113–124) define per-component maturity floors, all keyed off a
  pinned non-stub version that already exists.
- `bp §F1` line 551 ("cached run with mismatched pins is invalidated")
  + `val §6.7` together imply that once a non-stub triplet exists,
  movement is governed; they are silent on first issuance.

**Determination: AUTHORITY NOT FOUND.**

Maturity conditions for **subsequent** transitions are fully defined
(`val §6.7`, `gate §T1→T2`+, `bp §F1` pin shape, `val §6.1–§6.6`
evidence requirements). Authority for the **first** non-stub triplet
issuance — the concrete model/backend/runtime hash values and the
constitutional clause permitting the first bump off `@0.0.0-stub` —
is absent from every artifact reviewed. `c1` §B-UPC, `c3`, and `c4`
§B-UPC are the operative repository statements of this absence.

---

## 2. Version Transition Dependency Audit

For each of `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`,
`METRIC_ENGINE_VERSION`, this section enumerates the four existing
requirement classes and judges whether a legal first-transition path
already exists in the repository.

### 2.1 `LANDMARK_MODEL_VERSION` (D-POSE + D-HANDS pin)

- Governing requirements: `bp §F1` pin shape (lines 536–551);
  `bp §B1` D-POSE determinism requirements (lines 186–189: "pinned
  model file hash; pinned backend …; `LANDMARK_MODEL_VERSION` pins
  the full `(model_hash, backend_id, runtime_version)` triple");
  `val §1.4`/`§2 D-POSE` (line 145: "T1: 33-landmark per-frame output
  at pinned Blazepose Full version. T2: H1 pass on fixture.").
- Maturity requirements: `val §2 D-POSE` (line 145) T1 → T2 → T3 → T4
  ladder; `gate §T1→T2` (line 211); `gate Part 1 D-POSE ≥T2` row
  (`gate` line 114).
- Evidence requirements: `val §6.3 H1` (lines 287–296) determinism
  bytes; `val §6.1 H2` (lines 263–273) golden-clip; `val §6.2 H5`
  (lines 275–285) replay; `val §6.4` calibration certificate;
  `val §6.6` confidence monotonicity.
- Verification requirements: `val §6.7` migration harness; `ver §D-POSE`
  row (and detector rows in `ver`); `bp §H1`/`§H5` pass gates.

Legal first-transition path: **DOES NOT EXIST.** Shape, evidence, and
verification are defined; concrete first values (`pose_model_hash`,
`hands_model_hash`, `backend_id`, `runtime_version`) and authority to
issue them are not declared anywhere (per §1). Per `c1` line 122–125
no constitutional binding ties the bump to the maturity gates.

### 2.2 `DETECTOR_VERSION` (Finish anchor binding via D-POSE only; MVCS uses no other detector)

- Governing requirements: `bp §F1` (lines 545–547) pin shape includes
  `bat_model_hash`, `ball_model_hash`, `contact_config_hash`,
  `release_model_hash`, `plant_config_hash`, `backend_id`,
  `runtime_version`. Finish anchor per `bp` Anchors / `val §3 Finish`
  (line 184) is "Bound to D-POSE; post-contact window per `arch P2
  §17`" — it does not consume D-CONTACT/D-PLANT/D-RELEASE/D-BAT/D-BALL.
- Maturity requirements: `val §3 Finish` (line 184) T2/T3/T4 ladder
  ("Requires D-POSE ≥ T2 (T3 for T3+)"); `gate Part 2 Finish ≥T2`
  (per `gate` anchor matrix referenced in `bp` row 92–93).
- Evidence requirements: `val §6.1` golden-clip per-tier frame
  tolerance; `val §6.2` replay bit-equal `{frame_index, t_ms,
  confidence}`; `val §6.3` determinism bytes; `val §6.4` calibration
  certificate (`cal §5 Finish`); `val §6.6` confidence floor.
- Verification requirements: `val §6.7` migration; `ver §Finish`
  row (per `ver` anchors table format used for Launch/Heel/Contact
  /Release/Finish).

Legal first-transition path: **STRUCTURALLY UNRESOLVED.** `bp §F1`
requires the `DETECTOR_VERSION` pin to be a **composite** hash over
**all** detectors (D-BAT, D-BALL, D-CONTACT, D-PLANT, D-RELEASE) plus
backend/runtime. The MVCS implements only the Finish anchor extractor
sitting on D-POSE; it does not stand up D-BAT/D-BALL/D-CONTACT/D-PLANT
/D-RELEASE. No artifact authorizes a partial `DETECTOR_VERSION` value
or a "Finish-only" first-issuance carve-out. `bp §F1` line 551 ("cached
run with mismatched pins is invalidated") and `val §6.7` (whole-suite
green requirement) jointly forbid partial-pin emission once movement
begins. First-transition path therefore does not exist.

### 2.3 `METRIC_ENGINE_VERSION` (`finish_balance` engine)

- Governing requirements: `bp §F1` (lines 547–549) pin shape
  (`formula_version_per_metric_hash, geometry_config_hash,
  threshold_table_hash`); `bp §D` metric engine determinism
  requirements (line 401: "pinned `formula_version` per metric; pinned
  numeric library; sorted iteration; no wall-clock; no `Math.random`").
- Maturity requirements: `val §5 finish_balance` row (#17 in `val §5`
  metric matrix); `gate` metric matrix row for #17 `finish_balance ≥T2`
  (per `gate Part 3`).
- Evidence requirements: `val §6.3` determinism; `val §6.1` golden-clip
  at per-metric floor; `val §6.2` replay bit-equal metric values;
  `val §6.4` calibration certificate (T-low / scale-free per
  `arch P2 §17` referenced by `bp §I` row for #17); `val §6.5`
  missingness enum coverage; `val §6.6` confidence monotonicity.
- Verification requirements: `val §6.7`; `bp §I` row #17 ten-gate set
  (detector, anchor, frame-density, calibration, missingness,
  confidence, determinism, golden clips, tile-state mapper, replay).

Legal first-transition path: **STRUCTURALLY UNRESOLVED.** `bp §F1` line
547 ("`formula_version_per_metric_hash`") makes the pin a hash over
the **per-metric formula-version map for all 18 BH metrics**. The MVCS
ships only `finish_balance`. No artifact authorizes a partial
`METRIC_ENGINE_VERSION` value, a single-metric carve-out, or an
"unimplemented metrics carry placeholder formula_version" rule.
First-transition path does not exist.

### 2.4 Cross-pin synthesis

`bp §F2` (lines 553–567) requires the cache fingerprint to consume
all three pins simultaneously. A non-stub bump on any single pin
without the other two flips `cache_fingerprint_hex` for the entire
analysis. `bp §F1` failure state ("cached run with mismatched pins is
invalidated") confirms that the triplet is atomic at runtime. The
MVCS's natural scope (D-POSE only; one anchor; one metric) does not
align with the canonical pin granularity, and no carve-out authority
exists. This is the irreducible form of B-UPC.

---

## 3. Canonical Fixture Authority Audit

Question: do the validation framework, verification audit, build
plan, or production gate matrix already define the fixture corpus?

Evidence — what **is** defined:

- `val §6.3 Determinism Validation` (lines 287–296): inputs are
  "Canonical fixture; pinned component version"; pass criterion is
  "Identical output bytes across N runs (N per `bp §H1`)"; evidence
  retained includes "fixture hash, component version".
- `val §6.1 Golden-Clip Validation` (lines 263–273): inputs are "Fixed
  golden-clip set; pinned engine version; canonical frame-density tier
  per clip (`arch P1`)"; evidence retained includes "Per-clip output,
  ground-truth diff, pass/fail label".
- `val §6.2 Replay Validation` (lines 275–285): inputs are "Canonical
  trace fingerprint set; pinned engine version triplet (`bp §F1`)".
- `bp §H1 DeterminismHarness` (lines 683–696): inputs are "corpus of
  fixed-byte clips"; pass gate "100% byte-identical for deterministic
  metrics".
- `bp §H2 GoldenClipSuite` (lines 697–710): inputs are "golden clips +
  labels"; "per-metric labeled ground-truth clips with human-labeled
  anchor frames and physical measurements".
- `bp §H4 MissingnessAudit` (lines 721–728): coverage matrix over
  `(metric, missing_reason)` cells, each cell requires ≥1 clip.
- `bp §H5 ReplayHarness` (lines 730–736): "from persisted traces,
  reproduce metric outputs byte-identically".
- `ver §D-POSE`-row format and `ver §Missingness Surfacing` (line 110)
  reference "canonical fixtures" and "degraded fixtures" as the
  evidence substrate for replay and missingness-routing verification.
- `gate §T1→T2` (line 211) requires `val §H2` ground-truth pass on a
  **golden-clip set**; `gate D-POSE` row (line 114) references
  "`val §2.1 D-POSE` cleared at ≥T2 on golden-clip set".

Evidence — what is **not** defined:

- **No required fixture content.** No artifact specifies the concrete
  clip set, clip count, clip identity, labeled-frame ground truth,
  device/frame-density distribution, or storage location for any
  fixture. `bp §H2` defers floors to "the metric registry, not invented
  here" and that registry does not exist in repository.
- **No required fixture authority source.** No artifact names who
  authors, signs, or pins fixtures; no fixture-hash registry exists.
- **No first-fixture authorization.** No artifact authorizes a
  minimal-corpus "MVCS fixture" or any other partial fixture set.
- `c3` §H1 explicitly records that `scripts/replay/verify-determinism.ts`
  header defers landmark→event→metric pipeline coverage to "Phase
  2–4"; `c4` §Evidence Foundation reaffirms "no canonical fixture
  corpus exists for landmarks/events/metrics".

Fixture **types** required by the harness contracts (derivable, not
authored): fixed-byte video clip(s) (`bp §H1`); canonical traces
(`bp §H5`/`§F2`); ground-truth labels per detector/anchor/metric
(`bp §H2`); degraded-input variants per missing_reason
(`bp §H4`). The repository defines **the harness need** but supplies
**none of the artifacts** that satisfy it.

---

## 4. Minimum Fixture Corpus Definition (derivation-only)

Constraints: derive only what existing canonical requirements already
imply for the MVCS chain D-POSE → Finish → `finish_balance` → H1.
No new fixtures invented.

Chain-link derivation:

1. **D-POSE H1** (`val §6.3` + `bp §H1`)
   - Required by §6.3 inputs: one or more "fixed-byte clip(s)" so
     that "Identical output bytes across N runs" is testable.
   - Minimum implied by `bp §H1` ("corpus of fixed-byte clips") and
     `val §2 D-POSE` line 145 ("T2: H1 pass on fixture"): **at least
     one fixed-byte side-on rear-camera baseball-swing clip at the
     `arch P1` T-low frame-density tier**, since `val §3 Finish` line
     184 and the MVCS scope (per `c2`/`c4`) require the same clip to
     drive Finish-anchor derivation downstream.
   - Authority source for the clip: **UNDERIVABLE FROM EXISTING
     CANON.** No artifact names a fixture-authoring authority.

2. **Finish anchor H1** (`val §6.3` + `val §3` line 184 + `bp §H5`)
   - Same clip as (1); `val §3` Finish row binds Finish to D-POSE
     only, so no additional detector fixture is implied.
   - Expected output to be hashed: anchor `{frame_index, t_ms,
     confidence}` per `val §6.2` line 281.
   - **No additional fixture artifact required beyond (1)**, given
     the MVCS does not consume D-CONTACT/D-PLANT/D-RELEASE/D-BAT
     /D-BALL.

3. **`finish_balance` H1** (`val §6.3` + `bp §I` row #17 + `bp §D`)
   - Same clip as (1); `bp §I` `finish_balance` row (line 767-area
     metric matrix; explicit row in `bp §I` table) declares anchor
     dependency `finish_frame ≥0.6`, tier `T-low`, calibration
     `scale-free`, missingness `landmark_occluded / anchor_not_detected`.
   - Implied additional artifact: a **canonical missingness coverage
     fixture set** per `bp §H4` for the metric × applicable-reason
     cells (`landmark_occluded`, `anchor_not_detected`). `bp §H4`
     ("each `missing_reason` enum value has at least one golden clip
     that exercises it for at least one metric") requires at minimum
     two additional fixtures **if and only if H4 is exercised**.
     The MVCS scope (per `c2`) names H1 only; under strict H1-only
     scope no missingness fixture is implied. Under any extension to
     H4 or the `gate §T1→T2` evidence pack, those two fixtures become
     mandatory.

4. **H1 harness wiring**
   - Required by `val §6.3` evidence-retained list: **fixture hash**
     and **pinned component version**. The version is gated by §1–§2
     (B-UPC unresolved). The fixture hash is derivable from (1) only
     if (1) exists.

Minimum fixture corpus strictly implied by existing canon for H1-only:

| # | Fixture | Authority for content | Authority for issuance |
|---|---|---|---|
| F-1 | One fixed-byte side-on rear-camera baseball-swing clip at T-low frame density (≥30 fps) containing a labeled `finish_frame` per `val §3 Finish` and `arch P2 §17` | Content shape derivable from `arch P1` + `val §3 Finish` + `bp §I` `finish_balance` row | **UNDERIVABLE FROM EXISTING CANON** |
| F-2 | Canonical-trace reference output for F-1 (landmark stream + Finish anchor record + `finish_balance` metric value), to support `bp §H5` replay equivalence if H1 is extended to H5 | Content shape derivable from `bp §A6`/`§D`/`§F5` | **UNDERIVABLE FROM EXISTING CANON** |

F-2 is required only if the H1 slice is extended into H5; the MVCS
declares H1 only. F-1 is sufficient for H1 byte-equality.

---

## 5. Evidence Foundation Determination

§1: AUTHORITY NOT FOUND for first non-stub triplet issuance.
§2: No legal first-transition path exists for any of the three pins;
the `DETECTOR_VERSION` and `METRIC_ENGINE_VERSION` pins are
canonically composite, with no partial-issuance carve-out.
§3: Fixture **need** is canonically defined; fixture **content,
authority, and authorization** are not.
§4: A minimum H1 fixture (F-1) is derivable as a **type**, but its
issuance authority is `UNDERIVABLE FROM EXISTING CANON`.

**Determination: EVIDENCE FOUNDATION INCOMPLETE.**

Citations: `c1` §B-UPC lines 116–134; `bp §F1` lines 536–551;
`val §6.7` lines 337–351; `val §6.3` lines 287–296; `bp §H1` lines
683–696; `bp §H2` lines 697–710; `gate §T1→T2` line 211; `c3`
§MVCS-implementation-readiness; `c4` §B-UPC and §Fixture-corpus.

---

## 6. Closing Determination

**NOT READY FOR FIRST IMPLEMENTATION.**

Justification (repository-only):

- B-UPC remains unresolved at the constitutional layer. `bp §F1`
  defines pin **shape** and **negative rule** ("must move off
  `@0.0.0-stub`") but issues no first concrete values and no
  authority clause permitting first issuance (§1).
- The composite construction of `DETECTOR_VERSION` (`bp §F1` lines
  545–547) and `METRIC_ENGINE_VERSION` (`bp §F1` lines 547–549)
  forbids partial-pin emission, and no carve-out exists for the MVCS
  scope (§2.2, §2.3). Any first transition under current canon would
  require simultaneous standing of D-POSE+D-HANDS+D-BAT+D-BALL
  +D-CONTACT+D-PLANT+D-RELEASE and all 18 BH metric formulas —
  which the MVCS, by canonical definition (`c2`), does not provide.
- The canonical fixture corpus has defined need but undefined
  content, authority, and issuance (§3). F-1 in §4 is the smallest
  derivable type but cannot be constituted without an authoring
  authority. `scripts/replay/verify-determinism.ts` continues to
  defer pipeline coverage per `c3` and `c4`.
- Until a new canonical artifact (outside the scope of this audit)
  either (a) authorizes a first non-stub triplet via carve-out or
  staged-pin doctrine, and (b) issues fixture-authoring authority,
  the MVCS cannot produce the first legally verifiable, non-stub
  measurement artifact required by `c2`/`c3`/`c4`.

No code, no implementation, no architecture, no doctrine, no new
requirements, metrics, detectors, anchors, gates, or fixtures were
introduced by this audit.
