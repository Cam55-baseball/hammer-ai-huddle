## Problem

"Importing a module script failed" fires when a lazy-loaded route chunk's hash no longer exists on the server — typically after a deploy while the browser is holding an older `index.html` reference (esp. on installed PWAs). The current `lazyWithRetry` in `src/App.tsx` retries the same broken URL 3× and then surrenders to the local `ErrorBoundary`, which is why "Try again" never recovers — the file at that hash is permanently gone.

## Fix (global, swift)

### 1. `src/App.tsx` — make `lazyWithRetry` self-healing
- On the **final** retry failure for a chunk-load / module-import error, do a **one-shot hard reload** with a cache-bust param (`?_cb=<buildId>`), guarded by `sessionStorage` so we never loop:
  - Detect via `error.name === 'ChunkLoadError'` OR `/Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(error.message)`.
  - Key: `sessionStorage['chunkReload:' + importPath]`. If already set, fall through and throw (lets ErrorBoundary show its message instead of reload-looping).
- Apply the same wrap to the two preloaded lazies (`Dashboard`, `ScoutDashboard`) so the preload path isn't an escape hatch.

### 2. `src/App.tsx` — global listeners catch chunk errors outside `lazy()`
Add a `useEffect` in `App` that listens for:
- `window.addEventListener('error', …)` filtering for the same message patterns
- `window.addEventListener('unhandledrejection', …)` for promise rejections from dynamic `import()` calls anywhere in the app

…and routes them through the same `triggerChunkReload(importKey)` helper. This covers non-route dynamic imports (e.g. dialogs, drill detail sheets opened from "Open Baserunning").

### 3. `vite.config.ts` — keep workbox honest
Already `globPatterns: ['**/*.{js,css}']` precaches JS — which is exactly what makes hashed chunks go stale post-deploy in installed PWAs. Change to **`globPatterns: ['**/*.css']` only** (or drop JS precache and add a `runtimeCaching` rule for `/assets/*.js` with `StaleWhileRevalidate` + short maxAgeSeconds). This stops the SW from serving a manifest of vanished hashes after an update.

### 4. `src/registerSW.ts` (verify) — on `needRefresh`, prompt + `updateSW(true)`; on first uncaught chunk error, call `updateSW(true)` once before the cache-bust reload so the new SW takes over.

### 5. `src/components/ErrorBoundary.tsx` — chunk-aware fallback
When `componentDidCatch` sees a chunk-load message and the auto-reload guard is already tripped (so we can't reload again this session), render a friendlier panel with a "Reload app" button that clears the `chunkReload:` sentinels and calls `location.reload()` — instead of the "Try again" that just re-throws.

## Why this fixes the Baserunning click
The Hammers daily "Open Baserunning" navigates to `/baserunning-iq` (lazy route) or opens a lazy dialog. After a deploy the old SHA-hashed chunk URL 404s; today's retry loop can't help. With (1)+(2) the first failure triggers a single clean reload against the new `index.html`, which fetches the current hashes — and (3) ensures the SW isn't the one feeding stale URLs in the first place.

## Files touched
- `src/App.tsx` (modify `lazyWithRetry`, add global error listeners, wrap preloaded lazies)
- `src/components/ErrorBoundary.tsx` (chunk-aware fallback + clear sentinels)
- `vite.config.ts` (stop precaching JS; add runtime cache rule)
- `src/registerSW.ts` (verify update-on-error path)

No business logic changes. No DB changes.
