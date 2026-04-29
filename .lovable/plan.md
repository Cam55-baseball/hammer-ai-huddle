# Rebrand "AI" → "Hammer" across user-facing UI

Per the Hammer branding rule, the word "AI" should not appear in the UI. This pass replaces every visible "AI" label with "Hammer" (or removes it where the brand context already makes it implied). Code identifiers, comments, console logs, error logs, and DB column names are left untouched — only display strings change.

## Primary fix (the reported issue)

**`src/components/nutrition-hub/MealLogCard.tsx`** (line 55)
- `'AI Estimated'` → `'Hammer Estimated'` on the meal source badge.

## Other user-visible "AI" labels to rebrand

Athlete-facing:
- **`src/components/nutrition-hub/QuickLogActions.tsx`** (118): toast `'AI credits exhausted...'` → `'Hammer credits exhausted. Add credits to continue.'`
- **`src/components/TodaysTipsReview.tsx`** (139): badge text `AI` → `Hammer`
- **`src/components/vault/VaultRecapCard.tsx`** (193): badge text `AI` → `Hammer`
- **`src/components/mind-fuel/DailyLessonHero.tsx`** (95): badge text `AI` → `Hammer`
- **`src/components/analytics/AskHammerPanel.tsx`** (174): badge `AI Coach` → `Hammer Coach`
- **`src/components/base-stealing/LiveRepRunner.tsx`** (306): on-screen status `'AI analyzing movement...'` → `'Hammer analyzing movement...'`
- **`src/components/base-stealing/PostRepInput.tsx`** (100): visible label `AI: {reasoning}` → `Hammer: {reasoning}`
- **`src/components/hie/TeamWeaknessEngine.tsx`** (112): heading `AI Team Practice Plan` → `Hammer Team Practice Plan`
- **`src/components/training-block/DailyWorkoutPlanner.tsx`** (96): copy `Generate a single AI workout...` → `Generate a single Hammer workout...`

Owner / admin-facing (still part of the app UI):
- **`src/components/owner/VideoLibraryManager.tsx`** (192): tab `AI Suggestions` → `Hammer Suggestions`
- **`src/components/owner/VideoEditForm.tsx`** (394): label `AI Description (what the engine reads)` → `Hammer Description (what the engine reads)`
- **`src/components/owner/StructuredTagEditor.tsx`** (140): label `AI Description (required) *` → `Hammer Description (required) *`
- **`src/components/owner/DrillEditorDialog.tsx`** (407): label `AI Context` → `Hammer Context`
- **`src/components/owner/AISuggestionsReview.tsx`** (42): empty-state copy `Trigger AI analysis...` → `Trigger Hammer analysis...`
- **`src/components/owner/PendingDrillsQueue.tsx`** (179): empty-state copy `...create AI suggestions.` → `...create Hammer suggestions.`
- **`src/components/owner/VideoUploadWizard.tsx`** (345): copy `...trigger AI tag suggestions...` → `...trigger Hammer tag suggestions...`
- **`src/hooks/useVideoLibraryAdmin.ts`** (109, 365, 367): toast titles/descriptions `AI suggestions ready` / `review in AI Suggestions tab` → `Hammer suggestions ready` / `review in Hammer Suggestions tab`

## Out of scope (intentionally NOT changed)

- **i18n locale files** (`src/i18n/locales/*.json`): translation strings still reference `AI`; these will be addressed in a separate localization pass so we don't ship half-translated keys.
- **Code identifiers, props, prop types, function names** (e.g. `AIMealSuggestions`, `handleAddAISuggestion`, `is_ai_generated`, `useSmartFoodLookup` console log `AI path`): non-visible; leaving as-is to avoid churn.
- **Comments / JSDoc** referencing "AI" (e.g. `{/* AI Meal Suggestions */}`, `lib/ownerAuthority.tsx` doc comments): not user-visible.
- **Error/console logs** (`'AI analysis failed:'`, `'AI function error:'`): developer logs only.

## Verification

After edits, re-run `rg -n "\"AI |'AI |>AI<|>AI |AI Coach|AI Estimated|AI Suggest" src/ --glob '!src/i18n/**'` and confirm zero remaining hits.
