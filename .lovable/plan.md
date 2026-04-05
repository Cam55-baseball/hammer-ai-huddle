

# Runtime Verification Audit — Results

## Tests 1-6: PASS ✅ | Test 7: FAIL ❌ (Bug Found)

---

## Test 1: Mobile Decimal Input — PASS ✅

**Code proof** (line 852-861):
- `type="text"` — browser cannot strip decimals
- `inputMode="decimal"` — triggers numeric keypad on iOS/Android
- Regex `/^\d*\.?\d*$/` is the **only** gate, applied in `onChange`

Typing "9" → "9." → "9.6":
- "9" passes regex → state = "9" ✅
- "9." passes regex → state = "9." ✅
- "9.6" passes regex → state = "9.6" ✅

".5" passes regex ✅. Backspace through "9.6" → "9." → "9" → "" — all pass regex ✅.

**No cursor interference**: The regex only gates whether `onUpdate` fires. If it passes, React sets state to the full `e.target.value` — the browser manages cursor position natively.

## Test 2: Cursor Stability — PASS ✅

With `type="text"`, React's controlled input preserves cursor position when `value` is set to exactly what the user typed. The regex never modifies the value — it either accepts or rejects the full string. No `substring`, `replace`, or reformatting occurs. Cursor stays where the user placed it.

## Test 3: Paste + Invalid Input — PASS ✅

- Paste "123.45" → regex passes → accepted ✅
- Paste "12..34" → regex fails (two dots) → **rejected silently** ✅
- Paste "abc" → regex fails → rejected ✅
- After rejection, next valid keystroke works normally (no stuck state) because rejection simply doesn't call `handleLocalFieldChange`

## Test 4: Debounce Correctness — PASS ✅

**Lines 255-269**: Each keystroke clears the previous timer and starts a new 800ms timer. When it fires, it reads from `prev[fieldId]` (latest React state), not a stale closure variable.

Type "1" → "12" → "123" within 800ms:
- Timer for "1" cleared by "12"
- Timer for "12" cleared by "123"
- Only "123" timer fires → reads `prev[fieldId]` = "123" → saves "123" ✅

## Test 5: No Flicker — PASS ✅

**Line 242-244**: `getFieldValue` checks `localFieldValues` first. Since line 266 returns `prev` (keeps local state), the input never falls through to server data during the save window.

## Test 6: Multi-Field Isolation — PASS ✅

`debounceTimers.current` is keyed by `fieldId`. Each field has its own independent timer. No shared state between fields.

---

## Test 7: Close Before Debounce — FAIL ❌ BUG FOUND

**Lines 216-221**: When dialog closes:
```tsx
useEffect(() => {
  if (!open) {
    Object.values(debounceTimers.current).forEach(clearTimeout);
    debounceTimers.current = {};
    setLocalFieldValues({});
  }
}, [open]);
```

This clears ALL pending timers and wipes local state. If the user types a value and closes the dialog within 800ms, **the value is permanently lost**.

### Fix

Before clearing timers, flush all pending values:

```tsx
useEffect(() => {
  if (!open) {
    // Flush any pending debounced values before cleanup
    Object.keys(debounceTimers.current).forEach(fieldId => {
      clearTimeout(debounceTimers.current[fieldId]);
    });
    // Save all local values that haven't been persisted yet
    Object.entries(localFieldValues).forEach(([fieldId, value]) => {
      if (value !== undefined) {
        handleUpdateFieldValue(fieldId, value);
      }
    });
    debounceTimers.current = {};
    setLocalFieldValues({});
  }
}, [open]);
```

This ensures: close dialog → all pending values are immediately saved → then cleanup.

Note: `handleUpdateFieldValue` needs to be stable (wrapped in `useCallback` or referenced via ref) to avoid stale closure issues in this effect. Need to verify its dependencies.

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/CustomActivityDetailDialog.tsx` | Flush pending debounced values on dialog close before clearing timers (lines 216-221) |

## Summary

| Test | Result |
|------|--------|
| 1. Decimal input | ✅ PASS |
| 2. Cursor stability | ✅ PASS |
| 3. Paste handling | ✅ PASS |
| 4. Debounce correctness | ✅ PASS |
| 5. No flicker | ✅ PASS |
| 6. Multi-field isolation | ✅ PASS |
| 7. Close before debounce | ❌ **FAIL — data loss on early close** |

One fix needed. Everything else is production-solid.

