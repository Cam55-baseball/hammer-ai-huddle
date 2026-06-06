# Organism Wiring Completion Sprint — Plan

Goal: reach **10/10 PASS** on the ratification matrix in
`docs/asb/launch-closure/organism-wiring-ratification.md`, then run the
Pre-UHRC audit. No new doctrine, no UHRC, no AI Hammer, no recommendation
resolution. Only complete the already-approved organism.

## Verified starting state (from this turn's exploration)

- `PieV2FrameTagger` exists at `src/components/micro-layer/PieV2FrameTagger.tsx:36` but is **not mounted** in `src/pages/AnalyzeVideo.tsx` (988 lines, no reference).
- Edge-runtime hitting doctrine lives at `supabase/functions/_shared/hittingCausalChains.ts` (`PHASE_CAUSAL_CHAINS`) and `_shared/hittingPhases.ts` (`attributePhaseFromSymptoms`, `prioritizePhasesForRoadmap`). `hie-analyze/index.ts` does **not** import either — snapshot built at line ~1933 / upserted at ~1955 with no `hitting_doctrine` key.
- `HittingCausalChainCard` (`src/components/hitting/HittingCausalChainCard.tsx:22`) and `HittingRoadmapLadder` (`src/components/hitting/HittingRoadmapLadder.tsx:17`) exist but have **zero production call sites**.
- `hie_snapshots.hitting_doctrine jsonb` column already exists (migration applied; visible in `src/integrations/supabase/types.ts:4520`).
- `performance_sessions.pie_v2_signals` is written by `persistPieV2Session` but **no reader** consumes it on trends or coach surface.

## Section F — Video-derived pitching path

1. In `src/pages/AnalyzeVideo.tsx`, after a successful baseball-pitching analysis returns (`hie-analyze`/`analyze-video` response), render `<PieV2FrameTagger />` gated on `sport === 'baseball' && module === 'pitching'` and on the presence of `videoId` + `parentVideoEventId` from the analysis result.
2. Tagger emits `pie_v2_rep_score` events via existing `emitPieV2RepScore`. On tagger completion (or session-close callback), invoke `finalizePieV2Session({ persist: true })` against the same `athleteId` / `sessionId` so video-tagged reps land in the **same** `performance_sessions.pie_v2_signals` + `athlete_foundation_state.pie_v2_caution_state` projections. No parallel storage, no special-case writer.
3. Evidence: file:line of mount, emitted event sample, projection row example, coach surface citation.

## Section G — Hitting doctrine in `hie-analyze`

In `supabase/functions/hie-analyze/index.ts`:

1. Add imports: `attributePhaseFromSymptoms`, `prioritizePhasesForRoadmap`, `HittingPhaseId` from `../_shared/hittingPhases.ts`; `PHASE_CAUSAL_CHAINS`, `PHASE_ROADMAPS` from `../_shared/hittingCausalChains.ts`.
2. Add a pure helper `deriveHittingDoctrineAttribution(weaknessClusters, signalDepth)` that:
   - Maps weakness clusters → symptom tokens → `attributePhaseFromSymptoms`.
   - Returns `{ violated_phases, priority_phase, causal_chains, roadmap, confidence, missingness }`.
   - When `signalDepth` < doctrine threshold OR no symptoms map: returns `confidence: 0`, empty arrays, explicit `missingness: { reason: 'insufficient_reps' | 'unmapped_symptoms', missing_signals: [...] }`. **No imputation, no defaults, no fabricated priority.**
3. Attach result as `hitting_doctrine` on the snapshot object built before the `.upsert()` at line ~1955 (additive — does not mutate existing fields).
4. Engine-version stamp: include `engine_version: 'hie-doctrine-v1.0.0'` inside `hitting_doctrine` for replay pinning.

## Section H — Hitting surfaces

Athlete + coach must read the **same** `hie_snapshots.hitting_doctrine` JSON — single source of truth.

1. **Athlete surface:** in `src/components/hie/WeaknessClusterCard.tsx` (consumed by `ProgressDashboard`), append a doctrine block reading `snapshot.hitting_doctrine`. Render `<HittingCausalChainCard chain={causal_chains[priority_phase]} />` and `<HittingRoadmapLadder roadmap={roadmap} />`. When `confidence === 0`: render existing empty-state copy ("Not enough hitting reps yet — keep logging swings").
2. **Coach surface:** in `src/pages/CoachAthleteDetail.tsx` hitting tab, mount the identical pair of components reading from the same snapshot row (selected by `athlete_id`). No coach-only computation.
3. Evidence: athlete route, coach route, file:line refs for both mounts.

## Section I — Trends + coach reader for `pie_v2_signals` (closes Q4 + strengthens Q5)

1. **Trends:** add a reader in the existing pitching trends surface (locate in `src/components/...` near `PieV2CoachPanel` usage) that selects `performance_sessions.pie_v2_signals` for the athlete and renders aggregate trajectory. Read-only; no new table.
2. **Coach panel:** extend `PieV2CoachPanel` (mounted at `src/pages/CoachAthleteDetail.tsx:144`) to additionally surface the latest `pie_v2_signals` row alongside its existing ledger view.

## Section J — Fixtures and tests

1. Four Deno fixtures under `supabase/functions/hie-analyze/__tests__/doctrineFixtures.ts` covering P1, P2, P3, P4 violations. Each asserts `priority_phase` matches expected.
2. Extend `src/lib/pieV2/__tests__/endToEnd.test.ts` with a `persist: true` path against a mocked supabase client (vitest mock) verifying `performance_sessions.pie_v2_signals` update + `athlete_foundation_state.pie_v2_caution_state` upsert.

## Section K — Re-run forensic matrix + Pre-UHRC audit

Rewrite `docs/asb/launch-closure/organism-wiring-ratification.md` with:

- 10-row PASS/FAIL matrix with file:line evidence per row (target: 10/10).
- New "Pre-UHRC Readiness Audit" section answering the 10 questions from Section J of the sprint brief: organism connectivity, action→state reach, analysis→coach reach, caution→safeguarding reach, remaining P0 blockers for UHRC / AI Hammer / recommendation resolution, verified launch-readiness %, baseball verdict (NO-GO / SOFT-LAUNCH / PUBLIC-LAUNCH), enumerated blockers.

## Files

**New**
- `supabase/functions/hie-analyze/__tests__/doctrineFixtures.ts`
- (possibly) `supabase/functions/_shared/deriveHittingDoctrine.ts` if the helper warrants its own module

**Edited**
- `src/pages/AnalyzeVideo.tsx` (mount tagger + finalize call)
- `supabase/functions/hie-analyze/index.ts` (imports + helper + snapshot field)
- `src/components/hie/WeaknessClusterCard.tsx` (athlete doctrine block)
- `src/pages/CoachAthleteDetail.tsx` (coach doctrine block + extended pie_v2_signals reader)
- `src/components/pie/PieV2CoachPanel.tsx` (or equivalent — read `pie_v2_signals`)
- Trends surface file (TBD on locate — single addition, no rewrite)
- `src/lib/pieV2/__tests__/endToEnd.test.ts`
- `docs/asb/launch-closure/organism-wiring-ratification.md`

**Out of scope (explicit)**
- UHRC, AI Hammer standardization, recommendation resolution, onboarding redesign, softball parity, new doctrine, new scoring systems.

## Exit criteria

- 10/10 PASS with file:line evidence.
- Athlete and coach render identical doctrine output from the same JSON.
- Video-derived and session-derived pitching paths write to the same projections.
- Pre-UHRC audit completed with verdict + launch-readiness %.
