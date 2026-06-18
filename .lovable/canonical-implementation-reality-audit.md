# Canonical Implementation Reality Audit (Phase 10)

Sources (read-only):
- `arch` = `.lovable/canonical-measurement-architecture.md`
- `bp`   = `.lovable/canonical-implementation-blueprint.md`
- `gap`  = `.lovable/canonical-gap-analysis.md`
- `val`  = `.lovable/canonical-validation-framework.md`
- `cal`  = `.lovable/canonical-calibration-architecture.md`
- `conf` = `.lovable/canonical-confidence-architecture.md`
- `gate` = `.lovable/canonical-production-gate-matrix.md`
- `audit` = `.lovable/analysis-truth-audit.md`
- `extract` = `.lovable/analysis-truth-extraction.md`

Every requirement is cited to a Phase 1–9 document. Every evidence
claim is cited to a repository path. No new metrics, detectors,
anchors, harnesses, gates, thresholds, or doctrines are introduced.
Reality audit only.

---

## 1. Audit Scope

### 1.1 Boundary
- The audit evaluates the **current repository tree** against the
  canonical requirements established in Phases 1–9.
- The audit does **not** evaluate intent, design completeness,
  reviewer opinion, prompt wording, copy, UI polish, or roadmap
  position. Only **evidence in the repository** counts (`val §1.2`).
- The audit produces no architecture, no implementation, no
  sequencing, no prioritization, and no estimates.

### 1.2 Canonical authority
- `arch`, `bp`, `gap`, `val`, `cal`, `conf`, `gate` are treated as the
  **single canonical authority** for what is required.
- Where the repository disagrees with the canonical specification, the
  canonical specification is the reference and the repository is
  recorded as the **deficit**.

### 1.3 Evaluation rule
For each canonical component the audit records:
- **Canonical Requirement** — by citation only.
- **Repository Evidence** — file paths or "none found".
- **Implementation Status** — one of: `Missing`, `Stub`,
  `Partial-AI-only`, `Partial-deterministic`, `Present-unvalidated`,
  `Present-validated`.
- **Evidence Location** — repository path(s).
- **Missing Components** — what the canonical spec requires that the
  repository does not contain.
- **Production Readiness** — trust-class against `gate` Parts 1–4,
  using `val §1.3` ladder T0–T4.

### 1.4 Universal preconditions observed
Per `val §1.4` every production-eligible component requires pinned
identity, deterministic seed, cache-key conformance, canonical
missingness routing, and confidence exposure. Across the repository:

- Version pins exist only as `@0.0.0-stub` placeholders in
  `src/lib/biomech/versions.ts` (`LANDMARK_MODEL_VERSION`,
  `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION`). These are disqualifying
  per `val §1.4` and `audit S3`.
- Cache fingerprint composition exists in `src/lib/biomech/fingerprint.ts`
  but its inputs are stub-versioned; the structural contract from
  `bp §F2` is present, the **bound values are not**.
- No canonical missingness enum module is present in the repository.
- No central confidence module bound to `cal §5` certificates is
  present.

This single observation cascades into every per-component row below.

---

## 2. Detector Reality Matrix

Canonical requirements: `arch §Detectors`, `bp §B`, `val §2.1`,
`cal §4`, `conf §Detector`, `gate Part 1`.

