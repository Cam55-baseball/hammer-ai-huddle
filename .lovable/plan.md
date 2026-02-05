
# Smart Food Recognition: AI-Powered Nutrition Auto-Fill

## Overview

When you type a food name (like "chicken breast" or "apple"), the system will use AI to recognize the food and automatically fill in the nutritional information (calories, protein, carbs, fats) for your daily intake tracking.

## Current Behavior

Right now, when logging meals in the Nutrition Hub, you have these options:
1. **Quick Entry** - Manually type food name AND manually enter all macro values
2. **Detailed Entry** - Search a food database by name (requires exact matches)
3. **Photo Log** - Take a photo and AI identifies the food
4. **Barcode Scanner** - Scan packaged foods

**The Gap**: Quick Entry requires you to know and manually type all nutritional values. There's no "smart recognition" that automatically fills macros when you just type "grilled chicken" or "PB&J sandwich".

## Solution

Add **AI-Powered Smart Food Recognition** that:
1. Watches what you type in the meal title/name field
2. After you stop typing for ~1 second, calls AI to recognize the food
3. Auto-fills calories, protein, carbs, and fats based on the recognized food
4. Shows a confidence indicator and allows you to adjust values
5. First checks the local food database, then falls back to AI if no match

---

## Technical Implementation

### 1. New Edge Function: `parse-food-text`

Creates a new backend function that takes a text food description and returns estimated nutrition.

**Location**: `supabase/functions/parse-food-text/index.ts`

**Capabilities**:
- Accepts free-form text like "2 eggs with toast" or "chicken caesar salad"
- Uses Lovable AI (Gemini 2.5 Flash) for recognition
- Returns structured nutrition data with confidence levels
- Handles compound meals (e.g., "burger with fries")
- Uses USDA-reference nutrition values

```text
Input: "grilled chicken breast 6oz"
Output: {
  foods: [
    {
      name: "Grilled Chicken Breast",
      quantity: 6,
      unit: "oz",
      calories: 248,
      protein: 47,
      carbs: 0,
      fats: 5,
      confidence: "high"
    }
  ],
  totalCalories: 248,
  totalProtein: 47,
  totalCarbs: 0,
  totalFats: 5
}
```

### 2. New Hook: `useSmartFoodLookup`

Creates a React hook that manages the AI food recognition workflow.

**Location**: `src/hooks/useSmartFoodLookup.ts`

**Features**:
- Debounced input (waits 800ms after typing stops)
- First checks local `nutrition_food_database` for exact/fuzzy matches
- Falls back to AI recognition only if no database match
- Returns loading state, results, and error handling
- Caches recent lookups to avoid redundant API calls

### 3. Update Quick Entry Components

Enhance the existing Quick Entry UI in both logging dialogs:

**Files to Modify**:
- `src/components/nutrition-hub/MealLoggingDialog.tsx`
- `src/components/QuickNutritionLogDialog.tsx`

**UI Changes**:
1. Add a "magic wand" icon next to the meal title input
2. Show a subtle loading indicator while AI processes
3. Display recognized food(s) with a "confidence" badge (high/medium/low)
4. Auto-fill the macro fields with recognized values
5. Allow manual override of any auto-filled value
6. Show a "Not what you expected? Search database →" fallback link

### 4. Hybrid Lookup Strategy

The system uses a tiered approach for maximum accuracy:

```text
┌─────────────────────────────────────────┐
│  User types: "greek yogurt"             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Step 1: Search local food database      │
│ (nutrition_food_database table)         │
│ → If match found with >80% confidence   │
│   → Use database values (most accurate) │
└─────────────────────────────────────────┘
                    ↓ No match
┌─────────────────────────────────────────┐
│ Step 2: Call AI (parse-food-text)       │
│ → Gemini estimates nutrition            │
│ → Returns with confidence indicator     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Step 3: Auto-fill form fields           │
│ → User can adjust before saving         │
└─────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/parse-food-text/index.ts` | AI-powered food text parsing |
| `src/hooks/useSmartFoodLookup.ts` | React hook for smart lookup logic |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/nutrition-hub/MealLoggingDialog.tsx` | Add smart lookup to Quick Entry tab |
| `src/components/QuickNutritionLogDialog.tsx` | Add smart lookup to meal title field |
| `supabase/config.toml` | Register new edge function |
| `src/i18n/locales/en.json` | Add translation keys for new UI elements |

---

## User Experience Flow

1. User opens Quick Log dialog
2. Selects meal type (Breakfast, Lunch, etc.)
3. Types food name: "2 scrambled eggs with bacon"
4. After 800ms pause, sees a subtle shimmer/loading indicator
5. Fields auto-populate:
   - Calories: 340
   - Protein: 22g
   - Carbs: 2g
   - Fats: 27g
6. Small badge shows "AI Estimated • High Confidence"
7. User can adjust any value if needed
8. Taps "Save Meal" → Done!

---

## Edge Cases Handled

- **Ambiguous foods**: "Sandwich" → Shows "Medium Confidence" and estimates a generic sandwich
- **Compound meals**: "Burger with fries and soda" → Breaks down into 3 items, sums totals
- **Branded foods**: "Big Mac" → Recognizes and uses known nutritional data
- **Portions**: "Half cup of rice" → Adjusts serving size accordingly
- **Misspellings**: "chiken brest" → Fuzzy matching corrects to "Chicken Breast"
- **No match**: Shows "Unable to recognize. Please enter values manually or search database."

---

## Summary

This enhancement transforms the Quick Entry experience from manual data entry to intelligent food recognition. Users simply type what they ate, and the system fills in the nutritional details automatically using a combination of database lookup and AI estimation.
