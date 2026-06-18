# Canonical Build Plan (Phase 11)

Sources (read-only):
- `arch`    = `.lovable/canonical-measurement-architecture.md`
- `bp`      = `.lovable/canonical-implementation-blueprint.md`
- `gap`     = `.lovable/canonical-gap-analysis.md`
- `val`     = `.lovable/canonical-validation-framework.md`
- `cal`     = `.lovable/canonical-calibration-architecture.md`
- `conf`    = `.lovable/canonical-confidence-architecture.md`
- `gate`    = `.lovable/canonical-production-gate-matrix.md`
- `reality` = `.lovable/canonical-implementation-reality-audit.md`
- `audit`   = `.lovable/analysis-truth-audit.md`
- `extract` = `.lovable/analysis-truth-extraction.md`

Every requirement and every dependency is cited to a Phase 1–10 document.
No new metrics, detectors, anchors, harnesses, gates, thresholds, or
doctrines are introduced. No architecture, validation, calibration,
confidence, or production-gate requirements are modified. Build plan
only.

---

## 1. Build Scope

### 1.1 Authority
- The canonical architecture from Phases 1–9 remains the **sole
  authority** for what must be built.
- This document defines the implementation work required to satisfy
  those requirements; it does not add, remove, relax, or reinterpret
  any of them.
- The Master Implementation Deficit Inventory in `reality §10` is the
  **closed input set**. Every item in `reality §10.1`–`§10.9` appears
  exactly once in the Canonical Build Inventory (§9 below).

### 1.2 Non-additivity
- No new metric, detector, anchor, harness, gate, threshold, or
  doctrine is introduced.
- No estimates, sequencing, prioritization, owners, or dates.
- No file modifications are proposed. The plan enumerates the work
  required; it does not perform it.

### 1.3 Universal preconditions (carried)
Per `val §1.4` every component must, on completion, hold:
1. Non-stub pinned identity (`bp §F1`).
2. Deterministic seed `stableSeed(canonical_trace_fingerprint)`
   (`bp §F3`).
3. Cache-key conformance keyed by
   `(video_sha256_hex, cache_fingerprint_hex)` (`bp §F2`/`§F4`).
4. Canonical missingness routing (`arch §Missingness rules`).
5. Confidence exposure derived from a `cal §5` certificate
   (`conf §1.1`).

Each per-component row below assumes these preconditions are required
for promotion past T1 and lists them where relevant.

---

## 2. Detector Build Matrix

Columns: Current Status (`reality §2`), Required Canonical Outcome,
Missing Components, Required Build Work, Required Validation Work,
Required Calibration Work, Required Confidence Work, Production Gate
Dependency.

| Detector | Current Status | Required Canonical Outcome | Missing Components | Required Build Work | Required Validation Work | Required Calibration Work | Required Confidence Work | Production Gate Dependency |
|---|---|---|---|---|---|---|---|---|
| **D-POSE** | Stub (`reality §2`) — `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"` in `src/lib/biomech/versions.ts` | Deterministic Blazepose-Full landmark extractor per `arch §Landmarks`, `bp §B1`; pinned non-stub model id; per-frame visibility emitted; canonical missingness on `pose_not_detected`; certificate-bound confidence | Non-stub pinned model; landmark-visibility emission; missingness routing; calibration certificate; confidence emission | Land deterministic extractor satisfying `bp §B1` and `arch §Landmarks`; eliminate `@0.0.0-stub` pin per `val §1.4`; route `pose_not_detected` per `arch §Missingness rules` | `val §6.1 H1` deterministic + `val §6.2 H2` ground-truth on golden landmark set; `val §6.5 H5` replay equivalence over `bp §F2` fingerprint | `cal §4 D-POSE` residual envelope; certificate per `cal §3.2` scoped (segment, frame-density, device) | `conf §Detector D-POSE` calibration-bound, monotonic non-increasing per `conf §1.3` | `gate Part 1 D-POSE` ≥T2 |
| **D-HANDS** | Missing (`reality §2`) | Hand-keypoint detector per `arch §Detectors` with pinned model and canonical missingness `hands_not_detected` | Entire detector | Land detector per `bp §B`; route `hands_not_detected` per `arch §Missingness rules` | `val §6.1 H1` + `val §6.2 H2` + `val §6.5 H5` | `cal §4 D-HANDS` residual envelope; certificate per `cal §3.2` | `conf §Detector D-HANDS` calibration-bound | `gate Part 1 D-HANDS` ≥T2 |
| **D-BAT** | Missing — AI-prompt substitute only (`reality §2`) referenced in `src/lib/reportCard/contracts/bh.contract.ts` | Bat knob/mid/barrel-tip detector per `arch §Detectors`; pixel-to-inch scaling certificate per `cal §3.2`; bat-length prior flow per `arch §Calibration framework` | Entire detector; pixel-to-inch certificate; bat-length prior flow | Land detector per `bp §B`; remove AI-only substitute from value path per `arch §Measurement categories`; route `bat_not_detected` | `val §6.1 H1` + `val §6.2 H2` + `val §6.5 H5` on labeled bat-keypoint corpus | `cal §4 D-BAT` knob/mid/barrel-tip residual envelope; pixel-to-inch certificate (required by `bat_speed_contact` per `arch §13`) | `conf §Detector D-BAT` calibration-bound | `gate Part 1 D-BAT` ≥T2 |
| **D-BALL** | Missing (`reality §2`) | Ball-center detector + Kalman uplift per `arch §Detectors` | Entire detector | Land detector per `bp §B`; route `ball_not_detected`; preserve uplift-only semantics per `arch §10 bat_path` | `val §6.1 H1` + `val §6.2 H2` (uplift component) + `val §6.5 H5` | `cal §4 D-BALL` Kalman residual envelope; certificate per `cal §3.2` | `conf §Detector D-BALL` (uplift) calibration-bound | `gate Part 1 D-BALL` ≥T2 where used; uplift-only surfaces remain ungated per `arch §10` |
| **D-CONTACT** | Missing (`reality §2`) | Contact-frame detector (barrel-ball proximity + barrel deceleration; audio uplift) per `arch §Event anchors`; min confidence 0.8 | Entire detector | Land detector per `bp §B`; route `contact_frame_missing` | `val §6.1 H1` + `val §6.2 H2` on labeled contacts + `val §6.5 H5` | `cal §4 D-CONTACT` frame-index residual envelope; certificate per `cal §3.2` | `conf §Detector D-CONTACT` calibration-bound | `gate Part 1 D-CONTACT` ≥T2 |
| **D-PLANT** | Missing (`reality §2`) | Front-foot first-contact / full-plant detector per `arch §Event anchors`; min confidence 0.7 | Entire detector | Land detector per `bp §B`; route `front_foot_first_contact_missing` / `front_foot_full_plant_missing` | `val §6.1 H1` + `val §6.2 H2` on labeled plants + `val §6.5 H5` | `cal §4 D-PLANT` frame-index residual envelope; certificate per `cal §3.2` | `conf §Detector D-PLANT` calibration-bound | `gate Part 1 D-PLANT` ≥T2 |
| **D-RELEASE** | Missing (`reality §2`) | Pitcher-release-frame detector with optional audio assist per `arch §Event anchors §pitcher_release_frame`, `arch §3, §7`; min confidence 0.7 | Entire detector | Land detector per `bp §B`; route `pitcher_release_frame_missing` | `val §6.1 H1` + `val §6.2 H2` on labeled releases + `val §6.5 H5` | `cal §4 D-RELEASE` frame-index residual envelope; certificate per `cal §3.2` | `conf §Detector D-RELEASE` calibration-bound | `gate Part 1 D-RELEASE` ≥T2; precondition for `p2_timing`, `p3_timing` |

