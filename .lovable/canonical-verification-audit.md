# Canonical Verification Audit (Phase 12)

> **Status:** Verification-only. Defines the evidence required to verify repository compliance with the canonical system established in Phases 1–11. Introduces no architecture, implementation, validation, calibration, confidence, or production-gate requirements.

**Citation legend**
- `arch` → `.lovable/canonical-measurement-architecture.md`
- `bp` → `.lovable/canonical-implementation-blueprint.md`
- `gap` → `.lovable/canonical-gap-analysis.md`
- `val` → `.lovable/canonical-validation-framework.md`
- `cal` → `.lovable/canonical-calibration-architecture.md`
- `conf` → `.lovable/canonical-confidence-architecture.md`
- `gate` → `.lovable/canonical-production-gate-matrix.md`
- `reality` → `.lovable/canonical-implementation-reality-audit.md`
- `build` → `.lovable/canonical-build-plan.md`
- `audit` → `.lovable/analysis-truth-audit.md`
- `extract` → `.lovable/analysis-truth-extraction.md`

---

## 1. Verification Scope

### 1.1 Boundary
This audit defines, per canonical component, the evidence required to demonstrate that the repository state satisfies the canonical requirements established in Phases 1–11. It does not propose work, schedule work, or evaluate feasibility. It does not modify any canonical document.

### 1.2 Authority
The canonical documents listed above remain the sole authoritative sources. Where evidence appears inconsistent across canonical documents, the precedence is: `arch` > `bp` > `val` > `cal` > `conf` > `gate` > `gap` > `reality` > `build` > `audit` > `extract`.

### 1.3 Evaluation Surface
The repository (including but not limited to `src/lib/biomech/`, `src/lib/reportCard/`, `src/lib/determinism/`, `src/lib/replay/`, `src/lib/calibration/`, `src/lib/confidence/`, `src/lib/missingness/`, and all surfaces consuming these layers) is evaluated solely against the canonical requirements. Evidence existing outside canonical scope is excluded.

### 1.4 Trust-Class Reference
All Pass/Failure criteria reference the trust-class ladder (T0–T3) defined in `gate §Trust Classes` and `val §Trust Classes`. No new trust classes are introduced.

### 1.5 Evidence Forms
Permissible evidence forms are exclusively those defined in `val`, `cal`, `conf`, and `gate`: pinned version manifests, determinism harness outputs (H1), ground-truth harness outputs (H2), cross-rig harness outputs (H3), perturbation harness outputs (H4), replay-equivalence harness outputs (H5), calibration-stability harness outputs (H6), confidence-coverage harness outputs (H7), calibration certificates, confidence-propagation traces, missingness-enum traces, and replay-equivalence artifacts. No new evidence forms are introduced.

---

## 2. Detector Verification Matrix

