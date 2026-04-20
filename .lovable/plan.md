

## Plan — Hammer Video Tagging V2: Mount Points + AI Learning Layer

Phase 1 built the engine, hooks, panel, owner UI, and DB. Phase 2 makes it **live across the app** and adds the **AI learning layer** described in spec §10.

### Part A — Mount the suggestion panel (so Phase 1 is visible)

Currently `VideoSuggestionsPanel` is built but never rendered. Add it to:

1. **`src/pages/AnalyzeVideo.tsx`** — after `analysis` block (~line 815). Map `analysis.summary[]` + drill issue keys → movement patterns via `mapHIEAreaToMovement`. Mode = `immediate`. Skill domain derived from analysis route (`hitting`/`pitching`/`throwing`).

2. **`src/components/practice/PostSessionSummaryV2.tsx`** — after `FallbackInsights` (line 209). Aggregate movement keys from `composites` (low scores → corresponding movement_pattern), result tags from `drillBlocks[].outcomes`. Mode = `session`. Skill domain from `module` via `moduleToSkillDomain`.

3. **`src/components/hie/WeaknessClusterCard.tsx`** — append `<VideoSuggestionsPanel mode="long_term" movementPatterns={clusters.map(c => mapHIEAreaToMovement(c.area))}>` below the cluster list. Skill domain inferred from cluster area (default `hitting`).

4. **`src/pages/VideoLibrary.tsx`** — optional "Suggested for you" rail above the Browse tab when user has any HIE snapshot.

### Part B — AI Description Learning Layer (spec §10)

**B1. New edge function `analyze-video-description`** (`supabase/functions/analyze-video-description/index.ts`)
- Trigger: called by owner from the new "Auto-Tag" button on `VideoUploadForm` / `StructuredTagEditor`, OR batch-run from the Taxonomy tab "Analyze all untagged".
- Reads `library_videos.ai_description` + title.
- Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with a structured tool-call schema returning `{ movement_patterns[], result_tags[], context_tags[], correction_tags[], suggested_rules[] }` constrained to existing taxonomy keys (passed in the prompt).
- Writes proposals to a new staging table `video_tag_suggestions` (NOT to `video_tag_assignments` directly — owner approves first).

**B2. New table `video_tag_suggestions`** (migration):
```text
id uuid pk | video_id uuid fk | layer video_tag_layer_enum | suggested_key text
| confidence numeric (0–1) | source text ('ai_description'|'pattern_discovery')
| status text ('pending'|'approved'|'rejected') default 'pending'
| reasoning text | created_at | reviewed_by uuid | reviewed_at
```
RLS: owner-only read/write; system insert via service role.

**B3. New table `video_rule_suggestions`** for proposed new `video_tag_rules`:
```text
id uuid pk | skill_domain | movement_key | result_key | context_key | correction_key
| confidence | reasoning text | source_video_ids uuid[]
| status ('pending'|'approved'|'rejected') | created_at | reviewed_by | reviewed_at
```

**B4. Pattern Discovery edge function** `discover-tag-patterns` (cron-scheduled nightly):
- Scans `video_user_outcomes` for clusters where users with movement_pattern X who watched videos tagged Y showed `post_score_delta > 5`.
- Proposes new rules `(movement X) → (correction Y)` into `video_rule_suggestions` with confidence based on sample size and effect size.
- Skips suggestions matching existing active rules.

**B5. Owner Review UI** — new tab in `VideoLibraryManager.tsx`:
- **"AI Suggestions"** tab listing pending tag + rule suggestions grouped by video/skill domain.
- Per row: confidence badge, reasoning text, **Approve / Reject** buttons.
- Approve tag → inserts row in `video_tag_assignments` (weight=2 to mark AI-derived) and marks suggestion `approved`.
- Approve rule → inserts row in `video_tag_rules` with `notes='discovered_v1'`.
- Bulk approve filtered by confidence ≥ 0.8.

**B6. Wire into upload flow**:
- `VideoUploadForm.tsx` — after save, if `ai_description` is set and structured tags are sparse (<2 movement tags), fire `analyze-video-description` automatically and toast "AI suggested 5 tags — review in Suggestions tab".

### Part C — Effectiveness reinforcement loop

Extend `recompute-video-metrics` edge function (already exists from Phase 1) to also:
- For any `video_tag_rules` with `notes='discovered_v1'`, recompute its empirical effectiveness from `video_user_outcomes`. If `improvement_score < 0` over ≥20 samples, auto-deactivate the rule (`active=false`) and log to `audit_log`.
- Boost rule `strength` (cap 10) for rules whose downstream videos consistently show `post_score_delta > 8`.

### Files

**New**
- `supabase/migrations/<ts>_video_tagging_v2_ai_learning.sql` (2 tables + RLS)
- `supabase/functions/analyze-video-description/index.ts`
- `supabase/functions/discover-tag-patterns/index.ts`
- `src/components/owner/AISuggestionsReview.tsx`
- `src/hooks/useVideoTagSuggestions.ts`

**Edited**
- `src/pages/AnalyzeVideo.tsx` (mount panel)
- `src/components/practice/PostSessionSummaryV2.tsx` (mount panel)
- `src/components/hie/WeaknessClusterCard.tsx` (mount panel)
- `src/pages/VideoLibrary.tsx` (optional rail)
- `src/components/owner/VideoUploadForm.tsx` (auto-trigger AI analysis)
- `src/components/owner/VideoLibraryManager.tsx` (AI Suggestions tab)
- `supabase/functions/recompute-video-metrics/index.ts` (rule reinforcement)
- Cron schedule SQL for `discover-tag-patterns` (weekly)

### Out of scope (Phase 3+)
- LLM rewriting `ai_description` itself
- User-facing voting on suggestion quality
- Cross-skill-domain transfer learning

### Verification
1. Open `/analyze/hitting`, run analysis → suggestion panel appears under results with ≤2 immediate-mode videos and visible "Why" reasons.
2. Finish a Practice Hub session → session-mode panel appears in summary with ≤4 videos.
3. HIE Weakness Cluster card now shows a long-term panel with foundational drill videos.
4. Owner uploads video with only `ai_description` filled → toast appears, "AI Suggestions" tab shows proposed tags with confidence + reasoning.
5. Owner clicks Approve → tag assignment created; the video starts appearing in matching suggestions immediately.
6. After cron run, `discover-tag-patterns` populates `video_rule_suggestions` from outcome data; owner reviews and approves → new rule active in next recommendation cycle.
7. Existing Phase 1 flows (manual structured tagging, taxonomy/rules CRUD, suggestion engine ranking) unchanged.

