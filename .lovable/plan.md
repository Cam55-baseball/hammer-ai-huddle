

# Post-Session Experience v2 — Elite Feedback Layer

## Overview
Replace `PostSessionSummary.tsx` with a new session-reactive feedback system and redesign `RecentSessionsList.tsx` to show insight-tagged history with expandable Win/Focus/Metrics detail.

## New Files

### 1. `src/lib/sessionInsights.ts` — Deterministic Insight Engine
Pure functions that take `composite_indexes` + `drill_blocks` + `module` and return:
- **Win**: Best signal from session (highest relative composite or standout metric like barrel_pct >= 30%, decision >= 65, etc.)
- **Focus**: Biggest limiter (lowest composite, chase_pct spike, whiff_pct high, etc.)
- **Next Rep Cue**: Mapped from Focus category (lookup table: chase → "See it deeper before committing", whiff → "Stay through the zone", etc.)
- **Key Metrics**: Top 3 most relevant metrics filtered by module (Hitting: barrel_pct, chase_pct, hard_contact_pct; Pitching: avg_zone_pct, pei; Fielding: avg_clean_field_pct, avg_footwork_grade)
- **Session Tag**: Single label for history view ("Power Day", "Chase Spike", "Elite Execution", "Fatigue Drop", "Solid Work")

Module-aware metric relevance maps:
- `hitting` → BQI, decision, barrel_pct, chase_pct, whiff_pct, hard_contact_pct, line_drive_pct
- `pitching` → PEI, avg_zone_pct, competitive_execution
- `fielding` → FQI, avg_footwork_grade, avg_clean_field_pct
- `throwing` → competitive_execution

Win/Focus selection: rank all relevant metrics by deviation from thresholds, pick strongest positive (win) and strongest negative (focus).

### 2. `src/components/practice/PostSessionSummaryV2.tsx` — New Summary Component
Replaces `PostSessionSummary.tsx` in PracticeHub.

**Data fetch**: Same polling pattern but expanded select to include `drill_blocks, effective_grade, micro_layer_data`.

**Layout (top → bottom):**

**A. Session Snapshot Card** (primary/5 bg)
- Module + type + date + optional Coach-Led badge
- Large effective_grade display with `getGradeLabel()` prominently shown (e.g., "Plus-Plus · 62")
- Total reps + drill count subtitle

**B. Clear Win Card** (green/5 bg, trophy icon)
- Single sentence from `generateWin(composites, module)`
- e.g., "Your barrel rate hit 34% — above pro average"

**C. Priority Focus Card** (amber/5 bg, target icon)
- Single sentence from `generateFocus(composites, module)`
- e.g., "Chase rate spiked to 38% — costing quality reps"

**D. Next Rep Cue** (blue/5 bg, arrow icon)
- Short actionable instruction mapped from Focus
- e.g., "See it deeper before committing"

**E. Key Metrics** (max 3, horizontal row)
- Each: label + value + color indicator
- Only metrics supporting Win or Focus

**F. Streak** (kept, same as current)

**G. Done Button**

**Removed**: AIPromptCard, full composite grid

### 3. Updated `src/components/practice/RecentSessionsList.tsx`
**List row changes:**
- Date + module
- Effective grade badge
- Auto-generated insight tag badge (from `getSessionTag()`)
- Remove raw rep count from collapsed view

**Expanded view changes:**
- Show Win / Focus / Next Rep Cue (same insight engine)
- Show max 3 key metrics
- Keep videos and notes
- Remove raw drill_blocks dump and full composite grid

## Modified Files

| File | Change |
|------|--------|
| `src/lib/sessionInsights.ts` | **NEW** — deterministic insight engine |
| `src/components/practice/PostSessionSummaryV2.tsx` | **NEW** — replaces old summary |
| `src/pages/PracticeHub.tsx` | Import `PostSessionSummaryV2` instead of `PostSessionSummary` |
| `src/components/practice/RecentSessionsList.tsx` | Redesign with insight tags + Win/Focus expansion |
| `src/hooks/useRecentSessions.ts` | Add `effective_grade` to select (already has `composite_indexes`) |

## Implementation Order
1. Create `sessionInsights.ts` (pure logic, no deps)
2. Create `PostSessionSummaryV2.tsx`
3. Update `PracticeHub.tsx` import
4. Update `useRecentSessions.ts` select
5. Redesign `RecentSessionsList.tsx`

## What This Does NOT Touch
- Base stealing trainers (isolated, untouchable)
- Progress Hub
- HIE / prescription engine
- `calculate-session` edge function
- No new DB tables or migrations needed

