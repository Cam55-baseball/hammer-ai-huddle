# Canonical Authority Amendment

Amendment to the canonical stack closing the authority gaps enumerated
in Execution Cycle 6 §5 without introducing any new metrics, detectors,
anchors, validation rules, calibration rules, confidence rules,
production gates, architectures, or doctrines.

This amendment defines **authority holders** and **first-issuance
triggers** over requirements that already exist in canon. It adds
zero requirements, zero ceilings, zero evidence items, zero gates.

Citation shorthand mirrors Cycles 5–6:
`bp` = `canonical-build-plan.md`,
`val` = `canonical-validation-framework.md`,
`cal` = `canonical-calibration-architecture.md`,
`conf` = `canonical-confidence-architecture.md`,
`gate` = `canonical-production-gate-matrix.md`,
`ver` = `canonical-verification-audit.md`,
`auth` = `canonical-execution-authorization.md`,
`pra` = `canonical-production-readiness-audit.md`,
`c5` / `c6` = `execution-cycle-5/6-*.md`.

---

## 1. Amendment Scope

This amendment addresses **exactly** the unresolved Cycle 6 §5 minimum
authority set, plus the four already-resolved certificate-issuer
restatements required for clean hierarchy mapping in §5 below.

In scope (gaps to close):

1. First-issuance authority for the non-stub triplet
   `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION`
   (Cycle 6 §5 item 1; §1 G1–G3; §2.4).
2. MVCS-scope partial-pin carve-out (Cycle 6 §5 item 2; §1 G4; §2.4).
3. Fixture creator authority (Cycle 6 §5 item 3; §1 G5; §3 row 1).
4. Fixture approval authority (Cycle 6 §5 item 4; §1 G6; §3 row 2).
5. Fixture immutability authority at the moment of approval
   (Cycle 6 §5 item 5; §1 G7; §3 row 3).

Restated for hierarchy completeness only (already resolved in
Cycle 6 §1 G10–G13 / §4):

6. Detector / anchor / metric / confidence certificate issuance
   (already named in `cal §6.2`, `conf §87`/§488/§530).

Explicitly **out of scope** (Cycle 6 §5 explicitly excludes these from
the minimum set):

- Fixture retirement authority (Cycle 6 §1 G8) — not required for
  first execution.
- Fixture supersession authority (Cycle 6 §1 G9) — not required for
  first execution.
- Any new metric, detector, anchor, validation/calibration/confidence
  requirement, or production gate.
- Any change to existing pin shape (`bp §F1`), composite-hash
  discipline (`pra §59`/§89`), evidence sets (`val §6.1`–§6.6,
  `ver §2`–§4`), promotion ladders (`val §3`/§5`, `gate Part 1–3`),
  or certificate lifecycles (`cal §6.1`–§6.5`).

---

## 2. Version Issuance Authority

For each pin, this amendment names (a) the authority holder, (b) the
first-issuance trigger condition expressed solely as a precondition
over already-existing canonical requirements, and (c) the partial-pin
carve-out applicable to the MVCS scope.

No new pin shape, hash discipline, or migration semantics is
introduced. `bp §F1` pin shape and `val §6.7` migration re-pass are
unmodified.

### 2.1 `LANDMARK_MODEL_VERSION`

- **Authority holder.** The validation framework (`val §6` / `val §7`),
  acting under the same scope that `cal §6.2` already grants it for
  certificate issuance.
- **First-issuance trigger.** A non-stub value for
  `LANDMARK_MODEL_VERSION` may be issued by the validation framework
  iff the existing D-POSE T1→T2 evidence set (`val` line 145;
  `val §6.1` H1 inputs; `val §1.4` universal preconditions;
  `ver §2`; `gate Part 1` T1→T2 row 211: detector-pin non-stub
  directive, H1 pass on a canonical fixture, canonical missingness
  binding, per-keypoint confidence emission) is satisfied **against a
  canonical fixture issued under §3 below**.
- **Composite-pin discipline.** The composite shape required by
  `bp §F1` and the migration re-pass required by `val §6.7` are
  preserved unchanged. The first-issuance event constitutes the
  initial composite over the MVCS scope as bounded by §2.4 below.

### 2.2 `DETECTOR_VERSION`

- **Authority holder.** The validation framework (`val §6` / `val §7`),
  per `cal §6.2` issuer scope.
