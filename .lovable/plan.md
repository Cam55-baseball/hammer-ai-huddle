

# Restore Code Splitting for Dashboard Routes — Preload Strategy

## Problem
Dashboard and ScoutDashboard are statically imported in `App.tsx`, pulling ~685 and ~672 lines of code plus all their dependencies into the main bundle (inflating it from ~2.5MB to ~3.91MB). We need code splitting back without reintroducing the preview proxy failure.

## Root Cause of Original Failure (Why We Can't Just Revert)
The preview proxy intermittently fails to fetch Vite dependency chunks (`/node_modules/.vite/deps/chunk-*.js`) **on-demand during navigation**. The key insight: the failure happens when chunks are fetched *reactively* (user clicks → navigate → lazy load triggers → chunk fetch fails). If chunks are fetched *proactively* at boot, they're already cached in the browser by the time navigation happens.

## Solution: Lazy Import + Eager Preload

**Strategy**: Use `lazy()` for code splitting in the route tree, but trigger the imports immediately at module load time (not on navigation). This gives us:
- Separate chunks in the production build (restored code splitting)
- Chunks fetched at app boot, not at navigation time
- If the preload fails, `lazyWithRetry` handles it with 3 retries before the user ever navigates

### File 1: `src/App.tsx`

Remove the static imports on lines 13-14:
```typescript
// REMOVE:
// import Dashboard from "./pages/Dashboard";
// import ScoutDashboard from "./pages/ScoutDashboard";
```

Add preloaded lazy imports (after the `lazyWithRetry` helper):
```typescript
// Preloaded lazy imports — triggers fetch at boot, not on navigation
const dashboardImport = () => import("./pages/Dashboard");
const scoutDashboardImport = () => import("./pages/ScoutDashboard");

// Fire preloads immediately at module load time
const dashboardPreload = dashboardImport();
const scoutDashboardPreload = scoutDashboardImport();

// Lazy components that resolve from the already-in-flight preload
const Dashboard = lazy(() => dashboardPreload.catch(() => dashboardImport()));
const ScoutDashboard = lazy(() => scoutDashboardPreload.catch(() => scoutDashboardImport()));
```

How this works:
1. `dashboardPreload = dashboardImport()` fires the fetch **immediately** when `App.tsx` loads
2. `lazy(() => dashboardPreload)` resolves from the already-completed (or in-flight) promise
3. `.catch(() => dashboardImport())` retries once if the preload failed
4. The route still uses `<Suspense>` with `<PageLoadingSkeleton />` as fallback
5. In production: Vite outputs separate chunks for Dashboard and ScoutDashboard
6. In preview: the fetch fires at boot — by the time the user signs in and navigates, the module is already cached in the browser

### File 2: `vite.config.ts`

Add `manualChunks` to the build config to create predictable, stable chunks:

```typescript
build: {
  chunkSizeWarningLimit: 1500,
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-tooltip', '@radix-ui/react-tabs', '@radix-ui/react-select'],
        'vendor-query': ['@tanstack/react-query'],
        'vendor-supabase': ['@supabase/supabase-js'],
        'vendor-i18n': ['i18next', 'react-i18next'],
      },
    },
  },
},
```

This separates vendor libraries into stable chunks that rarely change, improving cache hit rates across deploys. Dashboard and ScoutDashboard will naturally become their own chunks via the dynamic imports.

## Expected Bundle Impact

| Chunk | Before (static) | After (preload+split) |
|-------|-----------------|----------------------|
| Main `index-*.js` | ~3.91 MB | ~2.0-2.5 MB |
| `Dashboard-*.js` | (in main) | ~150-250 KB |
| `ScoutDashboard-*.js` | (in main) | ~150-250 KB |
| `vendor-react-*.js` | (in main) | ~300 KB |
| `vendor-ui-*.js` | (in main) | ~200 KB |
| `vendor-supabase-*.js` | (in main) | ~100 KB |
| Total network | Same | Same (preloaded at boot) |

## Why This Will NOT Reintroduce the Module Import Failure

1. **Preload fires at boot, not on navigation** — chunks are fetched immediately when `App.tsx` loads, well before the user signs in
2. **Catch + retry on preload** — if the initial preload fails (proxy hiccup), the `.catch()` retries the import
3. **`Suspense` + `PageLoadingSkeleton`** — if both attempts are still in flight when the user navigates, they see a loading skeleton (not an error)
4. **Production is unaffected** — content-hashed static files from CDN, no proxy involved
5. **Preview stability** — by the time auth completes (2-5 seconds), the preloaded chunks are long cached

## Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Replace static Dashboard/ScoutDashboard imports with preloaded lazy imports |
| `vite.config.ts` | Add `rollupOptions.output.manualChunks` for vendor splitting |

