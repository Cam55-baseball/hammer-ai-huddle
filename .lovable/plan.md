

# Custom Activity Input Bug — Root Cause + Fix

## Root Cause: `INPUT_CASTING_ERROR`

**Two independent issues found:**

### Issue 1: `type="number"` on HTML input (PRIMARY)

**File:** `src/components/CustomActivityDetailDialog.tsx`, line 852
**File:** `src/components/custom-activities/CustomFieldsBuilder.tsx`, line 109

HTML `<input type="number">` has browser-native behavior that:
- Strips trailing decimals ("9." becomes "9" in some browsers)
- Blocks certain keystrokes on mobile
- Returns empty string from `e.target.value` for partial decimals like "9." or ".5"
- Behaves inconsistently across browsers/devices

When user types "9.6":
1. Types "9" → onChange fires, value = "9" ✅
2. Types "." → browser may strip it, onChange fires with value = "9" (not "9.") ❌
3. Types "6" → value becomes "96" instead of "9.6" ❌

### Issue 2: Debounce cleanup race (SECONDARY)

**File:** `src/components/CustomActivityDetailDialog.tsx`, lines 260-266

After the 800ms debounce fires and saves, `localFieldValues[fieldId]` is deleted. The value then falls through to `getFieldValue()` which reads from `log?.performance_data`. If the optimistic update or refetch hasn't completed yet, the input can briefly flash to stale/empty value.

The debounce closure also captures the `value` at the time of the keystroke that started the timer — if the user keeps typing after the debounce fires, the intermediate value is what gets saved, not the latest.

## Fix

### Changes to `CustomActivityDetailDialog.tsx`

**Line 852** — Change number input from `type="number"` to `type="text"` with `inputMode="decimal"`:

```tsx
// BEFORE
<Input
  type="number"
  value={getFieldValue(field.id)}
  onChange={(e) => handleLocalFieldChange(field.id, e.target.value)}
  ...
/>

// AFTER
<Input
  type="text"
  inputMode="decimal"
  value={getFieldValue(field.id)}
  onChange={(e) => {
    const v = e.target.value;
    if (v === '' || /^\d*\.?\d*$/.test(v)) {
      handleLocalFieldChange(field.id, v);
    }
  }}
  ...
/>
```

**Lines 254-269** — Fix debounce to always use latest value, and keep local state until refetch confirms:

```tsx
const handleLocalFieldChange = (fieldId: string, value: string) => {
  setLocalFieldValues(prev => ({ ...prev, [fieldId]: value }));
  if (debounceTimers.current[fieldId]) {
    clearTimeout(debounceTimers.current[fieldId]);
  }
  debounceTimers.current[fieldId] = setTimeout(() => {
    // Read latest value from state at save time
    setLocalFieldValues(prev => {
      const latestValue = prev[fieldId];
      if (latestValue !== undefined) {
        handleUpdateFieldValue(fieldId, latestValue);
      }
      return prev; // Don't delete — keep local value as source of truth until unmount
    });
    delete debounceTimers.current[fieldId];
  }, 800);
};
```

### Changes to `CustomFieldsBuilder.tsx`

**Line 109** — Same fix for the builder input:

```tsx
// BEFORE
type={field.type === 'number' ? 'number' : ...}

// AFTER
type={field.type === 'number' ? 'text' : ...}
// Add inputMode="decimal" when field.type === 'number'
```

### No backend changes needed
Values are stored as strings in `performance_data.fieldValues` (JSONB). The DB accepts any string. Conversion to number only happens at analysis/display time.

## Files Changed

| File | Change |
|------|--------|
| `src/components/CustomActivityDetailDialog.tsx` | Number input: `type="text"` + `inputMode="decimal"` + regex filter; fix debounce to use latest value and not delete local state prematurely |
| `src/components/custom-activities/CustomFieldsBuilder.tsx` | Same `type="text"` + `inputMode="decimal"` fix |

## Edge Cases Handled

| Input | Before | After |
|-------|--------|-------|
| "9." | Stripped to "9" | Preserved ✅ |
| ".5" | Blocked | Allowed ✅ |
| "9.62" | Could become "962" | Works correctly ✅ |
| "0.25" | May fail on mobile | Works correctly ✅ |
| "10.00" | Trailing zeros stripped | Preserved ✅ |

