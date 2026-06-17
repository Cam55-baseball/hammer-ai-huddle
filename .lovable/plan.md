
# Phase 1.75 — Analysis Truth Audit (Execution)

Produce exactly one file: `.lovable/analysis-truth-audit.md`.

Evidence-only forensic mode. No code, schema, prompt, UI, or metric changes. Every claim cites `path:line-range`. Anything not provable from code is recorded as "undetermined from code — evidence needed".

## Investigation order (read-only)

1. **S1 — Phase percentages**: `src/components/report-card/hammer/*`, `src/lib/reportCard/grade.ts`, `src/lib/reportCard/types.ts`, `src/lib/reportCard/disciplines/bh.ts`. Identify what the orb number is, the function computing it, and whether 100% is reachable.
2. **S2 — Metric inventory table**: `src/lib/reportCard/disciplines/bh.ts`, `src/lib/reportCard/contracts/bh.contract.ts`, `src/lib/reportCard/metricReaders.ts`, `supabase/functions/_shared/reportCardContracts.ts`. Per-tile: display name, definition, compute path, source field, confidence source, missing conditions — all with line ranges.
3. **S3 — Connect & Move vs Barrel Delivery**: diff inputs and formulas in `bh.ts` and the contract.
4. **S4 — Bat Path vs On-Plane %**: report only what code computes. Memo referenced as pointer only.
5. **S5 — Undetected metrics**: trace contract field → prompt → reader → tile compute for P2 knee-lift, P3 release, hands-outside-shoulders, bat speed, time-to-contact. Capture literal `missing_reason` strings.
6. **S6 — Bat speed**: prompt/schema, reader, tile. Units, estimation vs measured, calibration presence.
7. **S7 — Time to contact**: same.
8. **S8 — Failure paths**: `src/pages/AnalyzeVideo.tsx`, `supabase/functions/analyze-video/*`, frame extraction/thumbnail code. Catalog every throw/catch, status=complete-with-empty conditions.
9. **S9 — Nondeterminism (priority)**: `src/lib/biomech/fingerprint.ts`, `probeVideoMetadata.ts`, `frameExtractionDeterministic.ts`, `supabase/functions/_shared/biomechFingerprint.ts`, `analyze-video` edge fn (cache lookup/write, model id, temperature, seed), `video_analysis_runs`. Rank sources with code evidence.
10. **S10 — Desktop failure path**: `AnalyzeVideo.tsx` upload branch, `probeVideoMetadata.ts` rVFC use, UA gating, file size limits, MediaRecorder/Canvas usage.
11. **S11 — Trust score per metric**: TRUSTWORTHY / PARTIALLY TRUSTWORTHY / EXPERIMENTAL / NOT READY, justified strictly from S2–S10 evidence.
12. **Final A/B/C/D block**: derived from S11 only.

## Out of scope

No edits to `bh.ts`, contracts, prompts, edge functions, schemas, UI, `.lovable/plan.md`, `.lovable/bucket-a-changes.md`. No determinism fixes. No new methodology memos. No roadmap language.

## Deliverable

- `.lovable/analysis-truth-audit.md` (overwrite/refresh in evidence-only form) — sections S1–S11 plus A/B/C/D, every claim citing `path:line-range` or marked "undetermined from code — evidence needed".