- **First-issuance trigger.** A non-stub value for `DETECTOR_VERSION`
  may be issued iff the existing Finish anchor T1→T2 evidence set
  (`val §3` ladder; `val §6.1`/§6.2`/§6.4`/§6.6`; `ver §3`;
  `gate Part 2` T1→T2 row) is satisfied against a §3-approved fixture.
- **Composite-pin discipline.** `bp §F1` and `pra §59` composite-hash
  shape preserved. See §2.4 for the carve-out that bounds the
  composite to the MVCS scope at first issuance.

### 2.3 `METRIC_ENGINE_VERSION`

- **Authority holder.** The validation framework (`val §6` / `val §7`),
  per `cal §6.2` issuer scope.
- **First-issuance trigger.** A non-stub value for
  `METRIC_ENGINE_VERSION` may be issued iff the existing
  `finish_balance` T1→T2 evidence set (`val §5` / `val §3` chain;
  `val §6.1`–§6.6`; `val §1.4`; `ver §4`; `gate Part 3` T1→T2 row;
  Partial-AI ceiling per `conf`) is satisfied against a §3-approved
  fixture.
- **Composite-pin discipline.** `bp §F1` and `pra §89` composite-hash
  shape preserved. See §2.4.

### 2.4 MVCS-scope partial-pin carve-out

The composite-hash discipline established in `bp §F1`, `pra §59`, and
`pra §89` is preserved unchanged. This amendment adds **no relaxation,
no exception, and no parallel pin form**. It defines only the
**bootstrap scope** over which the first composite is computed:

- At first issuance, each composite hash is computed over the
  **canonical MVCS scope** (D-POSE; Finish anchor; `finish_balance`
  metric) as enumerated by Cycle 2 / Cycle 4 and reaffirmed by
  Cycle 5 §2. Components outside this scope remain at
  `@0.0.0-stub` and are bound into the composite as stubs, exactly
  as `bp §F1` already permits prior to their own first-issuance event.
- Any subsequent addition of a detector or metric outside the MVCS
  scope follows the existing `val §6.7` migration re-pass rule
  unmodified, producing a new composite that supersedes the prior one
  via the standard supersession pointer defined in `cal §6.1`.

No new pin shape, hash function, or composite discipline is
introduced. The carve-out is solely a statement that stub-valued
components participate in the composite exactly as `bp §F1` already
defines, and that this is the legal first-issuance state.

---

## 3. Fixture Authority

For each fixture-lifecycle authority gap identified in Cycle 6 §3,
this amendment names the authority holder and the trigger condition,
expressed solely as preconditions over existing canonical
requirements. No new fixture format, content requirement, evidence
field, or retention rule is introduced.

### 3.1 Fixture creator

