

# Weekly Wellness Goals - Strict Once-Per-Week Lock

## Problem Summary

The Weekly Wellness Goals card in The Vault currently uses `upsert` which allows users to update their goals after setting them. While the UI shows a locked state, users could potentially bypass this by re-triggering the save action. The requirement is to strictly enforce one submission per week, with the card resetting every Monday.

## Current Implementation Issues

1. **`handleSave` uses `upsert`** (line 121-123): This allows updating existing records instead of only inserting new ones
2. **Frontend-only lock**: The lock state (`isGoalsLocked`) is based on local state that resets on page reload until refetched from DB
3. **RLS allows updates**: The policy `Users can update own wellness goals` permits modifications after initial submission
4. **No "Update Goals" button should exist**: Line 394 shows an "Update Goals" text option when `hasExistingGoals` is true

---

## Technical Solution

### File 1: `src/components/vault/VaultWellnessGoalsCard.tsx`

**Changes:**

1. **Replace `upsert` with `insert` only** - Prevent any updates after initial submission

2. **Check for existing goals BEFORE save** - Re-verify from database that no goals exist for this week before allowing insert

3. **Handle duplicate key error gracefully** - If race condition occurs (user opens two tabs), catch the unique constraint violation and show appropriate message

4. **Remove "Update Goals" button text** - Since goals cannot be updated once set, only show "Set Goals"

5. **Add secondary database check in handleSave** - Double-check before insert to prevent race conditions

**Code Changes:**

```typescript
const handleSave = async () => {
  if (!user) return;
  
  // Re-check if goals already exist (handles race conditions/multiple tabs)
  const { data: existing } = await supabase
    .from('vault_wellness_goals')
    .select('id')
    .eq('user_id', user.id)
    .eq('week_start_date', weekStartStr)
    .maybeSingle();
  
  if (existing) {
    // Goals already set - update local state and show locked
    setHasExistingGoals(true);
    const nextWeek = addDays(weekStart, 7);
    setGoalsLockedUntil(nextWeek);
    toast({
      title: t('vault.wellnessGoals.alreadySet'),
      description: t('vault.wellnessGoals.lockedMessage'),
      variant: 'destructive'
    });
    return;
  }
  
  setSaving(true);

  const payload = {
    user_id: user.id,
    week_start_date: weekStartStr,
    target_mood_level: goals.target_mood_level,
    target_stress_level: goals.target_stress_level,
    target_discipline_level: goals.target_discipline_level,
    notification_enabled: goals.notification_enabled
  };

  // Use INSERT only - not upsert
  const { error } = await supabase
    .from('vault_wellness_goals')
    .insert(payload);

  setSaving(false);

  if (error) {
    // Handle duplicate key constraint (unique on user_id + week_start_date)
    if (error.code === '23505') {
      setHasExistingGoals(true);
      const nextWeek = addDays(weekStart, 7);
      setGoalsLockedUntil(nextWeek);
      toast({
        title: t('vault.wellnessGoals.alreadySet'),
        description: t('vault.wellnessGoals.lockedMessage'),
        variant: 'destructive'
      });
      return;
    }
    
    toast({
      title: t('common.error'),
      description: error.message,
      variant: 'destructive'
    });
  } else {
    setHasExistingGoals(true);
    const nextWeek = addDays(weekStart, 7);
    setGoalsLockedUntil(nextWeek);
    
    toast({
      title: t('vault.wellnessGoals.savedSuccess'),
      description: t('vault.wellnessGoals.goalsUpdated')
    });
  }
};
```

6. **Update button text** - Remove "Update Goals" option since updates are not allowed:

```typescript
// Change from:
{saving ? t('common.loading') : hasExistingGoals ? t('vault.wellnessGoals.updateGoals') : t('vault.wellnessGoals.setGoals')}

// Change to:
{saving ? t('common.loading') : t('vault.wellnessGoals.setGoals')}
```

---

### File 2: `src/i18n/locales/en.json` (and other locales)

**Add new translation keys:**

```json
"alreadySet": "Goals Already Set",
"lockedMessage": "Your weekly wellness goals are locked until next Monday."
```

---

## Database Considerations

The table already has a unique constraint on `(user_id, week_start_date)` which enforces one entry per user per week at the database level. By switching from `upsert` to `insert`, we leverage this constraint to prevent any modifications.

No database migration is needed - the existing unique constraint provides the backend enforcement.

---

## Files to Update

| File | Changes |
|------|---------|
| `src/components/vault/VaultWellnessGoalsCard.tsx` | Replace `upsert` with `insert`, add pre-save check, handle duplicate error, remove update button text |
| `src/i18n/locales/en.json` | Add `alreadySet` and `lockedMessage` translation keys |
| `src/i18n/locales/es.json` | Add translations |
| `src/i18n/locales/fr.json` | Add translations |
| `src/i18n/locales/de.json` | Add translations |
| `src/i18n/locales/ja.json` | Add translations |
| `src/i18n/locales/ko.json` | Add translations |
| `src/i18n/locales/zh.json` | Add translations |
| `src/i18n/locales/nl.json` | Add translations |

---

## Expected Outcome

1. Users can only set wellness goals **once per week**
2. After setting goals, the card displays a locked state showing current goals and progress tracking
3. The card resets every Monday at midnight (based on week_start_date calculation)
4. Multiple tab scenarios are handled gracefully - duplicate key errors show appropriate message
5. Backend enforcement via unique constraint prevents any bypass attempts

