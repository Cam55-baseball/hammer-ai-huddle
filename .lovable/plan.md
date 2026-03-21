

# Royal Timing — Video-Based Timing Audit Module

## Overview

New premium module at `/royal-timing`, locked by default, auto-unlocked with any subscription. Features single or dual video analysis with independent controls, precision timing (0.01s), sync/unsync capability, AI-powered insights via the existing `ai-chat` edge function, and data persistence to feed analytics.

## Architecture

Leverages existing patterns heavily:
- **Video controls**: Extend from `VideoComparisonView.tsx` and `useVideoSync.ts` (already have dual-video sync, frame stepping, speed control, screenshot capture)
- **Subscription gating**: Use `SubscriptionGate` with `requiredAccess="any"`
- **AI integration**: Use existing `ai-chat` edge function with a new `royalTimingContext` field
- **Data storage**: New `royal_timing_sessions` table

## Database Migration

```sql
CREATE TABLE public.royal_timing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_reason text,
  findings text,
  ai_analysis jsonb,
  timer_data jsonb,
  video_urls text[],
  sport text DEFAULT 'baseball',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.royal_timing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own timing sessions"
  ON public.royal_timing_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## New Files

### `src/pages/RoyalTiming.tsx`
- Page wrapper with `DashboardLayout` + `SubscriptionGate requiredAccess="any"`
- Renders `RoyalTimingModule`

### `src/components/royal-timing/RoyalTimingModule.tsx`
Main component with three sections:

**A. Video Section**
- Mode selector: Single Video / Comparison (Dual Video)
- Upload area for 1 or 2 videos (drag-drop, file picker, remove/replace)
- Videos persist via local state + save to `royal_timing_sessions.video_urls` on submit

**B. Video Players + Controls**
- Each video gets independent controls: Play/Pause, Rewind, Skip, Speed (0.25x–2x), Frame step (±1/30s), Timeline scrubber, Screenshot capture
- In dual mode: Master control bar that operates BOTH videos simultaneously (play/pause, rewind, skip, speed, frame step) — does NOT reset/realign positions, respects user-adjusted offsets
- Built on top of existing `useVideoSync` hook patterns but with `syncEnabled` off by default (user toggles sync on/off)

**C. Timing System**
- Per-video stopwatch (Start/Stop/Reset/Clear) with 0.01s precision display
- Sync/Unsync toggle per timer:
  - **Synced**: Timer tracks video `currentTime` including slow-motion and frame stepping
  - **Unsynced**: Timer runs independently via `requestAnimationFrame` or `performance.now()`
- In dual mode: Master timer that can sync with both videos
- All timer data captured as JSON on submit

**D. Input + AI Section**
- "Subject at Hand?" text input
- "Ask Hammer" toggle — when enabled, on submit AI analyzes input using `ai-chat` edge function with `royalTimingContext` (subject, findings, sport, timer data)
- "Findings after studying?" text input
- Submit button: saves session to `royal_timing_sessions`, triggers AI analysis, stores response

### `src/hooks/useRoyalTimingTimer.ts`
Custom hook for precision timing:
- `start()`, `stop()`, `reset()`, `clear()`
- `syncToVideo(videoRef)` — reads `video.currentTime` on each `requestAnimationFrame`
- `unsync()` — switches to independent `performance.now()` based timing
- Returns `{ elapsed, isRunning, isSynced }`
- Display format: `MM:SS.cc` (centiseconds)

## Existing File Changes

| File | Change |
|------|--------|
| `src/App.tsx` | Add lazy import + route `/royal-timing` |
| `src/components/AppSidebar.tsx` | Add "Royal Timing" to Training Modules section with `Crown` icon, visible when any subscription is active |
| `supabase/functions/ai-chat/index.ts` | Extract `royalTimingContext` from request body, add to system prompt when present |

## AI Integration Details

When "Ask Hammer" is enabled and user submits:
- Frontend calls `ai-chat` with `royalTimingContext: { subject, findings, sport, timerData }`
- Edge function adds context to system prompt: timing audit analysis, sport-specific (baseball/softball), elite-level insight
- Response stored in `royal_timing_sessions.ai_analysis`
- Data feeds into the existing analytics pipeline via the 6-week analysis queries

## Sidebar Placement

Add between existing training modules, using `Crown` icon from lucide-react. Only visible when user has any active subscription (same pattern as other gated modules).

