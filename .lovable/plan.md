# Foundations System — Hardening & Deep Integration Plan

A focused audit + implementation pass on the existing Foundations layer. Nothing about the application/per-rep recommendation engine is replaced — Foundations runs in parallel with its own scorer, candidate set, and surfaces.

---

## Audit Findings (current state)

Files in scope: `src/lib/foundationVideos.ts`, `src/hooks/useFoundationVideos.ts`, `src/components/video-library/FoundationsShelf.tsx`, `src/components/owner/FoundationTagEditor.tsx`, `src/hooks/useVideoLibraryAdmin.ts`, `src/pages/VideoLibrary.tsx`, migration `20260509044450_*`.

### Integration gaps (silent failure today)
1. **Owner Fast Editor + Video Edit Form** — Foundation toggle exists only in `VideoUploadWizard`. Editing an existing foundation video in `VideoFastEditor` / `VideoEditForm` cannot reach `foundation_meta` or `video_class`. Owner can silently strip a foundation video back to application by re-saving.
2. **Hammer / Today Tips edge function (`get-today-tips`)** — does not query `video_class='foundation'`. Foundations never surface in Hammer chat or daily tips.
3. **Trigger snapshot is mostly placeholder** — `domainRepCount: {}`, `regulationLow3d: false`, `seasonPhase: null`, `philosophyDriftIntents14d: 0`, all delta fields undefined. Only `new_user_30d` and `post_layoff` ever fire today.
4. **`recentlyWatched21d` is never set** — the −30 spam guard is dead code; no read of `library_video_analytics` watch history.
5. **Standard library feed (`useVideoLibrary`)** has no awareness of `video_class`. Foundations appear in the regular grid AND the shelf, double-surfacing and competing with application drills on the tier sort.
6. **Scorer math review** — `score *= (tierBoost[tier] ?? 1)` is *correct* (multiplicative tier weight, parallel to application engine), but `recentlyWatched21d` is applied AFTER the multiply, then `if (score <= 0) continue` silently drops featured videos when matched=1 and not-watched penalty applied with low base. Needs floor + reordering.
7. **No JSONB index on `foundation_meta`** — every shelf query scans 200 rows client-side.
8. **No realtime/cross-tab invalidation** for foundation watches; user can mark a foundation watched in tab A and see it re-recommended in tab B.
9. **No malformed-meta defense** — DB row with `foundation_meta = {}` will throw at `meta.refresher_triggers.filter(...)`.
10. **Length tier never persisted** — `length_tier` is in the type but the wizard/editor never writes it; matching boost is dead.
11. **No tests** for trigger derivation, scorer, completeness grading, or migration backfill.
12. **No analytics events** for `foundation_shown` / `foundation_clicked` / `foundation_helped` → can't learn over time.

### Logic risks
- `fragile_foundation` fires when **any** domain has <50 reps, including domains the athlete doesn't play (every new user is permanently fragile across all 9 domains). Must scope to athlete's primary domain(s).
- Trigger overlap formula: `60 + 20*(matched-1)` with no cap — 5 trigger overlap = 140 base before tier multiply, can exceed featured application drill scores in unified surfaces. Add cap at 120.
- `recompute_library_video_tier` for foundations counts `v_missing >= 3` as blocked — but the editor enforces required chips, so a malformed JSONB write (e.g. from an admin SQL fix) will silently block the video without telemetry.

---

## Implementation Plan

### 1. Scorer + trigger correctness (`src/lib/foundationVideos.ts`)
- Cap base score at 120 after overlap stacking.
- Apply `recentlyWatched21d` penalty BEFORE tier multiply, then floor at 0 (never drop a featured/matched video silently — keep with low score so admin diagnostics see it).
- Scope `fragile_foundation` to a passed-in `primaryDomains: FoundationDomain[]`.
- Add a `diversity` pass: max 2 results per `domain` in the returned list (prevents 4 hitting philosophies in a row).
- Add Zod schema `FoundationMetaSchema` + `parseFoundationMeta(raw): FoundationMeta | null` used by every reader.
- Export `FOUNDATION_META_VERSION = 1` and stamp all writes.

### 2. Real trigger wiring (`src/hooks/useFoundationVideos.ts` → split into `useFoundationSnapshot.ts`)
Replace placeholders with real queries (single batched RPC where possible):
- `domainRepCount` ← `custom_activity_logs` grouped by domain over last 90d.
- `bqiDelta7d`, `peiDelta7d`, `competitiveDelta14d` ← `engine_snapshot_versions` latest two snapshots.
- `faultRateDelta14d` ← `session_performance` fault aggregates.
- `regulationLow3d` ← `regulation_daily_index` last 3 days < threshold.
- `seasonPhase` ← `season_phases` table (already exists).
- `layoffDays` ← already wired, keep.
- `philosophyDriftIntents14d` ← count of distinct `practice_intent` values in last 14d > 2.
- `primaryDomains` ← `athlete_mpi_settings.sport` + `profiles.position`.
- Cache snapshot in React Query with `staleTime: 5 * 60_000`.

