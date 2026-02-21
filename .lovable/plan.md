

# Fix: Blank White Screen on Published Site

## Problem
The live site at `hammers-modality.lovable.app` serves an empty HTML shell with no `<head>`, no scripts, and no styles -- resulting in a blank white screen. This has been confirmed by fetching the live HTML.

## Root Cause
The `VitePWA` plugin in `vite.config.ts` (line 16) is the only plugin enabled exclusively in production mode. It is corrupting the `index.html` during the build process, stripping out all `<head>` content and `<script>` tags.

## Fix
**File: `vite.config.ts`**

Remove the VitePWA plugin from the plugins array and its import. The plugins array becomes:

```typescript
plugins: [
  react(),
  mode === "development" && componentTagger(),
].filter(Boolean),
```

Also remove line 5: `import { VitePWA } from 'vite-plugin-pwa';`

## What This Means
- The production build will produce a proper `index.html` with all content intact
- The live site will load and render correctly
- PWA features (offline caching, home screen install) will be temporarily unavailable
- PWA can be re-added later with a corrected configuration once the site is confirmed working
- The `vite-plugin-pwa` dependency stays installed and can be re-enabled later

## After Implementation
You will need to **publish an update** for the fix to take effect on the live site.

