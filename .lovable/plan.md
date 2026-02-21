

# Re-add PWA: Auto-Updates + Offline Support (Safe Manual Registration)

## Overview
Re-introduce PWA features (offline caching and auto-update prompts) using `vite-plugin-pwa` with manual service worker registration to avoid the previous `index.html` corruption issue.

## Changes

### 1. New file: `public/manifest.json`
- App name "Hammers Modality", short name "Hammers"
- `display: "standalone"`, `start_url: "/dashboard"`
- Theme color `#000000`, background color `#000000`
- Icon entries pointing to existing `/favicon.png` (192x192 and 512x512)

### 2. Update `index.html`
- Add `<link rel="manifest" href="/manifest.json">` in the head
- Remove the old cleanup script (lines 37-69) since we are now re-registering a new, proper service worker -- the new SW will naturally replace any stale ones

### 3. Update `vite.config.ts`
- Import `VitePWA` from `vite-plugin-pwa`
- Add it to the plugins array with these critical safety settings:
  - `injectRegister: null` -- prevents the plugin from modifying `index.html` (this was the root cause of the previous corruption)
  - `manifest: false` -- we provide our own `manifest.json` manually
  - `registerType: 'prompt'` -- show update notification instead of auto-reload
  - Workbox config: cache JS/CSS/HTML/images, `navigateFallback: 'index.html'`, deny `/~oauth` routes
  - Runtime caching for Google Fonts

### 4. New file: `src/registerSW.ts`
- Manually register `/sw.js` using the `workbox-window` `Workbox` class
- Listen for the `waiting` event (new version available)
- Dispatch a custom `sw-update-available` event on `window` so the UI can react
- Store a reference to the waiting service worker for `skipWaiting` calls

### 5. New file: `src/components/PWAUpdatePrompt.tsx`
- Listens for the `sw-update-available` custom event
- Shows a toast notification: "A new version is available. Tap to update."
- On click, sends `skipWaiting` message to the waiting SW and reloads the page

### 6. Update `src/main.tsx`
- Import and call `registerSW()` after rendering

### 7. Update `src/App.tsx`
- Import and add `<PWAUpdatePrompt />` inside the component tree (inside `ErrorBoundary`)

## Why This Is Safe
The previous crash happened because `vite-plugin-pwa` injected registration code into the built `index.html`, which corrupted the `<head>` and `<script>` tags. By setting `injectRegister: null` and `manifest: false`, the plugin only generates the service worker file -- it never touches `index.html`. We handle registration and manifest linking ourselves.

## Impact on Existing Users
- Home-screen users: The new service worker will automatically take over. The update prompt will appear when a new version is ready.
- First-time visitors: They get offline support and installability immediately.
- The `OfflineIndicator` component continues to work as-is (it uses `navigator.onLine`, independent of the service worker).

