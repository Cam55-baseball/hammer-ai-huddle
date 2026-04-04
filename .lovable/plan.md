

# Fix: Second Insert Path Missing Micros Guard

## Problem Found
There are **two** code paths that insert into `vault_nutrition_logs`:

1. **`useMealVaultSync.ts`** (line 189) — has the `{}` → `null` guard ✅
2. **`useVault.ts`** (line 719) — spreads `logData` directly with **NO guard** ❌

The spirulina smoothie (`micros = '{}'`, `data_confidence = 'medium'`) was inserted via the `useVault.ts` path, bypassing all integrity checks.

## Fix — `src/hooks/useVault.ts` (line ~717-724)

Add the same guard before insert:

```typescript
const saveNutritionLog = useCallback(async (logData: Omit<VaultNutritionLog, 'id' | 'logged_at'>) => {
  if (!user) return { success: false };

  // Guard: empty micros → null, force low confidence
  const REQUIRED_MICRO_KEYS = [
    'vitamin_a_mcg', 'vitamin_c_mg', 'vitamin_d_mcg', 'vitamin_e_mg',
    'vitamin_k_mcg', 'vitamin_b6_mg', 'vitamin_b12_mcg', 'folate_mcg',
    'calcium_mg', 'iron_mg', 'magnesium_mg', 'potassium_mg', 'zinc_mg',
  ];
  let sanitizedData = { ...logData };
  if (sanitizedData.micros != null && typeof sanitizedData.micros === 'object') {
    const micros = sanitizedData.micros as Record<string, unknown>;
    const hasData = Object.values(micros).some(v => typeof v === 'number' && v > 0);
    const isComplete = REQUIRED_MICRO_KEYS.every(k => typeof micros[k] === 'number');
    if (!hasData || !isComplete) {
      sanitizedData.micros = null;
      sanitizedData.data_confidence = 'low';
    }
  }

  const { error } = await supabase.from('vault_nutrition_logs').insert({
    user_id: user.id,
    entry_date: today,
    logged_at: new Date().toISOString(),
    ...sanitizedData,
  });
  // ... rest unchanged
```

## Database Fix — Clean the leaked row

```sql
UPDATE vault_nutrition_logs
SET micros = null, data_confidence = 'low'
WHERE micros::text = '{}';
```

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useVault.ts` | Add micros `{}` → `null` guard in `saveNutritionLog` |
| DB migration | Clean any remaining `{}` micros rows |

## Verification

After deploy, both insert paths enforce the same rule: incomplete micros → `null` + `low` confidence. No `{}` can leak through.

