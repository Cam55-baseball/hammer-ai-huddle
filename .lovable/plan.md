

# Fix Production Build Failure

## Problem
The production build fails after the "computing gzip size" phase, during Workbox service worker generation. The glob pattern `**/*.{js,css,html,ico,png,svg,woff2}` is pulling in large image assets (multiple 70-150KB JPGs), causing the precache manifest to exceed size limits or timeout.

## Solution
Two changes to `vite.config.ts`:

1. **Narrow `globPatterns`** from `**/*.{js,css,html,ico,png,svg,woff2}` to `**/*.{js,css,html}` -- only precache the app shell (HTML, JS, CSS). Images and fonts will still load normally, they just won't be cached offline on first visit.

2. **Add `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024`** (3MB) as a safety net so any unexpectedly large chunk is skipped rather than crashing the build.

## What This Means for Users
- No features are removed -- the app works exactly the same
- Offline support still works for the core app (pages, styles, logic)
- Images load from the network as usual (they were never reliably cached offline anyway due to this build failure)
- The live site will finally update with all recent changes

## File Changed
`vite.config.ts` -- two lines in the workbox config section

