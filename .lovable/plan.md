

# Implementation Plan: Progress Photos, Onboarding, & Performance

## Batch 1: 12-Week Progress Photo Comparison System

### Current State
- `VaultProgressPhotosCard.tsx` already has a basic 12-week comparison section (lines 339-417) that finds a photo ~12 weeks apart and shows measurement deltas
- Photos stored in `vault_progress_photos` table with `photo_date`, `next_entry_date`, measurements, and `photo_urls` (paths in `vault-photos` bucket, which is private)
- `useVault.ts` saves photos with `next_entry_date` = +42 days
- No `cycle_week` field exists on the table

### Changes

**Database migration**: Add `cycle_week` column to `vault_progress_photos`:
```sql
ALTER TABLE vault_progress_photos ADD COLUMN IF NOT EXISTS cycle_week integer DEFAULT 0;
```

**`src/hooks/useVault.ts`** — In `saveProgressPhoto`:
- Auto-compute `cycle_week` by finding the user's earliest photo date and calculating weeks elapsed, snapping to nearest 6-week bucket (0, 6, 12, 18...)
- Store `cycle_week` on insert

**`src/components/vault/VaultProgressPhotosCard.tsx`** — Major enhancement:
- Replace the current basic 12-week comparison section with a richer system:
  - **12-Week Milestone Prompt**: When the latest photo's `cycle_week` is a multiple of 12, show a prominent banner: "View Your 12-Week Transformation"
  - **Side-by-side Comparison View**: Show Week 0 vs Week 12 photos (actual images from `vault-photos` bucket using signed URLs since bucket is private). Add a "Show Week 6" toggle to include a middle reference
  - **Full Timeline View**: New "View Full Timeline" button opens a dialog/drawer showing all photos in chronological order as a scrollable timeline. Each entry is tappable to expand. Include a "Compare" mode where user selects 2+ photos to view side-by-side with zoom
- **Edge case handling**: Assign `cycle_week` using closest-bucket logic (e.g., week 7 upload maps to cycle_week 6). Still generate comparisons when possible even with gaps

**New component: `src/components/vault/PhotoTimelineDialog.tsx`**:
- Full-screen dialog with scrollable chronological photo timeline
- Tap-to-expand any image
- Multi-select compare mode (select 2+ photos, view side-by-side)
- Zoom/pinch support via CSS `object-fit` + transform

---

## Batch 2: Start Here — Full Onboarding Optimization

### Current State
- `StartHereGuide.tsx` exists as a simple dialog with 5 clickable steps (Profile, Log Session, Game Plan, Calendar, Analytics)
- `TutorialButton.tsx` triggers `TutorialModal` from `DashboardLayout.tsx`
- `tutorial_completed` boolean on `profiles` table tracks completion
- `StartHereGuide` is NOT wired into the layout — only `TutorialModal` is used

### Changes

**Replace `TutorialModal` with `StartHereGuide`** in `DashboardLayout.tsx`:
- Import `StartHereGuide` instead of `TutorialModal`
- For new users (`!tutorial_completed`), auto-open `StartHereGuide` on first visit
- For returning users, skip — just show the "Start Here" button in header

**Rewrite `src/components/StartHereGuide.tsx`** as a multi-step onboarding flow:

**Step 1 — Welcome / App Purpose**:
- Icon-driven overview: "Track reps. Analyze performance. Develop like a pro."
- What it does / what problems it solves / expected results
- Visual-first, not text-heavy

**Step 2 — Sport & Profile Setup**:
- Sport selector (Baseball / Softball) — calls `dispatchSportChange`
- Position multi-select
- Age / Level of play dropdown
- Optional goals text input
- Saves to `profiles` + `athlete_mpi_settings`

**Step 3 — How to Use (Core Actions)**:
- Icon cards for: Log Reps, Upload Video, Tag Reps, View Analytics, Use Vault
- Brief one-liner per card, visual-first

**Step 4 — First Action Prompt**:
- Two prominent CTA buttons: "Log First Practice" (→ /practice) or "Upload First Video" (→ /practice with video tab)
- No dead-end — must pick one

**Step 5 — Persistent Help**:
- "Need Help?" button visible on every step, links to help desk / floating chat
- On completion, mark `tutorial_completed = true` and `onboarding_completed = true`

---

## Batch 3: Processing Speed Optimization

### Current State
- No `staleTime` on most queries (only 3 files use it)
- No optimistic updates on rep logging
- No lazy loading for analytics components

### Changes

**`src/App.tsx`** — Configure React Query defaults:
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,     // 30s default
      gcTime: 5 * 60_000,    // 5 min cache
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Lazy-load heavy analytics pages** in `App.tsx`:
- Wrap `ProgressDashboard`, `HeatMapDashboard`, and analytics-heavy components in `React.lazy()` + `Suspense`

**`src/hooks/useRecentSessions.ts`** — Add `staleTime: 60_000` to prevent refetch spam

**`src/components/practice/RepScorer.tsx`** — Optimistic rep save:
- Show instant confirmation toast on save click before awaiting DB response
- Only show error if DB write fails

**`src/pages/PracticeHub.tsx`** — Add loading skeleton:
- Show skeleton cards for session list while data loads
- Prioritize visible UI elements first

**Video upload UX** in relevant upload components:
- Start upload immediately in background
- Show progress bar, don't block user from continuing
- These patterns already partially exist; ensure consistency

---

## Summary of All Files

| File | Change |
|------|--------|
| **Database** | Add `cycle_week` column to `vault_progress_photos` |
| `src/hooks/useVault.ts` | Auto-compute cycle_week on save, signed URL helper |
| `src/components/vault/VaultProgressPhotosCard.tsx` | 12-week milestone prompt, photo display, timeline button |
| `src/components/vault/PhotoTimelineDialog.tsx` | **NEW** — Full timeline + compare mode |
| `src/components/StartHereGuide.tsx` | Complete rewrite as multi-step onboarding |
| `src/components/DashboardLayout.tsx` | Wire StartHereGuide, auto-open for new users |
| `src/App.tsx` | Query defaults, lazy loading |
| `src/hooks/useRecentSessions.ts` | Add staleTime |
| `src/components/practice/RepScorer.tsx` | Optimistic save feedback |

