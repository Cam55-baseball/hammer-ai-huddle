

# Fix Blank Screen and Re-add PWA with Corrected Configuration

## Problem
The VitePWA plugin was previously wrapped in a `mode === "production" &&` conditional, which likely caused it to return `false` in a way that corrupted the HTML output during production builds. The plugin has been removed and needs to be re-added safely.

## Root Cause of Original Issue
The pattern `mode === "production" && VitePWA({...})` is problematic. When the condition is false, it produces `false` in the plugins array (handled by `.filter(Boolean)`), but when true, VitePWA may initialize differently than expected when loaded conditionally. The official docs show VitePWA should always be included in the plugins array unconditionally -- it only generates service worker assets during the build step regardless.

## Fix (single file change)

**File: `vite.config.ts`**

1. Re-add the `VitePWA` import
2. Add `VitePWA()` to the plugins array **unconditionally** (not wrapped in a mode check)
3. Keep the same manifest and workbox caching config as before

```typescript
import { VitePWA } from 'vite-plugin-pwa';

// In plugins array:
plugins: [
  react(),
  mode === "development" && componentTagger(),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.png', 'robots.txt'],
    manifest: {
      name: 'Hammers Modality - Elite Training',
      short_name: 'Hammers',
      description: 'Elite baseball & softball training with AI analysis',
      theme_color: '#000000',
      background_color: '#ffffff',
      display: 'standalone',
      icons: [
        {
          src: '/favicon.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    workbox: {
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*\/(thumbnails|avatars)\/.*/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'media-cache',
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*\/videos\/.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'video-cache',
            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
          },
        },
      ],
    },
  }),
].filter(Boolean),
```

## Why This Fixes It
- VitePWA is no longer conditionally loaded -- it runs in all modes, which is how the official docs recommend using it
- In development, it simply does nothing significant (no service worker is registered)
- In production, it correctly processes `index.html` to inject the manifest link and generates the service worker
- The `index.html` `<head>` content will no longer be stripped

## After Implementation
You will need to **publish an update** for the fix to take effect on the live site.

