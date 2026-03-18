

# Platform Enhancement Plan: Photo Export, Quick Add Fix, Progress Dashboard Intelligence

## 1. Exportable 12-Week Comparison + Advanced Photo Viewing

### A. Export Comparison

**`src/components/vault/VaultProgressPhotosCard.tsx`** — Add an "Export Comparison" button next to the 12-Week Comparison header (line ~406). Two export options:

- **Image Export**: Use HTML Canvas API to render the `ComparisonPhotoGrid` (Week 0, optional Week 6, Week 12 with date stamps) as a downloadable PNG. Create a utility `src/utils/generateComparisonImage.ts` that draws photos + labels onto a canvas and triggers download.
- **PDF Export**: Create `src/utils/generateComparisonPdf.ts` — use the same canvas approach but wrap in a simple blob-based PDF (or use a lightweight approach with `jsPDF` if acceptable, though it was previously removed). Alternative: generate a clean HTML layout rendered to canvas, then wrap as a single-page PDF download.

Both exports include: date stamps per photo, measurement deltas, clean white background, no UI chrome.

### B. Enhanced Photo Timeline Dialog

**`src/components/vault/PhotoTimelineDialog.tsx`** — Major upgrade:

- **Full-screen mode**: Add a maximize button that expands the dialog to `max-w-full h-screen`
- **Swipe navigation**: Add left/right keyboard arrow support and touch swipe (CSS scroll-snap or simple state-based navigation) when viewing a single zoomed photo
- **Multi-compare upgrade**: Currently supports 2-4 photos. Keep this, but add measurement delta badges between compared photos
- **Filters**: Add filter bar at top with:
  - Date range (simple month/year selects)
  - Cycle week dropdown (0, 6, 12, 18...)
  - These filter the `photos` array client-side before rendering

### C. Photo Access from Progress Dashboard

**`src/pages/ProgressDashboard.tsx`** — Add a "Progress Photos" card (new row) that:
- Shows latest photo thumbnail with cycle week badge
- "View Timeline" button opens `PhotoTimelineDialog`
- Requires fetching photos + signed URLs via the existing vault hook

---

## 2. Quick Add Bug Fix (Game Plan)

### Root Cause Analysis

The `addToToday()` in `useCustomActivities.ts` (line 340) does an upsert followed by `fetchTodayLogs()`. The `QuickAddFavoritesDrawer` calls `addToToday` → on success calls `refetch()` from `useGamePlan`. The issue is likely a race condition: `fetchTodayLogs()` and the GamePlan `refetch()` run concurrently, and the GamePlan task list may rebuild before the log data is fresh.

### Fix (`src/hooks/useCustomActivities.ts`)

- Add optimistic update: immediately append the new log to `todayLogs` state before the DB call completes
- On error, roll back the optimistic entry and show error toast
- Add retry logic (1 silent retry on network failure)

### Fix (`src/components/GamePlanCard.tsx`)

- In the `onAddToToday` handler (line ~2145), add a small delay before `refetch()` or better yet, `await` the `addToToday` call fully (which already awaits `fetchTodayLogs`), then call `refetch()`
- Add `toast` with undo action on failure

### Fix (`src/components/custom-activities/QuickAddFavoritesDrawer.tsx`)

- Disable the add button immediately on click (prevent double-tap)
- Show inline loading state per item being added

---

## 3. Progress Dashboard — "Ask Hammer" AI Chat

### New Component: `src/components/analytics/AskHammerPanel.tsx`

A collapsible chat panel embedded in the Progress Dashboard:
- Toggle button with Hammer branding (e.g., `MessageCircle` icon + "Ask Hammer")
- When opened, shows a chat interface (input + message list)
- Messages rendered with `react-markdown` for AI responses

### Backend Enhancement: `supabase/functions/ai-chat/index.ts`

Enhance the existing `ai-chat` edge function:
- Accept an optional `dashboardContext` field containing the user's current MPI scores, trends, and recent session summaries
- Enrich the system prompt with this data so AI responses are grounded in the athlete's actual performance
- Keep the existing auth + coaching philosophy logic

### Frontend Integration

**`src/pages/ProgressDashboard.tsx`**:
- Import and render `AskHammerPanel` after the existing analytics cards
- Pass user's MPI data, recent sessions, and sport context to the panel
- The panel calls `ai-chat` edge function with `dashboardContext` containing serialized analytics data

### Chat UX
- Streaming responses using the existing `ai-chat` function (convert to streaming by adding `stream: true` to the Lovable AI gateway call)
- Pre-populated suggestion chips: "What are my weaknesses?", "How's my consistency?", "What should I focus on?"
- Messages are session-only (not persisted to DB) — lightweight, no extra tables needed

---

## Files Summary

| File | Change |
|------|--------|
| `src/utils/generateComparisonImage.ts` | **NEW** — Canvas-based comparison image export |
| `src/utils/generateComparisonPdf.ts` | **NEW** — PDF comparison export |
| `src/components/vault/VaultProgressPhotosCard.tsx` | Add export button for 12-week comparison |
| `src/components/vault/PhotoTimelineDialog.tsx` | Full-screen, swipe, filters, enhanced compare |
| `src/pages/ProgressDashboard.tsx` | Add progress photos card + Ask Hammer panel |
| `src/hooks/useCustomActivities.ts` | Optimistic updates + retry for addToToday |
| `src/components/GamePlanCard.tsx` | Fix race condition in Quick Add handler |
| `src/components/custom-activities/QuickAddFavoritesDrawer.tsx` | Prevent double-tap, loading state |
| `src/components/analytics/AskHammerPanel.tsx` | **NEW** — AI chat panel for dashboard |
| `supabase/functions/ai-chat/index.ts` | Add dashboardContext support + streaming |