| Detector | Canonical Requirement | Required Evidence | Verification Method | Pass Criteria | Failure Criteria | Source Authority |
|---|---|---|---|---|---|---|
| **D-POSE** | Deterministic detector with non-stub pinned version; emits canonical pose schema; missingness enum on degraded input; confidence per detection. | (a) Non-stub version pin in `src/lib/biomech/versions.ts`; (b) H1 determinism trace; (c) H2 ground-truth report; (d) H3 cross-rig report; (e) H4 perturbation report; (f) calibration certificate; (g) confidence-coverage trace (H7); (h) missingness-enum binding. | Cross-check version pin against `arch §Versioning`; replay (a)–(h) under `stableSeed(canonical_trace_fingerprint)`. | All eight artifacts present, replay-equivalent, and certificate active; trust class ≥ T2. | Any stub version, missing harness artifact, expired/missing certificate, or absent missingness binding. | `arch §Detectors`, `bp §D-POSE`, `val §H1–H7`, `cal §Certificates`, `conf §Coverage`, `gate §Detector Gate`, `reality §Detectors`. |
| **D-HANDS** | Deterministic hand-segmentation detector with non-stub pin; canonical schema; missingness + confidence. | Same evidence set (a)–(h). | Same method. | Same pass. | Same failure. | `arch §Detectors`, `bp §D-HANDS`, `val §H1–H7`, `cal`, `conf`, `gate §Detector Gate`. |
| **D-BAT** | Deterministic bat-tracking detector with non-stub pin; canonical schema; missingness + confidence. | Same evidence set. | Same method. | Same pass. | Same failure. | `arch §Detectors`, `bp §D-BAT`, `val`, `cal`, `conf`, `gate §Detector Gate`. |
| **D-BALL** | Deterministic ball-tracking detector with non-stub pin; canonical schema; missingness + confidence. | Same evidence set. | Same method. | Same pass. | Same failure. | `arch §Detectors`, `bp §D-BALL`, `val`, `cal`, `conf`, `gate §Detector Gate`. |
| **D-CONTACT** | Deterministic contact detector with non-stub pin; canonical schema; missingness + confidence. | Same evidence set. | Same method. | Same pass. | Same failure. | `arch §Detectors`, `bp §D-CONTACT`, `val`, `cal`, `conf`, `gate §Detector Gate`. |
| **D-PLANT** | Deterministic plant-event detector with non-stub pin; canonical schema; missingness + confidence. | Same evidence set. | Same method. | Same pass. | Same failure. | `arch §Detectors`, `bp §D-PLANT`, `val`, `cal`, `conf`, `gate §Detector Gate`. |
| **D-RELEASE** | Deterministic release-event detector with non-stub pin; canonical schema; missingness + confidence. | Same evidence set. | Same method. | Same pass. | Same failure. | `arch §Detectors`, `bp §D-RELEASE`, `val`, `cal`, `conf`, `gate §Detector Gate`. |

---

## 3. Anchor Verification Matrix

| Anchor | Canonical Requirement | Required Evidence | Verification Method | Pass Criteria | Failure Criteria | Source Authority |
|---|---|---|---|---|---|---|
| **Launch** | Deterministic anchor resolver with non-stub pin; consumes only canonical detector outputs; emits anchor index + confidence + missingness. | (a) Non-stub anchor-resolver version pin; (b) H1; (c) H2; (d) H5 replay-equivalence; (e) H6 calibration-stability; (f) calibration certificate; (g) confidence-propagation trace; (h) missingness-enum binding. | Replay anchor under canonical detector outputs; compare against ground-truth fixtures per `val §H2`. | All artifacts present, replay-equivalent, certificate active; trust class ≥ T2. | Stub pin, missing harness output, expired certificate, anchor sourced from AI prompt rather than detector outputs. | `arch §Anchors`, `bp §Launch`, `val`, `cal`, `conf`, `gate §Anchor Gate`, `reality §Anchors`. |
| **Heel Plant** | Same canonical anchor requirements. | Same evidence set. | Same method. | Same pass. | Same failure. | `arch §Anchors`, `bp §Heel Plant`, `val`, `cal`, `conf`, `gate §Anchor Gate`. |
| **Contact** | Same canonical anchor requirements. | Same evidence set. | Same method. | Same pass. | Same failure. | `arch §Anchors`, `bp §Contact`, `val`, `cal`, `conf`, `gate §Anchor Gate`. |
| **Release** | Same canonical anchor requirements. | Same evidence set. | Same method. | Same pass. | Same failure. | `arch §Anchors`, `bp §Release`, `val`, `cal`, `conf`, `gate §Anchor Gate`. |
| **Finish** | Same canonical anchor requirements. | Same evidence set. | Same method. | Same pass. | Same failure. | `arch §Anchors`, `bp §Finish`, `val`, `cal`, `conf`, `gate §Anchor Gate`. |

---

## 4. Metric Verification Matrix

All 18 canonical BH metrics enumerated per `arch §Measurement Categories` and `bp §Metric Engines`. Each row carries the identical evidence schema; rows differ only in canonical metric identity.

**Shared columns for every metric row:**

