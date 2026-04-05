

# Add Runtime Observability Logs

Add temporary debug logging to three locations in `src/components/CustomActivityDetailDialog.tsx` to confirm real-world behavior matches the audit.

## Changes

### 1. Log debounce saves (line 284)
After `handleUpdateFieldValue` call in the debounce timer, add:
```tsx
console.debug('[CustomActivity Save]', { fieldId, value: latestValue, source: 'debounce' });
```

### 2. Log flush-on-close saves (lines 231-235)
Before the flush loop, log the full `localFieldValues`. Inside the loop, log each flushed field:
```tsx
console.debug('[CustomActivity Flush]', { localFieldValues, savedFieldIds: [...savedFieldIds.current] });
// inside the loop:
console.debug('[CustomActivity Save]', { fieldId, value, source: 'flush' });
```

### 3. Log skipped fields (already saved)
Inside the flush loop, log when a field is skipped due to `savedFieldIds`:
```tsx
console.debug('[CustomActivity Flush Skip]', { fieldId, reason: 'already saved' });
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/CustomActivityDetailDialog.tsx` | Add 4 `console.debug` statements — no behavior changes |

