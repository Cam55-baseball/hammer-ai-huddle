

# Fix PWA Build Error

## Problem
The production build is failing, likely during the VitePWA service worker generation step. The actual error is truncated in the logs, but the app works fine in development preview.

## Solution
Restrict VitePWA to production builds only (similar to how `componentTagger` is restricted to development). This prevents the plugin from interfering with development builds and isolates any potential issues.

## Changes

### 1. Update `vite.config.ts`
- Change `VitePWA(...)` to `mode === 'production' && VitePWA(...)` so it only runs during production builds
- The `.filter(Boolean)` at the end already handles falsy plugin entries

### 2. No other file changes needed
- `registerSW.ts`, `PWAUpdatePrompt.tsx`, `manifest.json`, `index.html`, `main.tsx`, and `App.tsx` are all correct as-is
- The service worker registration in `registerSW.ts` already gracefully handles the case where `/sw.js` doesn't exist (the `catch` on `wb.register()`)

## Technical Details

**vite.config.ts** change (line 16):
```typescript
// Before:
VitePWA({

// After:
mode === 'production' && VitePWA({
```

This ensures the plugin only generates the service worker during production builds, avoiding any dev-mode conflicts. The existing `.filter(Boolean)` on the plugins array will strip the `false` value in development.

