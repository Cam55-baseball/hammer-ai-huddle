
# Fix: "Save & End Session" Button in Manual Mode

## Root Cause

In `ManualRepRunner.tsx`, the `handleSaveEnd` function (triggered by the "Save & End Session" button in the data entry phase) calls `onRepComplete(result)` but **never calls `onEndSession()`**.

```
handleSaveEnd()
  → onRepComplete(result)  ✓ saves the rep, increments repCounter
  → [missing] onEndSession()  ✗ never called, so phase never becomes 'summary'
```

`onEndSession` is what tells `BaseStealingTrainer.tsx` to transition to `setPhase('summary')`. Without it, the user is silently stuck with an incremented rep counter and no summary screen.

The "Save & End" button in the `idle` phase (line 178) calls `onEndSession` directly and works fine — only the one in `data_entry` is broken.

## Fix

One-line change in `ManualRepRunner.tsx`:

```typescript
// BEFORE
const handleSaveEnd = () => {
  const result = buildResult();
  onRepComplete(result);
};

// AFTER
const handleSaveEnd = () => {
  const result = buildResult();
  onRepComplete(result);
  onEndSession(); // ← navigate to summary
};
```

## File Changed

| File | Change |
|------|--------|
| `src/components/base-stealing/ManualRepRunner.tsx` | Add `onEndSession()` call after `onRepComplete(result)` in `handleSaveEnd` |
