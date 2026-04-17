

## Plan — AI-Analyzed "Other" Liquids + Hydration in Daily Log

### Goal
1. When user picks **Other** in the liquid picker, let them type a free-form description (e.g. "iced matcha latte with oat milk") → Hammer (AI) analyzes it → produces full hydration nutrition (water/Na/K/Mg/sugar) → standard `computeHydrationProfile()` runs → log saved with score + tier just like preset drinks.
2. Surface today's hydration logs (with scores) inline in the **Daily Log** section of Nutrition Hub, alongside meals — so the day's full intake (food + drink + scores) lives in one place.

---

### 1. New edge function — `analyze-hydration-text`

`supabase/functions/analyze-hydration-text/index.ts`

- Input: `{ text: string, amount_oz: number }`
- Auth: standard JWT bearer check (matches `parse-food-text` pattern).
- Calls Lovable AI (`google/gemini-3-flash-preview`) via tool-calling for **structured output**:
  ```
  {
    display_name: string,
    water_g_per_oz: number,
    sodium_mg_per_oz: number,
    potassium_mg_per_oz: number,
    magnesium_mg_per_oz: number,
    sugar_g_per_oz: number,
    total_carbs_g_per_oz: number,
    confidence: "high" | "medium" | "low",
    notes: string
  }
  ```
- System prompt: "USDA-grade hydration analyst. Estimate per-oz values for any beverage. Water% bounded 0–1g/g. Be conservative."
- Returns the per-oz profile + display name + confidence. Handles 429/402 gateway errors and surfaces them.
- No DB write — pure analysis. Client owns the insert.
- `verify_jwt = false` (Lovable default); validate auth header in code.

### 2. `useHydration.ts` — extend `addWater` for AI-analyzed drinks

Add an optional `aiNutrition` param:
```ts
addWater(
  amount, liquidType, qualityClass,
  aiNutrition?: { display_name, water_g_per_oz, sodium_mg_per_oz, ... }
)
```

When `aiNutrition` is passed (i.e. `liquidType === 'other'`):
- Skip the `hydration_beverage_database` lookup.
- Multiply per-oz values by amount → compute profile via existing `computeHydrationProfile()` → same insert path.
- Store the AI-provided `display_name` in a new field on the log row so the card can label it ("Iced matcha latte" instead of just "Other").

### 3. Schema migration — store AI display label

Add to `hydration_logs`:
- `custom_label text` (nullable) — only set for `liquid_type='other'` AI logs.

`HydrationLogCard.tsx`: when `liquid_type === 'other'` and `custom_label` exists, render it instead of the generic "Other" label.

### 4. `QuickLogActions.tsx` — Other → text input flow

When user selects **Other** in the liquid picker:
- Replace the existing single-step confirm with a small inline form:
  - Text input: "What are you drinking?" (e.g. "kombucha", "homemade smoothie with banana and almond milk")
  - "Analyze with Hammer" button → calls `supabase.functions.invoke('analyze-hydration-text', { text, amount_oz })`
  - Loading state with spinner
  - On success: show preview card with display name + score + tier + breakdown (water%, Na/K/Mg, sugar) + confidence chip
  - "Add" button → `addWater(amount, 'other', quality, aiNutrition)`
- Error handling: surface 429 ("AI is busy, try again") and 402 ("Add credits to continue") via toast.

### 5. Daily Log integration — meals + hydration unified

`NutritionDailyLog.tsx` currently only shows meals (and renders `HydrationQualityBreakdown` separately further down). Change:
- Pull today's hydration logs via `useHydration()` (already cached, realtime-synced).
- Filter to `currentDate` (currently `useHydration` is today-only — extend to accept a date OR use `getLogsForDateRange` for non-today views).
- Build a unified, **time-ordered** list of entries: meals + hydration logs, sorted by `logged_at`.
- Render hydration entries using `HydrationLogCard` inline between meal cards (same chronological feed).
- Add hydration totals to the "Day Totals" footer:
  - Total oz · Avg hydration score · tier chip
- Keep `HydrationQualityBreakdown` lower in the page for the deeper aggregate view (electrolytes/sugar breakdown) — no duplication of per-drink cards there once they appear inline.

### 6. Backwards compatibility
- Preset drinks: zero behavior change.
- Legacy "other" logs without `custom_label`: fall back to "Other" label (current behavior).
- Legacy hydration logs without `hydration_profile`: already handled by `HydrationLogCard` (volume-only).

### Files to change

| File | Action |
|---|---|
| `supabase/functions/analyze-hydration-text/index.ts` | **NEW** edge function |
| Migration | Add `custom_label text` to `hydration_logs` |
| `src/hooks/useHydration.ts` | Extend `addWater` signature + per-oz multiply branch + persist `custom_label` |
| `src/components/nutrition-hub/QuickLogActions.tsx` | "Other" → text input → analyze → preview → confirm flow |
| `src/components/nutrition-hub/HydrationLogCard.tsx` | Render `custom_label` when present |
| `src/components/nutrition-hub/NutritionDailyLog.tsx` | Merge hydration logs into chronological day feed; add hydration to Day Totals |

### Out of scope
- Editing AI analysis after save (re-log instead)
- Caching identical "other" descriptions to a shared DB (each log is independent for v1)
- Historical date hydration view inside Daily Log when navigating past days — keep today-only in v1; show a "view in Hydration section" hint for past dates

