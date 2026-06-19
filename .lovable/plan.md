## Phase 16 — Canonical Authority Amendment

Create exactly one new file: `.lovable/canonical-authority-amendment.md`

No other files created, modified, or deleted. Documentation-only amendment that resolves the authority gaps identified in Cycles 5–6 without introducing any new metrics, detectors, anchors, validation rules, calibration rules, confidence rules, production gates, architectures, or doctrines.

### File Structure

1. **Amendment Scope** — enumerate the five Cycle 6 §5 gaps verbatim (first-issuance triplet, MVCS partial-pin carve-out, fixture creator, fixture approval, fixture immutability-at-first-approval) and the dependent issuance authorities (detector/anchor/metric/confidence certificates). Explicit non-scope statement.

2. **Version Issuance Authority** — for each of `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION`: name the authorizing body, the first-issuance trigger condition (rooted in existing `val §6.7` migration semantics and `bp §F1` pin shape), and the MVCS-scope partial-pin carve-out clause grounded in `c5 §2`. No new requirements — only authority assignments over existing requirements.

3. **Fixture Authority** — authority assignments for creation, approval, immutability, supersession, retirement, each citing the existing canonical requirement it activates (`val §6.1`, `bp §H1`–§H6, `cal §6.4`/§6.5, `ver §6`). No new fixture requirements introduced.

4. **Certificate Issuance Authority** — authority assignments for detector, anchor, metric, confidence certificates citing existing issuance clauses (`cal §6.1`/§6.2`, `conf §87`/§488/§530, `gate §T1→T2`).

5. **Authority Hierarchy** — table mapping each authority to the existing framework it operates within (validation, calibration, confidence, production-gate), demonstrating no new framework is created.

6. **Amendment Impact Analysis** — explicit verification that no metric/detector/anchor/validation/calibration/confidence/gate is added, modified, or relaxed; only authority-holder identities and first-issuance triggers are defined.

7. **Closing Determination** — `AUTHORITY GAP CLOSED` or `AUTHORITY GAP REMAINS`, justified solely by whether §2–§4 fully cover Cycle 6 §5's minimum set.

### Constraints

Exactly one new file. No code, no implementation, no architecture changes, no new metrics/detectors/anchors/gates, no new validation/calibration/confidence requirements. Reality-only amendment of authority assignments over already-existing canonical requirements.