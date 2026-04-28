## What

Right now, tapping the "Log Your Nutrition" task on the Game Plan card sends the user to `/vault?openSection=nutrition`, which is the wrong destination. It should take them to the **Nutrition Hub** and land them on the **Log Meal** card (the section with Breakfast / Lunch / Dinner / Snack / Pre-Workout / Post-Workout buttons), so they can log a meal in one tap.

## Changes

### 1. `src/components/GamePlanCard.tsx` (~line 635-639)

Change the nutrition task handler to navigate to the Nutrition Hub with a hash anchor instead of vault:

```ts
if (task.taskType === 'nutrition') {
  navigate('/nutrition-hub#log-meal');
  return;
}
```

### 2. `src/components/nutrition-hub/NutritionHubContent.tsx`

- Wrap the `<LogMealCard />` block (around line 459) in a `<div id="log-meal" className="scroll-mt-24">…</div>` so it becomes an anchor target with breathing room beneath the sticky header.
- Add a `useEffect` that watches `useLocation().hash` and, when it equals `#log-meal`, ensures the `today` tab is active (it is by default, but this guards against future changes) and smooth-scrolls the `#log-meal` element into view. Mirror the retry pattern already used in `src/pages/Nutrition.tsx` (multiple `setTimeout` attempts at 100/500/1000ms) to handle async data loads (`useTDEE`, macro query) that can shift layout after mount.

```ts
const location = useLocation();
useEffect(() => {
  if (location.hash !== '#log-meal') return;
  setActiveTab('today');
  const scroll = () => {
    document.getElementById('log-meal')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const t1 = setTimeout(scroll, 100);
  const t2 = setTimeout(scroll, 500);
  const t3 = setTimeout(scroll, 1000);
  return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
}, [location.hash]);
```

Add `useLocation` to the existing `react-router-dom` import.

## Out of scope

- No changes to the `MealLoggingDialog` flow itself — once on the Log Meal card the user picks the meal type as today.
- No change to the vault nutrition card; other vault entry points still work.
- No copy / i18n changes.
- Not auto-opening the meal type dialog on arrival — clicking through from Game Plan should land on the visible Log Meal card so the user can pick the right meal type, not force them into a default.
