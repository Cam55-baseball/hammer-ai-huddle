

# Part 1: Fix Stale UI After Activity Edits + Part 2: Upgrade Practice Session Detail View

## What's Actually Broken (Part 1)

The `updateTemplate` function in `useCustomActivities.ts` does call `fetchTemplates()` after a successful DB write, which re-fetches from the database. However, the **GamePlanCard** consumes activities through `useGamePlan`, which has its **own separate fetch cycle**. After `updateTemplate` succeeds:

- `useCustomActivities.templates` updates ✅
- `useGamePlan.customActivities` stays stale until its own `refetch()` is called ❌

The GamePlanCard does call `refetch()` after edits — but there's a race condition: `updateTemplate` awaits `fetchTemplates()` internally, then the caller awaits `refetch()`, creating a sequential double-fetch. Meanwhile, the CalendarDaySheet has proper optimistic updates but GamePlanCard doesn't apply them for edits (only for creates via `addOptimisticActivity`).

### Fix Strategy

1. **Add optimistic update to GamePlanCard edits** — Before `updateTemplate` resolves, immediately patch the local `customActivities` list so the UI reflects the change in <50ms.

2. **Centralize cache invalidation via React Query** — Convert `useCustomActivities` from raw `useState` to `useQuery` so all consumers share the same cache. When one component invalidates, all components get the update automatically. This eliminates the fragmented state problem entirely.

3. **Add BroadcastChannel sync** — The project already uses `BroadcastChannel('data-sync')` for multi-tab sync. Hook custom activity mutations into this channel so edits propagate across tabs.

---

## Part 2: Upgrade Practice Session Detail Dialog

The current `PracticeSessionDetailDialog.tsx` dumps raw drill blocks, composite indexes as key-value pairs, and session context as a flat grid. No insights, no scoring, no coaching intelligence.

### What Changes

Rebuild the dialog to surface the existing `generateInsights()` engine (from `sessionInsights.ts`) and add a session performance score — matching the elite post-session summary pattern.

**New Layout:**

```text
┌─────────────────────────────┐
│ Hitting · Elite Execution   │  ← Module + Session Tag
│ Practice · Apr 9 · Grade 67 │
├─────────────────────────────┤
│ 🏆 Win: Barrel rate hit 32% │  ← from generateInsights()
│ 🎯 Focus: Chase at 38%      │
│ 🔁 Cue: Lay off the first…  │
├─────────────────────────────┤
│  BQ: 64   Chase: 28%  LD: 24│  ← Top 3 key metrics (colored)
├─────────────────────────────┤
│ ▸ Warm-Up (12 reps · 72%)   │  ← Collapsible drill blocks
│ ▸ Live Reps (20 reps · 58%) │     (expand for rep details)
│ ▸ Competition (8 reps · 81%)│
├─────────────────────────────┤
│ Performance Score: 🟢 72     │  ← (intensity+execution+consistency)/3
├─────────────────────────────┤
│ Notes: "Felt good today..."  │
└─────────────────────────────┘
```

## Technical Details

### Files Changed

| File | Action |
|------|--------|
| `src/hooks/useCustomActivities.ts` | Convert templates to `useQuery`, add optimistic cache updates on mutations |
| `src/components/GamePlanCard.tsx` | Add optimistic patch for template edits (not just creates) |
| `src/components/PracticeSessionDetailDialog.tsx` | Full rewrite: add insights engine, collapsible drills, performance score, remove raw data dumps |
| `src/hooks/useGamePlan.ts` | Invalidate shared query key after mutations instead of separate refetch |

### Key Implementation Notes

- **Optimistic edits**: `updateTemplate` will use `queryClient.setQueryData` to patch the cache immediately, then persist to DB, with rollback on error.
- **Practice dialog**: Reuses `generateInsights()` from `sessionInsights.ts` (already battle-tested). Performance score = average of non-null composite values, mapped to Poor/Solid/Elite bands.
- **Drill blocks**: Switch from flat list to `Collapsible` components — show drill name + summary on collapse, expand for rep-by-rep detail.
- **Remove**: Raw composite index grid, raw session context dump, anything requiring interpretation.

