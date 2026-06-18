## Phase 8 — Canonical Confidence Architecture

Create exactly one new file: `.lovable/canonical-confidence-architecture.md`. No other files touched.

### Source inputs (read-only, citation-bound)
- `arch` = `.lovable/canonical-measurement-architecture.md`
- `bp` = `.lovable/canonical-implementation-blueprint.md`
- `gap` = `.lovable/canonical-gap-analysis.md`
- `val` = `.lovable/canonical-validation-framework.md`
- `cal` = `.lovable/canonical-calibration-architecture.md`
- `audit` = `.lovable/analysis-truth-audit.md`
- `extract` = `.lovable/analysis-truth-extraction.md`

Every clause cites one of the seven. No invented metrics, detectors, anchors, thresholds, confidence sources, or harnesses.

### Document outline

**1. Preamble**
- Confidence philosophy: derived (never authored), deterministic, replay-equivalent, calibration-bound, missingness-visible, additive.
- Confidence authority hierarchy: calibration certificate → detector confidence → anchor confidence → metric confidence (via `arch §Confidence model` product) → report-card surface. Lower layers may not overwrite higher.
- Confidence propagation philosophy: monotonic non-increasing along the dependency chain; products only as defined in `arch §Confidence model`; no lateral injection.
- Confidence aggregation philosophy: products and visibility-weighted aggregations exactly as `arch §Confidence model` and `bp §D` already declare; no new operators.
- Confidence demotion philosophy: demotion-before-correction, mirroring `val §1.5`, `val §7`, `cal §1.5`, `cal §7`.
- Confidence visibility philosophy: every surface exposes confidence one interaction away (`bp §E`, `val §5`); fabrication, smoothing, and collapse forbidden (`gap §D`).

**2. Detector Confidence Architecture**
Rows: D-POSE, D-HANDS, D-BAT, D-BALL, D-CONTACT, D-PLANT, D-RELEASE. Each row: Confidence source (per `bp §B` and `cal §2`) · Emission contract (per-frame, scoped, version-pinned) · Persistence requirements (replay-reconstructable, retention handle per `cal §6.3`) · Propagation requirements (downstream anchor/metric usage) · Demotion triggers (`cal §7`, `val §1.5`).

**3. Anchor Confidence Architecture**
Rows: Launch, Heel Plant, Contact, Release, Finish. Each row: Source (`arch §Event anchors`, `cal §3`) · Emission requirements (per-tier where required, fallback to `anchor_not_detected` from `arch §Missingness rules`) · Dependency requirements (which detector certificates must bind) · Propagation requirements · Demotion requirements.

**4. Metric Confidence Architecture**
All 18 BH metrics. Per metric: Confidence inputs (the factors of the `arch §Confidence model` product as declared in the metric's `arch §Part 2` row) · Aggregation requirements (product per `arch §Confidence model`; visibility weighting where declared) · Emission requirements · Persistence requirements (replay-equivalent via `bp §H5`) · Demotion requirements · Display requirements (tile state mapping per `bp §E1`, `val §5`).

**5. Report Card Confidence Architecture**
Rows: Phase percentages, Phase orbs, Tile states, Ribbon generation, Coaching layer, Missingness layer. Each row: Confidence requirements · Display requirements · Propagation requirements · Demotion requirements. Resolves the dual-denominator bug as already specified in `gap §D` and `val §5` (no new rule). Coaching layer remains a presentation-only consumer (`gap §D`, `bp §E4`).

**6. Confidence Governance Framework**
- Persistence: deterministic, immutable, retention-handle-addressable.
- Versioning: bound to `bp §F1` engine version + reasoning version pins.
- Replay equivalence: every confidence value reconstructable by `bp §H5`.
- Auditability: confidence lineage exposed at every surface (`val §6`).
- Certificate linkage: every confidence claim binds a calibration certificate (`cal §5`, `cal §6.1`).
- Invalidation rules: dependency certificate invalidation, version migration, drift breach, evidence withdrawal, demotion event (cites `cal §6.4`, `val §1.5`).

**7. Confidence Promotion and Demotion Matrix**
T0→T1, T1→T2, T2→T3, T3→T4 confidence requirements for detectors, anchors, metrics, report-card outputs — all referring back to the existing matrix in `val §7` and the calibration ladder in `cal §7`. No new gates; this section maps confidence-specific obligations onto the existing ladder.
- Confidence failure conditions (curve violation, fabrication, smoothing, missing certificate).
- Confidence downgrade conditions (Warn/Breach severities from `cal §7.3`).
- Confidence recovery conditions (new certificate through `val §6/§7`; no silent re-fit).

**8. Closing constraints** (restated verbatim from request).

### Hard constraints
- Confidence architecture only.
- No code, schema, prompts, UI, roadmap, sequencing, prioritization, owners, or estimates.
- No changes to architecture, blueprint, validation framework, calibration architecture, or gap analysis.
- No new metrics, detectors, anchors, harnesses, thresholds, or confidence sources invented.
- Only `.lovable/canonical-confidence-architecture.md` is created.
