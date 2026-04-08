

# Defensive Drill Progression System — Elite Coaching Intelligence

## What We're Building

Upgrading the existing drill system from a flat library into a 4-layer progression engine that thinks like an elite coach: auto-populated seed drills, development-tier filtering, outcome-to-drill mapping, and challenge-zone scoring.

## Current State

- **drills table**: 29 rows, has sport/ai_context/premium/is_active/is_published/description. No `progression_level`.
- **drill_tags**: 47 tags across 8 categories (skill, body_part, equipment, intensity, phase, position, error_type, situation). All good.
- **drill_tag_map**: junction with weight column. Working.
- **drill_positions**: exists. Working.
- **drill_usage_tracking**: exists with success_rating. Working.
- **Engine**: Pure function scoring across 8 axes. No progression-level awareness.
- **Admin CMS**: Full CRUD with tag weights, positions, publish toggle. No progression level field.
- **Player UI**: FixYourGame, DrillDetailDialog, FieldingIssueSelector all functional.

**Missing**: progression_level column, AI drill generation pipeline, owner review queue, challenge-zone scoring, auto-seed system, sport-specific modifiers.

---

## Phase 1 — Schema Changes (Migration)

### 1A. Add `progression_level` to `drills`
```sql
ALTER TABLE public.drills
  ADD COLUMN progression_level int NOT NULL DEFAULT 4
    CONSTRAINT drills_progression_level_range 
    CHECK (progression_level >= 1 AND progression_level <= 7);
```
Levels: 1=Tee Ball, 2=Youth, 3=Middle School, 4=High School, 5=College, 6=Pro, 7=Elite

### 1B. Add `sport_modifier` to `drills`
```sql
ALTER TABLE public.drills
  ADD COLUMN sport_modifier numeric NOT NULL DEFAULT 1.0;
```
Allows softball-specific drills to get a priority boost (e.g., slow roller = 1.15 in softball).

### 1C. Add `version` to `drills`
```sql
ALTER TABLE public.drills
  ADD COLUMN version int NOT NULL DEFAULT 1;
```
Every edit increments version for audit trail.

### 1D. Create `pending_drills` table (AI review queue)
```sql
CREATE TABLE public.pending_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  sport text NOT NULL DEFAULT 'baseball',
  positions text[] DEFAULT '{}',
  progression_level int NOT NULL DEFAULT 4,
  tags jsonb NOT NULL DEFAULT '{}',
  ai_context text,
  module text NOT NULL DEFAULT 'fielding',
  skill_target text,
  source text NOT NULL DEFAULT 'ai',
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);
```
RLS: owner-only read/write.

### 1E. Add `performance_improved` to `drill_usage_tracking`
```sql
ALTER TABLE public.drill_usage_tracking
  ADD COLUMN performance_improved boolean;
```

---

## Phase 2 — Seed Foundational Drills

Use the insert tool to populate ~30-40 foundational drills across progression levels, tagged and weighted. Examples:

| Drill | Level | Positions | Error Tags |
|-------|-------|-----------|------------|
| Two-Hand Fielding | 1 (Tee Ball) | infield, outfield | bobble, dropped_ball |
| Basic Glove Presentation | 2 (Youth) | infield | glove_work |
| Backhand Ground Ball | 4 (HS) | shortstop, third_base | bad_footwork |
| Slow Roller Charge | 5 (College) | third_base, shortstop | slow_reaction |
| Double Play Feed Pivot | 5 (College) | second_base, shortstop | late_transfer |
| Bare Hand Exchange | 6 (Pro) | all infield | late_transfer |

Each gets full ai_context, tags with weights, and positions.

---

## Phase 3 — Upgrade Recommendation Engine

### `src/utils/drillRecommendationEngine.ts`

**New fields on DrillInput:**
- `progression_level: number` (1-7)
- `sport_modifier: number`

**New field on RecommendationInput:**
- `userLevel?: number` (1-7, derived from profile age/competition level)

