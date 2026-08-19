# Scheduled Priority Tasks at the Top of Hammers Today

Periodic items that already drive The Game Plan (6-week recap, progress photos, performance re-tests, scout self-grades, weekly wellness goals) will surface at the very top of the Hammers Today plan on the exact day they come due — and stay there until done.

## What the athlete sees

A single compact strip pinned above everything else in "Coach Hammer · today's plan", rendered **only when something is actually due**:

```text
┌────────────────────────────────────────────────┐
│  DUE TODAY · 2                                 │
│  📷  Take progress photos      Every 6 weeks → │
│  📄  Generate 6-week recap     Overdue      → │
└────────────────────────────────────────────────┘
```

- Zero due items = the strip does not render at all. No empty state, no clutter.
- Each row: icon, short title, one-line "why", cadence chip, tap-to-open.
- Overdue items sort first and read "Overdue" instead of the cadence.
- Rows deep-link straight into the right Vault section (existing `openSection` deep-link system) — not a generic page dump.
- Subtle one-time attention treatment (soft ring/pulse) that stops once the athlete opens the strip that day, matching the existing HPI / Start Line glow pattern.

## Why this can't drift

No new schedule is invented. The strip reads the exact same authorities the Game Plan already reads:

| Item | Authority |
|---|---|
| 6-week recap | `useRecapCountdown` (42-day cycle, missed-cycle detection) |
| Progress photos | `vault_progress_photos.next_entry_date` |
| Performance re-test | `vault_performance_tests.next_entry_date` |
| Scout grades (hit/throw, pitching) | `vault_scout_grades.next_prompt_date` |
| Weekly wellness goals | `vault_weekly_wellness_quiz` row for current week |

If Game Plan says due, Today says due. One cadence source, two surfaces.

## Technical notes

1. **New hook** `src/hooks/hammer/useScheduledPriorityTasks.ts`
   - React Query, single batched read of the five cadence sources plus `useRecapCountdown`.
   - Module-gates pitching grades (`useSubscription`), hitting/throwing grades likewise.
   - Returns a sorted `ScheduledPriorityTask[]` (overdue first) with title, detail, cadence label, icon, and a `getVaultSectionUrl()` / `getVaultRecapUrl()` link.
   - Read-only. No writes, no new cadence math, no derived storage.

2. **New component** `src/components/hammer/ScheduledPriorityStrip.tsx`
   - Presentation only; returns `null` when the task list is empty or still loading.
   - Uses existing `useOpenedOnceToday` for the glow-until-opened behavior.
   - Semantic tokens only — no hardcoded colors.

3. **Mount point** `src/components/hammer/HammerDailyPlan.tsx`
   - Inserted as the first child of the plan `CardContent`, above the Schedule dropdown, wrapped in the existing `ErrorBoundary` pattern so a data hiccup can never take down the plan.
   - No changes to prescription generation, ordering, or WIC logic.
