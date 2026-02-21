

# Fix: Force Fresh Production Build to Replace Corrupted HTML

## Problem Identified

Testing revealed that:
- **Preview (dev server)** works perfectly on both desktop and mobile, no errors
- **Live published site** (hammers-modality.lovable.app) shows a **blank white page**
- The HTML served by the live site is completely stripped: `<html lang="en"><body><div id="root"></div></body></html>`
- The entire `<head>` section, all `<script>` tags, all `<meta>` tags, and the cache cleanup script are **missing** from the production output

This means the currently deployed production build artifact contains a corrupted `index.html` from when the VitePWA plugin was still active. Our cache cleanup script was never part of what's deployed.

## Root Cause

The production site is still serving a build that was created when the VitePWA plugin was corrupting the HTML output. Subsequent publishes may not have triggered a full rebuild, or the CDN is caching the old corrupted HTML.

## Solution

Force the build system to produce a new, clean output by making a small change that triggers a full rebuild:

1. **Add a cache-busting HTML comment** to `index.html` (e.g., `<!-- build: 2026-02-21 -->`) to ensure the file is treated as changed
2. **Publish the update** -- this should trigger a complete rebuild with the correct, uncorrupted `index.html`

## Technical Details

**File: `index.html`**
- Add an HTML comment inside `<head>` to force the build system to recognize the file has changed:
  ```html
  <!-- Force rebuild: 2026-02-21 -->
  ```

## Verification Steps

After publishing:
1. Visit https://hammers-modality.lovable.app in an incognito window
2. View page source to confirm all `<head>` content, scripts, and the cache cleanup code are present
3. Test on mobile
4. Do a hard refresh (`Ctrl+Shift+R`) in your regular browser to bypass any browser-level HTTP caching of the old broken HTML

## Why This Should Work

The source `index.html` is correct and complete. The Vite config is clean (no PWA plugin). The only issue is that the deployed build artifact is stale. A fresh publish with a file change will force a complete rebuild and CDN cache invalidation.

