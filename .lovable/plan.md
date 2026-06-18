## Phase 11 — Canonical Build Plan

Create exactly one new file: `.lovable/canonical-build-plan.md`. No other files touched.

### Approach

1. Treat Phase 10's Master Implementation Deficit Inventory as the closed input set. Every item in it must appear exactly once in the Canonical Build Inventory (§9).
2. For each canonical component, translate its Phase 10 deficit into the build, validation, calibration, and confidence work required to satisfy the **existing** canonical requirements — no new metrics/detectors/anchors/gates/doctrines invented, no thresholds changed.
3. All work items cite the canonical clause they satisfy (`arch`, `bp`, `gap`, `val`, `cal`, `conf`, `gate`, `audit`, `extract`, `reality`). No estimates, sequencing, prioritization, owners, or dates.

### Document Structure

1. **Build Scope** — canonical authority statement; plan exists solely to satisfy existing canonical requirements; no architecture/validation/calibration/confidence/gate changes.
2. **Detector Build Matrix** — 7 rows × 8 columns (Current Status, Required Canonical Outcome, Missing Components, Required Build Work, Required Validation Work, Required Calibration Work, Required Confidence Work, Production Gate Dependency).
3. **Anchor Build Matrix** — 5 rows × 8 columns.
4. **Metric Build Matrix** — 18 rows × 8 columns.
5. **Report Card Build Matrix** — 7 rows × 6 columns.
6. **Validation Build Matrix** — every missing harness (`H1`–`H7`) and universal precondition deficit from Phase 10 §10.5/§10.8, cited to `val §6` only.
7. **Calibration Build Matrix** — every missing certificate / drift requirement from Phase 10 §10.6, cited to `cal §3`–`§6` and `cal §Drift` only.
8. **Confidence Build Matrix** — every missing confidence emission/propagation/invalidation requirement from Phase 10 §10.7, cited to `conf §Detector`–`§Surface`, `§Propagation`, `§Promotion-Demotion` only.
9. **Production Gate Closure Matrix** — for every detector, anchor, metric, surface: current gate status (from Phase 10 §9), missing requirements, required closure work, final target gate (per `gate` Parts 1–4 + `val §1.3` ladder).
10. **Canonical Build Inventory** — single consolidated list mirroring Phase 10 §10.1–§10.9, with each deficit appearing exactly once.
11. **Closing Constraints** — build-plan only; no code, no architecture/validation/calibration/confidence/gate changes; no new metrics/detectors/anchors/gates/doctrines; no estimates; no sequencing; no prioritization.

### Constraints Honored

- Single new file only.
- Pure translation of Phase 10 deficits into satisfaction work against Phases 1–9 requirements.
- No code, no implementation, no architecture/validation/calibration/confidence/gate changes.
- No new metrics, detectors, anchors, gates, or doctrines invented.
- No estimates, sequencing, prioritization, owners, or dates.
- All requirements cited by reference; all repository references are read-only path citations.
