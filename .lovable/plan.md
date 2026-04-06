

# Add Vitamin & Supplement Logging to Quick Nutrition Log Dialog

## What This Does

Adds a collapsible "Vitamins & Supplements" section to the `QuickNutritionLogDialog` (the "Log Meal" dialog on the Game Plan). Users can add one or more vitamins/supplements alongside their meal entry. These get saved to the existing `vault_vitamin_logs` table using the existing `useVitaminLogs` hook.

## Changes

### 1. Modify `src/components/QuickNutritionLogDialog.tsx`

- Import `useVitaminLogs` and its types (`CreateVitaminInput`)
- Import `SUPPLEMENT_REFERENCE` and `SUPPLEMENT_NAMES` from `VitaminSupplementTracker.tsx` (or extract to shared constants)
- Add state for a list of supplements to log: `supplements: Array<{ name: string; dosage: string }>`
- Add a collapsible section (similar to "Digestion Notes") between the Energy Level and Save button:
  - Header: "Vitamins & Supplements (optional)" with a `Pill` icon
  - An autocomplete/select input for supplement name (from `SUPPLEMENT_NAMES`)
  - A dosage input that auto-fills the suggested range from `SUPPLEMENT_REFERENCE`
  - An "Add" button to push to the list
  - Show added supplements as removable badges/chips
- On save (`handleSave`): after saving the nutrition log, iterate through the supplements list and call `addVitamin()` for each one
- Reset supplements list in `resetForm()`

### 2. Extract shared supplement data (minor refactor)

Move `SUPPLEMENT_REFERENCE` and `SUPPLEMENT_NAMES` from `VitaminSupplementTracker.tsx` to a new file `src/constants/supplements.ts` so both components can import from a single source of truth.

## No database changes needed

The `vault_vitamin_logs` table already exists and supports all required fields.

## Technical Detail

The supplement section UI will be a `Collapsible` with:
- A combobox-style input listing known supplements (with free-text for custom ones)
- Auto-populated dosage from the reference data
- Each added supplement shown as a chip with an X to remove
- On save, each supplement is inserted via `useVitaminLogs().addVitamin()` with today's date and timing based on the selected meal type (breakfast → `with_breakfast`, etc.)

