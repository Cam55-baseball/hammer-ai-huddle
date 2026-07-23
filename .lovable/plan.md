Plan: ECM Health Tips in Nutrition

### User-decided requirements
- Surface: a new accordion category on the existing Nutrition page.
- Format: short tip in the list/accordion; tapping opens a rich detail card.
- No dosage numbers in the content.
- ECM tips must also enter the existing Daily Health Tip / streak rotation.

### Goal
Add an **ECM & Connective Tissue Health** category to the Nutrition page, seed it with 50+ rich tips about hyaluronic acid, collagen synthesis, fibroblast activation, hydration/ECM water, and amino-acid precursors (arginine, lysine, ornithine, glutamine, glycine, proline), and make those tips eligible for the daily tip stream.

### 1. Schema & seed data
1.1 Migration: add a `details` JSONB column to `public.nutrition_daily_tips` so a tip can carry a rich card payload.
1.2 Migration grants/policies: no new tables are created; the existing RLS policy already allows authenticated SELECT, so only the column needs to be added. Service-role insert remains unchanged.
1.3 Seed `public.nutrition_daily_tips` with 50+ rows where `category = 'ecm_health'`, `sport = 'both'`, and `details` contains:
- `mechanism` — why it supports ECM
- `foodSources` — array of food examples
- `safetyNote` — educational caveat
- `athleteRelevance` — tie to baseball/softball tissue resilience
No dosage values are included.

### 2. Backend edge functions
2.1 `supabase/functions/get-daily-tip/index.ts`
- Add `ecm_health: 'ECM & Connective Tissue Health'` to `CATEGORY_NAMES`.
- Select the new `details` column when querying `nutrition_daily_tips`.
- Include `details` in the returned tip object.

2.2 `supabase/functions/get-today-tips/index.ts`
- Add `ecm_health: 'ECM & Connective Tissue Health'` to the local category-name map.
- Select `details` from the nested `nutrition_daily_tips` relation.
- Return `details` in each tip object.

### 3. Frontend UI
3.1 `src/components/NutritionCategory.tsx`
- Add a new category entry with `id: 'ecm_health'`, icon `Layers` (or similar), color, and a `dynamic` flag.
- For the `ecm_health` category, fetch rows from `public.nutrition_daily_tips` using a new `useNutritionCategoryTips` hook instead of rendering the five static i18n bullets.
- Render each dynamic tip as a short, tappable list item.
- Keep the other 18 categories unchanged.
- Update the `topicsCount` prop in `src/pages/Nutrition.tsx` from `18` to `19`.

3.2 `src/hooks/useNutritionCategoryTips.ts`
- New hook: query `public.nutrition_daily_tips` by category (`ecm_health`) and `sport` (both or current sport), ordered by `created_at`, limited to a reasonable page size (e.g., 25) with optional load-more.

3.3 `src/components/TipDetailDialog.tsx`
- New dialog: accepts `{ tip_text, categoryName, details }` and shows:
  - The short tip
  - Mechanism
  - Food sources
  - Safety note / disclaimer
  - Athlete relevance
- Triggered by tapping an ECM tip in the accordion or a tip in `DailyTipHero` / `TodaysTipsReview` when `details` is present.

3.4 `src/components/DailyTipHero.tsx` and `src/components/TodaysTipsReview.tsx`
- Add a "Learn more" / tappable action that opens `TipDetailDialog` when the tip has `details`.
- No change to existing save/refresh/streak behavior.

3.5 `src/i18n/locales/en.json`
- Add `nutrition.categories.ecmHealth` and `nutrition.categories.ecmHealthDesc`.
- Add detail-label keys: `nutrition.ecm.mechanism`, `nutrition.ecm.foodSources`, `nutrition.ecm.safetyNote`, `nutrition.ecm.relevance`, `nutrition.ecm.learnMore`.
- Keep the existing health disclaimer strings.

### 4. Safety & compliance
- Every ECM tip includes a safety note and is framed as educational, not medical or prescriptive.
- No dosage numbers are surfaced in the app.
- No user-facing "AI" language; the existing "Hammer" label for generated tips is preserved.

### 5. Verification
- Type check the codebase after changes.
- Confirm the new `ecm_health` tips are returned by `get-daily-tip`.
- Confirm the accordion category renders the dynamic list and that tapping opens the detail dialog.
- Confirm the daily tip rotation can serve an ECM tip and that the detail dialog works from `DailyTipHero` and `TodaysTipsReview`.
- Verify the count label reads "19 topics" and no "AI" copy appears in the new surfaces.