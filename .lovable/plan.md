

# Emergency Fix: Remove VitePWA Entirely to Restore Live Site

## Problem
The published site at `hammers-modality.lovable.app` is still showing a blank white screen. Fetching the live HTML confirms the `<head>` section and all `<script>` tags are being stripped during the production build. The VitePWA plugin -- even when included unconditionally -- is still corrupting the output.

## Root Cause
The `vite-plugin-pwa` package is interfering with the production HTML generation. This may be a version compatibility issue or a conflict with the current Vite/build configuration. Regardless of how it is configured (conditional or unconditional), it is producing a broken `index.html` in production.

## Fix (single file change)

**File: `vite.config.ts`**

1. Remove the `import { VitePWA } from 'vite-plugin-pwa'` line
2. Remove the entire `VitePWA({...})` block from the plugins array
3. Keep everything else (manual chunks, aliases, etc.) unchanged

The plugins array becomes:
```typescript
plugins: [
  react(),
  mode === "development" && componentTagger(),
].filter(Boolean),
```

## What This Means
- The production build will produce a correct `index.html` with all content intact
- The live site will load and render properly after publishing
- PWA features (offline caching, install prompt) will be temporarily unavailable
- The `vite-plugin-pwa` dependency remains installed and can be investigated/re-added later once the site is confirmed working

## After Implementation
You **must publish an update** for the fix to take effect on the live site. The deployment typically takes 1-2 minutes.

## Future PWA Re-enablement
Once the site is confirmed working, we can investigate the VitePWA version compatibility and re-add it with a known-working configuration. This should be done as a separate step after the site is stable.