- **Canonical Requirement:** Deterministic engine with non-stub pinned `MetricEngine` version; consumes only canonical detector + anchor outputs; emits value + canonical confidence + missingness enum; bound to active calibration certificate. (`arch §Measurement Categories`, `bp §Metric Engines`.)
- **Required Evidence:** (a) non-stub engine version pin in `src/lib/biomech/versions.ts`; (b) H1 determinism; (c) H2 ground-truth; (d) H3 cross-rig; (e) H4 perturbation; (f) H5 replay-equivalence; (g) H6 calibration-stability; (h) H7 confidence-coverage; (i) calibration certificate; (j) confidence-propagation trace; (k) missingness-enum trace.
- **Verification Method:** Replay engine outputs under `stableSeed(canonical_trace_fingerprint)`; compare against fixtures per `val §H2`; verify certificate active per `cal §Certificates`; verify confidence propagation per `conf §Propagation`.
- **Pass Criteria:** All artifacts (a)–(k) present, replay-equivalent, certificate active, drift below `cal §Drift Thresholds`; trust class ≥ T2 per `gate §Metric Gate`.
- **Failure Criteria:** Any stub pin, AI-prompt substitute, missing harness artifact, expired/missing certificate, missing missingness binding, or surface consumption bypassing canonical engine output.
- **Source Authority:** `arch §Measurement Categories`, `bp §<metric>`, `val §H1–H7`, `cal`, `conf`, `gate §Metric Gate`, `reality §Metrics`.

| # | Metric |
|---|---|
| M-01 | Stance Width Index |
| M-02 | Load Depth |
| M-03 | Stride Length |
| M-04 | Heel-Plant Timing |
| M-05 | Front-Side Block Index |
| M-06 | Hip-Shoulder Separation |
| M-07 | Pelvis Rotational Velocity |
| M-08 | Torso Rotational Velocity |
| M-09 | Kinematic Sequencing Index |
| M-10 | Bat Lag |
| M-11 | On-Plane Index |
| M-12 | Bat Path Length |
| M-13 | Attack Angle |
| M-14 | Time-to-Contact |
| M-15 | Contact Depth |
| M-16 | Hand Path Efficiency |
| M-17 | Finish Balance Index |
| M-18 | Deceleration Control |

---

## 5. Report Card Verification Matrix

| Surface | Canonical Requirement | Required Evidence | Verification Method | Pass Criteria | Failure Criteria | Source Authority |
|---|---|---|---|---|---|---|
| **Phase Percentages** | Derived solely from canonical metric engine outputs and calibration-bound confidence; no AI-emitted score consumption. | (a) Surface-input lineage trace showing only canonical engines as upstream; (b) H5 replay-equivalence; (c) confidence-propagation trace per `conf §Surfacing`. | Replay surface under canonical engine outputs; verify lineage. | Lineage canonical-only; replay-equivalent; trust class ≥ T2. | Any AI-prompt input, missing lineage, replay divergence. | `arch §Report Card`, `bp §Phase Percentages`, `conf §Surfacing`, `gate §Surface Gate`, `reality §Surfaces`. |
| **Phase Orbs** | Orb states derived from canonical engines + confidence + missingness enum. | (a) Lineage trace; (b) H5 replay artifact; (c) missingness-enum binding; (d) confidence-propagation trace. | Replay orb state under canonical outputs; verify missingness routing. | All artifacts present; replay-equivalent; trust class ≥ T2. | Missing missingness binding, AI input, replay divergence. | `arch §Report Card`, `bp §Phase Orbs`, `conf`, `gate §Surface Gate`. |
| **Tile States** | Tile state machine derived from canonical metric outputs + confidence thresholds defined in `conf §Surfacing`. | (a) Lineage trace; (b) H5 replay artifact; (c) confidence-propagation trace; (d) missingness-enum binding. | Replay tile state machine under canonical outputs. | Lineage canonical-only; replay-equivalent; thresholds match `conf §Surfacing`; trust class ≥ T2. | Threshold drift, AI input, replay divergence. | `arch §Report Card`, `bp §Tiles`, `conf §Surfacing`, `gate §Surface Gate`. |
| **Ribbon Generation** | Ribbon assembled deterministically from canonical metric + anchor outputs; replay-stable. | (a) Lineage trace; (b) H1 determinism artifact for ribbon assembler; (c) H5 replay artifact. | Replay ribbon generator under canonical outputs. | Deterministic; replay-equivalent; trust class ≥ T2. | Non-deterministic ordering, AI input, replay divergence. | `arch §Report Card`, `bp §Ribbon`, `val §H1`, `gate §Surface Gate`. |
| **Confidence Surfacing** | Surface-level confidence values bound to calibration certificates per `conf §Surfacing` and `cal §Certificates`. | (a) Confidence-propagation trace; (b) active calibration certificate per metric; (c) H7 coverage artifact. | Verify per-surface confidence values match `conf §Propagation` formulas under active certificates. | Match within `cal §Drift Thresholds`; trust class ≥ T2. | Hard-coded confidence, missing certificate, drift breach. | `conf §Surfacing`, `cal §Certificates`, `gate §Surface Gate`. |
| **Missingness Surfacing** | All degraded-input states surfaced via canonical missingness enum; no silent suppression. | (a) Missingness-enum trace per surface; (b) H5 replay artifact under degraded fixtures. | Replay surface under degraded fixtures per `val §H2`; verify enum routing. | All degraded states surfaced via enum; replay-equivalent; trust class ≥ T2. | Silent suppression, ad-hoc strings, missing enum binding. | `arch §Missingness`, `conf §Missingness`, `gate §Surface Gate`. |
| **Coaching Layer** | Coaching text generated only from canonical metric + confidence + missingness inputs; no surface authoring beyond canonical lineage. | (a) Coaching-input lineage trace; (b) H5 replay artifact for deterministic coaching selection; (c) confidence + missingness inputs. | Replay coaching selection under canonical inputs. | Lineage canonical-only; deterministic; replay-equivalent; trust class ≥ T2. | Free-form AI authoring without lineage, replay divergence. | `arch §Coaching`, `bp §Coaching`, `conf`, `gate §Surface Gate`. |