---

## 3. Anchor Build Matrix

Columns: Current Status (`reality §3`), Required Canonical Outcome,
Missing Components, Required Build Work, Validation Dependency,
Calibration Dependency, Confidence Dependency, Production Gate
Dependency.

| Anchor | Current Status | Required Canonical Outcome | Missing Components | Required Build Work | Validation Dependency | Calibration Dependency | Confidence Dependency | Production Gate Dependency |
|---|---|---|---|---|---|---|---|---|
| **Launch** (`swing_initiation`) | Missing (`reality §3`) | Deterministic anchor extractor on D-POSE wrist accel + D-BAT knob accel per `arch §Event anchors`; min confidence 0.7; fallback `anchor_not_detected` | Anchor extractor; D-POSE; D-BAT; certificate; confidence | Land anchor extractor per `bp §B`; route missingness per `arch §Missingness rules` | `val §6.1 H1` + `val §6.2 H2 Launch` frame-index harness + `val §6.5 H5` | `cal §5 Launch` residual envelope; certificate per `cal §3.2` | `conf §Anchor Launch` calibration-bound, monotonic | `gate Part 2 Launch` ≥T2; gated by D-POSE ≥T2 and D-BAT ≥T2 |
| **Heel Plant** (`front_foot_first_contact` / `front_foot_full_plant`) | Missing (`reality §3`) | Deterministic anchor extractor on D-PLANT + D-POSE per `arch §Event anchors`; min confidence 0.7 | Anchor extractor; D-POSE; D-PLANT; certificate; confidence | Land anchor extractor per `bp §B`; route `front_foot_*_missing` | `val §6.1 H1` + `val §6.2 H2 Heel Plant` + `val §6.5 H5` | `cal §5 Heel Plant` residual envelope; certificate per `cal §3.2` | `conf §Anchor Heel Plant` calibration-bound | `gate Part 2 Heel Plant` ≥T2; gated by D-POSE ≥T2 and D-PLANT ≥T2 |
| **Contact** (`contact_frame`) | Missing (`reality §3`) | Deterministic anchor extractor on D-CONTACT + D-BAT + D-POSE per `arch §Event anchors`; min confidence 0.8 | Anchor extractor; D-POSE; D-BAT; D-CONTACT; certificate; confidence | Land anchor extractor per `bp §B`; route `contact_frame_missing` | `val §6.1 H1` + `val §6.2 H2 Contact` + `val §6.5 H5` | `cal §5 Contact` residual envelope; certificate per `cal §3.2` | `conf §Anchor Contact` calibration-bound | `gate Part 2 Contact` ≥T2; gated by D-POSE, D-BAT, D-CONTACT ≥T2 |
| **Release** (`pitcher_release_frame`) | Missing (`reality §3`) | Deterministic anchor extractor on D-RELEASE (pose+crop, audio-assist) per `arch §Event anchors`; min confidence 0.7 | Anchor extractor; D-RELEASE; certificate; confidence | Land anchor extractor per `bp §B`; route `pitcher_release_frame_missing` | `val §6.1 H1` + `val §6.2 H2 Release` + `val §6.5 H5` | `cal §5 Release` residual envelope; certificate per `cal §3.2` | `conf §Anchor Release` calibration-bound | `gate Part 2 Release` ≥T2; gated by D-RELEASE ≥T2 |
| **Finish** (`finish_frame`) | Missing (`reality §3`) | Deterministic anchor extractor on D-POSE stillness per `arch §Event anchors`; min confidence 0.6 | Anchor extractor; D-POSE; certificate; confidence | Land anchor extractor per `bp §B`; route missingness per `arch §Missingness rules` | `val §6.1 H1` + `val §6.2 H2 Finish` stillness harness + `val §6.5 H5` | `cal §5 Finish` residual envelope; certificate per `cal §3.2` | `conf §Anchor Finish` calibration-bound | `gate Part 2 Finish` ≥T2; gated by D-POSE ≥T2 |

