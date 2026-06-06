# Organism Wiring Sprint — Ratification Matrix (in-progress)

Engine version pin: `pie-v2.0.0` (`src/lib/pieV2/types.ts:11`).

## What shipped this turn

### Section A — Capture surface wiring (pitching, partial)
- `PitchingV2MicroInput` now mounted in production at
  `src/pages/PracticeHub.tsx:601` (baseball + pitching module only).
- Panel state held at `src/pages/PracticeHub.tsx:109`, reset on session
  done at `src/pages/PracticeHub.tsx:275`, passed into `createSession`
  at `src/pages/PracticeHub.tsx:384`.
- Adapter `buildSessionRepsFromMicroInput` at
  `src/lib/pieV2/buildSessionReps.ts:43` converts the panel payload
  into a canonical `PieV2RepInput[]` (single session-level rep,
  missingness preserved verbatim — no imputation).
- `usePerformanceSession.createSession` now invokes
  `finalizePieV2Session` post-insert at
  `src/hooks/usePerformanceSession.ts:140` when reps are present,
  driving capture → score → aggregate → emit → safeguard → persist.
  Errors are logged + swallowed; legacy save path is untouched.

### Section B — Projection writer (complete)
- New canonical writer `persistPieV2Session` at
  `src/lib/pieV2/persistSession.ts:46`.
  - Writes `performance_sessions.pie_v2_signals` (per-session aggregate
    + `engine_version` + `computed_at`).
  - Upserts `athlete_foundation_state.pie_v2_caution_state` (RR-6
    advisory; cleared to `null` when `level === "none"`).
  - Replay-safe, idempotent, lineage-preserving; never authors organism
    truth (projection of the canonical event aggregate, not its source).
- `finalizePieV2Session` extended with `persist?: boolean` (default
  `true`) at `src/lib/pieV2/finalizeSession.ts:18` so the existing
  end-to-end test (`src/lib/pieV2/__tests__/endToEnd.test.ts`) keeps
  running pure by passing `persist: false` (still required for tests
  in next turn).

### Hitting doctrine column (Section C scaffolding)
- DB migration adds `public.hie_snapshots.hitting_doctrine jsonb`
  (additive). Column exists; no writer or reader yet.

## PASS / FAIL matrix

| # | Question | Status | Evidence |
|---|----------|--------|----------|
| 1 | Pitcher can create a session | PASS (pre-existing) | `src/pages/PracticeHub.tsx:354` + `src/hooks/usePerformanceSession.ts:97` |
| 2 | Session creates a PIE V2 aggregate event | PASS (new this turn) | `usePerformanceSession.ts:140` → `finalizePieV2Session` → `emitPieV2SessionAggregate` (`src/lib/pieV2/emit.ts:85`) |
| 3 | Aggregate persists to `performance_sessions.pie_v2_signals` | PASS (new this turn) | `persistSession.ts:54` |
| 4 | Appears in trends (longitudinal read path) | FAIL | No reader wired to `pie_v2_signals` yet. |
| 5 | Visible to coaches in `CoachAthleteDetail` | PASS (pre-existing) | `PieV2CoachPanel` mounted at `src/pages/CoachAthleteDetail.tsx:144` (reads ledger events). New `pie_v2_signals` column not yet consumed there. |
| 6 | Updates `athlete_foundation_state.pie_v2_caution_state` | PASS (new this turn) | `persistSession.ts:78–104` |
| 7 | Hitter generates phase analysis (`hitting_doctrine` populated) | FAIL | `hie-analyze` not yet importing `_shared/hittingPhases.ts`; column exists but no writer. |
| 8 | `HittingRoadmapLadder` renders for athletes | FAIL | Component still orphaned. |
| 9 | `HittingCausalChainCard` renders for athletes | FAIL | Component still orphaned. |
| 10 | Coach sees identical hitting chain | FAIL | Pending Section C + D. |

**Current launch-readiness:** 4 / 10 PASS (40%) — up from 1 / 10
before this turn (only #1 pre-existed at green).

## Remaining blockers (must be PASSed before UHRC / AI Hammer)

1. **Section A residual:** mount `PieV2FrameTagger` in
   `src/pages/AnalyzeVideo.tsx` after a successful pitching/baseball
   analysis (uses existing `emitPieV2RepScore`; no new writer needed).
2. **Section C:** in `supabase/functions/hie-analyze/index.ts`:
   - import `HITTING_PHASES` from `../_shared/hittingPhases.ts` and
     `PHASE_CAUSAL_CHAINS` / `PHASE_ROADMAPS` from
     `../_shared/hittingCausalChains.ts`;
   - add pure `deriveHittingDoctrineAttribution(weaknessClusters)`
     returning `{ violated_phases, priority_phase, causal_chains,
     roadmap, confidence, missingness }`;
   - attach as `hitting_doctrine` on the snapshot object built at
     `index.ts:1927` before the upsert at `index.ts:1954`;
   - confidence stays 0 with empty arrays when signal depth is below
     the doctrine threshold — never impute.
3. **Section D:** mount `HittingCausalChainCard` + `HittingRoadmapLadder`
   reading `(snapshot as any).hitting_doctrine` inside
   `src/components/hie/WeaknessClusterCard.tsx` (used by
   `ProgressDashboard`) and inside a new coach panel on
   `src/pages/CoachAthleteDetail.tsx`. Empty state when
   `confidence === 0`.
4. **Trends reader (Q4):** add a `pie_v2_signals` consumer to the
   longitudinal/trend surface so the projection becomes visible.
5. **Coach reader for `pie_v2_signals` (Q5 strengthening).**
6. **End-to-end test:** extend `src/lib/pieV2/__tests__/endToEnd.test.ts`
   with a `persist: true` path against a mocked supabase client; add
   deno fixtures for P1..P4 hitting attribution.

## Verdict

**NO-GO.** Section A is partial, Sections C and D are not started.
Do not begin UHRC, AI Hammer standardization, or recommendation
resolution work until the matrix above is fully PASS.
