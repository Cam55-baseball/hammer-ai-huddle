

# Fix: Production Build Failure

## Root Cause

The project has **5141 modules** with **no code splitting configuration**. This produces JS chunks well over 500KB, triggering Vite's chunk size warnings on stderr. The deployment pipeline interprets stderr output as a build failure, causing the "Publishing failed" error.

Additionally, several test-only packages (`@playwright/test`, `vitest`, `jsdom`, `@testing-library/*`, `baseline-browser-mapping`) are listed in `dependencies` instead of `devDependencies`, bloating the install step unnecessarily.

## Changes

### 1. Add Code Splitting and Suppress Chunk Warnings (vite.config.ts)

Add `build` configuration with:
- **`chunkSizeWarningLimit: 1500`** - Raises the threshold to prevent warnings from being emitted to stderr
- **`rollupOptions.output.manualChunks`** - Splits the monolithic bundle into logical vendor chunks:
  - `vendor-react`: react, react-dom, react-router-dom
  - `vendor-ui`: All @radix-ui packages, class-variance-authority, tailwind-merge, clsx, cmdk, vaul, sonner
  - `vendor-charts`: recharts
  - `vendor-motion`: framer-motion
  - `vendor-i18n`: i18next, react-i18next, i18next-browser-languagedetector
  - `vendor-supabase`: @supabase/supabase-js
  - `vendor-query`: @tanstack/react-query
  - `vendor-fabric`: fabric (large canvas library, only used in 2 files)
  - `vendor-date`: date-fns
  - `vendor-dnd`: @dnd-kit packages

### 2. Clean Up Dependencies (package.json)

Move test-only packages from `dependencies` to `devDependencies`:
- `@playwright/test` (largest offender - downloads browser binaries)
- `vitest`
- `jsdom`
- `@testing-library/jest-dom`
- `@testing-library/react`

Remove from direct dependencies entirely:
- `baseline-browser-mapping` (transitive dependency of `browserslist`, not directly used)

### 3. Update package-lock.json

Regenerate the lock file to reflect the dependency changes cleanly.

## Files Modified

| File | Change |
|------|--------|
| `vite.config.ts` | Add `build.chunkSizeWarningLimit` and `rollupOptions.output.manualChunks` |
| `package.json` | Move test deps to `devDependencies`, remove `baseline-browser-mapping` |
| `package-lock.json` | Regenerated to match dependency changes |

## Why This Fixes the Build

- Splitting chunks keeps individual files under the warning threshold, preventing stderr output
- Removing test dependencies from production reduces install size by hundreds of MB
- The deployment pipeline no longer sees stderr warnings and completes successfully

## No Impact on Functionality

- Code splitting only affects how JS is packaged for delivery (multiple smaller files vs one large file)
- The app loads identically -- the browser fetches the chunks it needs
- All existing features, components, and pages work exactly the same

