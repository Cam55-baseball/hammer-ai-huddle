

# Fix: Preview Module Import Failure After Sign-In

## Root Cause

The failing URL from the runtime error is:
```
/node_modules/.vite/deps/chunk-ZMLY2J2T.js?v=0b4ef1c3
```

This is a **Vite pre-bundled dependency chunk**, not a page file. When the user signs in and the app navigates to `/dashboard`, React Router triggers the lazy import for the Dashboard page. That page's dependency tree includes chunks from `.vite/deps/` that the preview proxy intermittently fails to serve (returning HTML or a network error instead of JS).

The Auth page itself loads fine because its chunks were already fetched during initial page load. The problem is exclusively with chunks needed by pages loaded **after** navigation.

## Fix — Static Import Critical Post-Auth Pages

Convert `Dashboard` and `ScoutDashboard` from lazy to static imports. These are the two pages users land on after sign-in (based on role). Making them static ensures their entire dependency tree is resolved at initial page load — before auth ever completes.

All other pages remain lazy-loaded (they're navigated to from within the app after the initial load succeeds, which is more reliable).

### `src/App.tsx`

**1. Add static imports** (after existing imports, before `lazyWithRetry` definitions):
```typescript
import Dashboard from "./pages/Dashboard";
import ScoutDashboard from "./pages/ScoutDashboard";
```

**2. Remove their lazy definitions** (delete lines 56 and 63):
```typescript
// DELETE: const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
// DELETE: const ScoutDashboard = lazyWithRetry(() => import("./pages/ScoutDashboard"));
```

No route changes needed — the JSX references `<Dashboard />` and `<ScoutDashboard />` remain identical.

## Why This Works
- Static imports are resolved by Vite's module graph at page load time
- All dependency chunks for Dashboard/ScoutDashboard load with the initial bundle
- No dynamic fetch is needed after sign-in completes
- Other lazy pages still benefit from code splitting (they load from already-warm connections)

## Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Static import Dashboard + ScoutDashboard, remove their `lazyWithRetry` definitions |

## What This Does NOT Do
- No new dependencies
- No route changes
- No auth logic changes
- No Vite config changes