---

## 4. Metric Build Matrix

All 18 BH metrics from `arch §Part 2`. Every metric is currently
**Partial-AI-only** per `reality §4` and emitted via prompts inside
`src/lib/reportCard/contracts/bh.contract.ts` and consumed by
`src/lib/reportCard/disciplines/bh.ts`. The required canonical outcome
removes the model from the value path per `arch §Measurement
categories` (AI-only is not a permitted production category; hybrid is
permitted only on residual judgement channels).

Columns: Current Status, Required Canonical Outcome, Missing
Components, Required Build Work, Validation Dependency, Calibration
Dependency, Confidence Dependency, Production Gate Dependency.

| # | Metric (`arch §`) | Current Status | Required Canonical Outcome | Missing Components | Required Build Work | Validation Dependency | Calibration Dependency | Confidence Dependency | Production Gate Dependency |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `hip_load` (§1) | Partial-AI-only | Deterministic engine on D-POSE per `arch §1`; scale-free; missingness routing | Deterministic engine; missingness routing; certificate-bound confidence | Land engine per `bp §C`; remove AI from value path | `val §H1` + `val §H2` + `val §H5` | `cal §6 hip_load` scale-free; certificate per `cal §3.2` | `conf §Metric hip_load` product per `arch §Confidence model` | `gate Part 3 #1` ≥T2; gated by D-POSE ≥T2 |
| 2 | `hand_load` (§2) | Partial-AI-only | Deterministic engine on D-POSE per `arch §2`; scale-free | As above | Land engine per `bp §C` | `val §H1` + `val §H2` + `val §H5` | `cal §6 hand_load` scale-free | `conf §Metric hand_load` | `gate Part 3 #2` ≥T2 |
| 3 | `p2_timing` ★ (§3) | Partial-AI-only | Deterministic boolean per `arch §3` over Release → `hand_load_apex` window | Engine; anchors; certificate-bound confidence | Land engine per `bp §C` | `val §H1` + `val §H2` + `val §H4` deadband legality | `cal §6 p2_timing` timing residual envelope per `cal §5 Release` | `conf §Metric p2_timing` | `gate Part 3 #3` ≥T2; gated by D-RELEASE ≥T2 |
| 4 | `eyes_tracking` (§4) | Partial-AI-only | Deterministic engine on D-POSE per `arch §4`; D-BALL uplift | Engine; uplift binding | Land engine per `bp §C` | `val §H1` + `val §H2`; uplift via `val §H2 D-BALL` | `cal §6 eyes_tracking` scale-free; D-BALL uplift bound | `conf §Metric eyes_tracking` | `gate Part 3 #4` ≥T2; uplift surfaces gated by D-BALL ≥T2 |
| 5 | `stride_direction` (§5) | Partial-AI-only | Deterministic engine on D-POSE per `arch §5`; signed degrees over Heel Plant anchor | Engine; anchor | Land engine per `bp §C` | `val §H1` + `val §H2` + `val §H5` | `cal §6 stride_direction` scale-free | `conf §Metric stride_direction` | `gate Part 3 #5` ≥T2 |
| 6 | `heel_plant` (§6) | Partial-AI-only | Deterministic engine on D-POSE per `arch §6` | Engine; anchor | Land engine per `bp §C` | `val §H1` + `val §H2` + `val §H5` | `cal §6 heel_plant` scale-free | `conf §Metric heel_plant` | `gate Part 3 #6` ≥T2 |
| 7 | `p3_timing` ★ (§7) | Partial-AI-only | Deterministic signed-ms engine per `arch §7`; asymmetric deadband; tile must be `score_meter` | Engine; anchors; certificate | Land engine per `bp §C` | `val §H1` + `val §H2` + `val §H4` deadband | `cal §6 p3_timing` timing residual envelope | `conf §Metric p3_timing` | `gate Part 3 #7` ≥T2; gated by D-RELEASE ≥T2 and D-PLANT ≥T2 |
| 8 | `hands_outside_shoulders_at_landing` ★ (§8) | Partial-AI-only | Deterministic boolean on D-POSE at Heel Plant per `arch §8` | Engine; anchor | Land engine per `bp §C` | `val §H1` + `val §H2` boolean harness | `cal §6 hands_outside_shoulders_at_landing` scale-free | `conf §Metric hands_outside_shoulders_at_landing` | `gate Part 3 #8` ≥T2 |
| 9 | `sequencing` (§9) | Partial-AI-only | Deterministic sequence-legality check per `arch §9` (strictly increasing-time landmarks across window) | Engine; anchors | Land engine per `bp §C` | `val §H1` + `val §H2` | `cal §6 sequencing` scale-free | `conf §Metric sequencing` | `gate Part 3 #9` ≥T2 |
| 10 | `bat_path` (§10) | Partial-AI-only | Deterministic shape engine on D-BAT per `arch §10` over `barrel_in_zone_entry` → `contact_frame` → `barrel_in_zone_exit` | Engine; anchors; D-BAT; D-BALL uplift | Land engine per `bp §C` | `val §H1` + `val §H2` + `val §H5` | `cal §6 bat_path`; plane prior per `arch §10 Calibration` | `conf §Metric bat_path` | `gate Part 3 #10` ≥T2; gated by D-BAT ≥T2 |
| 11 | `on_plane` ★ (§11) | Partial-AI-only | Deterministic percentage on D-BAT barrel-axis trace per `arch §11` | Engine; anchors; D-BAT | Land engine per `bp §C` | `val §H1` + `val §H2` + `val §H4` boundary | `cal §6 on_plane`; plane prior | `conf §Metric on_plane` | `gate Part 3 #11` ≥T2; gated by D-BAT ≥T2 |
| 12 | `time_to_contact` ★ (§12) | Partial-AI-only | Deterministic timing on `swing_initiation` → `contact_frame` per `arch §12`; T-high frame density | Engine; anchors; T-high envelope | Land engine per `bp §C` | `val §H1` + `val §H2` + `val §H4` deadband + `val §H5` | `cal §6 time_to_contact` timing residual envelope | `conf §Metric time_to_contact` | `gate Part 3 #12` ≥T2; gated by D-BAT, D-CONTACT ≥T2; T-high required |
| 13 | `bat_speed_contact` ★ (§13) | Partial-AI-only | Hybrid engine on D-BAT barrel-tip with pixel-to-inch scaling per `arch §13`; T-high; bat-length prior flow | Engine; pixel-to-inch certificate; bat-length flow | Land engine per `bp §C`; replace prompt-only 33 in default per `audit S5` / `reality §10.6` | `val §H1` + `val §H2` + `val §H4` + `val §H5` | `cal §6 bat_speed_contact`; pixel-to-inch certificate per `cal §3.2`; bat-length prior with confidence propagation per `arch §Calibration framework` | `conf §Metric bat_speed_contact` propagating bat-length uncertainty linearly per `arch §13` | `gate Part 3 #13` ≥T2; gated by D-BAT, D-CONTACT ≥T2; T-high required |
| 14 | `back_elbow_contact` / connection (§14) | Partial-AI-only | Deterministic engine over Launch → barrel-delivery → Contact per `arch §14`; no single-frame "elbow past belly button" formula | Engine; Launch + Contact anchors | Land engine per `bp §C` | `val §H1` + `val §H2` + `val §H5` | `cal §6 back_elbow_contact` scale-free | `conf §Metric back_elbow_contact` | `gate Part 3 #14` ≥T2; gated by Launch, Contact anchors ≥T2 |
| 15 | `hitters_move` (§15) | Partial-AI-only | Deterministic engine on D-POSE + D-BAT per `arch §15` | Engine; D-BAT | Land engine per `bp §C` | `val §H1` + `val §H2` | `cal §6 hitters_move` | `conf §Metric hitters_move` | `gate Part 3 #15` ≥T2 |
| 16 | `shoulder_plane_steadiness` (§16) | Partial-AI-only | Deterministic shoulder-line angle stability on D-POSE per `arch §16` | Engine; anchors | Land engine per `bp §C` | `val §H1` + `val §H2` | `cal §6 shoulder_plane_steadiness` scale-free | `conf §Metric shoulder_plane_steadiness` | `gate Part 3 #16` ≥T2 |
| 17 | `finish_balance` (§17) | Partial-AI-only | Deterministic engine on D-POSE post-contact per `arch §17` | Engine; Finish anchor | Land engine per `bp §C` | `val §H1` + `val §H2` | `cal §6 finish_balance` scale-free | `conf §Metric finish_balance` | `gate Part 3 #17` ≥T2; gated by Finish anchor ≥T2 |
| 18 | `shoulder_to_shoulder_hold` (§18) | Partial-AI-only | Deterministic hand-cluster-to-back-shoulder spacing % over Heel Plant → Contact per `arch §18`; boolean fallback; leak booleans | Engine; Heel Plant + Contact anchors | Land engine per `bp §C` | `val §H1` + `val §H2` + `val §H5` | `cal §6 shoulder_to_shoulder_hold` scale-free | `conf §Metric shoulder_to_shoulder_hold` | `gate Part 3 #18` ≥T2; gated by Heel Plant, Contact anchors ≥T2 |

