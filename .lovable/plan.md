

# Gate ALL Drills Behind Subscription

## What Changes

All drills become premium — free users see drill names and recommendations but all video content is locked. The "Premium/Free" label in the CMS becomes unnecessary since everything is gated.

## Implementation

### 1. Update recommendation engine logic
In `src/utils/drillRecommendationEngine.ts`, change the `locked` check from `drill.premium && !userHasPremium` to simply `!userHasPremium`. Every drill is locked for non-subscribers regardless of the `premium` flag.

### 2. Update CMS display
In `src/components/owner/DrillCmsManager.tsx`, remove or relabel the "Premium/Free" badge column. Since all drills are now gated, showing this distinction is misleading. Replace with a simple "Subscription Required" note or remove the column entirely.

### 3. Update DrillEditorDialog
In `src/components/owner/DrillEditorDialog.tsx`, remove the `premium` toggle from the drill creation/edit form since it's no longer relevant.

### 4. Update tests
In `src/utils/__tests__/drillRecommendationEngine.test.ts`, update the premium gating test to reflect that ALL drills are locked for free users, not just those with `premium: true`.

### 5. Keep `premium` column in DB
No migration needed — the column stays but is ignored. This avoids breaking anything and allows reverting if needed.

## Files

| File | Action |
|------|--------|
| `src/utils/drillRecommendationEngine.ts` | Change `locked` to `!userHasPremium` |
| `src/components/owner/DrillCmsManager.tsx` | Remove Premium/Free badge column |
| `src/components/owner/DrillEditorDialog.tsx` | Remove premium toggle |
| `src/utils/__tests__/drillRecommendationEngine.test.ts` | Update gating tests |

