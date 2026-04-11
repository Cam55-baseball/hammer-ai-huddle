

# Baserunning IQ Level System

## Summary
Add a dynamically computed player level (Rookie → 0.01%) based on lesson completion, scenario accuracy, and daily streak. Display with a progress bar on the main page. No new database table — purely client-side computation from existing data.

## Level Tiers & Thresholds

| Level | Points Required | Badge Color |
|-------|----------------|-------------|
| Rookie | 0 | gray |
| Reactive | 100 | blue |
| Instinctive | 300 | purple |
| Elite | 600 | amber/gold |
| 0.01% | 1000 | gradient red/gold |

## Scoring Formula

Points are computed from three existing data sources:

1. **Lesson Completion** (max ~500 pts): `completedLessons × 50` (capped contribution)
2. **Scenario Accuracy** (max ~300 pts): `(7-day accuracy% / 100) × 300` from daily attempts stats
3. **Daily Streak** (max ~200 pts): `min(streak, 20) × 10` (capped at 20 days)

Total = sum of all three. Level is determined by which threshold range the total falls in. Progress bar shows % toward next tier.

## New Files

### `src/utils/baserunningLevel.ts`
- `computeBaserunningLevel(completionPct, accuracy, streak)` → `{ level, label, points, nextThreshold, progressToNext, color }`
- Pure function, no DB calls — computes from values already available in hooks

### `src/components/baserunning-iq/LevelBadge.tsx`
- Compact card showing: level icon + name, points total, animated progress bar to next level
- Gradient styling per tier for visual punch
- Placed between the header and DailyDecision on the main page

## Modified Files

### `src/pages/BaserunningIQ.tsx`
- Import `LevelBadge` and `computeBaserunningLevel`
- Pass `completionPct` from `useBaserunningProgress` + `stats.accuracy` and `streak` from `useBaserunningDaily` into the level computation
- Render `<LevelBadge />` between the page header and DailyDecision

### `src/hooks/useBaserunningDaily.ts`
- No changes needed — already exports `streak` and `stats.accuracy`

## UI Layout (main page, no active lesson)

```text
┌─ Header: "Baserunning IQ" ─────────────┐
│                                          │
│ ┌─ LevelBadge ─────────────────────────┐│
│ │ ⭐ REACTIVE  ·  145 pts              ││
│ │ [████████░░░░░░░] 45% to Instinctive ││
│ └──────────────────────────────────────┘│
│                                          │
│ ┌─ DailyDecision ──────────────────────┐│
│ │ ...                                   ││
│ └──────────────────────────────────────┘│
│                                          │
│ ┌─ LessonList ─────────────────────────┐│
│ │ ...                                   ││
│ └──────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

## Instant Update Behavior
Level is recomputed on every render from reactive query data. When a lesson is completed or a daily scenario answered, React Query invalidation triggers re-render → level updates instantly with no additional DB call.

## Files Summary

| File | Action |
|------|--------|
| `src/utils/baserunningLevel.ts` | New — level computation logic |
| `src/components/baserunning-iq/LevelBadge.tsx` | New — level display component |
| `src/pages/BaserunningIQ.tsx` | Edit — integrate LevelBadge with data from both hooks |

