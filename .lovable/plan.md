# Plan: Optimize Hammer Video Suggestions — Post-Session + Long-Term Only

## Confirmation of your direction

Agreed. We are killing the `immediate` (per-rep) mode entirely. Hammer is not a helicopter coach. Suggestions surface in exactly two places:

1. **Post-Session** — every single session, after save, based on what just happened in that session.
2. **Long-Term** — on the dashboard / Vault, based on rolling weakness clusters from HIE + practice history.

No popups mid-rep. No interruptions. No suggestions while logging.

---

## What's broken today

- The recommendation engine (`videoRecommendationEngine.ts`) is built and tier-aware, but **nothing real feeds it**. The `useVideoSuggestions` hook requires `movementPatterns` / `resultTags` / `contextTags` arrays — and no caller currently passes session-derived values.
- `PostSessionSummary.tsx` shows scores + an `AIPromptCard` but **no video suggestions**.
- Long-term surfaces (Vault, dashboard) have no Hammer-driven video block tied to HIE weakness clusters.
- `analysisToTaxonomy.ts` already exists with the mapping helpers (HIE area → movement, outcome tag → result, context → context) — it's just unused.

---

## What we will build

### 1. Remove `immediate` mode from the engine
- Drop `'immediate'` from `SuggestionMode` type.
- Remove its entry from `MODE_CAPS`.
- Delete any per-rep call sites if found (search confirms none currently wired in production UI).
- Update `trackVideoSuggestionShown` typing accordingly.

### 2. Post-Session video block (every session, every time)
New component: `src/components/practice/PostSessionVideoSuggestions.tsx`

Signal extraction (runs once when summary opens):
- Pull the just-saved session's `drill_blocks`, `composite_indexes`, `session_context`, and `module`.
- Aggregate across the session's reps:
  - **Movement patterns**: take the bottom-2 lowest `execution_grade` drill blocks → map their flagged mechanics via `mapHIEAreaToMovement`.
  - **Result tags**: collect `outcome_tags` across reps, keep the top 3 most frequent → `mapOutcomeToResult`.
  - **Context tags**: pull from `session_context` + session intent (handedness, pitch type focus, count focus) via `mapSessionContext`.
- Resolve `skillDomain` from `module` via `moduleToSkillDomain`.
- Call `useVideoSuggestions({ mode: 'session', ... })` → returns max 4 videos.

Render rules:
- Insert into `PostSessionSummary.tsx` between Performance Indexes and the Streak card.
- Header: "Hammer Picks for You" + one-line rationale ("Based on this session's lowest-graded reps and outcomes").
- Each card shows thumbnail, title, top reason, and "Why this video" expandable list (`reasons[]` from engine).
- If <2 candidates qualify (minScore 40), show "No targeted picks this session — clean work." instead of filler.
- Track impressions via `trackVideoSuggestionShown` on mount.

### 3. Long-Term suggestions surface
New component: `src/components/dashboard/LongTermVideoSuggestions.tsx`

Signal source — rolling 14-day window:
- Query `hie_weakness_clusters` (or equivalent — we'll confirm exact table during build) for the user's current top-3 unresolved areas → movement patterns.
- Query `custom_activity_logs` + `performance_sessions` over 14 days → most frequent low-grade outcome tags → result tags.
- Athlete profile (sport, position, handedness) → context tags.
- Call `useVideoSuggestions({ mode: 'long_term', ... })` → 4 videos biased toward `drill` / `breakdown` formats.

Placement:
- Dashboard (role: athlete) — add a "Develop This Week" card slot.
- Vault overview — add the same block under the existing weakness cluster section.

Refresh cadence:
- Recomputes on `BroadcastChannel('data-sync')` events for `session_saved` / `analysis_complete` (already wired in `useVideoSuggestions`).
- Throttled by React Query `staleTime: 60s`.

### 4. Strengthen `analysisToTaxonomy.ts`
- Add a `aggregateSessionToTaxonomy(session)` helper that returns `{ movementPatterns, resultTags, contextTags, skillDomain }` so both post-session and long-term components share one pure mapper.
- Add a `aggregateRollingWindowToTaxonomy(userId, days)` async helper for long-term.
- Unit-test both with vitest fixtures (already used elsewhere).

### 5. Outcome tracking (close the loop)
- Already partially built (`video_user_outcomes`). Confirm:
  - Impression logged when card appears (`trackVideoSuggestionShown`).
  - Watch logged via `trackVideoWatched` from `VideoLibraryPlayer` when the user opens a suggested video.
  - `post_score_delta` populated by an existing nightly job or add a tiny trigger in `calculate-session` to diff next session's composite vs prior baseline for any video watched in between.
- This feeds `userOutcomes` back into the engine — videos that helped *you* rank higher next time; videos you watched 3x with no improvement get deprioritized.

---

## Files to create / edit

**Create**
- `src/components/practice/PostSessionVideoSuggestions.tsx`
- `src/components/dashboard/LongTermVideoSuggestions.tsx`
- `src/lib/analysisToTaxonomy.test.ts`

**Edit**
- `src/lib/videoRecommendationEngine.ts` — remove `immediate` from `SuggestionMode` + `MODE_CAPS`.
- `src/hooks/useVideoSuggestions.ts` — type updates.
- `src/lib/analysisToTaxonomy.ts` — add aggregation helpers.
- `src/components/practice/PostSessionSummary.tsx` — mount the post-session block.
- Athlete dashboard component (will locate during build — likely `src/pages/Index.tsx` or a dashboard cards file) — mount long-term block.
- `supabase/functions/calculate-session/index.ts` — small addition to compute `post_score_delta` for previously-suggested videos (only if not already present).

---

## Out of scope
- Per-rep / `immediate` suggestions (explicitly rejected).
- Changing taxonomy management (already shipped).
- Changing tier/confidence math.
- Push notifications for suggestions — surfaces are in-app only.

---

## Acceptance checks
- After saving any practice session, the summary shows a "Hammer Picks for You" block (or the empty-state line).
- Suggestions reflect this session's worst-graded reps + frequent outcome tags + context.
- Dashboard "Develop This Week" updates within 60s of a session save (cross-tab via BroadcastChannel).
- No suggestion UI fires during rep entry.
- Watching a suggested video is recorded; subsequent sessions show whether the score moved.