**New scoring axis in ScoreBreakdown:**
- `progressionFit: number` (0-20)

**Challenge-zone logic:**
```typescript
// Optimal: drill level matches user level or is 1 above
const diff = drill.progression_level - userLevel;
if (diff === 0 || diff === 1) progressionFit = 20;
else if (diff === -1) progressionFit = 12;
else if (diff === 2) progressionFit = 8;
else if (diff < -1 || diff > 2) progressionFit = 0; // too easy or too hard
```

**Sport modifier applied:**
```typescript
finalScore = Math.round(rawScore * drill.sport_modifier);
```

**Escalation logic (repeated issues):**
- If `detectedIssues` contains an issue the user has logged 3+ times (from usageStats context), boost drills one progression level higher.

**Fallback enhancement:**
- When no matches, return fundamental drills filtered by position and progression level instead of alphabetical.

---

## Phase 4 — AI Drill Generation Edge Function

### `supabase/functions/generate-drills/index.ts`

Uses Lovable AI (Gemini) with structured tool-calling output:

**Input**: sport, module, target_issues (optional)
**Process**:
1. Call Gemini with strict schema requiring: title, description, sport, positions[], progression_level, tags (error_type[], skill[], situation[]), ai_context, module, skill_target
2. Validate response: reject if missing tags, no progression level, no clear outcome
3. Deduplicate against existing drill names
4. Insert into `pending_drills` table with `status: 'pending'`

**Output**: count of drills generated and queued

---

## Phase 5 — Owner Review Queue UI

### `src/components/owner/PendingDrillsQueue.tsx` (New)

- Table showing pending AI-generated drills
- Each row: title, sport, level, tags preview
- Actions: Accept (creates real drill + tags + positions), Edit (opens editor pre-filled), Reject (with reason)
- Accept auto-enriches tags by suggesting related tags based on existing tag co-occurrence

### Update `DrillCmsManager.tsx`
- Add tab/section toggle: "Library" | "Pending Review" (with count badge)

---

## Phase 6 — Update DrillEditorDialog

Add to the form:
- **Progression Level**: Select dropdown (Tee Ball through Elite)
- **Sport Modifier**: Number input with tooltip explaining priority boost
- **Version**: Read-only display showing current version (auto-increments on save)

Update save logic to increment `version` on update.

---

## Phase 7 — Update Data Fetching Hook

### `src/hooks/useDrillRecommendations.ts`

- Map `progression_level` and `sport_modifier` into `DrillInput`
- Derive `userLevel` from profile data (age band → level mapping)
- Pass to engine

---

## Phase 8 — Update Tests

### `src/utils/__tests__/drillRecommendationEngine.test.ts`

Add tests:
- Progression fit: user level 4 → level 4 drill scores higher than level 1
- Challenge zone: level 5 drill for level 4 user gets 20pts, level 7 gets 0pts
- Sport modifier: 1.15 modifier boosts final score by 15%
- Fallback returns position-filtered fundamentals
- Escalation: repeated issue boosts higher-level drills

---

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add progression_level, sport_modifier, version to drills; create pending_drills |
| Data insert | Seed ~30 foundational drills with tags, positions, progression levels |
| `src/utils/drillRecommendationEngine.ts` | Add progressionFit axis, sport modifier, challenge-zone logic, enhanced fallback |
| `src/utils/__tests__/drillRecommendationEngine.test.ts` | Add progression/modifier/escalation tests |
| `src/hooks/useDrillRecommendations.ts` | Map new fields, derive userLevel |
| `supabase/functions/generate-drills/index.ts` | New — AI drill generation with validation |
| `src/components/owner/PendingDrillsQueue.tsx` | New — review queue UI |
| `src/components/owner/DrillCmsManager.tsx` | Add pending review tab |
| `src/components/owner/DrillEditorDialog.tsx` | Add progression level, sport modifier, version fields |