| Detector | Canonical Requirement | Repository Evidence | Implementation Status | Evidence Location | Missing Components | Production Readiness |
|---|---|---|---|---|---|---|
| **D-POSE** | Blazepose-Full landmark extraction with pinned model, per-frame visibility, deterministic seed (`arch §Landmarks`, `bp §B1`); `val §H1`+`H2` on golden set; `cal §4 D-POSE` residual envelope; `conf §Detector D-POSE` monotonic | No landmark extractor in repo. Only the stub identifier `LANDMARK_MODEL_ID = "blazepose_full"`, `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`. | **Stub** | `src/lib/biomech/versions.ts` | Actual pose extraction; pinned non-stub model; landmark-visibility emission; calibration certificate; confidence emission; validation harness pass | **T0** — fails `val §1.4` pinned-identity precondition; ineligible per `gate Part 1` |
| **D-HANDS** | Hand keypoint extraction with pinned detector, `cal §4 D-HANDS` residual envelope, `conf §Detector D-HANDS` | None found. No file references hand-keypoint detection as a deterministic component. | **Missing** | none | Entire detector | **T0** — ineligible per `gate Part 1` |
| **D-BAT** | Bat knob/mid/barrel-tip detector, pixel-to-inch scaling cert (`cal §3.2`), `val §H1`+`H2`, `conf §Detector D-BAT` | None found. Bat geometry is referenced only in AI prompt strings inside `src/lib/reportCard/contracts/bh.contract.ts` (e.g. `bat_speed_contact_mph`, `on_plane_pct`). | **Missing (AI-prompt substitute only)** | `src/lib/reportCard/contracts/bh.contract.ts` (prompt-only) | Entire detector; pixel-to-inch calibration certificate; bat-length prior flow per `arch §Calibration framework` | **T0** — ineligible per `gate Part 1`; AI-only path is out-of-spec per `arch §Measurement categories` |
| **D-BALL** | Ball-center detector + Kalman uplift, `cal §4 D-BALL`, `conf §Detector D-BALL` | None found. Ball is referenced only inside AI prompt copy. | **Missing** | none | Entire detector | **T0** — ineligible per `gate Part 1` |
| **D-CONTACT** | Contact-frame detector (barrel-ball proximity + barrel deceleration; audio uplift) per `arch §3 Event anchors`, `val §H1`+`H2`, `cal §4 D-CONTACT` | None found. `contact_frame` is referenced only inside AI prompts (`bh.contract.ts`). | **Missing** | none | Entire detector | **T0** — ineligible per `gate Part 1` |
| **D-PLANT** | Front-foot first-contact / full-plant detector per `arch §Event anchors`, `val §H1`+`H2`, `cal §4 D-PLANT` | None found. Foot-plant is only an AI-prompt directive. | **Missing** | none | Entire detector | **T0** — ineligible per `gate Part 1` |
| **D-RELEASE** | Pitcher-release-frame detector with optional audio assist (`arch §Event anchors`, `arch §3, §7`), `val §H1`+`H2`, `cal §4 D-RELEASE` | None found. Pitcher release is only an AI-prompt directive. | **Missing** | none | Entire detector | **T0** — ineligible per `gate Part 1` |