---

## 5. Report Card Build Matrix

Columns: Current Status (`reality §5`), Required Canonical Outcome,
Missing Components, Required Build Work, Dependency Requirements,
Production Gate Dependency.

| Surface | Current Status | Required Canonical Outcome | Missing Components | Required Build Work | Dependency Requirements | Production Gate Dependency |
|---|---|---|---|---|---|---|
| **Phase Percentages** | Partial — `src/lib/reportCard/grade.ts` averages measured tiles only | Single-denominator per-phase percentage bound to canonical engine outputs per `arch §Tile semantics` and `val §5`; dual-denominator behaviour resolved per `gate Part 4` | Phase-scoped percentage surface bound to canonical metric values; missingness excluded from denominator | Bind surface to canonical engine outputs per `bp §E1`; remove AI-emitted score inputs from the value path | All 18 metrics at ≥T2 in their phase; canonical missingness routing | `gate Part 4 Phase Percentages` ≥T2 |
| **Phase Orbs** | Partial — orbs consume AI-emitted scores in `src/components/report-card/hammer/visuals/ShareCardExport.tsx` | Replay-stable orbs reflecting canonical per-phase metric outputs per `gate Part 4` | Engine-bound input; replay equivalence | Bind orb state to canonical metric outputs per `bp §E2` | Metrics at ≥T2; `H5` replay-equivalence pass | `gate Part 4 Phase Orbs` ≥T2 |
| **Tile States** | Present-unvalidated — `ReportCardTileSpec.toState` (`src/lib/reportCard/types.ts`, `src/lib/reportCard/disciplines/bh.ts`) returns `pass`/`warn`/`fail`/`missing` over AI-emitted scores | Tile state keyed to canonical metric value + `arch §Missingness rules` enum | Canonical-engine inputs; canonical missingness enum source | Switch tile input source to canonical engine outputs per `bp §E2`; bind missingness to canonical enum | Metrics at ≥T2; canonical missingness enum module landed; certificate-bound confidence per `conf §Surface` | `gate Part 4 Tile States` ≥T2 |
| **Ribbon Generation** | Partial — ribbon/banner copy in `ReportCardTileSpec` fed by AI scores | Replay-stable ribbon text derived from canonical metric outputs per `bp §E3` | Engine-driven ribbon binding | Bind ribbon generator to canonical metric outputs per `bp §E3` | Metrics at ≥T2; `H5` replay-equivalence pass | `gate Part 4 Ribbon Generation` ≥T2 |
| **Confidence Surfacing** | Missing for BH (`reality §5`) — PieV2 has `PieV2Confidence` in `src/lib/pieV2/types.ts` but is not BH and not certificate-bound | Surface exposes calibration-bound confidence per `conf §Surface`; monotonic non-increasing per `conf §1.3` | Surface-level confidence field bound to upstream `cal §5` certificates | Land BH confidence surface per `bp §E4` consuming `conf §Metric` values | Metrics at ≥T2; calibration certificates per `cal §3.2`; confidence emission per `conf §Metric` | `gate Part 4 Confidence Surfacing` ≥T2 |
| **Missingness Surfacing** | Partial — `{ status: "missing" }` exists in tile state union but no canonical missingness enum module | Surface routes `arch §Missingness rules` enum values; never collapses missingness into a number per `val §5` | Canonical missingness enum module; server-side enforcement | Land canonical missingness enum per `arch §Missingness rules`; enforce server-side per `arch §Production-readiness gate` step 4 | Canonical missingness enum module landed; metrics at ≥T2 | `gate Part 4 Missingness Surfacing` ≥T2 |
| **Coaching Layer** | Partial-AI-only — `src/lib/hammer/prescription/dailyPlan.ts` and nudge components consume AI-emitted scores | Presentation-only consumer of engine confidence per `conf §Authority hierarchy` level 5; may not author detector/anchor/metric/confidence values per `gap §D` / `bp §E4` | Engine-bound upstream scores; no authoring of confidence | Re-source coaching layer from canonical engine outputs and `conf §Surface` per `bp §E4`; remove upstream authoring | Surfaces above at ≥T2 | `gate Part 4 Coaching Layer` ≥T2 |

