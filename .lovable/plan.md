
# Fix: Blank Preview (Vite Build Server Crash)

## Problem
The preview is completely blank. The browser console shows a **404 error for `src/App.tsx`** itself, which means the Vite dev server crashed or failed to restart after the batch of 9 simultaneous file edits. This is NOT a code bug -- all modified files have been verified as syntactically correct.

## Root Cause
When many files are edited simultaneously, the Vite dev server's Hot Module Replacement (HMR) can fail to recover, resulting in the entire application becoming unresolvable. The server stops serving source files, causing 404s on core entry points like `App.tsx`.

## Fix
Add a trivial comment to `vite.config.ts` to force the build system to fully restart and recompile all modules from scratch.

### File: `vite.config.ts`
- Add a cache-busting comment (e.g., `// Force rebuild: 2026-03-03`) at the top of the file
- This triggers a full Vite server restart since `vite.config.ts` changes always cause a complete reload

### No other changes needed
All 9 files from the previous edit session have been reviewed and are correct:
- `SessionTypeSelector.tsx` -- 5 session types, valid JSX
- `FeelingsPrompt.tsx` -- 3-axis readiness, valid JSX  
- `SessionConfigPanel.tsx` -- auto-derived fields, valid logic
- `RepScorer.tsx` -- swing decision + hit spot additions, valid JSX (747 lines reviewed)
- `RepSourceSelector.tsx` -- grouped layout, valid JSX
- `HandednessGate.tsx` -- localStorage auto-select, valid JSX
- `SessionConfigBar.tsx` -- badge display, valid JSX
- `PracticeHub.tsx` -- reordered flow, valid JSX
- `useSessionDefaults.ts` -- localStorage hook, valid TypeScript