---

## 6. Validation Verification Matrix

Audited solely against `val`. No new harnesses, gates, or thresholds introduced.

| Harness | Canonical Requirement (`val`) | Required Evidence | Verification Method | Pass Criteria | Failure Criteria |
|---|---|---|---|---|---|
| **H1 Determinism** | Per-component determinism under `stableSeed(canonical_trace_fingerprint)`. | H1 artifact per detector, anchor, metric, surface. | Replay component N times; compare byte-equivalence. | All replays byte-equivalent. | Any non-determinism. |
| **H2 Ground-Truth** | Per-component ground-truth agreement against canonical fixtures. | H2 artifact per component. | Run against canonical fixture set. | Agreement within `val §H2` tolerance. | Tolerance breach. |
| **H3 Cross-Rig** | Stability across canonical rigs. | H3 artifact per component. | Run on each rig; compare. | Within `val §H3` tolerance. | Breach. |
| **H4 Perturbation** | Robustness under canonical perturbation set. | H4 artifact per component. | Apply perturbations; measure delta. | Within `val §H4` envelope. | Envelope breach. |
| **H5 Replay-Equivalence** | Replay equivalence across version migrations. | H5 artifact per component. | Replay across pinned versions. | Equivalent within `val §H5`. | Divergence. |
| **H6 Calibration-Stability** | Calibration stability across time and recalibration cycles. | H6 artifact per component. | Compare consecutive calibration certificates. | Drift within `cal §Drift Thresholds`. | Drift breach. |
| **H7 Confidence-Coverage** | Confidence coverage matches calibration-derived expectations. | H7 artifact per component. | Empirical coverage vs nominal per `conf §Coverage`. | Within `conf §Coverage` band. | Band breach. |

---

## 7. Calibration Verification Matrix

Audited solely against `cal`. No new calibration rules introduced.

| Requirement (`cal`) | Required Evidence | Verification Method | Pass Criteria | Failure Criteria |
|---|---|---|---|---|
| Active calibration certificate per detector / anchor / metric. | Certificate artifact; issuance metadata; pinned-version binding. | Cross-check certificate registry against canonical component inventory. | Certificate present, unexpired, version-bound. | Missing, expired, or unbound certificate. |
| Drift detection bound to demotion linkage per `cal §Drift`. | Drift-detection trace; demotion-link record. | Replay drift detector against H6 outputs. | Drift breach demotes per `gate §Demotion`. | No demotion on breach. |
| Recalibration provenance preserved. | Provenance log per certificate. | Verify lineage from prior certificate. | Continuous provenance chain. | Broken chain. |
| Certificate scope matches canonical component identity. | Scope binding metadata. | Compare scope vs canonical inventory. | Exact match. | Scope drift. |