---

## 6. Validation Build Matrix

Maps `reality §10.5` and `reality §10.8` deficits to satisfaction work
against `val §6`. No new harnesses or thresholds.

| Requirement | Current Status (`reality §6`/`§10`) | Required Canonical Outcome | Required Build Work |
|---|---|---|---|
| **H1 — Deterministic** (`val §6.1`) | Partial scaffold — `scripts/replay/verify-determinism.ts` against stub pins | Deterministic replay across pinned non-stub versions per `val §6.1` | Wire `H1` against non-stub pinned versions per `bp §F1` |
| **H2 — Ground-truth** (`val §6.2`) | Missing | Labeled corpus + per-component ground-truth checks for every detector / anchor / metric per `val §6.2` | Land corpus and per-component harness per `val §6.2` |
| **H3 — Calibration-evidence retention** (`val §6.3`, `bp §H3`) | Missing | Evidence-retention module per `val §6.3` and `bp §H3` | Land evidence-retention and certificate store per `bp §H3` |
| **H4 — Boundary / deadband** (`val §6.4`) | Missing | Deadband / legality boundary harness for ★ metrics per `val §6.4` | Land boundary harness for `p2_timing`, `p3_timing`, `time_to_contact`, `on_plane`, `hands_outside_shoulders_at_landing`, `bat_speed_contact`, `back_elbow_contact`, `shoulder_to_shoulder_hold` per `val §6.4` |
| **H5 — Replay equivalence** (`val §6.5`, `bp §H5`) | Partial — composer present in `src/lib/biomech/fingerprint.ts`; equivalence test missing | Byte-equal replay over `bp §F2` fingerprint per `val §6.5` | Land replay corpus + equivalence harness against canonical traces per `bp §H5` |
| **H6 — Version-migration** (`val §6.7`) | Missing | Re-pass harness on any pinned-version change per `val §6.7` | Land migration harness per `val §6.7` |
| **H7 — Demotion-on-regression** (`val §1.5`) | Missing | Demote-on-regression enforcer per `val §1.5` | Land demotion enforcer per `val §1.5` |
| **Universal precondition — pinned identity** (`val §1.4`) | All pins `@0.0.0-stub` in `src/lib/biomech/versions.ts` | Non-stub pinned identity for every component per `bp §F1` | Replace `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION` stubs with bound non-stub pins per `bp §F1` |
| **Universal precondition — deterministic seed** (`val §1.4`) | Structural composer present; `stableSeed(videoId)` regression per `audit S5` not yet exercised against non-stub pipeline | `stableSeed(canonical_trace_fingerprint)` per `bp §F3` | Migrate seed source per `bp §F3`; eliminate `stableSeed(videoId)` per `audit S5` |
| **Universal precondition — cache-key conformance** (`val §1.4`) | Composer present; bound values stub-versioned | Cache keyed by `(video_sha256_hex, cache_fingerprint_hex)` per `bp §F2`/`§F4` | Bind cache keys to non-stub fingerprint per `bp §F2`/`§F4` |
| **Universal precondition — missingness routing** (`val §1.4`) | No canonical missingness enum module present | Canonical missingness enum module per `arch §Missingness rules` routed by every not-produced output | Land canonical missingness enum module and route every not-produced output through it |
| **Universal precondition — confidence exposure** (`val §1.4`) | No canonical confidence module bound to `cal §5` certificates | Every produced output exposes confidence in `[0,1]` per `arch §Confidence model` and `conf §1.1` | Land confidence emission per component bound to `cal §5` certificates |

