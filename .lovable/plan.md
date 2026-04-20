

## Plan — Hammer Video Tagging + Suggestion Engine V1

Upgrade the existing `library_videos` flat-tag system into a 6-layer structured tagging engine with a rule-based recommendation engine, real-time suggestion modes, and a learning feedback loop — without breaking the current Video Library UI.

### 1. Database — schema changes (migration)

**Enums** (Postgres types):
- `video_type_enum` — drill, game_at_bat, practice_rep, breakdown, slow_motion, pov, comparison
- `skill_domain_enum` — hitting, fielding, throwing, base_running, pitching
- `video_tag_layer_enum` — movement_pattern, result, context, correction (the 4 structured taxonomy layers; `video_type` and `skill_domain` are columns, not tags)

**Extend `library_videos`** (additive, nullable for back-compat):
- `video_format video_type_enum` (Layer 1)
- `skill_domains skill_domain_enum[]` (Layer 2)
- `ai_description text` (free-text intent description)

**New table `video_tag_taxonomy`** — the controlled vocabulary for layers 3–6:
```text
id uuid pk | layer video_tag_layer_enum | key text | label text | skill_domain skill_domain_enum
| description text | created_by uuid | active bool default true
unique(layer, key, skill_domain)
```
Seeded with the spec's enums (hands_forward_early, roll_over_contact, two_strike, keep_hands_back, etc.) for hitting + fielding + pitching + throwing + base_running.

**New table `video_tag_assignments`** — many-to-many video↔structured-tag:
```text
video_id uuid fk → library_videos | tag_id uuid fk → video_tag_taxonomy
| weight smallint default 1 (owner can boost a tag 1–5)
pk(video_id, tag_id)
```

**New table `video_tag_rules`** — the relationship engine (movement+result+context → correction):
```text
id uuid pk | skill_domain | movement_key | result_key (nullable) | context_key (nullable)
| correction_key | strength smallint default 5 | active bool | notes text | created_by uuid
```
Seeded with spec rules (e.g. `hands_forward_early + roll_over_contact → keep_hands_back, barrel_stays_behind_hands`; `slow_first_step → reaction_drills, first_step_quickness`).

**New table `video_performance_metrics`** — feedback loop counters:
```text
video_id uuid pk → library_videos
suggestion_count int | watch_count int | total_watch_seconds bigint
post_view_improvement_sum numeric | post_view_improvement_n int
last_recomputed_at timestamptz
```
Computed `improvement_score` = `post_view_improvement_sum / max(1, post_view_improvement_n)`.

**New table `video_user_outcomes`** — per-user learning signal:
```text
id uuid pk | user_id | video_id | suggested_at | watched_at | watch_seconds
| suggestion_reason jsonb (rule + tags matched) | post_score_delta numeric (filled by background job)
| mode text ('immediate'|'session'|'long_term')
```

**RLS**: taxonomy + rules read-public/write-owner; assignments owner-write/all-read; performance_metrics public-read/system-write; user_outcomes user-scoped read/write + owner read.

Existing `library_videos.tags text[]` and `library_tags` table stay untouched (legacy filter chips keep working).

### 2. Recommendation engine — `src/lib/videoRecommendationEngine.ts` (new)

Pure function, fully unit-testable:

```ts
recommendVideos({
  skillDomain, sport, mode: 'immediate'|'session'|'long_term',
  movementPatterns: string[],   // from analysis/HIE/drill issues
  resultTags: string[],         // from latest reps / outcomeTags
  contextTags: string[],        // from session context
  candidateVideos: VideoWithTags[],
  rules: VideoTagRule[],
  userOutcomes: Map<videoId, {watchCount, avgPostDelta}>,
  globalMetrics: Map<videoId, {improvementScore}>
}) → Array<{ video, score, reasons: string[] }>
```

**Ranking weights (priority order from spec)**:
1. Exact movement_pattern tag match → +50 per match (× tag weight)
2. Result tag match → +25
3. Context tag match → +15
4. Rule-derived correction tag match (movement+result→correction) → +40
5. User-specific success: `userOutcomes[v].avgPostDelta × 8`, capped ±20
6. Global `improvementScore × 5`, capped ±10
7. Recency bonus: `created_at` within 30 days → +3
8. Penalty: already watched ≥3 times by user with no positive delta → −15

**Mode caps**:
- `immediate`: max 2 results, requires score ≥ 60
- `session`: max 4, requires score ≥ 40
- `long_term`: max 4, biased toward `correction` + `drill` formats

Each result carries human-readable `reasons[]` strings ("Matches your movement pattern: hands drifting forward early", "Targets roll-over contact you logged 3× today") for the mandatory "WHY" UI.

### 3. Suggestion delivery — `useVideoSuggestions` hook + UI

**New hook** `src/hooks/useVideoSuggestions.ts` — wraps the engine with React Query, handles the 3 modes:
- `useImmediateSuggestions(rep)` — fires after a rep is logged
- `useSessionSuggestions(sessionId)` — runs after 10–20 reps aggregated
- `useLongTermSuggestions()` — pulls from HIE weakness clusters + 6-week test report

**New component** `src/components/video-suggestions/VideoSuggestionsPanel.tsx`:
- Renders ≤4 cards (≤2 in immediate mode), each shows thumbnail, title, "Why" reason list
- "Watch" CTA tracks `video_user_outcomes` row (suggestion_count++ on display, watch_count++ on play)
- Reuses existing `VideoPlayer` modal from `src/components/video-library/`

