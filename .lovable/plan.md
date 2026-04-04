

# Router-Safe URL State — Replace `window.history.replaceState` with `useSearchParams`

## Problem
`GamePlanCard.tsx` uses `window.history.replaceState` and `window.location.search` to manage URL query params. This bypasses React Router, causing potential state desync and breaking back/forward navigation.

## Changes

### `src/components/GamePlanCard.tsx`

**1. Import `useSearchParams`:**
```typescript
import { useNavigate, useSearchParams } from 'react-router-dom';
```

**2. Add hook at component top:**
```typescript
const [searchParams, setSearchParams] = useSearchParams();
```

**3. Replace `setUrlParam` helper (lines 511-520):**
```typescript
const setUrlParam = useCallback((key: string, value: string | null) => {
  setSearchParams(prev => {
    if (value) {
      prev.set(key, value);
    } else {
      prev.delete(key);
    }
    return prev;
  }, { replace: true });
}, [setSearchParams]);
```

**4. Replace restore effect (lines 539-569) — read from `searchParams` instead of `window.location.search`:**
```typescript
useEffect(() => {
  if (loading) return;
  const activityId = searchParams.get('activityId');
  const folderItemId = searchParams.get('folderItemId');
  // ... rest of restore logic unchanged
}, [loading]);
```

**5. `App.tsx` line 19** — the `_cb` cleanup is outside the router, so it stays as `window.history.replaceState` (correct — it runs before `BrowserRouter` mounts).

## Files Changed

| File | Change |
|------|--------|
| `src/components/GamePlanCard.tsx` | Replace `window.history.replaceState` / `window.location.search` with `useSearchParams` |

## What This Enables
- Back button closes dialog, forward reopens it
- URL state reactive to React Router
- No manual DOM API usage inside routed components

