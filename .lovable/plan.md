

# Build System Audit — Root Cause + Full Analysis

## Build Failure Root Cause

The production build fails at the **PWA service worker generation** step. The error:

```
Assets exceeding the limit:
- assets/index-BQk2DrgN.js is 3.91 MB, and won't be precached.
```

**File**: `vite.config.ts` line 22 sets `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024` (3 MB). The main bundle `index-BQk2DrgN.js` is 3.91 MB, so the Workbox plugin throws a hard error and kills the build. Vite itself builds fine — the PWA plugin crashes *after* Vite finishes.

**Why it grew past 3 MB**: Dashboard and ScoutDashboard were moved from lazy imports to static imports (our earlier fix for preview auth). This pulled their entire dependency trees into the main chunk, inflating `index-*.js` from ~2.5 MB to 3.91 MB.

---

## Fix: Increase PWA Cache Limit

**`vite.config.ts` line 22** — change:
```typescript
maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
```
to:
```typescript
maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
```

This immediately unblocks the build. The 3 MB limit was arbitrary and too tight for an app with 90+ routes and static Dashboard imports.

---

## Full System Audit Results

### 1. Edit → Preview → Production Flow

```text
Code edit
  → Sandbox Vite dev server (HMR, port 8080)
  → Preview proxy (id-preview--*.lovable.app)
  → User sees live preview (development mode, no PWA)

Publish click
  → Lovable CI runs `vite build` (production mode)
  → PWA plugin generates service worker
  → Output deployed to CDN (hammers-modality.lovable.app)
```

### 2. Preview vs Production Differences

| Aspect | Preview (dev) | Production |
|--------|--------------|------------|
| Module serving | Vite dev server, ESM on-demand via `/node_modules/.vite/deps/` | Static bundled chunks from CDN |
| PWA/SW | Disabled (`mode === 'production'` guard, line 16) | Active, precaches all JS/CSS/HTML |
| `lovable-tagger` | Active (line 15) | Disabled |
| Asset URLs | Proxied through `id-preview--*.lovable.app` | Direct CDN with content-hash filenames |
| Auth redirects | Go through preview proxy | Direct to published domain |

**Key risk**: Preview serves dependency chunks via Vite's pre-bundle cache (`/node_modules/.vite/deps/chunk-*.js`). These are fetched on-demand through the preview proxy, which can intermittently fail — producing the "Importing a module script failed" error. This is a **platform-level limitation** of the preview proxy, not a code bug. Our static Dashboard import mitigates the most critical path.

### 3. Dependency Pre-bundling & Chunk Stability

- Vite pre-bundles dependencies into `.vite/deps/` with content-hash query params (`?v=0b4ef1c3`)
- Any dependency change invalidates the hash, forcing re-fetch of all dep chunks
- In preview: chunks are served live from the sandbox — proxy failures cause module import errors
- In production: chunks are baked into the build with stable content-hash filenames — no proxy involved

### 4. Cache Behavior

| Layer | Behavior | Invalidation |
|-------|----------|-------------|
| Browser (preview) | Vite uses `?v=` query param on dep chunks | Changes on any dependency update |
| Browser (production) | Content-hash filenames (`index-BQk2DrgN.js`) | New build = new hash = new file |
| Service Worker | Precaches all JS/CSS/HTML per `globPatterns` | New SW detected → `PWAUpdatePrompt` shows toast |
| CDN | Lovable CDN serves production assets | New publish replaces all assets |
| `index.html` meta tags | `Cache-Control: no-cache` (lines 4-6) | Forces revalidation on every load |

### 5. Lovable Injections

- **`lovable-tagger`** (dev only, line 15): Adds component metadata for the editor — stripped in production
- **No other injections**: Vite config is standard, no custom Rollup plugins, no post-build transforms
- **`public/_redirects`**: Present but **ignored** by Lovable hosting (SPA fallback is built-in)

### 6. Failure Recovery

- **`ErrorBoundary.tsx`**: Catches dynamic import failures, offers retry with cache clear + SW unregister
- **`lazyWithRetry`**: 3 attempts with exponential backoff for lazy imports
- **`PWAUpdatePrompt`**: Detects waiting SW, prompts user to update
- **`registerSW.ts`**: Handles SW registration failure gracefully (console.warn only)

### 7. Version Control & Rollback

- Lovable built-in version history allows instant rollback
- **Caveat**: Database migrations are NOT rolled back — only frontend code reverts
- **Caveat**: Edge functions deploy immediately and independently

### 8. Concrete Risk Points

| Risk | Location | Severity | Status |
|------|----------|----------|--------|
| PWA cache limit too small | `vite.config.ts:22` | **CRITICAL** (blocks build) | **Fix needed** |
| `_redirects` file is dead weight | `public/_redirects` | Low | Can remove |
| Main bundle 3.91 MB | `App.tsx` static imports | Medium | Acceptable tradeoff for auth stability |
| Preview proxy chunk failures | Platform-level | Medium | Mitigated by static Dashboard import |
| No `manualChunks` config | `vite.config.ts` | Low | Could improve but not required |

---

## Files Changed

| File | Change |
|------|--------|
| `vite.config.ts` | Increase `maximumFileSizeToCacheInBytes` from 3 MB to 5 MB |
| `public/_redirects` | Delete (unused by Lovable hosting) |

## Answer: Is the Preview Fundamentally Unreliable?

The preview proxy can fail to serve Vite dependency chunks — this is a platform characteristic, not a bug in your code. For **authenticated + lazy-loaded flows**, the risk is real but bounded. Our static import of Dashboard/ScoutDashboard eliminates the highest-impact failure path. For other lazy routes, the `lazyWithRetry` wrapper with 3 retries provides adequate resilience. The preview is **reliable enough for testing** with these mitigations in place — the remaining risk is transient proxy hiccups on rarely-loaded lazy pages, which the retry logic handles.

