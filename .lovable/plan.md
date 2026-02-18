
# Add Meal Time Input & Improve Digestion Notes Across All Nutrition Logging Entry Points

## Overview

There are **3 distinct nutrition logging entry points** in the app:
1. **Vault (The Vault page)** — `VaultNutritionLogCard.tsx` — the most feature-rich form
2. **Quick Log Dialog** — `QuickNutritionLogDialog.tsx` — used from the Game Plan / Dashboard
3. **Nutrition Hub Meal Logging Dialog** — `MealLoggingDialog.tsx` — used from the Nutrition Hub page

All 3 need a **Meal Time** field and improved **Digestion Notes**. The changes will be consistent and additive — no breaking changes.

---

## Part 1: Database Change

A new `meal_time` column (type `text`, nullable) will be added to `vault_nutrition_logs` to store the time as a user-friendly string (e.g., `"7:30 AM"`, `"12:00 PM"`).

This keeps it simple — no complex time parsing, just the text the user types or selects. The existing `logged_at` column will continue to auto-record when the log was *saved*, while `meal_time` captures when the athlete *actually ate*.

---

## Part 2: Meal Time Input Field

A time picker input will be added to all 3 logging forms. It will:
- Default to the current time in `h:mm a` format (e.g., "7:30 AM") so users don't have to type it manually
- Use a native `<input type="time">` under the hood for mobile-friendly picking, displayed with a readable 12-hour format label
- Show a `Clock` icon
- Be fully optional (nullable)

---

## Part 3: Improved Digestion Notes

Currently, `digestion_notes` is only present in `VaultNutritionLogCard.tsx` — a plain textarea with a generic placeholder. The improvements:

**In VaultNutritionLogCard.tsx:**
- Replace the plain placeholder with descriptive, structured prompt text that guides athletes:
  - *"How did you feel after eating? (e.g., bloated, energized, heavy, light, stomach cramps, heartburn, felt great)"*
- Add **quick-tap tags** above the textarea: common digestion descriptors the user can tap to instantly add them as chips (e.g., "Felt great ✅", "Bloated 🫧", "Energized ⚡", "Heavy 🧱", "Light 🪶", "Cramps 😣", "Heartburn 🔥", "Nauseous 🤢")
- Tags toggle into the textarea, comma-separated, so free-text is still supported
- Cap at 60px min-height for cleanliness

**In QuickNutritionLogDialog.tsx and MealLoggingDialog.tsx:**
- Add a `digestion_notes` field (currently missing from both) — a small, collapsible "Optional Notes" section at the bottom with the same improved placeholder and quick-tap tags
- Keep it collapsible so it doesn't overwhelm the quick-log experience

---

## Files to Modify

| File | Changes |
|---|---|
| `src/components/vault/VaultNutritionLogCard.tsx` | Add `mealTime` state, Meal Time input field, improved digestion notes with quick-tap tags |
| `src/components/QuickNutritionLogDialog.tsx` | Add `mealTime` state, Meal Time input field, add optional collapsible digestion notes section |
| `src/components/nutrition-hub/MealLoggingDialog.tsx` | Add `mealTime` state, Meal Time input field (both Quick and Detailed tabs), add optional collapsible digestion notes |
| `src/hooks/useMealVaultSync.ts` | Pass `meal_time` through to the database insert |

## Files to Add (Database Migration)

1 migration to add `meal_time text nullable` column to `vault_nutrition_logs`

---

## Technical Notes

- `meal_time` is stored as text (e.g., `"7:30 AM"`) — simple, human-readable, avoids timezone complexity
- Default value for the input is computed at form open time: `format(new Date(), 'h:mm a')`
- The native `<input type="time">` value is in `HH:mm` 24-hour format and will be converted to `h:mm a` for storage/display
- Digestion quick-tags are stored inline in the `digestion_notes` text field, comma-separated, so no schema change is needed for tags
- The `VaultNutritionLogCard` `onSave` callback signature already accepts `meal_time` since it spreads into the insert — no hook changes needed for the Vault path; only `useMealVaultSync` needs updating for the other two paths
- MealLogCard display already shows `loggedAt` time from `logged_at` — we can optionally display `meal_time` if present (shown as "Eaten at: 7:30 AM")