### 3. Recently-watched (real)
- Read `library_video_analytics` rows where `action='view'` and `created_at > now() - 21d` for current user, build `Set<videoId>` and stamp candidates.
- Subscribe to `BroadcastChannel('data-sync')` `video_watched` events to invalidate the React Query key.

### 4. Owner editing parity
- Add `<FoundationTagEditor>` branch + `video_class` toggle to `VideoFastEditor.tsx` and `VideoEditForm.tsx`.
- In `useVideoLibraryAdmin.updateStructuredFields`, validate via Zod; reject invalid foundation_meta with toast instead of silent partial write.
- Auto-set `length_tier` from video duration in wizard + edit save.

### 5. Standard feed segregation (`useVideoLibrary` + `VideoLibrary.tsx`)
- Default `useVideoLibrary` query filters out `video_class='foundation'` (foundations only appear in their dedicated shelf + `/video-library/foundations` route).
- Add filter chip "Foundations" that flips the predicate.
- Shelf auto-hides when no triggers active AND user is not on the dedicated route (avoid permanent shelf clutter).

### 6. Hammer / Today Tips integration
- `supabase/functions/get-today-tips/index.ts`: after computing application tips, run a parallel foundation lookup (server-side scorer mirror in `_shared/foundationScorer.ts`) capped at 1 per day per domain; attach as `tips.foundation` field.
- Surface in existing Today Tips UI as a single "Refresh your base" card with reason text.

### 7. DB hardening (single migration)
- `CREATE INDEX library_videos_foundation_class_idx ON library_videos (video_class) WHERE video_class='foundation';`
- `CREATE INDEX library_videos_foundation_meta_gin ON library_videos USING GIN (foundation_meta jsonb_path_ops) WHERE video_class='foundation';`
- Add CHECK trigger (not constraint — per project rules) validating foundation rows have `domain`, `scope`, non-empty audience/triggers arrays, version stamp.
- New table `foundation_video_outcomes (user_id, video_id, shown_at, clicked_at, watched_seconds, helped_flag, trigger_keys text[])` with RLS (user owns own rows, owner reads aggregates via SECURITY DEFINER fn).
- Backfill: stamp `foundation_meta->>'version' = '1'` on existing rows.

### 8. Resilience
- Every reader uses `parseFoundationMeta`; on failure log to `engine_sentinel_logs` with `kind='foundation_meta_malformed'` and skip the row instead of throwing.
- Shelf wrapped in `<ErrorBoundary fallback={null}>`.
- Thumbnail fallback already handled; add `video_url` empty/whitespace skip (per `data-integrity/video-url-standard` core rule).

### 9. Learning loop (lightweight, no model)
- Insert `foundation_video_outcomes` rows on shown/clicked/watched/helped.
- Weekly cron edge function `recompute-foundation-effectiveness`: per (video_id, trigger_key) compute helped_rate = helped / shown; store on `library_videos.foundation_effectiveness jsonb`.
- Scorer reads `foundation_effectiveness[trigger]` and adds up to +15 boost — deterministic, bounded.

### 10. UX polish (mobile-first @ 440px)
- Shelf header copy: "Return to your blueprint" with subcopy mapped to top trigger.
- Empty/onboarding state for `/video-library/foundations` route when 0 videos.
- Skeleton state during load (currently returns null → CLS jump).
- Aria labels on cards, keyboard nav (`tabIndex`, `onKeyDown` Enter/Space).

### 11. Tests
- `src/lib/foundationVideos.test.ts`: trigger derivation matrix, scorer math (overlap cap, recently-watched, diversity, malformed meta).
- `src/hooks/useFoundationSnapshot.test.ts`: mocked Supabase, assert real signals fire.
- Migration test: insert malformed row → trigger raises; insert clean row → tier `normal`.
- Edge function deno test for `get-today-tips` foundation branch.

---

## Out of scope
- No changes to application/per-rep `videoRecommendationEngine.ts` ranking logic.
- No new AI model; effectiveness learning is deterministic counters.
- No paid-tier gating for foundations.
- No bulk re-tagging of historical videos (owner does it via the parity-fixed Fast Editor).

---

## Deliverable order (one approval, executed sequentially)
1. Migration (indexes, outcomes table, validation trigger, version stamp).
2. `foundationVideos.ts` scorer + Zod + parser.
3. `useFoundationSnapshot.ts` real signal wiring + cache.
4. Recently-watched + cross-tab invalidation.
5. Editor parity (Fast Editor + Edit Form + length_tier autofill).
6. Standard feed segregation + filter chip.
7. `get-today-tips` integration + shared scorer.
8. Outcomes telemetry + weekly effectiveness cron.
9. Shelf UX polish + skeleton + a11y.
10. Tests (unit + integration + edge).

After implementation: architecture summary, data flow map, trigger flow map, recommendation flow map, failure recovery map delivered as a single `docs/foundations-architecture.md`.