---

## 7. Calibration Build Matrix

Maps `reality §10.6` deficits to satisfaction work against `cal §3`–
`§6` and `cal §Drift`. No new certificate types, no new drift
classes, no new severity bands.

| Requirement | Current Status (`reality §7`/`§10.6`) | Required Canonical Outcome | Required Build Work |
|---|---|---|---|
| **Calibration certificate model** (`cal §3.2`, `cal §6.1`) | Missing | Certificate authoring with scope binding and version pin per `cal §3.2` | Land certificate model per `cal §3.2` and `cal §6.1` |
| **Detector calibration** (`cal §4 D-POSE/HANDS/BAT/BALL/CONTACT/PLANT/RELEASE`) | Missing for all 7 | Per-detector calibration evidence + certificate per `cal §4` | Land per-detector calibration evidence and certificates per `cal §4` |
| **Anchor calibration** (`cal §5 Launch/Heel Plant/Contact/Release/Finish`) | Missing for all 5 | Per-anchor calibration evidence + certificate per `cal §5` | Land per-anchor calibration evidence and certificates per `cal §5` |
| **Metric calibration** (`cal §6` for 18 BH metrics) | Missing for all 18 | Per-metric calibration evidence + certificate per `cal §6` | Land per-metric calibration evidence and certificates per `cal §6` |
| **Pixel-to-inch certificate for `bat_speed_contact`** (`cal §3.2`, `arch §13`) | Missing | Dedicated pixel-to-inch certificate per `cal §3.2` | Land pixel-to-inch certificate per `cal §3.2` |
| **Certificate retention / supersession** (`cal §6.6`) | Missing | Certificate store + supersession chain per `cal §6.6` | Land certificate store and supersession chain per `cal §6.6` |
| **Drift detection** (`cal §Drift §Detection`) | Missing | Drift detector per `cal §Drift §Detection` | Land drift detector per `cal §Drift §Detection` |
| **Drift classification & severity** (`cal §Drift §Classification`, `§Severity`) | Missing | Classification and severity machinery per `cal §Drift` | Land classification and severity machinery per `cal §Drift` |
| **Drift evidence retention** (`cal §Drift §Evidence`) | Missing | Drift-evidence store per `cal §Drift §Evidence` | Land drift-evidence store per `cal §Drift §Evidence` |
| **Drift → demotion linkage** (`cal §Drift §Promotion`, `val §1.5`) | Missing | Demotion plumbing per `cal §Drift §Promotion` and `val §1.5` | Land demotion plumbing per `cal §Drift §Promotion` and `val §1.5` |

---

## 8. Confidence Build Matrix

Maps `reality §10.7` deficits to satisfaction work against
`conf §Detector`–`§Surface`, `§Propagation`, `§Promotion-Demotion`. No
new confidence sources, no new aggregation operators.

