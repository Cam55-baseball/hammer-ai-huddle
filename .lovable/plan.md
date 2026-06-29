# Video Analysis Reliability + UX Restoration + Throwing/Pitching Audit

## Problem
1. Users get **kicked to Home/Login mid-analysis**. Console confirms session is lost ("No user or session after auth settled"). Root cause: `analyze-video` runs synchronously for 30–90s while the tab is foregrounded — same eviction class we already fixed for calendar/typing with `protectedEditing.ts` and heartbeat guards. The analyze page has no equivalent guard.
2. Loading skeleton is still rendered but **`AnalysisProgressIndicator` was removed in Phase 49** (see `src/pages/AnalyzeVideo.tsx:1118` comment). Users have no countdown, so the spinner "feels frozen."
3. Need to confirm throwing (BB+SB) and baseball pitching report-card specs and analyze-video prompts are still aligned with current philosophy and ship elite drills.

## Fix Plan

### 1. Stop the eviction during analysis (priority)
- Mark the analyze surface as protected: add `data-protected-editing="true"` on the `AnalyzeVideo` content wrapper.
- Use the existing `protectedEditing.ts` heartbeat the same way `SeasonScheduleImporterDialog` does: while `analyzing || uploading || extractingFrames` is true, start a heartbeat that blocks auth eviction (refresh failures, focus loss, visibility hidden) until the run resolves.
- Add a visibility-safe keepalive: when the tab hides during analysis, do NOT signOut or treat session as stale; rely on Supabase's silent refresh and our protected flag.
- Wrap the `supabase.functions.invoke("analyze-video", …)` calls with an `AbortController` + 120s client timeout (current edge budget) so a hung socket surfaces as a clean retry instead of an auth-context unmount.
- On any thrown error inside the analyze flow, never let it bubble past the page's error boundary in a way that re-mounts the auth provider (set local error state, keep the page).

### 2. Restore the countdown + skeleton
- Re-enable `AnalysisProgressIndicator` on the analyze surface (re-add the import + render above `AnalysisResultSkeleton`) for `analyzing === true`. The component already exists with elapsed seconds, progress bar to a 45s estimate, and stage messaging; no rewrite needed.
- Keep `AnalysisResultSkeleton` rendered below the indicator so users see both: live countdown + content placeholder.
- Add the same indicator to the retry path (`handleRetryAnalysis`).

### 3. Confirm throwing + baseball pitching are current and elite
- Audit `src/lib/reportCard/disciplines/bp.ts` and `throwing.ts` against the latest philosophy. `throwing.ts` reuses BP tiles minus windup-only ones — confirm the 6 reused tile keys still exist in `bp.ts` and that each carries an elite drill string (current spot-check shows drills present: towel/med-ball, glove-tuck, lateral lunge ladders, etc.).
- Audit `supabase/functions/analyze-video/index.ts` BB-pitching (line 669) and throwing (line 1367) blocks against the same tile schema (`buildMetricsSchema` from `_shared/reportCardContracts.ts`), confirm `getContractFor("baseball","pitching")` and `getContractFor(sport,"throwing")` return the tile keys the prompt asks the model to score, and that all metrics required by the spec are emitted.
- Verify softball pitching block (line 897) still matches `bp.ts` derivatives used for SB.
- Any tile present in `bp.ts`/`throwing.ts` but missing a drill string gets one written from the existing methodology docs (`back-elbow-methodology.md`, `finish-and-balance-methodology.md`, `p3-timing-methodology.md`). Hitting's P3 do-not-cue rule is hitting-only and does not affect throwing/pitching — confirm no banned phrases leaked into BP/throwing prompts.
- Run `bun run lint:p3` (already wired) to verify no cross-contamination.

## Technical Details

Files touched:
- `src/pages/AnalyzeVideo.tsx` — wrap content with `data-protected-editing`, start/stop heartbeat around analyze runs, restore `AnalysisProgressIndicator`, add `AbortController` to both invoke sites, harden catch blocks.
- `src/components/report-card/hammer/AnalysisProgressIndicator.tsx` — no change (re-used).
- `src/lib/reportCard/disciplines/bp.ts` + `throwing.ts` — drill string fill-ins only if audit finds gaps.
- `supabase/functions/analyze-video/index.ts` — only touched if the audit reveals a tile/metric mismatch with the contract; otherwise read-only confirmation.

No schema changes. No new edge functions. Purely additive on the client; analyze-video is already async-friendly (it returns when done).

## Out of scope
- Moving to webhook-based analysis (would require new edge fn + DB column). Current synchronous flow is fine once eviction is fixed and timeout is bounded; revisit only if real p95 exceeds 90s.