- **Authority holder.** The validation framework (`val §6` / `val §7`),
  per `cal §6.2` issuer scope, extended by this amendment from
  certificate issuance to canonical-fixture authorship over the
  inputs already named by `val §6.1` ("Canonical fixture; pinned
  component version") and `bp §H1`–§H6.
- **Constraint.** Fixture content requirements remain those already
  named in `val §6.1`, `bp §H1`–§H6`, and `ver §6`. This amendment
  adds no fixture content requirement.

### 3.2 Fixture approval

- **Authority holder.** The validation framework (`val §6` / `val §7`).
- **Trigger.** A fixture authored under §3.1 becomes a canonical input
  iff the validation framework records its hash, its pinned component
  version, and the universal preconditions of `val §1.4`, using the
  evidence retention mechanism already defined by `val §1.6` and
  `cal §6.3`.
- **Constraint.** No new approval evidence beyond what `val §1.4`,
  `val §1.6`, and `cal §6.3` already require.

### 3.3 Fixture immutability at the moment of approval

- **Authority holder.** The validation framework (`val §6` / `val §7`),
  acting through the existing immutable retention handle defined by
  `cal §6.3`.
- **Trigger.** At the moment of §3.2 approval, the fixture's hash is
  pinned via the same immutable retention handle that `cal §6.3`
  already mandates for every artifact named inside an evidence
  manifest. The bootstrap gap identified in Cycle 6 §1 G7 / §3 row 3
  is closed by stating that §3.2 approval **is itself** a retention
  event under `cal §6.3`, applied to the fixture artifact directly.
- **Constraint.** No new hash function, retention format, or storage
  rule is introduced. `cal §6.3` semantics are preserved unchanged.

### 3.4 Fixture supersession and retirement (out of scope, restated)

Per Cycle 6 §5, fixture supersession (G9) and retirement (G8) are
**not** in the minimum authority set required for first execution and
are not amended here. The existing certificate-level supersession
pointer (`cal §6.1`) and certificate invalidation cascade
(`cal §6.4`) continue to govern downstream artifacts unchanged.

---

## 4. Certificate Issuance Authority

Already canonically resolved in `cal §6.2` and `conf §87`/§488/§530
(Cycle 6 §1 G10–G13; §4). Restated here for hierarchy completeness
only; this amendment adds nothing.

- **Detector certificate issuer.** Validation framework, per
  `cal §6.2`, gated by `gate Part 1` T1→T2 row.
- **Anchor certificate issuer.** Validation framework, per
  `cal §6.1` typing and `cal §6.2`, gated by `gate Part 2`.
- **Metric certificate issuer.** Validation framework, per
  `cal §6.1` / `cal §6.2`, gated by `gate Part 3`; composite pin
  preserved per `pra §89`.
- **Confidence certificate issuer.** Validation framework, per
  `cal §6.2` and `conf §87` / `conf §488` / `conf §530`; issued
  alongside the corresponding artifact certificate per `cal §5.5`.

All four issuances remain conditional on (i) a non-stub pin under §2
and (ii) a §3-approved fixture inside the evidence manifest required
by `val §6.1`. With §2 and §3 in force, those preconditions are now
satisfiable.

---

## 5. Authority Hierarchy

Mapping of each authority defined or restated above to the existing
canonical framework it operates within. No new framework is created.

| Authority (this amendment) | Holder | Operates within (existing framework) | Existing citation |
|---|---|---|---|
| §2.1 First-issuance `LANDMARK_MODEL_VERSION` | Validation framework | Validation (`val §6`/§7), Pin (`bp §F1`), Migration (`val §6.7`), Gate (`gate Part 1`) | `val §6.1`, `bp §F1`, `gate Part 1` T1→T2 row 211 |
| §2.2 First-issuance `DETECTOR_VERSION` | Validation framework | Validation, Pin, Composite discipline (`pra §59`), Gate (`gate Part 2`) | `val §3`, `bp §F1`, `pra §59`, `ver §3` |
| §2.3 First-issuance `METRIC_ENGINE_VERSION` | Validation framework | Validation, Pin, Composite discipline (`pra §89`), Gate (`gate Part 3`), Confidence ceiling (`conf` Partial-AI) | `val §5`/§3, `bp §F1`, `pra §89`, `ver §4` |
| §2.4 MVCS-scope partial-pin carve-out | (Definitional only — no new authority) | Pin (`bp §F1`), Migration (`val §6.7`), Supersession (`cal §6.1`) | `bp §F1`, `pra §59`/§89, `val §6.7`, `cal §6.1` |
| §3.1 Fixture creator | Validation framework | Validation (`val §6`/§7), H1 inputs (`val §6.1`), Build (`bp §H1`–§H6`), Verification (`ver §6`) | `val §6.1`, `bp §H1`–§H6, `ver §6` |
| §3.2 Fixture approval | Validation framework | Validation preconditions (`val §1.4`), Retention (`val §1.6`, `cal §6.3`) | `val §1.4`/§1.6, `cal §6.3` |
| §3.3 Fixture immutability at approval | Validation framework | Calibration retention (`cal §6.3`) | `cal §6.3` |
| §4 Detector / anchor / metric / confidence certificate issuance | Validation framework | Calibration issuance (`cal §6.1`/§6.2`), Confidence recovery (`conf §87`/§488/§530), Gate (`gate Part 1–3`) | `cal §6.1`/§6.2`, `conf §87`/§488/§530, `gate Part 1–3` |

Single authority holder across all rows: the **validation framework**
already named by `cal §6.2`. This amendment introduces no new
authority body and no parallel issuance path.

---

## 6. Amendment Impact Analysis

Explicit verification that this amendment changes nothing beyond
authority assignments and first-issuance trigger conditions over
already-existing requirements.

| Canonical surface | Changed? | Evidence |
|---|---|---|
| Metrics (count, identity, formulas) | No | No metric named, defined, modified, or removed in §1–§5. `finish_balance` is referenced only as the existing MVCS metric per Cycle 4. |
| Detectors (count, identity, behavior) | No | D-POSE and Finish are referenced only as the existing MVCS detector/anchor per Cycle 4. |
| Anchors | No | Finish referenced only as existing anchor; no anchor added/modified. |
| Validation requirements (`val §1.4`, §6.1`–§6.7`) | No | All §2/§3 triggers reference existing evidence sets and preconditions verbatim; no new evidence field, ladder row, or precondition introduced. |
| Calibration requirements (`cal §5`, §6`) | No | `cal §6.1`–§6.5` lifecycle preserved; `cal §6.3` retention semantics applied as-is to fixture artifacts (Cycle 6 §3 already established `cal §6.3` covers manifest-named artifacts; §3.3 names §3.2 approval as the retention event). |
| Confidence requirements (`conf` ceilings, Partial-AI rules, certificate flow) | No | `conf §87`/§488/§530 issuance flow preserved; no new ceiling, partition, or calibration. |
| Production gates (`gate Part 1–3` T1→T2 rows) | No | Gate rows referenced as-is as the triggers for §2.1–§2.3. No row added, removed, or relaxed. |
| Pin shape and composite discipline (`bp §F1`, `pra §59`/§89`) | No | §2.4 confirms stub-valued components participate in the composite exactly as `bp §F1` already permits; no relaxation, no exception, no parallel pin form. |
| Migration rule (`val §6.7`) | No | Re-pass-on-migration preserved unchanged; subsequent scope expansion follows it. |
| Certificate lifecycle (`cal §6.1`–§6.5`) | No | Supersession pointer, invalidation cascade, retention handle all preserved. |
| Authority hierarchy (`auth §2`–§3`) | Extended within bounds | `auth §2` forbids introducing **further authority sources**; this amendment introduces none — all authorities resolve to the validation framework already named in `cal §6.2`. `auth §3` forbids reinterpretation or relaxation of the canonical stack; this amendment relaxes nothing and only assigns the existing validation-framework authority to the previously unnamed first-issuance and fixture-lifecycle events. |

No code, no implementation, no architecture, no doctrine. The
amendment is purely an authority-assignment overlay on existing
canonical requirements.

---

## 7. Closing Determination

**AUTHORITY GAP CLOSED.**

Justification, mapping each Cycle 6 §5 minimum-set item to the
section that closes it:

- Cycle 6 §5 item 1 (first-issuance triplet) → closed by §2.1, §2.2,
  §2.3, each naming the validation framework as holder and binding
  the first-issuance trigger to existing T1→T2 evidence sets.
- Cycle 6 §5 item 2 (MVCS-scope partial-pin carve-out) → closed by
  §2.4, which adds no new pin form and instead clarifies that the
  bootstrap composite is computed over the MVCS scope with
  out-of-scope components held at `@0.0.0-stub` exactly as `bp §F1`
  already permits.
- Cycle 6 §5 item 3 (fixture creator) → closed by §3.1, naming the
  validation framework under the same scope as `cal §6.2`.
- Cycle 6 §5 item 4 (fixture approval) → closed by §3.2, binding
  approval to existing `val §1.4`/§1.6` and `cal §6.3` mechanisms.
- Cycle 6 §5 item 5 (fixture immutability at first approval) →
  closed by §3.3, which names the §3.2 approval event as itself a
  `cal §6.3` retention event applied to the fixture artifact,
  resolving the Cycle 6 §1 G7 bootstrap gap without introducing a new
  retention rule.

With §2 and §3 in force, the certificate-issuance preconditions
identified in Cycle 6 §4 (non-stub pin; canonical fixture in
manifest) are satisfiable, and the §4 issuance authorities — already
canonically named — become reachable for D-POSE, Finish,
`finish_balance`, and the corresponding confidence certificate.

Items deliberately deferred per Cycle 6 §5 (fixture retirement G8,
fixture supersession G9) remain unaddressed by design and do not
block first implementation.

This amendment introduces zero new metrics, detectors, anchors,
validation requirements, calibration requirements, confidence
requirements, production gates, architectures, or doctrines. It
only assigns the already-named validation-framework authority
(`cal §6.2`) to the previously unnamed first-issuance and
fixture-lifecycle events enumerated in Cycle 6 §5.
