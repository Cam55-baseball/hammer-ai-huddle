

# Flush-on-Close Verification — 3 Real Issues Found

## Audit Results

### Test 1: Flush Uses Latest Value — ✅ PASS (with caveat)

The `useEffect([open])` runs after React renders with `open=false`. At that point, `localFieldValues` in the closure IS the latest state from the current render cycle. Since `setLocalFieldValues` updates are synchronous within React's batching, the value read during flush is correct.

Typing "1" → "12" → "123" → close:
- Each keystroke calls `setLocalFieldValues` immediately (line 265)
- On close, React renders with latest `localFieldValues = { fieldId: "123" }`
- Effect reads "123" → saves "123" ✅

### Test 2: Double-Save — ⚠️ ISSUE (cosmetic, not data-corrupting)

**Scenario**: Type "123", wait 700ms, close at 750ms.

- At 700ms: debounce fires → calls `handleUpdateFieldValue("123")` → API call #1 starts
- At 750ms: `open` → false → effect clears timers (already deleted at line 277) → flush reads `localFieldValues` still has "123" → calls `onUpdateFieldValue("123")` → API call #2

**Result**: Two identical API calls. No data corruption (idempotent upsert), but wasteful.

**Fix**: Track which fields have been saved since last edit. Only flush fields with pending (unsaved) changes.

### Test 3: State Update After Unmount — ❌ FAIL

**File**: `CustomActivityDetailDialog.tsx`, line 281-293

The flush effect calls `onUpdateFieldValue` (prop) directly — this is fine. BUT the debounce path (line 269-278) calls `handleUpdateFieldValue`, which does:
```tsx
setSavingFieldIds(prev => new Set(prev).add(fieldId));  // line 283
await onUpdateFieldValue(fieldId, value);                 // line 285
setSavingFieldIds(prev => { ... });                       // line 287 — AFTER UNMOUNT
```

If a debounce fires right before close, the `await` resolves after the dialog unmounts, triggering `setSavingFieldIds` on an unmounted component. React 18 removed the warning but it's still a no-op state update on a destroyed component — messy but not a crash.

**Fix**: Use a mounted ref to guard post-unmount state updates.

### Test 4: Stable Function Reference — ⚠️ ISSUE

`onUpdateFieldValue` is defined as an inline arrow in `GamePlanCard.tsx` (line 2135). This means every parent re-render creates a new function reference. The `useEffect([open])` does NOT include `onUpdateFieldValue` in its dependency array, so it captures a potentially stale closure.

In practice this is low-risk because the function's behavior doesn't change between renders (it always reads from `selectedCustomTask` via state setter). But it violates React best practices.

**Fix**: Store `onUpdateFieldValue` in a ref so the effect always has the latest version.

### Test 5: Slow Network — ✅ PASS

The flush calls `onUpdateFieldValue` which does an optimistic update (line 2149-2160) before the network call. On reopen, `getFieldValue` reads from `log.performance_data` which was optimistically updated. No flicker.

### Test 6: Partial Multi-Field Flush — ✅ PASS

`Object.entries(localFieldValues)` iterates ALL fields. Each gets its own `onUpdateFieldValue` call. No field is skipped.

### Test 7: Reopen Consistency — ✅ PASS

After flush: `setLocalFieldValues({})` clears local state. On reopen, `getFieldValue` falls through to `log.performance_data` which was updated by the optimistic update + persist. Values match.

---

## Summary

| Test | Result | Severity |
|------|--------|----------|
| 1. Latest value flush | ✅ PASS | — |
| 2. Double-save | ⚠️ Idempotent duplicate | Low |
| 3. Post-unmount state update | ❌ FAIL | Medium |
| 4. Stale callback ref | ⚠️ Theoretical | Low |
| 5. Slow network | ✅ PASS | — |
| 6. Multi-field flush | ✅ PASS | — |
| 7. Reopen consistency | ✅ PASS | — |

## Fix Plan

### File: `src/components/CustomActivityDetailDialog.tsx`

**Change 1 — Add mounted ref + callback ref**

```tsx
const isMounted = useRef(true);
const onUpdateFieldValueRef = useRef(onUpdateFieldValue);
onUpdateFieldValueRef.current = onUpdateFieldValue;

useEffect(() => {
  isMounted.current = true;
  return () => { isMounted.current = false; };
}, []);
```

**Change 2 — Guard post-unmount state updates in handleUpdateFieldValue**

```tsx
const handleUpdateFieldValue = async (fieldId: string, value: string) => {
  if (!onUpdateFieldValueRef.current) return;
  setSavingFieldIds(prev => new Set(prev).add(fieldId));
  try {
    await onUpdateFieldValueRef.current(fieldId, value);
  } finally {
    if (isMounted.current) {
      setSavingFieldIds(prev => {
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      });
    }
  }
};
```

**Change 3 — Eliminate double-save with a "saved" tracker**

```tsx
const savedFieldIds = useRef<Set<string>>(new Set());
```

In the debounce callback, after saving: `savedFieldIds.current.add(fieldId)`
In `handleLocalFieldChange`: `savedFieldIds.current.delete(fieldId)` (new edit invalidates saved status)

In the flush effect: only flush fields NOT in `savedFieldIds.current`:
```tsx
Object.entries(localFieldValues).forEach(([fieldId, value]) => {
  if (value !== undefined && !savedFieldIds.current.has(fieldId) && onUpdateFieldValueRef.current) {
    onUpdateFieldValueRef.current(fieldId, value);
  }
});
```

### Files Changed

| File | Change |
|------|--------|
| `src/components/CustomActivityDetailDialog.tsx` | Add mounted ref, callback ref, saved-field tracker; guard unmount; eliminate double-save |

