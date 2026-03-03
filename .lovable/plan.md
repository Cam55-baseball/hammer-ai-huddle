

# Fix: React forwardRef Error (Broken Vite Dependency Cache)

## Problem
The console shows: `Cannot read properties of undefined (reading 'forwardRef')` in `vendor-ui-C68qUwAh.js`. This means React is `undefined` when the pre-bundled UI vendor chunk tries to use `React.forwardRef()`. The Vite dependency optimizer cache (`.vite/deps/`) is corrupted.

## Why Previous Fixes Didn't Work
Adding comments to `vite.config.ts` and `main.tsx` does not force Vite to **re-optimize dependencies**. Vite only re-runs dependency pre-bundling when:
- The dependency list changes
- `optimizeDeps` configuration changes
- The lockfile changes

## Fix

### `vite.config.ts`
Add an `optimizeDeps.force: true` setting to force Vite to re-bundle all dependencies from scratch on the next server start. This directly addresses the corrupted `vendor-ui` chunk.

```ts
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  optimizeDeps: {
    force: true,
  },
  plugins: [
    // ... existing plugins unchanged
  ],
  // ... rest unchanged
}));
```

The `optimizeDeps.force: true` option tells Vite to ignore its cached pre-bundled dependencies and re-optimize everything. This will rebuild the `vendor-ui` chunk with proper React references.

### After Preview Recovers
Once confirmed working, the `force: true` can optionally be removed (it adds a small startup cost), but it's harmless to leave in place.

### No other changes needed
All application code is correct. This is purely a build tooling cache issue.
