

The user is on `/nutrition-hub` and can't see hydration scores. Let me trace where `HydrationLogCard` is actually rendered.

Looking at the code:
- `HydrationLogCard` is the new rich card with the score chip.
- It's used inside `HydrationTrackerWidget.tsx` (the popover) per last summary.
- On the Nutrition Hub page itself, the daily log shows `HydrationQualityBreakdown` (aggregate), but I need to check if individual hydration logs are listed anywhere on the page.

From `NutritionDailyLog.tsx`: it renders meal cards (`MealLogCard`) and `HydrationQualityBreakdown` (aggregate stats). It does **NOT** render individual hydration log entries with `HydrationLogCard`. So hydration logs only show their score inside the **HydrationTrackerWidget popover** — not on the main Nutrition Hub page.

That's the disconnect: the user is looking at `/nutrition-hub` expecting to see per-drink scores, but those only appear when they open the hydration tracker popover.

Let me verify by viewing the relevant files before planning.