| Requirement | Current Status (`reality §8`/`§10.7`) | Required Canonical Outcome | Required Build Work |
|---|---|---|---|
| **Detector confidence emission** (`conf §Detector`) | Missing for all 7 | Replay-equivalent, certificate-bound confidence per `conf §Detector` | Land per-detector confidence emission bound to `cal §4` certificates |
| **Anchor confidence emission** (`conf §Anchor`, `arch §Event anchors` min-confidence table) | Missing for all 5 | Per-anchor confidence emission per `conf §Anchor` | Land per-anchor confidence emission bound to `cal §5` certificates |
| **Metric confidence aggregation** (`conf §Metric`, `arch §Confidence model`) | Missing for all 18 | Product or visibility-weighted aggregation per `conf §Metric` and `arch §Confidence model`; lineage to inputs | Land metric confidence aggregator per `conf §Metric` |
| **Surface confidence** (`conf §Surface`) | Missing for BH | Monotonic non-increasing presentation-only surface per `conf §Surface` | Bind BH surfaces to upstream confidence per `conf §Surface` |
| **Confidence propagation lineage** (`conf §Propagation`) | Missing | Propagation graph from certificate → detector → anchor → metric → surface per `conf §Propagation` | Land propagation graph per `conf §Propagation` |
| **Confidence invalidation rules** (`conf §Promotion-Demotion`) | Missing | Invalidation enforcement per `conf §Promotion-Demotion` | Land invalidation enforcer per `conf §Promotion-Demotion` |
| **Confidence-vs-missingness routing** (`conf §1.1` Principle 5) | Partial — tile-state union keeps `missing` discrete, but AI-emitted path can collapse missingness into a number | Server-side enforcement that missingness never collapses into a confidence number per `conf §1.1` | Enforce server-side per `arch §Production-readiness gate` step 4 |
| **PieV2 confidence binding (informational)** | Present-unvalidated in pitching only (`src/lib/pieV2/types.ts`); not BH | Out of audit scope; no cross-domain reuse implied | None within this plan |

---

## 9. Production Gate Closure Matrix

Columns: Current Gate Status (`reality §9`), Missing Requirements,
Required Closure Work, Final Target Gate (per `gate` Parts 1–4 and the
`val §1.3` ladder).

| Scope | Current Gate Status | Missing Requirements | Required Closure Work | Final Target Gate |
|---|---|---|---|---|
| **Detectors — D-POSE, D-HANDS, D-BAT, D-BALL, D-CONTACT, D-PLANT, D-RELEASE** | Fails `gate Part 1` for all 7 (`reality §9`) | Non-stub pin (`val §1.4`); deterministic implementation (`bp §B`); `val §H1/H2/H5` pass; `cal §4` certificate; `conf §Detector` emission | Complete §2 rows for each detector; land §6 H1/H2/H3/H5/H6/H7 satisfaction; land §7 detector calibration; land §8 detector confidence | `gate Part 1` ≥T2 for each detector |
| **Anchors — Launch, Heel Plant, Contact, Release, Finish** | Fails `gate Part 2` for all 5 | Required detector eligibility ≥T2; anchor extractor; `val §H1/H2/H5` pass; `cal §5` certificate; `conf §Anchor` emission | Complete §3 rows; depend on detector closure | `gate Part 2` ≥T2 for each anchor |
| **Metrics — all 18 BH metrics** | Fails `gate Part 3` for all 18 | Deterministic engine (`bp §C`); `val §H1/H2/H4/H5` pass; `cal §6` certificate; `conf §Metric` emission; pixel-to-inch cert for `bat_speed_contact`; T-high envelope for `time_to_contact` and `bat_speed_contact` | Complete §4 rows; depend on detector + anchor closure | `gate Part 3` ≥T2 for each metric |
| **Report-card surfaces — Phase Percentages, Phase Orbs, Tile States, Ribbon, Confidence Surfacing, Missingness Surfacing, Coaching Layer** | Fails `gate Part 4` for all 7 | Canonical-engine input sources; canonical missingness enum module; certificate-bound confidence; replay equivalence per `H5` | Complete §5 rows; depend on metric closure | `gate Part 4` ≥T2 for each surface |
| **Demotion pathways — replay-divergence, certificate-invalidation, calibration-drift, confidence-invalidation, missingness-routing, dependency-failure, version-migration** | Not exercisable (`reality §9`) | Replay corpus + `H5`; certificates from §7; drift detection + linkage (`cal §Drift`); confidence invalidation (`conf §Promotion-Demotion`); canonical missingness enum module; dependency graph; migration harness (`H6`) | Complete §6, §7, §8 rows to make each demotion path exercisable per `gate §Demotion authority hierarchy` | Each demotion pathway exercisable per `gate §Demotion authority hierarchy` |

---

## 10. Canonical Build Inventory

Single consolidated list mirroring `reality §10.1`–`§10.9`. Each
deficit appears exactly once and is cited to the canonical clause it
satisfies on completion. No prioritization, no sequencing, no
estimates.

### 10.1 Detectors (`reality §10.1`)
- D-POSE deterministic implementation with non-stub pinned model
  (`arch §Landmarks`, `bp §B1`, `val §1.4`).
- D-HANDS detector (`arch §Detectors`, `bp §B`).
- D-BAT detector with knob / mid / barrel-tip keypoints
  (`arch §Detectors`, `bp §B`).
- D-BALL detector + Kalman uplift (`arch §Detectors`, `bp §B`).
- D-CONTACT detector (`arch §Event anchors §contact_frame`, `bp §B`).
- D-PLANT detector (`arch §Event anchors §front_foot_*`, `bp §B`).
- D-RELEASE detector with optional audio assist
  (`arch §Event anchors §pitcher_release_frame`, `bp §B`).

### 10.2 Anchors (`reality §10.2`)
- Launch (`swing_initiation`) extractor (`arch §Event anchors`,
  `bp §B`).
- Heel Plant (`front_foot_first_contact`, `front_foot_full_plant`)
  extractor (`arch §Event anchors`, `bp §B`).
- Contact (`contact_frame`) extractor (`arch §Event anchors`,
  `bp §B`).
- Release (`pitcher_release_frame`) extractor (`arch §Event anchors`,
  `bp §B`).
