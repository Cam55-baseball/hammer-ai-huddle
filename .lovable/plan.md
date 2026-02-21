

# Fix: Remove manualChunks to Resolve Chunk Loading Order Crash

## Problem
The live site crashes with `Cannot read properties of undefined (reading 'forwardRef')` because the `manualChunks` configuration splits React (`vendor-react`) and UI libraries like Radix (`vendor-ui`) into separate chunks. The browser can load `vendor-ui` before `vendor-react` is ready, meaning React is `undefined` when Radix tries to call `React.forwardRef`.

## Root Cause
The `manualChunks` function in `vite.config.ts` forces React core into one chunk and all UI libraries (Radix, cmdk, vaul, sonner) into another. Vite/Rollup does not guarantee loading order between sibling chunks, so the UI chunk can execute before React is available.

## Fix

**File: `vite.config.ts`**

Remove the entire `manualChunks` configuration from `rollupOptions`. Let Vite handle code splitting automatically -- it understands dependency graphs and will ensure React loads before anything that depends on it.

The build section becomes:
```typescript
build: {
  chunkSizeWarningLimit: 1500,
},
```

## Why This Works
- Vite's default code splitting respects module dependency order
- React will always be loaded before any library that imports it
- The chunk sizes may be slightly different, but correctness is more important than manual optimization
- The `chunkSizeWarningLimit` is kept to suppress warnings for larger chunks

## After Implementation
You must **publish an update** for the fix to take effect on the live site. Then hard-refresh or open in incognito to verify.

