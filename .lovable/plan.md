
# Phase 5 — Canonical Gap Analysis & Build Matrix (DELIVERED → `.lovable/canonical-gap-analysis.md`)

## Deliverable
One file: `.lovable/canonical-gap-analysis.md`. No code, no roadmap, no prioritization, no edits anywhere else.

## Source documents (read-only inputs)
- `.lovable/analysis-truth-audit.md` — current reality
- `.lovable/analysis-truth-extraction.md` — extracted current behavior
- `.lovable/canonical-measurement-architecture.md` — canonical measurement spec
- `.lovable/canonical-implementation-blueprint.md` — canonical implementation spec
- `.lovable/bat-path-vs-on-plane-definitions.md`
- `.lovable/p3-timing-methodology.md`
- `.lovable/time-to-contact-vs-power.md`
- `.lovable/back-elbow-methodology.md`
- `.lovable/finish-and-balance-methodology.md`
- `.lovable/confidence-source-trace.md`

No new investigation of code. Gap rows reference findings already captured in the audit/extraction; canonical-state columns cite the architecture/blueprint section IDs.

## Document structure

**Preamble**
- Purpose: translate "current vs canonical" into a single source of truth for what must change.
- Method: each row = Current (audit citation) → Canonical (architecture/blueprint citation) → Gap classification → Required work (inventory only).
- Gap classification vocabulary: `BUILD` (new), `FIX` (broken), `REPLACE` (swap implementation), `HIDE` (remove from surface until ready), `RETAIN` (already canonical), `CALIBRATE` (parameter/threshold tuning only).
- Trust-class vocabulary reused from audit: T0 fabricated, T1 stub, T2 partial-deterministic, T3 deterministic-uncalibrated, T4 production-ready.

**Section A — Metric Gap Matrix (all 18 BH metrics)**
Columns: Metric | Current State | Canonical State | Gap | Current Trust Class | Required Detectors | Required Anchors | Required Calibration | Phone-Only Possible (Y/N + condition) | Production Ready (Y/N).
Special-focus rows expanded with sub-bullets where the canonical spec demands them: `bat_speed_contact`, `time_to_contact`, `bat_path`, `on_plane_pct`, `connect_and_move`, `barrel_delivery`, `p2_timing`, `p3_timing`, `hands_outside_shoulders`.

**Section B — Detector Gap Matrix**
Rows: D-POSE, D-HANDS, D-BAT, D-BALL, D-CONTACT, D-RELEASE, D-PLANT.
Columns: Exists / Stub / Partial / Missing | Current implementation citation | Canonical contract citation | Required-by metrics | Gap classification.

**Section C — Determinism Gap Matrix**
Rows for each determinism seam called out in audit + blueprint §F:
- Seed source (`seed(videoId)` → `seed(canonical_trace_fingerprint)`)
- Cache key (`cache(videoId)` → `cache(video_sha256_hex + cache_fingerprint_hex)`)
- Version pins (`@0.0.0-stub` → pinned `LANDMARK_MODEL_VERSION` / `DETECTOR_VERSION` / `METRIC_ENGINE_VERSION`)
- Probe contract (synthetic 30 fps fallback → `insufficient_temporal_resolution` missingness)
- AI residual envelope (unbounded vs bounded ±10, temp 0, seeded)
- Replay equivalence harness (absent vs required)
Columns: Current | Canonical | Gap | Affected metrics.

**Section D — Report Card Gap Matrix**
Rows: Phase % computation, Phase orb behavior, Tile state mapper, Missingness surfacing, Confidence surfacing, Ribbon coverage, AI coaching layer boundary.
Columns: Current behavior (audit cite) | Canonical behavior (blueprint §E cite) | Gap | Affected metrics/tiles.

**Section E — Production Readiness Matrix**
Four buckets defined by current trust class:
- Bucket A — Production-ready or near (T3/T4): list metrics, list residual gates outstanding.
- Bucket B — Deterministic foundation present but uncalibrated (T2→T3): list metrics, list calibration/anchor work.
- Bucket C — Stub-class, requires new detector or anchor (T1→T2/T3): list metrics, list detector dependencies.
- Bucket D — Fabricated / cannot ship as measured (T0): list metrics, list whether canonical path exists or surface must be hidden.
Each bucket row: Metric | Outstanding gates from blueprint §I (10-gate matrix) | What must happen to move up one bucket.

**Section F — Master Build Inventory**
Single flat list, deduplicated across A–E. Categories only for readability (no ordering implied):
- Detectors to build/complete
- Event anchors to build
- Calibration subsystems
- Determinism seams to fix
- Missingness/confidence surfaces
- Report-card contract changes
- Validation harnesses (determinism, golden clip, replay, calibration, missingness)
- Surfaces to hide until canonical path exists
No priorities, no sequencing, no owner assignment, no estimates.

**Closing constraint block**
Reiterates: inventory only; no roadmap; supersedes nothing in audit/architecture/blueprint; future phases consume this matrix.

## Hard constraints
- Only `.lovable/canonical-gap-analysis.md` is created. No other file is touched.
- No new methodology — every canonical cell cites architecture or blueprint; every current cell cites audit or extraction.
- No code, no schema, no prompts, no UI, no roadmap, no sequencing, no estimates.
