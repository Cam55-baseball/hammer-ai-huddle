

# Multi-System Upgrade: Competition Weighting, Vault Video, Speed Steps, Rep Analysis, Sport Separation

## Scope

Six interconnected systems spanning new data files, UI components, Vault integration, and analytics engine logic.

---

## 1. Competition Level Weighting Engine

### New Data Files

**`src/data/baseball/competitionLevels.ts`** and **`src/data/softball/competitionLevels.ts`**

Each contains a full competition level taxonomy with `competition_weight_multiplier` and `league_difficulty_index` per level:

- **Youth/Amateur**: little_league (0.45), rec (0.50), youth (0.55), travel (0.70), hs_jv (0.75), hs_varsity (0.82)
- **Collegiate**: juco (0.85), naia (0.87), d3 (0.90), d2 (0.95), d1 (1.05)
- **Summer Ball**: AI-classified (edge function), known leagues hard-coded (cape_cod: 1.08, usa_collegiate_national: 1.15 for baseball; ausl_summer: 1.10 for softball)
- **Professional**: foreign_league (1.10), indie_pro (1.12), winter_ball (1.08), academy (1.05), rookie (1.10), low_a (1.15), high_a (1.20), aa (1.28), aaa (1.35), mlb (1.50), wbc (1.55), olympic (1.55)
- Softball equivalent ladder separately defined

**`src/data/competitionWeighting.ts`** — Shared engine logic:
- `getCompetitionWeight(sport, level, athleteAge?, leagueAge?)` → `{ competition_weight_multiplier, age_play_up_bonus, league_difficulty_index }`
- Age play-up bonus: `(leagueAge - athleteAge) * 0.03` capped at 0.12, only pre-collegiate
- Performance credit formula: `rawCredit * competition_weight_multiplier * (1 + age_play_up_bonus)`
- Deduction scaling: inverse — higher competition = less penalty. `rawDeduction * (2.0 - competition_weight_multiplier)`

### Summer League AI Classification (Edge Function)

**`supabase/functions/classify-league/index.ts`** — Uses Lovable AI to classify unknown summer leagues:
- Input: league name, sport, country
- Output: difficulty_multiplier (0.7–1.2 range)
- Uses tool calling for structured output
- Stores classification in a `league_classifications` table for caching

### Database Migration
```sql
CREATE TABLE public.league_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL,
  league_name TEXT NOT NULL,
  country TEXT,
  difficulty_multiplier NUMERIC NOT NULL DEFAULT 0.85,
  ai_classified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport, league_name)
);
ALTER TABLE public.league_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read" ON public.league_classifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert" ON public.league_classifications FOR INSERT TO authenticated WITH CHECK (true);
```

### UI Integration
- Add competition level selector in `GameSetupForm.tsx` and `SessionConfigPanel.tsx` (for game/scrimmage sessions)
- Summer league: text input with AI classify button
- Age play-up fields auto-calculated from profile DOB

---

## 2. Practice Video → Vault Storage

### Changes to `SessionVideoUploader.tsx`
- After uploading to `videos` bucket, also create a Vault entry linking the video
- Store in `vault_practice_videos` view/query pattern: videos queryable by module, session, rep, date, position

### New Hook: `useVaultVideos.ts`
- Queries `session_videos` joined with `performance_sessions` for Vault organization
- Provides filters: by module, date range, session_id, rep_id
- Ensures video persists even if session log is deleted (separate confirmation required)

### Vault UI Integration
- Add "Practice Videos" tab in Vault page
- Organized by module → session → rep → date
- Video thumbnails with module/position badges

### Video Constraints (Constants)
```typescript
export const VIDEO_LIMITS = {
  MAX_CLIP_DURATION_SEC: 300, // 5 minutes per clip
  MAX_FILE_SIZE_MB: 500,      // 500MB max
  MAX_SESSION_DURATION_MIN: 60, // 60 min full session
  SUPPORTED_FORMATS: ['mp4', 'mov', 'webm'],
};
```
- Validate on upload in `SessionVideoUploader.tsx`
- Display warnings for large files

### Log-Video Binding Rules
- Deleting a log prompts: "Keep video in Vault?" (default: Yes)
- Video references `session_id` and `rep_indexes` but is NOT cascade-deleted

---

## 3. Speed Program Step Count Tracking

### `SpeedSession` Interface Update
- Add `steps_per_rep?: Record<string, number[]>` — keyed by distance, array of step counts per rep

### Speed Lab UI (`src/pages/SpeedLab.tsx` or equivalent logging component)
- Below each sprint distance rep time input, add optional "Steps" numeric input
- Auto-calculate: stride_length = distance_yards * 3 / steps, step_frequency = steps / time_sec

### Custom Workout Card
- In workout builder rep logging, add optional "Steps Taken" integer input
- Stored in `performance_data.exerciseSets[exercise].steps`

