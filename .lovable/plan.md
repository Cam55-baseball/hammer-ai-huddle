

# Defensive Drill System — Full UI/UX + Engine + Admin CMS

## Current State

**Already built** (from previous phase):
- `drills` table with `sport`, `ai_context`, `premium`, `is_active`, `description` columns
- `drill_tags` table (ENUM categories: skill, body_part, equipment, intensity, phase, position)
- `drill_tag_map` junction table
- Pure recommendation engine in `src/utils/drillRecommendationEngine.ts`
- 13-test suite passing

**Missing** (this phase):
- No `positions` support on drills (the schema has no `drill_positions` table)
- No `error_type` / `situation` tag categories (current ENUM only has skill, body_part, equipment, intensity, phase, position)
- No `weight` column on `drill_tag_map`
- No `detected_issues` on performance sessions
- No `is_published` / `created_by` on drills
- No player-facing "Fix Your Game" screen
- No admin Drill CMS
- No drill detail page
- No "My Work" saved/recommended drills screen
- Engine lacks position matching, weight scoring, error_type matching, and trend awareness

---

## Phase 1 — Schema Changes (Migration)

### 1A. Extend `drill_tag_category` ENUM
Add `error_type` and `situation` to the existing enum.

### 1B. Add columns to `drills`
```sql
ALTER TABLE public.drills
  ADD COLUMN title text,  -- alias for name, kept for compat
  ADD COLUMN is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN created_by uuid REFERENCES auth.users(id),
  ADD COLUMN subscription_tier_required text DEFAULT 'free',
  ADD COLUMN updated_at timestamptz DEFAULT now();
```

### 1C. Create `drill_positions` table
```sql
CREATE TABLE public.drill_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id uuid NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  position text NOT NULL,
  UNIQUE(drill_id, position)
);
```
With RLS: public read, owner write.

### 1D. Add `weight` to `drill_tag_map`
```sql
ALTER TABLE public.drill_tag_map ADD COLUMN weight int NOT NULL DEFAULT 1;
```

### 1E. Add `detected_issues` to `performance_sessions`
```sql
ALTER TABLE public.performance_sessions
  ADD COLUMN detected_issues text[] DEFAULT '{}';
```

### 1F. Create `drill_usage_tracking` table (for trend awareness)
```sql
CREATE TABLE public.drill_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_id uuid NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  used_at timestamptz DEFAULT now(),
  success_rating smallint  -- 1-5
);
```
With RLS: users can read/write own rows.

### 1G. Seed error_type and situation tags
Insert tags like: `late_transfer`, `bad_footwork`, `bobble`, `offline_throw`, `slow_roller`, `backhand`, `double_play`, etc.

---

## Phase 2 — Upgrade Recommendation Engine

### `src/utils/drillRecommendationEngine.ts`

Extend interfaces:
- Add `positions: string[]` to `DrillInput`
- Add `tagWeights: Record<string, number>` to `DrillInput`
- Add `position?: string` and `detectedIssues?: string[]` to `RecommendationInput`
- Add `positionMatch` and `errorTypeMatch` to `ScoreBreakdown`
- Add `matchReasons: string[]` to `ScoredDrill`

New scoring formula:
```
score =
  + errorTagMatch * 5 (weighted)
  + skillTagMatch * 3
  + positionMatch * 4
  + sportMatch * 3 (already handled by filter)
  + weightBonus (from drill_tag_map.weight)
  + difficultyFit
  + variety
  + trendBonus (if success_rate > 0.8 → +5)
```

Add `matchReasons[]` array to each scored drill for UI transparency (e.g., "matches late_transfer", "position match: SS").

### `src/utils/__tests__/drillRecommendationEngine.test.ts`
Add tests for:
- Position filtering (Catcher input → no SS drills ranked high)
- Error type matching (late_transfer → only those drills ranked highest)
- Weight bonus application
- Match reasons populated correctly

---

## Phase 3 — Player UI

### 3A. "Fix Your Game" Screen (Post-Session)

**New component**: `src/components/practice/FixYourGame.tsx`

Shown after session logging (as optional step after PostSessionSummaryV2). Displays:
- "Top Issues Detected" — chips showing detected_issues from the session
- "Recommended Defensive Drills" — cards from the recommendation engine
- Each card: video thumbnail, title, "Why recommended" (from matchReasons + ai_context), position tag, difficulty badge
- Buttons: ▶ Watch, ⭐ Save to Vault, 🔒 Locked (subscription gated)