- Finish (`finish_frame`) extractor on D-POSE stillness
  (`arch §Event anchors`, `bp §B`).

### 10.3 Metrics — remove AI from value path (`reality §10.3`)
- Deterministic engine for each of the 18 BH metrics
  (`arch §1`–`§18`, `bp §C`), replacing the AI-prompt substitute in
  `src/lib/reportCard/contracts/bh.contract.ts` /
  `src/lib/reportCard/disciplines/bh.ts` per
  `arch §Measurement categories`.

### 10.4 Surfaces (`reality §10.4`)
- Phase Percentages bound to canonical engine outputs (`bp §E1`,
  `gate Part 4`).
- Phase Orbs bound to canonical engine outputs (`bp §E2`,
  `gate Part 4`).
- Tile States bound to canonical engine outputs + canonical
  missingness enum (`bp §E2`, `arch §Missingness rules`,
  `gate Part 4`).
- Ribbon Generation bound to canonical engine outputs (`bp §E3`,
  `gate Part 4`).
- Confidence Surfacing bound to `conf §Metric` / `cal §5`
  certificates (`bp §E4`, `conf §Surface`, `gate Part 4`).
- Missingness Surfacing bound to canonical missingness enum
  (`arch §Missingness rules`, `val §5`, `gate Part 4`).
- Coaching Layer re-sourced from canonical engine outputs and
  `conf §Surface` (`bp §E4`, `gap §D`, `conf §Authority hierarchy`,
  `gate Part 4`).

### 10.5 Validation harnesses (`reality §10.5`)
- `H1` deterministic harness against non-stub pins (`val §6.1`).
- `H2` ground-truth harness + labeled corpus (`val §6.2`).
- `H3` calibration-evidence retention (`val §6.3`, `bp §H3`).
- `H4` boundary / deadband harness for ★ metrics (`val §6.4`).
- `H5` replay-equivalence harness + corpus (`val §6.5`, `bp §H5`).
- `H6` version-migration harness (`val §6.7`).
- `H7` demotion-on-regression enforcer (`val §1.5`).

### 10.6 Calibration (`reality §10.6`)
- Calibration certificate model (`cal §3.2`, `cal §6.1`).
- Per-detector calibration evidence + certificates for all 7
  detectors (`cal §4`).
- Per-anchor calibration evidence + certificates for all 5 anchors
  (`cal §5`).
- Per-metric calibration evidence + certificates for all 18 BH
  metrics (`cal §6`).
- Pixel-to-inch certificate for `bat_speed_contact` (`cal §3.2`,
  `arch §13`).
- Certificate retention and supersession (`cal §6.6`).
- Drift detection (`cal §Drift §Detection`).
- Drift classification and severity (`cal §Drift §Classification`,
  `§Severity`).
- Drift evidence retention (`cal §Drift §Evidence`).
- Drift → demotion linkage (`cal §Drift §Promotion`, `val §1.5`).

### 10.7 Confidence (`reality §10.7`)
- Detector confidence emission for all 7 detectors
  (`conf §Detector`).
- Anchor confidence emission for all 5 anchors (`conf §Anchor`).
- Metric confidence aggregation for all 18 BH metrics
  (`conf §Metric`, `arch §Confidence model`).
- Surface confidence binding for all 7 BH surfaces
  (`conf §Surface`).
- Confidence propagation lineage (`conf §Propagation`).
- Confidence invalidation enforcement (`conf §Promotion-Demotion`).
- Server-side enforcement that missingness never collapses into a
  confidence number (`conf §1.1` Principle 5,
  `arch §Production-readiness gate` step 4).

### 10.8 Universal preconditions (`reality §10.8`)
- Replace `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`,
  `METRIC_ENGINE_VERSION` `@0.0.0-stub` pins in
  `src/lib/biomech/versions.ts` with bound non-stub pins
  (`val §1.4`, `bp §F1`, `audit S3`).
- Migrate seed source to
  `stableSeed(canonical_trace_fingerprint)`, eliminating
  `stableSeed(videoId)` (`bp §F3`, `audit S5`).
- Bind cache keys to `(video_sha256_hex, cache_fingerprint_hex)` on
  non-stub fingerprint (`bp §F2`/`§F4`).
- Land canonical missingness enum module
  (`arch §Missingness rules`).
- Land confidence emission per component bound to `cal §5`
  certificates (`conf §1.1`, `arch §Confidence model`).

### 10.9 Production-eligibility closure (`reality §10.9`)
- Detectors 7/7 to `gate Part 1` ≥T2.
- Anchors 5/5 to `gate Part 2` ≥T2.
- BH metrics 18/18 to `gate Part 3` ≥T2.
- Report-card surfaces 7/7 to `gate Part 4` ≥T2.
- All 7 demotion pathways exercisable per
  `gate §Demotion authority hierarchy`.

---

## 11. Closing Constraints

- Build-plan only.
- No code.
- No implementation.
- No architecture changes.
- No validation changes.
- No calibration changes.
- No confidence changes.
- No production-gate changes.
- No new metrics.
- No new detectors.
- No new anchors.
- No new gates.
- No new doctrines.
- No estimates, sequencing, prioritization, owners, or dates.

All citations resolve to Phases 1–10 canonical documents (`arch`,
`bp`, `gap`, `val`, `cal`, `conf`, `gate`, `reality`, `audit`,
`extract`). All repository references are read-only path citations.
