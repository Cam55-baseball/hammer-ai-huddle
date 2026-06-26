# Phase 51 — Release Blocker Elimination Plan

Three Phase 50 blockers, three surgical fixes, one verification doc. No new architecture.

## Blocker 1 — Wire `tempo_sec` end-to-end

**Trace:** `AnalyzeVideo.tsx` already calls `runPoseInference` + `toAnchorFrames` (Phase 42B). It does NOT call `runTempoPipeline`, and the resulting evidence is never persisted to `video_metric_runs` / `video_analysis_runs`.

**Fix:**
1. In `AnalyzeVideo.tsx` after pose inference, invoke `runTempoPipeline({ video_sha256_hex, fps_true, landing_time_sec: null, direction_sign, calibration_h_px, pose_frames })`.
2. Persist via existing `recordAnalysisRun` (`src/lib/biomech/auditTrail.ts`) with the produced `cache_fingerprint_hex`, `evidence_sha256_hex`, engine versions, outcome.
3. Insert one row into `video_metric_runs` containing `{ metric_key: 'tempo_sec', value, missingness, evidence_sha256_hex }` so the read side can retrieve it.
4. Read it back in the same view and render the value (or its canonical missingness reason) in the existing Release-1 surface — no new component.

No engine, metric, or schema changes. Pure wiring through existing functions/tables.

**Evidence:** capture console + a `supabase--read_query` SELECT showing the persisted row keyed by `video_sha256_hex`.

## Blocker 2 — Remove remaining athlete-visible `/100` Physio cards

**Trace:** `PhysioPostWorkoutBanner.tsx` renders `Physio Report • {regulation_score}/100`. Phase 50 flagged this as a fabricated numeric surface still mounted in Vault.

**Fix:**
1. Strip the `{score}/100` text from `PhysioPostWorkoutBanner.tsx` — keep only the qualitative regulation message (green/yellow/red + sentence).
2. Repo crawl for any other athlete-visible `/100`, `score`, `grade`, `efficiency`, `composite`, `ranking`, `report card` mounts; suppress any that imply deterministic measurement. Coach-only / ops-only diagnostics are out of scope per Phase 49 scope.

## Blocker 3 — Coach Chat fabricated efficiency score

**Trace:** `supabase/functions/hammer-chat/index.ts` composes a system prompt from athlete context + next-step. Need to verify whether it (or `useHammerChat` payload) injects efficiency/score language, and whether the model is instructed to invent numbers.

**Fix:**
1. Read `hammer-chat` edge function. Add an explicit system-prompt clause forbidding invented numeric biomechanical claims (scores, grades, efficiency values, composites, percentages, rankings, measured findings) unless the value is present in the supplied deterministic context.
2. Remove any context field currently passing a fabricated efficiency/score number into the prompt (e.g. PIE V2 derived score injected as if measured). Pass only fields backed by a deterministic engine or athlete-reported truth.
3. No change to chat UX otherwise.

## Verification

- `bunx tsgo --noEmit`
- `bunx vitest run` (tempo pipeline tests already exist)
- `rg` sweep for athlete-visible: `score`, `grade`, `efficiency`, `measured`, `report card`, `composite`, `ranking`, `/100`, letter grades, percentage scores — document every remaining hit and classify athlete-visible vs ops-only.
- Playwright crawl of `/`, `/analyze`, `/vault`, `/progress` capturing screenshots + console + network.
- SQL SELECT proving one `video_metric_runs` row exists for the test video.

## Deliverable

Single doc `.lovable/phase-51-release-blocker-elimination.md` with: files changed, before/after evidence per blocker, repo-sweep table, the five YES/NO answers, and final determination (target: READY FOR LIMITED BETA, contingent on the SELECT returning a persisted tempo row from a real uploaded clip).

## Technical notes

- Files expected to change: `src/pages/AnalyzeVideo.tsx`, `src/components/physio/PhysioPostWorkoutBanner.tsx`, `supabase/functions/hammer-chat/index.ts`, possibly `src/hooks/useHammerChat.ts` (context payload trim).
- No migrations needed — `video_metric_runs` and `video_analysis_runs` already exist.
- No new components, no new tables, no new metrics.
