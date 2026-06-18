## Plan

Single-pass, read-only forensic audit. Produce exactly one file: `.lovable/analysis-truth-audit.md` (overwrite existing).

### Scope
Sections S1–S11 with every claim cited as `path:line-range`. Unprovable claims marked `undetermined from code — evidence needed`. Final block: A/B/C/D trust classification derived strictly from S11.

### Files to read (read-only)
- `src/components/report-card/hammer/HammerReportCard.tsx`
- `src/components/report-card/hammer/visuals/PhaseRail.tsx`
- `src/lib/reportCard/contracts/bh.ts`, `bh.contract.ts`, `shared.ts`, `reportCardContracts.ts`
- `src/lib/reportCard/metricReaders.ts`, `types.ts`, `grade.ts`
- `src/lib/biomech/versions.ts`, `fingerprint.ts`
- `supabase/functions/analyze-video/index.ts`
- `supabase/functions/_shared/biomechFingerprint.ts`
- `src/lib/video/probeVideoMetadata.ts` (or equivalent)
- Any landmark/detector modules referenced by `versions.ts`

### Section mapping
- S1 Report-card calculation logic
- S2 Metric production sources (AI vs client compute)
- S3 Engine/detector versions
- S4 Cache fingerprinting + scoping
- S5 Seed derivation + same-video nondeterminism
- S6 Calibration assumptions (bat length, pixel scaling)
- S7 Sampling budget / frame extraction
- S8 Failure paths (completed-with-null, fallbacks)
- S9 Desktop/browser failure paths (probeFps, codec)
- S10 Per-metric evidence table (all 18 BH metrics)
- S11 Per-metric trust classification (TRUSTWORTHY / PARTIALLY / EXPERIMENTAL / NOT READY)

### Final block
A. Safe for production today
B. Requiring redesign
C. Requiring investigation
D. Hide until trustworthy

### Out of scope
No code/schema/prompt/UI/metric changes. No edits to `.lovable/plan.md` or other docs. No roadmap, no recommendations, no fixes.
