

# Craving Engine — Behavioral Intelligence Fix

## Problem
The craving engine currently queries foods by nutrient density alone, ignoring taste profile. This produces nutritionally correct but behaviorally wrong suggestions (e.g., Parmesan for a "sweet" craving).

## Solution
Add a `food_category` text array column to `nutrition_food_database`, populate all 139 foods with taste tags, then filter the craving query by category match.

## Changes

### 1. Database Migration — Add `food_category` column + populate

Add `food_category text[]` to `nutrition_food_database`.

Populate via UPDATE statements mapping each food to one or more categories: `sweet`, `salty`, `savory`, `crunchy`, `chocolate`.

Category assignments (key examples):
- **sweet**: Apple, Banana, Blueberries, Dark Chocolate, Grapes, Honey, Mango, Maple Syrup, Orange, Peach, Pineapple, Strawberries, Watermelon, Chocolate Milk, Granola, Greek Yogurt, Overnight Oats, Waffle, Pancake
- **salty**: Bacon, Pretzels, Popcorn, Chips, Soy Sauce, Ham, Sausage, Salsa, Hummus, Cheddar Cheese, Parmesan, Mozzarella
- **savory**: Beef Steak, Grilled Chicken, Ground Turkey, Pork Chop, Tilapia, Shrimp, Tuna, Eggs, Tofu, Lentils, Black Beans, Edamame, Broccoli, Asparagus, Mushrooms
- **crunchy**: Almonds, Cashews, Walnuts, Trail Mix, Popcorn, Pretzels, Chips, Rice Cakes, Carrots, Celery, Bell Pepper, BBQ Seeds, Chia Seeds
- **chocolate**: Dark Chocolate, Chocolate Milk, RX Bar (Chocolate)

Foods can have multiple tags (e.g., Dark Chocolate = `{sweet, chocolate}`, Popcorn = `{salty, crunchy}`).

### 2. `src/components/nutrition-hub/CravingGuidance.tsx` — Filter by category

Update the food query (line 70-75) to add a `.contains('food_category', [selectedCraving])` filter:

```typescript
const { data: foods } = await supabase
  .from('nutrition_food_database')
  .select('name')
  .contains('food_category', [selectedCraving])
  .gt(topDeficient, 0)
  .order(topDeficient, { ascending: false })
  .limit(2);
```

### 3. No-match microcopy

The existing no-match message stays: `"No aligned foods found — prioritize nutrient correction first"`

Add a subtle explanation line below it:
`"Your craving may not align with your body's highest nutrient need today"`

### 4. Types update

The `food_category` column will be auto-reflected in the generated Supabase types after migration.

## Files Changed

| File | Change |
|------|--------|
| DB migration | Add `food_category text[]`, populate all 139 foods |
| `src/components/nutrition-hub/CravingGuidance.tsx` | Add `.contains('food_category', [selectedCraving])` filter + no-match microcopy |

## What This Does NOT Do
- No new tables
- No changes to scoring logic
- No changes to nutrient thresholds or limiting factor ranking
- No fallback to behaviorally incorrect foods

