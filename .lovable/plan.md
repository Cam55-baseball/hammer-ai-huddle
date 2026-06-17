# Phase 1.75 — Analysis Truth Audit

**Deliverable:** one new file, `.lovable/analysis-truth-audit.md`. Evidence only. No code changes, no copy changes, no metric edits, no edge function deploys, no schema work, no proposals, no roadmap.

## Scope guardrails

- Read-only investigation across the client report-card stack, the `analyze-video` edge function, the shared contracts, the biomech/determinism layer, and the frame extraction + probe pipeline.
- Every claim in the doc must cite a file path and line range. No assumptions, no "should", no "intended" — only what the code actually does today.
- If something cannot be determined from the code, the doc will say "undetermined from code — evidence needed" rather than guess.
- No new metrics, no renamed metrics, no formula edits. The P2/P3/back-elbow/finish-and-balance work already in flight is out of scope for this audit and will be referenced as "already-changed, see bucket-a-changes.md" where relevant.

## Investigation map

Each section in the audit maps to a concrete set of files to read first. I will expand from there as needed.

### S1 — Report card phase percentages (1/2/3/4 circles)
- `src/components/report-card/hammer/*` (phase header / circle components)
- `src/lib/reportCard/grade.ts`, `src/lib/reportCard/types.ts`
- `src/lib/reportCard/disciplines/bh.ts` (phase grouping)
- Identify: what number is rendered, which function computes it, inputs, max/min, whether 100% is reachable, whether it's score vs confidence vs completion.

### S2 — Current metric inventory (table)
- `src/lib/reportCard/disciplines/bh.ts` (tile specs + compute fns)
- `src/lib/reportCard/contracts/bh.contract.ts`
- `src/lib/reportCard/metricReaders.ts`
- `supabase/functions/_shared/reportCardContracts.ts` (prompt + schema)
- Build the requested table for every BH tile actually shipped: display name, definition, compute path, data source field, confidence source, failure/missing conditions.

### S3 — Connect & Move vs Barrel Delivery
- Locate both tiles in `bh.ts` + contract. Diff their input fields, formulas, and source signals. State plainly whether they share inputs.

### S4 — Bat Path vs On-Plane %
- Same approach. Cross-reference `.lovable/bat-path-vs-on-plane-definitions.md` only as a pointer; the audit itself reports what the code computes, not what the memo proposes.

### S5 — Undetected metrics
- For each of P2 knee-lift, P3 release, hands-outside-shoulders, bat speed, time-to-contact: trace from contract field → prompt instruction → reader → tile compute → missing path. Document required inputs (frames, angles, landmarks) and the literal `missing_reason` strings the system emits. Classify failure category strictly from code evidence; mark "undetermined" where runtime telemetry would be required.

### S6 — Bat speed audit
- Trace the field in `_shared/reportCardContracts.ts` prompt + schema, the reader, the tile. Document units, whether it's model-estimated vs computed, whether any calibration (pixels-per-inch, bat length) is used.

### S7 — Time to contact audit
- Same trace. Define start/contact frame per code, units, estimation vs direct measurement.

### S8 — Failed analysis paths
- `src/pages/AnalyzeVideo.tsx` (upload → analyze → render flow)
- `supabase/functions/analyze-video/*`
- Frame extraction + thumbnail paths
- Catalog every throw/catch, every "complete but empty" path, whether `status=complete` can coexist with empty metrics, retry vs initial divergence.

### S9 — Same-video nondeterminism (highest priority)
- `src/lib/biomech/fingerprint.ts`, `probeVideoMetadata.ts`, `frameExtractionDeterministic.ts`
- `supabase/functions/_shared/biomechFingerprint.ts`
- `analyze-video` edge function: cache lookup, cache write, AI call params (temperature, seed, model id)
- `video_analysis_runs` table usage
- Enumerate every known + suspected nondeterminism source: fps probe drift, landing-time input, AI temperature/seed, prompt assembly order, frame selection, cache key composition, retry path divergence, desktop vs mobile probe differences. Rank by likelihood with code evidence.

### S10 — Desktop failure path
- `AnalyzeVideo.tsx` upload branch, `probeVideoMetadata.ts` (`requestVideoFrameCallback` availability), any UA-gated code, file size limits, MediaRecorder/Canvas usage.
- Identify desktop-specific blockers (rVFC support in Firefox/Safari desktop, autoplay-muted requirements, file input handling).

### S11 — Trust score
- For every metric in the S2 table, assign one of: TRUSTWORTHY / PARTIALLY TRUSTWORTHY / EXPERIMENTAL / NOT READY. Justification rooted in S2–S10 evidence only.

### Final deliverable block (A/B/C/D buckets)
Produced strictly from S11 classifications. No recommendations beyond bucket assignment.

## Out of scope (explicit)

- No edits to `bh.ts`, contracts, prompts, edge functions, schemas, or UI.
- No new methodology memos beyond the single audit file.
- No changes to `.lovable/plan.md` or `bucket-a-changes.md`.
- No determinism fixes — the audit feeds the determinism investigation, it does not perform it.

## File produced

- `.lovable/analysis-truth-audit.md` (new) — sections S1–S11 plus A/B/C/D final block, every claim citing `path:line-range`.

## Approval gate

After this audit is delivered and you review it, you decide what (if anything) moves to Phase 2. No follow-up work will be started from this plan.
