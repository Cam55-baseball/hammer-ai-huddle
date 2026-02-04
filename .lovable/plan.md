

# Fix: Amber Glow Animation and Performance Test Locking

## Issues Found

### Issue 1: Amber Glow Animation Not Displaying

**Root Cause:** The `App.css` file containing the `animate-glow-pulse-amber` animation is **NOT IMPORTED** anywhere in the application.

- `src/main.tsx` only imports `./index.css`
- `src/App.tsx` has no CSS import
- The animation definition exists in `App.css` (lines 85-96) but is never loaded

**Solution:** Move the amber glow animation from `App.css` to `index.css`, which is the main stylesheet that is actually imported.

---

### Issue 2: Performance Tests Not Locking After Save

**Root Cause:** The `justSaved` state fix was correctly implemented, but there may be an issue with how the result is being evaluated OR the CSS import issue is masking a UI problem. However, looking at the code:

```typescript
// VaultPerformanceTestCard.tsx line 282-285
const result = await onSave(selectedModule, results, handedness);
if (result.success) {
  setJustSaved(true); // Immediately show as locked
}
```

The logic appears correct. The issue could be:
1. The save is failing silently (result.success is false)
2. The component is unmounting/remounting after save

**Debug + Solution:** Add console logging to verify the save flow, but also ensure the `justSaved` state persists correctly.

---

## Implementation Plan

### File Changes

| File | Changes |
|------|---------|
| `src/index.css` | Add the amber glow animation keyframes and utility class |
| `src/App.css` | Remove the amber glow animation (to avoid duplication) |
| `src/components/vault/VaultPerformanceTestCard.tsx` | Add debug logging to verify save success |
| `src/components/vault/VaultProgressPhotosCard.tsx` | Add debug logging to verify save success |

---

## Technical Details

### 1. Move Animation to index.css

Add at the end of `src/index.css`:

```css
/* Amber glow pulse animation for checkout Important message */
@keyframes glow-pulse-amber {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
  }
  50% { 
    box-shadow: 0 0 16px 6px rgba(251, 191, 36, 0.3);
  }
}

.animate-glow-pulse-amber {
  animation: glow-pulse-amber 2s ease-in-out infinite;
}
```

### 2. Add Debug Logging to Performance Test Card

```typescript
const handleSave = async () => {
  // ... existing code ...
  
  setSaving(true);
  console.log('[VaultPerformanceTestCard] Saving performance test...');
  const result = await onSave(selectedModule, results, handedness);
  console.log('[VaultPerformanceTestCard] Save result:', result);
  if (result.success) {
    console.log('[VaultPerformanceTestCard] Setting justSaved to true');
    setJustSaved(true);
  }
  setTestResults({});
  setSaving(false);
};
```

### 3. Add Debug Logging to Progress Photos Card

Same pattern for `VaultProgressPhotosCard.tsx`.

---

## Summary

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Amber glow not showing | `App.css` not imported | Move animation to `index.css` |
| Tests not locking | Need debug verification | Add console logging + verify justSaved state |

