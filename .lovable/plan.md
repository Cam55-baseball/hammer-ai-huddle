

# Link Vitamin Logs + Add Dosage Editing

## What This Does

Two changes: (1) migrate `useVitaminLogs` to react-query so supplements logged from Quick Log appear in Nutrition Hub without reload, and (2) add an `updateVitamin` function so users can edit dosage inline on both the VitaminSupplementTracker and QuickNutritionLogDialog.

## Changes

### 1. `src/hooks/useVitaminLogs.ts` — React Query + Update Function

- Replace `useState`/`useEffect` fetching with `useQuery` using keys `['vitaminLogs', targetDate]` and `['vitaminAdherence']`
- Add `updateVitamin(id, fields)` method that does a Supabase `update` on `vault_vitamin_logs` and invalidates the query cache
- Expose `updateVitamin` from the hook's return object
- All mutation methods (`addVitamin`, `markVitaminTaken`, `deleteVitamin`, `updateVitamin`) invalidate both query keys after success

### 2. `src/components/QuickNutritionLogDialog.tsx` — Cache Invalidation

- After the supplement logging loop in `handleSave`, call `queryClient.invalidateQueries({ queryKey: ['vitaminLogs'] })` and `queryClient.invalidateQueries({ queryKey: ['vitaminAdherence'] })`
- This ensures the Nutrition Hub refreshes automatically

### 3. `src/components/vault/VitaminSupplementTracker.tsx` — Inline Dosage Edit

- Destructure `updateVitamin` from `useVitaminLogs()`
- In each vitamin row, replace the static dosage display with an `EditableCell` component (already exists at `src/components/EditableCell.tsx`)
- On save, call `updateVitamin(vitaminId, { dosage: newValue })`

### Technical Detail — `updateVitamin` in the hook

```typescript
const updateVitamin = async (vitaminId: string, fields: { dosage?: string; timing?: VitaminTiming }) => {
  const { error } = await supabase
    .from('vault_vitamin_logs')
    .update(fields)
    .eq('id', vitaminId)
    .eq('user_id', user.id);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ['vitaminLogs'] });
  queryClient.invalidateQueries({ queryKey: ['vitaminAdherence'] });
};
```

No database changes needed.