**Mount points** (additive — no removal of existing flows):
- Hitting/Pitching analysis result page → immediate mode (after analysis returns)
- Practice Hub session summary → session mode
- HIE Weakness Cluster card → "Watch related videos" button → long_term mode
- Vault performance test report → long_term mode

### 4. Owner tagging UI — extend `src/components/owner/VideoUploadForm.tsx` + `VideoLibraryManager.tsx`

**Two-mode tagging panel** (per spec §7):

**Mode A — Structured (required)**
- Required: `video_format` dropdown (Layer 1), `skill_domains` multi-select (Layer 2)
- 4 grouped multi-selects pulling from `video_tag_taxonomy` filtered by layer + skill domain:
  - Movement Patterns (Layer 3)
  - Result Tags (Layer 4)
  - Context Tags (Layer 5)
  - Correction/Intent Tags (Layer 6)
- Per-tag weight slider 1–5 (default 1)

**Mode B — AI Description (required)**
- Free-text `ai_description` textarea with placeholder example from spec
- Stored on `library_videos.ai_description`

**New tab in `VideoLibraryManager`**:
- **"Taxonomy"** — owner-only CRUD on `video_tag_taxonomy` (add/edit/deactivate keys per layer per skill_domain)
- **"Rules"** — owner-only CRUD on `video_tag_rules` (movement+result+context → correction)

### 5. Feedback loop — recompute metrics

**New edge function** `supabase/functions/recompute-video-metrics/index.ts`:
- Runs on cron (nightly, follows `architecture/edge-functions/implementation-standards`)
- For each video: aggregates `video_user_outcomes` → updates `video_performance_metrics` (suggestion_count, watch_count, improvement_score)
- `post_score_delta` is filled by a separate trigger: when a `performance_sessions` row is inserted within 7 days of a `video_user_outcomes.watched_at` for that user/skill_domain, compute the delta vs the user's prior session score and write it back.

**Realtime sync**: `BroadcastChannel('data-sync')` invalidates `['video-suggestions']` query on rep log + session save (per multi-tab strategy).

### 6. Analysis integration (data input → engine)

Map existing analysis outputs to taxonomy keys via `src/lib/analysisToTaxonomy.ts`:
- `useHIESnapshot().weakness_clusters[].area` → `movement_pattern` keys
- `outcomeTags.ts` IDs (barrel, roll_over, etc.) → `result` keys (rename pass — `roll_over_contact` matches existing `barrel`/`hard_hit`/`pop_up` naming)
- Session intent gate (handedness/pitch type) + game state → `context` keys
- HIE `prescriptive_actions[].weakness_area` → seeds new `video_tag_rules` rows

No changes to analysis formulas (per spec §11).

### 7. Files

**New**:
- `supabase/migrations/<ts>_video_tagging_v1.sql` (enums, tables, RLS, seed taxonomy + rules)
- `src/lib/videoRecommendationEngine.ts` + tests
- `src/lib/analysisToTaxonomy.ts`
- `src/hooks/useVideoSuggestions.ts`
- `src/hooks/useVideoTaxonomy.ts`
- `src/components/video-suggestions/VideoSuggestionsPanel.tsx`
- `src/components/owner/StructuredTagEditor.tsx`
- `src/components/owner/TaxonomyManager.tsx`
- `src/components/owner/RuleEngineManager.tsx`
- `supabase/functions/recompute-video-metrics/index.ts` (+ cron config)

**Edited**:
- `src/components/owner/VideoUploadForm.tsx` (add structured panel + ai_description)
- `src/components/owner/VideoLibraryManager.tsx` (Taxonomy + Rules tabs)
- `src/hooks/useVideoLibraryAdmin.ts` (write to `video_tag_assignments` + `ai_description`)
- `src/pages/VideoLibrary.tsx` (optional "Suggested for you" rail above Browse)
- Mount `VideoSuggestionsPanel` in Hitting/Pitching analysis result page, Practice Hub summary, HIE WeaknessCluster card

### Out of scope (Phase 2 per spec §10)
- AI parsing of `ai_description` to auto-derive new tag relationships
- Automatic discovery of new `video_tag_rules`
- No removal of legacy `library_videos.tags` array

### Verification
1. Owner uploads a video → required to pick `video_format`, ≥1 `skill_domain`, ≥1 movement pattern, fill `ai_description`. Saves to `video_tag_assignments` + `library_videos`.
2. Owner adds rule `hands_forward_early + roll_over_contact → keep_hands_back` in Rules tab → row in `video_tag_rules`.
3. User logs a rep with outcome `roll_over_contact` while analysis flags `hands_forward_early` → Immediate panel shows ≤2 videos with reasons "Matches: hands drifting forward early" + "Fixes: keep hands back".
4. After 15 reps in a session → Session panel shows ≤4 videos addressing dominant movement issues.
5. HIE Weakness Cluster "Watch related videos" → Long-term panel shows ≤4 foundational drill videos.
6. Watching a video → row in `video_user_outcomes`; nightly job updates `video_performance_metrics.improvement_score`; future suggestions for that user re-rank with personal success boost.
7. Existing Video Library Browse/Saved tabs continue to work unchanged with legacy `tags` filtering.

