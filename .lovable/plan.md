

# Baserunning IQ — Full Implementation Plan

## Summary
Add a structured learning + decision engine for baserunning IQ as a submodule inside both 5Tool Player and Golden 2Way. Three new database tables, one new page, sidebar/landing page integration, and sport-filtered content with persistent progress tracking.

## 1. Database Tables (Migration)

### `baserunning_lessons`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| title | text NOT NULL | |
| content | text NOT NULL | rich text / markdown |
| sport | text NOT NULL | 'baseball', 'softball', or 'both' |
| level | text NOT NULL | 'beginner', 'advanced', 'elite' |
| order_index | int NOT NULL default 0 | |
| elite_cue | text | short coach cue |
| game_transfer | text | how it applies in-game |
| created_at | timestamptz default now() | |

### `baserunning_scenarios`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| lesson_id | uuid FK → baserunning_lessons | ON DELETE CASCADE |
| scenario_text | text NOT NULL | |
| sport | text NOT NULL | 'baseball', 'softball', 'both' |
| difficulty | text NOT NULL | 'easy', 'game_speed', 'elite' |
| correct_answer | text NOT NULL | |
| explanation | text NOT NULL | |
| options | jsonb NOT NULL default '[]' | array of answer choices |
| created_at | timestamptz default now() | |

### `baserunning_progress`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid NOT NULL | references auth.users via profile pattern |
| lesson_id | uuid FK → baserunning_lessons | ON DELETE CASCADE |
| completed | boolean default false | |
| score | int default 0 | |
| last_attempt_at | timestamptz default now() | |
| UNIQUE(user_id, lesson_id) | | |

**RLS Policies:**
- `baserunning_lessons` and `baserunning_scenarios`: SELECT for authenticated users (read-only content)
- `baserunning_progress`: full CRUD for `auth.uid() = user_id`

## 2. New Route & Page

**Route:** `/baserunning-iq`

**Page:** `src/pages/BaserunningIQ.tsx`
- Uses `DashboardLayout`
- Fetches lessons filtered by user sport (`baseball`, `softball`, or `both`)
- Shows lesson list with completion progress
- Clicking a lesson opens lesson detail view with:
  - Title, content, highlighted elite cue, game transfer section
  - Scenario training block at bottom (quiz-style)
- Progress persisted to `baserunning_progress` table

**Components:**
- `src/components/baserunning-iq/LessonList.tsx` — lesson cards with progress indicators
- `src/components/baserunning-iq/LessonDetail.tsx` — full lesson view
- `src/components/baserunning-iq/ScenarioBlock.tsx` — interactive quiz with answer selection, feedback, explanation

## 3. Sidebar Integration

In `src/components/AppSidebar.tsx`, add to both the 5Tool Player and Golden 2Way subModules arrays:
```
{ title: 'Baserunning IQ', url: '/baserunning-iq', icon: Brain, description: 'Baserunning decision training' }
```

## 4. Landing Page Cards

In both `src/pages/FiveToolPlayer.tsx` and `src/pages/GoldenTwoWay.tsx`, add a new tile:
```
{
  key: "baserunning-iq",
  icon: Brain,
  label: "Baserunning IQ",
  description: "Learn elite baserunning decisions and test your game IQ",
  getRoute: () => "/baserunning-iq",
}
```
Card shows progress % fetched from `baserunning_progress` and a "Continue" button.

## 5. Sport Filtering Logic

All queries filter with: `sport = selectedSport OR sport = 'both'`

Applied at:
- Lesson list fetch
- Scenario fetch within lessons
- Progress calculations (only count lessons matching sport filter)

## 6. App.tsx Route Registration

Add lazy import and route:
```
const BaserunningIQ = lazyWithRetry(() => import("./pages/BaserunningIQ"));
<Route path="/baserunning-iq" element={<BaserunningIQ />} />
```

## 7. Hook for Progress

`src/hooks/useBaserunningProgress.ts` — fetches user progress, calculates completion %, exposes `markComplete` and `updateScore` mutations via react-query.

## Files Changed
- `supabase/migrations/` — new migration for 3 tables + RLS
- `src/pages/BaserunningIQ.tsx` — new
- `src/components/baserunning-iq/LessonList.tsx` — new
- `src/components/baserunning-iq/LessonDetail.tsx` — new
- `src/components/baserunning-iq/ScenarioBlock.tsx` — new
- `src/hooks/useBaserunningProgress.ts` — new
- `src/App.tsx` — add route
- `src/components/AppSidebar.tsx` — add to 5Tool + Golden 2Way subModules
- `src/pages/FiveToolPlayer.tsx` — add tile
- `src/pages/GoldenTwoWay.tsx` — add tile

