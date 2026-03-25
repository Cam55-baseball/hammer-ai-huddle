

# Fix AI Credits Error Handling for Nutrition Features

## Root Cause

Both the Hammer Meal Suggestions and the Meal Title auto-analysis are failing because the **AI gateway is returning 402 (credits exhausted)**. The edge function logs confirm: `[parse-food-text] AI gateway error: 402`. This is a billing/usage issue — not a code bug.

To restore these features, Lovable AI credits need to be added via **Settings > Workspace > Usage**.

## What We Can Improve (Code)

The current error handling swallows the 402 context in some paths, leaving users confused. We should make the experience more graceful:

### 1. `src/components/nutrition-hub/AIMealSuggestions.tsx`

The `supabase.functions.invoke` call doesn't expose HTTP status codes directly — the error comes back as a generic message. When the response body contains `"Payment required"` or `"credits"`, show a specific, user-friendly message instead of a generic error.

- Parse the error/data for 402-related keywords
- Show: "AI credits are currently unavailable. You can still log meals manually."
- Disable the "Get Suggestions" / "Refresh" button temporarily with a tooltip

### 2. `src/hooks/useSmartFoodLookup.ts`

The 402 handling at line 183 already catches `"credits"` but the message `"Hammer credits required."` is vague. Improve:

- Change error message to: "AI auto-fill is temporarily unavailable. Please enter nutrition info manually."
- Set a `creditsDepleted` flag so the component can hide the AI analysis UI entirely rather than showing a broken state

### 3. Nutrition Log Entry Component

Find where the meal title triggers `useSmartFoodLookup` and ensure that when `status === 'error'` with a credits issue, the manual input fields are immediately shown/expanded without requiring extra user action.

## Files to Change

| File | Change |
|------|--------|
| `src/components/nutrition-hub/AIMealSuggestions.tsx` | Better 402 error message; disable refresh button when credits depleted |
| `src/hooks/useSmartFoodLookup.ts` | Expose `creditsDepleted` flag; improve error message |
| Nutrition log form component (uses `useSmartFoodLookup`) | Auto-expand manual fields when credits are depleted |