### Analytics
- `useSpeedProgress.ts` enhanced with stride efficiency metrics
- Dashboard shows: avg steps per distance, stride length trend, step frequency trend

---

## 4. Rep Analysis — "Analyze" Tab on Tagged Videos

### Scoping Rule
- "Analyze" button appears ONLY when:
  - Video is tagged to a rep AND
  - Module is one of: `hitting`, `pitching`, `throwing`
- Does NOT appear for catching, baserunning, fielding, or other modules

### Component: `src/components/practice/RepVideoAnalysis.tsx`
- Opens a full-screen or dialog view of the tagged video clip
- Integrates existing `FrameAnnotationDialog` (fabric.js) for:
  - Frame-by-frame navigation
  - Drawing tools (lines, circles, rectangles, freehand)
  - Body angle markers
  - Release point tagging
  - Bat path tracing / throw slot tracking
- Annotations saved to `session_videos.rep_markers[i].annotations` JSONB
- Editable after initial save
- Visible to linked coaches via existing `is_linked_coach` check

### Integration Points
- In `VideoRepReview.tsx` and `SessionVideoUploader.tsx` — add "Analyze" button per tagged rep
- In Vault practice videos view — "Analyze" button on eligible clips
- In coach dashboard player video section — read-only annotation view

---

## 5. Baseball vs Softball Separation (Enforcement)

### Already Separated Files
The codebase already maintains separate files (`src/data/baseball/` vs `src/data/softball/`). This task ensures the NEW competition level data follows the same pattern.

### New Files
- `src/data/baseball/competitionLevels.ts` — Baseball-specific competition ladder
- `src/data/softball/competitionLevels.ts` — Softball-specific competition ladder
- `src/data/baseball/summerLeagues.ts` — Known baseball summer leagues with multipliers
- `src/data/softball/summerLeagues.ts` — Known softball summer leagues with multipliers

### Engine Contract Update
Add to `ENGINE_CONTRACT.ts`:
```typescript
COMPETITION_WEIGHT_ENABLED: true,
AGE_PLAY_UP_BONUS_CAP: 0.12,
AGE_PLAY_UP_BONUS_PER_YEAR: 0.03,
SUMMER_LEAGUE_AI_CLASSIFY: true,
```

---

## 6. Stress Testing & Data Integrity

No separate component — validation logic embedded in:
- Sport switch: competition data is sport-scoped, no cross-contamination
- International users: AI league classification supports any country
- Custom classification errors: cached in `league_classifications` with `ai_classified` flag for manual override
- Longitudinal: all competition weights stored per-session, not recalculated retroactively
- Organization overrides: existing `is_org_coach_or_owner` function gates corrections
- Data Freeze compatible: competition weights are read-only in frozen state

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/data/baseball/competitionLevels.ts` | Baseball competition level taxonomy + multipliers |
| `src/data/softball/competitionLevels.ts` | Softball competition level taxonomy + multipliers |
| `src/data/baseball/summerLeagues.ts` | Known baseball summer league multipliers |
| `src/data/softball/summerLeagues.ts` | Known softball summer league multipliers |
| `src/data/competitionWeighting.ts` | Shared weighting engine: credit/deduction scaling, age play-up |
| `src/data/videoLimits.ts` | Video upload constraints |
| `src/hooks/useVaultVideos.ts` | Vault video query/filter hook |
| `src/components/practice/RepVideoAnalysis.tsx` | Video analysis view with annotation integration |
| `supabase/functions/classify-league/index.ts` | AI summer league classification |

## Files to Modify

| File | Changes |
|------|---------|
| `src/data/ENGINE_CONTRACT.ts` | Add competition weight constants |
| `src/components/game-scoring/GameSetupForm.tsx` | Add competition level selector |
| `src/components/practice/SessionConfigPanel.tsx` | Add competition level for game/scrimmage sessions |
| `src/components/practice/SessionVideoUploader.tsx` | Vault integration, video limits validation, analyze button |
| `src/components/practice/VideoRepReview.tsx` | Add "Analyze" button for hitting/pitching/throwing reps |
| `src/hooks/useSpeedProgress.ts` | Add step count tracking and stride analytics |
| `src/pages/SpeedLab.tsx` (or equivalent) | Steps input per sprint rep |
| Vault page component | Add "Practice Videos" tab |

## Database Migration

```sql
-- League classifications cache
CREATE TABLE public.league_classifications (...);

-- Add competition_level to performance_sessions
ALTER TABLE public.performance_sessions 
  ADD COLUMN IF NOT EXISTS competition_level TEXT,
  ADD COLUMN IF NOT EXISTS competition_weight NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS age_play_up_bonus NUMERIC DEFAULT 0;

-- Add steps tracking to speed_sessions
ALTER TABLE public.speed_sessions 
  ADD COLUMN IF NOT EXISTS steps_per_rep JSONB DEFAULT '{}';
```