Detector summary: **0 of 7 detectors meet `val §1.4` preconditions.**
All AI-only references to detector concepts are out-of-spec per
`arch §Measurement categories` (AI-only is "not a permitted production
category").

---

## 3. Anchor Reality Matrix

Canonical requirements: `arch §Event anchors`, `val §2.2`, `cal §5`,
`conf §Anchor`, `gate Part 2`.

| Anchor | Canonical Requirement | Repository Evidence | Implementation Status | Evidence Location | Missing Components | Production Readiness |
|---|---|---|---|---|---|---|
| **Launch** (`swing_initiation`) | D-POSE wrist accel + D-BAT knob accel; min conf 0.7; fallback `anchor_not_detected` | No detector code; no anchor extractor; the term appears in AI prompts only. | **Missing** | `src/lib/reportCard/contracts/bh.contract.ts` (prompt-only) | Deterministic anchor extractor; underlying D-POSE, D-BAT; cert; confidence | **T0** — ineligible per `gate Part 2`; required detectors at T0 |
| **Heel Plant** (`front_foot_first_contact` / `front_foot_full_plant`) | D-PLANT on pose; min conf 0.7; fallback `front_foot_*_missing` | Prompt-only references inside `bh.contract.ts` and methodology docs. | **Missing** | `src/lib/reportCard/contracts/bh.contract.ts`; `.lovable/p3-timing-methodology.md` (spec only) | Anchor extractor; D-POSE, D-PLANT; cert; confidence | **T0** — ineligible per `gate Part 2` |
| **Contact** (`contact_frame`) | D-CONTACT bat+pose (+ optional audio); min conf 0.8 | Prompt-only references; no detector code. | **Missing** | `src/lib/reportCard/contracts/bh.contract.ts` | Anchor extractor; underlying D-POSE, D-BAT, D-CONTACT; cert; confidence | **T0** — ineligible per `gate Part 2` |
| **Release** (`pitcher_release_frame`) | D-RELEASE pose+crop, audio-assist; min conf 0.7 | Prompt-only references. | **Missing** | `src/lib/reportCard/contracts/bh.contract.ts` | Anchor extractor; D-RELEASE; cert; confidence | **T0** — ineligible per `gate Part 2` |
| **Finish** (`finish_frame`) | D-POSE stillness; min conf 0.6 | Prompt-only references inside `.lovable/finish-and-balance-methodology.md` and `bh.contract.ts`. | **Missing** | `.lovable/finish-and-balance-methodology.md`; `bh.contract.ts` | Anchor extractor on D-POSE stillness; cert; confidence | **T0** — ineligible per `gate Part 2` |

Anchor summary: **0 of 5 anchors are extractable from a deterministic
detector trace in the repository.**

---

## 4. Metric Reality Matrix

Canonical requirements: `arch §Part 2` (metrics 1–18), `bp §C`,
`val §2.3` + `val §H1–H4`, `cal §6`, `conf §Metric`, `gate Part 3`.

For brevity each row records the seven gate columns as `Y`/`N`/`AI`
where:
- `Y` = present and bound to canonical requirements,
- `N` = absent,
- `AI` = present only as an AI prompt directive in
  `src/lib/reportCard/contracts/bh.contract.ts` and/or
  `src/lib/reportCard/disciplines/bh.ts` (out-of-spec per
  `arch §Measurement categories`).

| # | Metric (`arch §`) | Canonical Definition Exists | Implementation Exists | Deterministic Engine Exists | Validation Evidence Exists | Calibration Evidence Exists | Confidence Exists | Production Gate Status | Repository Evidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `hip_load` (§1) | Y (`arch §1`) | AI (prompt-only) | N | N | N | N (no `cal §5` binding) | **Fail** `gate Part 3` row 1 | `src/lib/reportCard/contracts/bh.contract.ts` (`hip_stability_score_100`) |
| 2 | `hand_load` (§2) | Y | AI | N | N | N | N | **Fail** | `bh.contract.ts` (`hand_load_score_100`) |
| 3 | `p2_timing` ★ (§3) | Y | AI (boolean prompt) | N | N | N | N | **Fail**; also blocked because D-RELEASE T0 | `bh.contract.ts` (`p2_timing_pass`) |
| 4 | `eyes_tracking` (§4) | Y | AI | N | N | N | N | **Fail** | `bh.contract.ts` (`eyes_track_score_100`) |
| 5 | `stride_direction` (§5) | Y | AI (signed degrees prompt) | N | N | N | N | **Fail** | `bh.contract.ts` (`stride_dir_deg_off_square`) |
| 6 | `heel_plant` (§6) | Y | AI | N | N | N | N | **Fail** | `bh.contract.ts` (`heel_plant_score_100`) |
| 7 | `p3_timing` ★ (§7) | Y | AI (signed ms prompt) | N | N | N | N | **Fail**; also blocked because D-RELEASE + D-PLANT T0 | `bh.contract.ts` (`p3_release_offset_ms`); `.lovable/p3-timing-methodology.md` |
| 8 | `hands_outside_shoulders_at_landing` ★ (§8) | Y | AI (boolean prompt) | N | N | N | N | **Fail** | `bh.contract.ts` (`hands_outside_shoulders_at_landing_pass`) |
| 9 | `sequencing` (§9) | Y | AI (boolean prompt) | N | N | N | N | **Fail** | `bh.contract.ts` (`sequencing_ok`) |
| 10 | `bat_path` (§10) | Y | AI (0–100 prompt) | N | N | N | N | **Fail**; D-BAT T0 | `bh.contract.ts` (`bat_path_score_100`); `.lovable/bat-path-vs-on-plane-definitions.md` |
| 11 | `on_plane` ★ (§11) | Y | AI (% prompt) | N | N | N | N | **Fail**; D-BAT T0 | `bh.contract.ts` (`on_plane_pct`) |
| 12 | `time_to_contact` ★ (§12) | Y | AI (ms prompt; range 80–400) | N | N | N | N | **Fail**; requires T-high + D-BAT + D-CONTACT (all T0) | `bh.contract.ts` (`time_to_contact_ms`); `.lovable/time-to-contact-vs-power.md` |
| 13 | `bat_speed_contact` ★ (§13) | Y | AI (mph prompt; prompt-only 33 in default per `audit S?`) | N | N | N (no pixel-to-inch cert) | N | **Fail**; requires T-high + D-BAT + D-CONTACT + bat-length prior; all T0 | `bh.contract.ts` (`bat_speed_contact_mph`) |
| 14 | `back_elbow_contact` / connection (§14) | Y | AI (0–100 prompt) | N | N | N | N | **Fail**; requires Launch/Contact anchors (T0) | `bh.contract.ts` (`connection_barrel_delivery_score_100`); `.lovable/back-elbow-methodology.md` |
| 15 | `hitters_move` (§15) | Y | AI | N | N | N | N | **Fail** | `bh.contract.ts` (`hitters_move_score_100`) |
| 16 | `shoulder_plane_steadiness` (§16) | Y | AI | N | N | N | N | **Fail** | `bh.contract.ts` (`shoulder_plane_steadiness_score_100`) |
| 17 | `finish_balance` (§17) | Y | AI | N | N | N | N | **Fail**; Finish anchor T0 | `bh.contract.ts` (`finish_balance_score_100`); `.lovable/finish-and-balance-methodology.md` |
| 18 | `shoulder_to_shoulder_hold` (§18) | Y | AI (% prompt + boolean fallback + leak booleans) | N | N | N | N | **Fail**; Heel Plant + Contact anchors T0 | `bh.contract.ts` (`shoulder_to_shoulder_hold_pct_to_contact`, `shoulder_to_shoulder_hold_pass`, `front_shoulder_leak_*`) |

Metric summary: **0 of 18 BH metrics have a deterministic engine,
validation evidence, calibration evidence, or canonical confidence
binding.** All 18 are implemented via AI prompt directives only, which
is the **out-of-spec** category per `arch §Measurement categories` and
is the same posture documented in `audit S5`/`gap §D`.

---

## 5. Report Card Reality Matrix

Canonical requirements: `bp §E`, `arch §Tile semantics`,
`val §5`, `conf §Surface`, `gate Part 4`.

| Surface | Canonical Requirement | Repository Evidence | Status | Gap | Production Readiness |
|---|---|---|---|---|---|
| **Phase Percentages** | Single-denominator phase percentage per `arch §Tile semantics`; missingness excluded from denominator per `val §5` | Letter-grade aggregation in `src/lib/reportCard/grade.ts` averages across **measured** tiles only (missing tiles excluded from denominator). No phase-level percentage surface is wired to the canonical engine pipeline. | **Partial** | Phase-scoped percentages tied to canonical engine outputs; resolution of the dual-denominator behaviour per `gate Part 4` | **T0** — depends on metrics at T0 |
| **Phase Orbs** | Replay-stable orbs reflecting per-phase canonical metric outputs (`gate Part 4`) | Tile-state union (`pass`/`warn`/`fail`/`missing`) defined in `src/lib/reportCard/types.ts`; phase-orb surfaces present in `src/components/report-card/hammer/visuals/ShareCardExport.tsx` consume AI-emitted scores. | **Partial (consumes AI scores, not canonical engine)** | Binding to canonical metric outputs; replay equivalence | **T0** |
| **Tile States** | Pass/warn/fail/missing tile states keyed to canonical metric value + missingness enum (`arch §Missingness rules`) | `ReportCardTileSpec.toState` mapping in `src/lib/reportCard/types.ts`; mapping logic in `src/lib/reportCard/disciplines/bh.ts` (17 tiles); status enum includes `missing`. | **Present-unvalidated** (structure is in place, but inputs are AI-emitted, not canonical engine outputs) | Canonical engine inputs; canonical missingness enum source; calibration-bound confidence per `conf §Surface` | **T0** |
| **Ribbon Generation** | Replay-stable ribbon text derived from canonical metric outputs (`bp §E3`) | Ribbon/banner copy referenced inside `ReportCardTileSpec` (`bannerText`, `description`) — fed by AI scores, not canonical engine. | **Partial** | Engine-driven ribbon binding; replay equivalence | **T0** |
| **Confidence Surfacing** | Surface exposes calibration-bound confidence per `conf §Surface` (monotonic non-increasing) | No surface-level confidence field is wired from `cal §5` certificates. PieV2 (`src/lib/pieV2/types.ts`) defines a `PieV2Confidence` type for pitching, but it is not bound to any `cal §5` certificate and is unrelated to BH. | **Missing for BH** | Calibration-bound confidence emission for BH surfaces | **T0** |
| **Missingness Surfacing** | Surface routes `arch §Missingness rules` enum values; never collapses missingness into a number (`val §5`) | `ReportCardTileSpec.toState` returns `{ status: "missing" }` and tile-state union includes `missing`; **no canonical missingness enum module** is present, so reasons are free-text inside prompts. | **Partial** | Canonical missingness enum module; server-side enforcement per `arch §Production-readiness gate` step 4 | **T0** |
| **Coaching Layer** | Presentation-only consumer of engine confidence (`conf §Authority hierarchy` level 5); may not author detector/anchor/metric/confidence values | Coaching layers (e.g. `src/lib/hammer/prescription/dailyPlan.ts`, AI nudge components) consume scores that are themselves AI-emitted, propagating the out-of-spec category upward. | **Partial-AI-only** | Engine-bound scores upstream; no authoring of confidence | **T0** |

Report card summary: **All seven surfaces are wired to AI-emitted
inputs, not to canonical engine outputs.** None of them satisfy
`gate Part 4`.

---

## 6. Validation Reality Matrix

Canonical requirements: `val §6` (`H1`–`H7`).

| Harness | Canonical Requirement | Repository Evidence | Status | Gap | Production Readiness Impact |
|---|---|---|---|---|---|
| **H1 — Deterministic** | `val §6.1` deterministic replay across pinned versions | `scripts/replay/verify-determinism.ts` present; pinned versions are stubs (`@0.0.0-stub`). | **Partial (scaffold only)** | Non-stub pins; corpus; pass criteria | All components blocked from T2 per `val §1.2` |
| **H2 — Ground-truth** | `val §6.2` labeled corpus + per-component ground-truth checks for every detector / anchor / metric | No labeled corpus, no per-component ground-truth tests in `tests/`, `src/test/`, or `scripts/`. | **Missing** | Corpus, ground-truth fixtures, per-component harness | All components blocked from T2 |
| **H3 — Calibration evidence** | `val §6.3` evidence retention required by `bp §H3` | No calibration-evidence retention module is present. | **Missing** | Evidence-retention module; certificate storage | All components blocked above T1 |
| **H4 — Boundary** | `val §6.4` deadband / legality boundary harness for ★ metrics | No deadband/legality harness for `p2_timing`, `p3_timing`, `time_to_contact`, etc. | **Missing** | Harness implementation; spec-tied thresholds | All ★ metrics blocked |
| **H5 — Replay equivalence** | `val §6.5` byte-equal replay over `bp §F2` fingerprint | Fingerprint composer present in `src/lib/biomech/fingerprint.ts`; no replay-equivalence test harness against canonical traces exists. | **Partial (composer only)** | Replay corpus; equivalence harness | All components blocked from T3 |
| **H6 — Version-migration** | `val §6.7` re-pass on any pinned-version change | No migration-harness scripts present. | **Missing** | Migration harness | All components subject to demotion on first non-stub pin |
| **H7 — Demotion enforcement** | `val §1.5` demote-on-regression machinery | No central demotion enforcer present. | **Missing** | Demotion enforcer | Demotion currently un-automated |

Validation summary: **No canonical validation harness is in a passing
state.** Per `val §1.3` no component can hold above T1.

---

## 7. Calibration Reality Matrix

Canonical requirements: `cal §3`–`cal §6` (certificates),
`cal §Drift` (drift detection / classification / severity / evidence /
promotion).

| Requirement | Canonical Reference | Repository Evidence | Status | Gap |
|---|---|---|---|---|
| Calibration certificate model | `cal §3.2`, `cal §6.1` | None found. | **Missing** | Certificate authoring / scope binding / version pin |
| Detector calibration (`cal §4` per detector) | `cal §4` | None of D-POSE/HANDS/BAT/BALL/CONTACT/PLANT/RELEASE has a calibration record. | **Missing** | Per-detector calibration evidence and certificate |
| Anchor calibration (`cal §5` per anchor) | `cal §5` | None for Launch / Heel Plant / Contact / Release / Finish. | **Missing** | Per-anchor calibration evidence |
| Metric calibration (`cal §6` per metric) | `cal §6` | None for the 18 BH metrics. | **Missing** | Per-metric calibration evidence; pixel-to-inch cert for `bat_speed_contact` |
| Certificate retention / supersession | `cal §6.6` | None found. | **Missing** | Certificate store; supersession chain |
| Drift detection | `cal §Drift §Detection` | None found. | **Missing** | Drift detector |
| Drift classification / severity | `cal §Drift §Classification`, `§Severity` | None found. | **Missing** | Classification machinery |
| Drift evidence retention | `cal §Drift §Evidence` | None found. | **Missing** | Drift-evidence store |
| Drift → demotion linkage | `cal §Drift §Promotion`, `val §1.5` | None found. | **Missing** | Demotion plumbing |

Calibration summary: **No calibration certificate exists for any
detector, anchor, or metric.** Per `cal §1.1` no component can be
calibrated; per `val §1.3` no component can hold above T1.

---

## 8. Confidence Reality Matrix

Canonical requirements: `conf §Detector`, `conf §Anchor`,
`conf §Metric`, `conf §Surface`, `conf §Propagation`,
`conf §Promotion-Demotion`.

| Requirement | Canonical Reference | Repository Evidence | Status | Gap |
|---|---|---|---|---|
| Detector confidence emission (replay-equivalent, certificate-bound) | `conf §Detector` | None for any detector. | **Missing** | Confidence emission; certificate binding |
| Anchor confidence emission | `conf §Anchor`; `arch §Event anchors` min-confidence table | None for any anchor. | **Missing** | Confidence emission |
| Metric confidence (product / visibility-weighted aggregation only) | `conf §Metric`; `arch §Confidence model` | No metric-confidence module bound to canonical inputs is present. | **Missing** | Aggregation operator; lineage to inputs |
| Surface confidence (monotonic non-increasing, presentation-only) | `conf §Surface` | Surface code (`src/lib/reportCard/*`) does not consume an upstream canonical confidence. | **Missing** | Surface binding |
| Confidence propagation lineage | `conf §Propagation` | None found. | **Missing** | Propagation graph; binding to `cal §5` cert |
| Confidence invalidation rules | `conf §Promotion-Demotion` | None found. | **Missing** | Invalidation enforcement |
| Confidence-vs-missingness routing (never collapse missingness into a number) | `conf §1.1` Principle 5 | Mixed: `ReportCardTileSpec` keeps `missing` as a discrete status (correct), but AI-emitted scores can be returned without a missingness route, which collapses missingness into a number (incorrect). | **Partial** | Server-side missingness enforcement |
| PieV2 confidence (separate domain) | n/a for BH | `src/lib/pieV2/types.ts` defines `PieV2Confidence`, `PieV2ConfidenceBasis`, `PieV2MissingnessRecord`. It is **not** bound to a `cal §5` certificate and is **not** a BH confidence implementation. | **Present-unvalidated** in pitching only | Calibration binding; cross-domain reuse is out of audit scope |

Confidence summary: **No canonical confidence path exists for BH.**
The only structured confidence object in the codebase is PieV2's
pitching-side type, and it is not certificate-bound.

---

## 9. Production Gate Reality Matrix

Per `gate` Parts 1–4 and the demotion authority chain in
`gate §Demotion authority hierarchy`.

| Gate (per `gate`) | Component Set | Pass? | Reason |
|---|---|---|---|
| Detector production eligibility (`gate Part 1`) | 7 detectors | **Fails for all 7** | None meet `val §1.4` pinned-identity precondition; none have calibration certificates; none emit canonical confidence |
| Anchor production eligibility (`gate Part 2`) | 5 anchors | **Fails for all 5** | Underlying detectors all at T0 |
| Metric production eligibility (`gate Part 3`) | 18 BH metrics | **Fails for all 18** | AI-only (out-of-spec per `arch §Measurement categories`); no deterministic engine; no validation; no calibration; no canonical confidence |
| Report-card surface production eligibility (`gate Part 4`) | 7 surfaces | **Fails for all 7** | All consume AI-emitted inputs; none consume canonical engine outputs or calibration-bound confidence |
| Replay-divergence demotion path | `gate §Demotion` row 1 | Not exercisable | No replay corpus; no `H5` pass to diverge from |
| Certificate-invalidation demotion path | `gate §Demotion` row 2 | Not exercisable | No certificates exist to invalidate |
| Calibration-drift-breach demotion path | `gate §Demotion` row 3 | Not exercisable | No drift detection wired |
| Confidence-invalidation demotion path | `gate §Demotion` row 4 | Not exercisable | No canonical confidence to invalidate |
| Missingness-routing-failure demotion path | `gate §Demotion` row 5 | Not exercisable | No canonical missingness enum module |
| Dependency-failure demotion path | `gate §Demotion` row 6 | Not exercisable | No dependency graph wired |
| Version-migration-failure demotion path | `gate §Demotion` row 7 | Not exercisable | Pins are stubs; no migration harness |

**Net production-gate state: 0 components pass any gate.**
No new gates may be created (closing constraint).

---

## 10. Master Implementation Deficit Inventory

Single consolidated list (no prioritization, no sequencing, no
estimates). Each entry cites the canonical requirement it fails to
satisfy.

### 10.1 Missing — detectors
- D-POSE deterministic implementation with non-stub pinned model
  (`arch §Landmarks`, `bp §B1`, `val §1.4`).
- D-HANDS detector (`arch §Detectors`).
- D-BAT detector (knob / mid / barrel-tip) (`arch §Detectors`).
- D-BALL detector (`arch §Detectors`).
- D-CONTACT detector (`arch §Event anchors §contact_frame`).
- D-PLANT detector (`arch §Event anchors §front_foot_*`).
- D-RELEASE detector (`arch §Event anchors §pitcher_release_frame`).

### 10.2 Missing — anchors
- Launch (`swing_initiation`), Heel Plant (`front_foot_first_contact`
  + `front_foot_full_plant`), Contact (`contact_frame`), Release
  (`pitcher_release_frame`), Finish (`finish_frame`) — none have a
  deterministic extractor (`arch §Event anchors`).

### 10.3 Partially-implemented — metrics (out-of-spec AI category)
- All 18 BH metrics from `arch §1`–`§18` are emitted via AI prompts
  in `src/lib/reportCard/contracts/bh.contract.ts` and consumed via
  `src/lib/reportCard/disciplines/bh.ts`. Per `arch §Measurement
  categories` the AI-only category is **not a permitted production
  category**, so the present implementation counts as a partial /
  out-of-spec substitute rather than a canonical implementation.

### 10.4 Disconnected — surfaces
- Phase percentages, phase orbs, tile states, ribbon, confidence,
  missingness surfacing, coaching layer all consume AI-emitted inputs
  instead of canonical engine outputs (`gate Part 4`, `conf §Surface`,
  `bp §E`).
- `PieV2Confidence` exists in the pitching domain but is not bound to
  a `cal §5` certificate and is not connected to BH surfaces.

### 10.5 Unvalidated — harnesses
- `H1` deterministic harness: scaffold only (`scripts/replay/
  verify-determinism.ts`), pins are stubs — does not satisfy
  `val §6.1`.
- `H2` ground-truth harness: missing (`val §6.2`).
- `H3` calibration-evidence retention: missing (`val §6.3`,
  `bp §H3`).
- `H4` boundary / deadband harness: missing (`val §6.4`).
- `H5` replay-equivalence harness: composer present in
  `src/lib/biomech/fingerprint.ts`, equivalence test missing
  (`val §6.5`, `bp §H5`).
- `H6` version-migration harness: missing (`val §6.7`).
- `H7` demotion-on-regression enforcer: missing (`val §1.5`).

### 10.6 Uncalibrated — certificates
- No calibration certificate exists for any detector, anchor, or
  metric (`cal §3.2`, `cal §4`–`§6`).
- Bat-length / pixel-to-inch certificate for `bat_speed_contact` is
  absent (`cal §3.2`, `arch §13`).
- Drift detection, classification, severity, evidence retention, and
  drift→demotion linkage are absent (`cal §Drift`).

### 10.7 Confidence-absent
- No detector emits canonical confidence (`conf §Detector`).
- No anchor emits canonical confidence (`conf §Anchor`).
- No metric emits a calibration-bound confidence
  (`conf §Metric`; `arch §Confidence model`).
- No surface consumes a calibration-bound confidence
  (`conf §Surface`).
- No confidence propagation lineage exists (`conf §Propagation`).
- No confidence invalidation enforcement exists
  (`conf §Promotion-Demotion`).

### 10.8 Universal-precondition deficits (`val §1.4`)
- Pinned identity: `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`,
  `METRIC_ENGINE_VERSION` are all `@0.0.0-stub` in
  `src/lib/biomech/versions.ts`. Per `val §1.4` and `audit S3`, this is
  disqualifying for every component depending on those pins.
- Deterministic seed: structural composer is present in
  `src/lib/biomech/fingerprint.ts`, but its bound input values are
  stub-versioned; the `stableSeed(videoId)` regression flagged in
  `audit S5` is not yet exercised against a non-stub pipeline.
- Canonical missingness enum module: not present in repository
  (`arch §Missingness rules`).
- Confidence exposure: not present per `conf §Detector`–`§Surface`.

### 10.9 Production-eligibility status
- Detectors production-eligible: **0 / 7**.
- Anchors production-eligible: **0 / 5**.
- BH metrics production-eligible: **0 / 18**.
- Report-card surfaces production-eligible: **0 / 7**.
- Canonical demotion pathways exercisable: **0 / 7**.

---

## 11. Closing Constraints

- Reality audit only.
- No code.
- No implementation.
- No architecture changes.
- No roadmap.
- No sequencing.
- No prioritization.
- No estimates.
- No new metrics.
- No new detectors.
- No new anchors.
- No new gates.
- No new doctrines.

All citations resolve to Phases 1–9 canonical documents
(`arch`, `bp`, `gap`, `val`, `cal`, `conf`, `gate`, `audit`,
`extract`). All repository evidence resolves to existing file paths
without modification.
