

# Fix: "Importing a module script failed" Error

## Diagnosis

The error is **not a code bug**. All imports resolve correctly, all files are syntactically valid, and no missing modules exist.

The error `"Importing a module script failed"` occurs because the browser has cached an old `index.html` that references JavaScript chunk filenames (e.g., `index-B3hjN48E.js`) from a previous build. After the latest code changes deployed, those chunk files were replaced with new ones (different hashes). The browser tries to load the old chunks, which no longer exist on the server, causing the import failure.

The `ErrorBoundary` catches this and shows "Oops! Something went wrong" with a "Return to Home" button, but even that reload still uses the cached HTML — so the error persists.

## Fix

Add a **force-reload mechanism** to the `ErrorBoundary` when it detects a dynamic import error. Instead of just navigating, it should do a hard reload that bypasses the browser cache:

**File: `src/components/ErrorBoundary.tsx`**
- In the `handleRetry` method, use `window.location.reload()` — but the current implementation already uses cache-busting via `_cb` query param
- The real issue: the `handleReset` method navigates to `/` with `window.location.href = '/'` which may still serve the cached HTML
- Change `handleRetry` to use `location.reload(true)` or `fetch` with `cache: 'reload'` header to bust the HTML cache, then reload
- Alternatively, add `Cache-Control: no-cache` meta tag to `index.html` to prevent HTML caching

**Specific changes:**
1. In `ErrorBoundary.tsx` `handleRetry`: use `caches.delete()` to clear service worker caches before reloading, then `window.location.reload()`
2. Also unregister the stale service worker that may be serving the old HTML
3. Add a comment in `index.html` with a cache-busting meta tag for the HTML itself

This is a minimal fix — just improving the recovery path when chunk files are stale.

