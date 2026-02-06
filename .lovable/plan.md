

# Fix AI Recommendations Error + Rename to "Hammer Workout Recommendations"

## Two Changes

### 1. Rename Title
Update the title from "AI Recommendations" to "Hammer Workout Recommendations" across all translation files and the mobile-shortened label.

**Translation files to update** (the `aiRecommendations.title` key in each):

| File | Current | New |
|------|---------|-----|
| `src/i18n/locales/en.json` | "AI Recommendations" | "Hammer Workout Recommendations" |
| `src/i18n/locales/es.json` | "Recomendaciones IA" | "Recomendaciones Hammer" |
| `src/i18n/locales/fr.json` | "Recommandations IA" | "Recommandations Hammer" |
| `src/i18n/locales/de.json` | "KI-Empfehlungen" | "Hammer Empfehlungen" |
| `src/i18n/locales/nl.json` | "AI Aanbevelingen" | "Hammer Aanbevelingen" |
| `src/i18n/locales/zh.json` | "AI推荐" | "Hammer 推荐" |
| `src/i18n/locales/ja.json` | "AI推奨" | "Hammer 推奨" |
| `src/i18n/locales/ko.json` | "AI 추천" | "Hammer 추천" |

**Button shorthand update** in `src/components/custom-activities/DragDropExerciseBuilder.tsx`:
- The mobile-only short label currently reads "AI" -- change it to "Hammer" so it stays on-brand on small screens.

### 2. Fix Edge Function Crash (exercises.forEach error)
The `recommend-workout` edge function crashes when processing templates that use the block-based workout format (`{ _useBlocks: true, blocks: [...] }`) because it calls `.forEach()` on an object instead of an array.

**Change to `supabase/functions/recommend-workout/index.ts`**:

Add a helper function to normalize the exercises field:

```typescript
function extractExercisesFromTemplate(exercisesField: any): any[] {
  if (!exercisesField) return [];
  if (Array.isArray(exercisesField)) return exercisesField;
  if (exercisesField._useBlocks && Array.isArray(exercisesField.blocks)) {
    return exercisesField.blocks.flatMap(
      (block: any) => Array.isArray(block.exercises) ? block.exercises : []
    );
  }
  return [];
}
```

Then update the workout log processing to use this helper instead of accessing `.exercises` directly.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/recommend-workout/index.ts` | Add `extractExercisesFromTemplate` helper, use it in log processing |
| `src/components/custom-activities/DragDropExerciseBuilder.tsx` | Change mobile label from "AI" to "Hammer" |
| `src/i18n/locales/en.json` | Update title to "Hammer Workout Recommendations" |
| `src/i18n/locales/es.json` | Update title |
| `src/i18n/locales/fr.json` | Update title |
| `src/i18n/locales/de.json` | Update title |
| `src/i18n/locales/nl.json` | Update title |
| `src/i18n/locales/zh.json` | Update title |
| `src/i18n/locales/ja.json` | Update title |
| `src/i18n/locales/ko.json` | Update title |