Integrate into `PracticeHub.tsx` flow as an optional post-session step.

### 3B. Issue Detection in Fielding Logging

**Edit**: `src/components/practice/InfieldRepTypeFields.tsx` (or appropriate fielding component)

Add multi-select chip selector for `detected_issues`:
- late_transfer, bad_footwork, bobble, offline_throw, booted_ground_ball, bad_footwork_angle
- Store in session's `detected_issues` column

### 3C. Drill Detail Dialog

**New component**: `src/components/practice/DrillDetailDialog.tsx`

Sections:
- Video player (or locked blur + upgrade CTA)
- Description (coach-level teaching)
- "Why this helps YOU" (from ai_context + matchReasons)
- Tags displayed as badges (skills, situations, error types)
- Save to vault button

### 3D. "My Work" Section

**New component**: `src/components/vault/VaultDrillWork.tsx`

Tabs:
- Saved Drills (from `vault_saved_drills`)
- Recently Recommended (stored in local state or a new lightweight table)
- Shows drill cards with quick actions

---

## Phase 4 — Admin / Owner CMS

### 4A. Add "Drill CMS" section to Owner Dashboard

**Edit**: `src/components/owner/OwnerSidebar.tsx`
- Add `'drill-cms'` to `OwnerSection` type
- Add sidebar item with Dumbbell icon

**Edit**: `src/pages/OwnerDashboard.tsx`
- Add section label and render `DrillCmsManager` component

### 4B. Drill Library Manager

**New component**: `src/components/owner/DrillCmsManager.tsx`

Table view with columns: Title, Sport, Positions, Tags, Tier, Status (published/draft)
Actions: Edit, Delete, Duplicate
Search/filter bar

### 4C. Create/Edit Drill Dialog

**New component**: `src/components/owner/DrillEditorDialog.tsx`

Form sections:
- **Core Info**: Title, Video URL, Sport (baseball/softball), Positions (multi-select)
- **Coaching Layer**: Description (textarea), AI Context (textarea with prompt: "Explain WHEN this drill should be used and WHAT it fixes")
- **Tagging System**: Split UI with checkbox grids for Error Tags, Skill Tags, Situation Tags
- **Weight Control**: Advanced toggle with slider per tag (1-5)
- **Access Control**: Free / Premium toggle
- **Publish Toggle**: Draft / Published

Uses Supabase to insert/update `drills`, `drill_positions`, `drill_tag_map` tables.

---

## Phase 5 — Subscription Enforcement

- Backend: Engine marks `locked: true` for premium drills (already done)
- Frontend: `DrillDetailDialog` blurs video and shows upgrade CTA for locked drills
- `FixYourGame` cards show lock icon with upgrade prompt
- Premium video URLs are NOT included in the response for free users — add a filter in the data-fetching hook that strips `video_url` when `locked: true`

---

## Phase 6 — Data Fetching Hook

**New hook**: `src/hooks/useDrillRecommendations.ts`

- Fetches drills with joined tags and positions from Supabase
- Fetches user's weakness data from performance intelligence
- Calls `computeDrillRecommendations()` with assembled input
- Returns scored drills, loading state
- Strips `video_url` from locked drills before returning

---

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Extend enum, add columns, create tables, seed tags |
| `src/utils/drillRecommendationEngine.ts` | Add position, error_type, weight, matchReasons, trend scoring |
| `src/utils/__tests__/drillRecommendationEngine.test.ts` | Add position/error/weight/trend tests |
| `src/hooks/useDrillRecommendations.ts` | New — data fetching + engine integration |
| `src/components/practice/FixYourGame.tsx` | New — post-session recommendation screen |
| `src/components/practice/DrillDetailDialog.tsx` | New — full drill view |
| `src/components/practice/FieldingIssueSelector.tsx` | New — issue chips for fielding reps |
| `src/components/vault/VaultDrillWork.tsx` | New — saved/recommended drills in vault |
| `src/components/owner/DrillCmsManager.tsx` | New — admin drill library table |
| `src/components/owner/DrillEditorDialog.tsx` | New — create/edit drill form |
| `src/components/owner/OwnerSidebar.tsx` | Add drill-cms section |
| `src/pages/OwnerDashboard.tsx` | Render DrillCmsManager |
| `src/pages/PracticeHub.tsx` | Integrate FixYourGame after session summary |
| `src/pages/Vault.tsx` | Add VaultDrillWork tab/section |