---

## 8. Confidence Verification Matrix

Audited solely against `conf`. No new confidence rules introduced.

| Requirement (`conf`) | Required Evidence | Verification Method | Pass Criteria | Failure Criteria |
|---|---|---|---|---|
| Per-component confidence emission bound to calibration. | Confidence-emission trace + active certificate. | Replay emission under canonical inputs. | Values match `conf §Propagation`. | Hard-coded or uncalibrated values. |
| Confidence propagation across detector → anchor → metric → surface. | Propagation trace spanning full lineage. | Replay end-to-end. | Propagation matches `conf §Propagation` formulas. | Lineage gap or formula deviation. |
| Confidence invalidation on missingness or certificate expiry. | Invalidation-event trace. | Inject degraded fixtures and expired certificates per `val §H2`. | Invalidation routes per `conf §Invalidation`. | Silent passthrough. |
| Coverage matches calibrated expectations. | H7 artifact. | Empirical vs nominal coverage. | Within `conf §Coverage` band. | Band breach. |

---

## 9. Production Gate Verification Matrix

Verifies satisfaction of every gate defined in `gate`. References Phase 9 only.

| Gate (`gate`) | Required Evidence | Verification Method | Pass Criteria | Failure Criteria |
|---|---|---|---|---|
| **Universal Precondition Gate** | Non-stub pins for Landmark Model, Detector, Metric Engine in `src/lib/biomech/versions.ts`; canonical missingness enum module; `stableSeed(canonical_trace_fingerprint)`. | Inspect version manifest; verify enum module; verify seed binding. | All preconditions met. | Any stub pin or missing precondition. |
| **Detector Gate** | Per `gate §Detector Gate`: H1–H7 + certificate + confidence + missingness. | Per §2 above. | Trust class ≥ T2. | Below T2. |
| **Anchor Gate** | Per `gate §Anchor Gate`. | Per §3 above. | Trust class ≥ T2. | Below T2. |
| **Metric Gate** | Per `gate §Metric Gate`. | Per §4 above. | Trust class ≥ T2. | Below T2. |
| **Surface Gate** | Per `gate §Surface Gate`. | Per §5 above. | Trust class ≥ T2. | Below T2. |
| **Replay-Equivalence Gate** | H5 artifact for every component under every pinned version. | Run H5 across version matrix. | All equivalent. | Any divergence. |
| **Calibration-Drift Gate** | Drift trace ≤ `cal §Drift Thresholds`; demotion linkage active. | Compare consecutive H6 artifacts. | Within thresholds. | Breach without demotion. |
| **Confidence-Invalidation Gate** | Invalidation events on missingness/expiry. | Inject degraded fixtures; verify routing. | Routes per `conf §Invalidation`. | Silent passthrough. |
| **Missingness-Routing Gate** | Enum-bound missingness on every surface. | Replay degraded fixtures across surfaces. | Enum-routed everywhere. | Any ad-hoc or silent state. |
| **Version-Migration Gate** | Replay-equivalence preserved across version migrations. | H5 across migration pairs. | Equivalent or canonical migration record. | Unrecorded divergence. |
| **Trust-Class Demotion Gate** | Failure on any gate above demotes trust class per `gate §Demotion`. | Verify demotion linkage triggers. | Demotion occurs on failure. | No demotion on failure. |

---

## 10. Canonical Verification Inventory

Single consolidated, deduplicated list of all evidence required to demonstrate constitutional compliance. Every requirement appears exactly once.

