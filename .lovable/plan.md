# Report Card System — Full Reference Document

Compile the complete, verbatim inventory of the legacy Hammer Report Card system into a single in-repo document the team can review. Documentation only — no behavior, flags, or components change.

## Deliverable

One new file: `docs/asb/report-card-system-reference.md`

## Contents

1. Current mount status — every render site that was removed (file + line), the Phase 49 lock reason, and the `RELEASE1_HITTING_SUPPRESSED` kill switch.
2. Architecture map — `src/lib/reportCard/` (contracts, disciplines, v1, grade, release1, metricReaders, types) and `src/components/report-card/` (tiles, explainer sheet, visuals, UHRC panels), plus where measurements persist (`videos.ai_analysis.metrics`).
3. Metric value contract — measured vs missing shapes, confidence semantics, no-imputation rule.
4. Tile display modes and statuses, including every tile field (standard, threshold chip, non-negotiable, phase, explainer trio).
5. Grading algorithm — pass/warn/fail weighting, missing exclusion, non-negotiable caps, letter bands, determinism.
6. Discipline coverage matrix for both sports, explicitly noting softball reuses baseball tiles with a relabel and which modules never had cards.
7. Pitching (BP) — all 9 tiles with metric key, unit, range, pass/elite standard, display mode, non-negotiable flag.
8. Throwing — the 6-tile subset and what is excluded and why.
9. Hitting (BH) — all tiles grouped P1–P4 with keys, bands, custom timing curves, and non-negotiables.
10. BH V1 category schema — the four doctrine categories with every field, including the intentionally empty drill/video/roadmap slots.
11. Release-1 Trust Lock — the full VISIBLE / HIDDEN / SHOWCASE_FUTURE classification lists and net rendering effect.
12. UHRC aggregate layer — pillars, exact weights, and how hitting phases feed mechanics.
13. Server pipeline — `analyze-video`, `recompute-report-card`, schema/prompt generation, validation, deterministic seeding.
14. Support surfaces — trend hook and strip, share export, grade ribbon, phase rail, radial meter, camera angle helper, explainer sheet.
15. Appendix A — verbatim explainer text (what/why, how to improve, encouragement) for every metric.
16. Appendix B — verbatim AI prompt block and scoring examples for every metric.

## Technical notes

- Content is transcribed directly from the source files so the document stays byte-accurate to what shipped; each section cites its source file paths.
- No source file is edited; the doc is additive under `docs/asb/`.
- Appendices A and B will be long (every metric across BP, BH, throwing); they are kept at the end so the main body stays readable.
