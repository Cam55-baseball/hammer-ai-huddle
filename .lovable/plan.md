# Phase 1.75 — Analysis Truth Audit (Execution)

Single-pass forensic, read-only investigation. Produces exactly one deliverable.

## Deliverable

Overwrite `.lovable/analysis-truth-audit.md` with sections S1–S11 plus the final A/B/C/D trust-classification block. Every claim cites `path:line-range`, or is marked `undetermined from code — evidence needed`.

## Investigation scope (read-only)

- **S1 — Phase percentages**: `src/components/report-card/hammer/visuals/PhaseRail.tsx`, `src/components/report-card/hammer/HammerReportCard.tsx`, `src/lib/reportCard/grade.ts`, `src/lib/reportCard/types.ts`.
- **S2 — Metric inventory**: `src/lib/reportCard/disciplines/bh.ts`, `src/lib/reportCard/contracts/bh.contract.ts`, `src/lib/reportCard/contracts/shared.ts`, `src/lib/reportCard/metricReaders.ts`, `supabase/functions/_shared/reportCardContracts.ts`.
- **S3 — Connect & Move vs Barrel Delivery**: same as S2.
- **S4 — Bat Path vs On-Plane %**: same as S2 (memo pointer only).
- **S5 — Undetected metrics**: contract → prompt → reader → tile trace; capture literal `missing_reason` strings.
- **S6 — Bat speed**: prompt/schema/reader/tile.
- **S7 — Time to contact**: prompt/schema/reader/tile.
- **S8 — Failure paths**: `src/pages/AnalyzeVideo.tsx`, `supabase/functions/analyze-video/*`, frame-extraction code.
- **S9 — Nondeterminism**: `src/lib/biomech/fingerprint.ts`, `src/lib/biomech/versions.ts`, `src/lib/biomech/probeVideoMetadata.ts`, `frameExtractionDeterministic.ts`, `supabase/functions/_shared/biomechFingerprint.ts`, `supabase/functions/analyze-video/index.ts` (cache lookup/write, model id, temperature, seed), `video_analysis_runs`.
- **S10 — Desktop failure path**: `AnalyzeVideo.tsx` upload branch, `probeVideoMetadata.ts` rVFC use, UA gating, file size limits.
- **S11 — Trust score per metric**: classify TRUSTWORTHY / PARTIALLY TRUSTWORTHY / EXPERIMENTAL / NOT READY using only S2–S10 evidence.
- **Final A/B/C/D block**: derived strictly from S11.

## Out of scope

No edits to `bh.ts`, contracts, prompts, edge functions, schemas, UI, `.lovable/plan.md`, `.lovable/bucket-a-changes.md`. No determinism fixes. No new methodology memos. No roadmap language. No code, schema, prompt, UI, or metric changes anywhere.
