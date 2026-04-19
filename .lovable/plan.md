

## Fix Nutrition Hub tab strip horizontal scroll

### Problem
The tab strip above the Daily Log (`Today / Weekly / Planning / Shopping / Recipes`) in `NutritionHubContent.tsx` (line 480) uses:
```
<TabsList className="w-full flex overflow-x-auto">
  <TabsTrigger className="flex-1 min-w-fit ..." />
```
`flex-1` forces each trigger to shrink and share the row width, which **defeats `overflow-x-auto`** — there's nothing to scroll because the children compress to fit. On a 390px viewport this crams the labels and the scroll bar never engages.

### Fix
In `src/components/nutrition-hub/NutritionHubContent.tsx` (lines 480–486):
- Remove `flex-1` from each `TabsTrigger` so they keep their natural width and overflow horizontally.
- Keep `whitespace-nowrap` and `min-w-fit` to prevent label wrapping.
- Add `h-auto` / proper padding to the `TabsList` (shadcn's default `TabsList` has fixed height + `inline-flex` styling that conflicts with horizontal scroll). Override with `w-full justify-start overflow-x-auto no-scrollbar` and add `flex-shrink-0` per trigger.
- Add a small custom utility (inline `style` or Tailwind arbitrary) so the scrollbar is hidden visually but scroll still works on touch (optional polish).

Final classes:
- `TabsList`: `w-full justify-start overflow-x-auto flex gap-1 h-auto p-1`
- Each `TabsTrigger`: `flex-shrink-0 min-w-fit px-3 text-xs sm:text-sm whitespace-nowrap` (drop `flex-1`)

### Verification
- On 390px mobile, the 5 tabs sit at natural width and the row scrolls horizontally with a swipe.
- Active tab indicator still works; tapping each tab still switches content.
- On ≥sm viewports, all tabs fit without needing to scroll.

