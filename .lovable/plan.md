

# Fix: Preview Not Loading

## Diagnosis

The console logs show "Dynamic import failed (attempt 1/3)" errors, which are transient module loading failures during hot module reload after recent code changes. The retry logic (3 attempts) usually recovers, but sometimes the dev server gets into a stale state.

All recently edited files (`TeeDepthGrid.tsx`, `PitchLocationGrid.tsx`, `RepSourceSelector.tsx`, `RepScorer.tsx`, `SessionConfigPanel.tsx`, `ExecutionSlider.tsx`) are syntactically valid with no import/export mismatches. The dashboard page and its imports are also clean.

## Root Cause

This is a **stale module cache issue** from the Vite dev server after multiple rapid file changes. It is not a code bug.

## Fix

**No code changes needed.** A simple page refresh in the preview should resolve this. If you're still seeing a blank preview:

1. Try clicking the **Refresh button** (the circular arrow icon in the dashboard header)
2. If that doesn't work, try appending `?_cb=1` to the preview URL to bust the cache

If the issue persists after refresh, I can add a small no-op comment to `src/pages/Dashboard.tsx` to force a fresh rebuild of the module graph.