### 10.1 Versioning Evidence
- V-01 — Non-stub Landmark Model pin in `src/lib/biomech/versions.ts`.
- V-02 — Non-stub Detector version pin per detector (D-POSE, D-HANDS, D-BAT, D-BALL, D-CONTACT, D-PLANT, D-RELEASE).
- V-03 — Non-stub Anchor-resolver version pin per anchor (Launch, Heel Plant, Contact, Release, Finish).
- V-04 — Non-stub Metric Engine version pin per metric (M-01…M-18).
- V-05 — Non-stub Surface-binding version pin per surface (Phase Percentages, Phase Orbs, Tile States, Ribbon Generation, Confidence Surfacing, Missingness Surfacing, Coaching Layer).
- V-06 — Canonical `stableSeed(canonical_trace_fingerprint)` binding present at all replay surfaces.
- V-07 — Canonical missingness-enum module present and referenced by every component listed in V-02 through V-05.

### 10.2 Determinism Evidence (H1)
- H1-D — H1 artifact per detector (×7).
- H1-A — H1 artifact per anchor (×5).
- H1-M — H1 artifact per metric (×18).
- H1-S — H1 artifact per surface (×7).

### 10.3 Ground-Truth Evidence (H2)
- H2-D — per detector (×7).
- H2-A — per anchor (×5).
- H2-M — per metric (×18).

### 10.4 Cross-Rig Evidence (H3)
- H3-D, H3-A, H3-M — per detector / anchor / metric.

### 10.5 Perturbation Evidence (H4)
- H4-D, H4-A, H4-M — per detector / anchor / metric.

### 10.6 Replay-Equivalence Evidence (H5)
- H5-D, H5-A, H5-M, H5-S — per detector / anchor / metric / surface; plus H5-MIG across every version-migration pair.

### 10.7 Calibration-Stability Evidence (H6)
- H6-D, H6-A, H6-M — per detector / anchor / metric.

### 10.8 Confidence-Coverage Evidence (H7)
- H7-D, H7-A, H7-M — per detector / anchor / metric.

### 10.9 Calibration Certificates
- C-CERT-D — active certificate per detector.
- C-CERT-A — active certificate per anchor.
- C-CERT-M — active certificate per metric.
- C-DRIFT — drift-trace + demotion-link record per certificate.
- C-PROV — recalibration-provenance log per certificate.
- C-SCOPE — scope-binding metadata per certificate.

### 10.10 Confidence Evidence
- CF-EMIT — per-component confidence-emission trace.
- CF-PROP — end-to-end confidence-propagation trace (detector → anchor → metric → surface).
- CF-INV — confidence-invalidation event trace under degraded inputs and expired certificates.
- CF-COV — empirical-vs-nominal coverage report (cross-reference H7).

### 10.11 Missingness Evidence
- MS-BIND — missingness-enum binding per component (detector / anchor / metric / surface).
- MS-ROUTE — missingness-routing trace per surface under degraded fixtures.

### 10.12 Surface Lineage Evidence
- SL-PP — Phase Percentages lineage trace.
- SL-PO — Phase Orbs lineage trace.
- SL-TS — Tile States lineage trace.
- SL-RG — Ribbon Generation lineage trace.
- SL-CS — Confidence Surfacing lineage trace.
- SL-MS — Missingness Surfacing lineage trace.
- SL-CL — Coaching Layer lineage trace.

### 10.13 Production Gate Evidence
- G-UPC — Universal Precondition Gate satisfaction record.
- G-DET — Detector Gate trust-class record per detector.
- G-ANC — Anchor Gate trust-class record per anchor.
- G-MET — Metric Gate trust-class record per metric.
- G-SUR — Surface Gate trust-class record per surface.
- G-REP — Replay-Equivalence Gate matrix.
- G-DFT — Calibration-Drift Gate record.
- G-INV — Confidence-Invalidation Gate record.
- G-MIS — Missingness-Routing Gate record.
- G-MIG — Version-Migration Gate record.
- G-DEM — Trust-Class Demotion linkage record.

---

## 11. Closing Constraints

- Verification audit only.
- No code.
- No implementation.
- No architecture changes.
- No validation changes.
- No calibration changes.
- No confidence changes.
- No production-gate changes.
- No estimates.
- No sequencing.
- No prioritization.
- No new metrics.
- No new detectors.
- No new anchors.
- No new gates.
- No new doctrines.
