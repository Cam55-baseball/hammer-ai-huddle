

# Royal Timing — Storage, Library, Sharing & Messaging System

## Overview

Six changes: (1) persist videos to cloud storage, (2) session library UI, (3) sharing system, (4) session messaging thread, (5) Ask Hammer context expansion, (6) UI text fix.

---

## 1. Database Migration

### Alter `royal_timing_sessions`
- Add `video_1_path text`, `video_2_path text` columns (storage file paths, replacing the `video_urls` array for new sessions)

### New table: `royal_timing_shares`
```sql
CREATE TABLE public.royal_timing_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES royal_timing_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: sender or recipient can read; sender can insert; linked coach/player validation
```

### New table: `royal_timing_messages`
```sql
CREATE TABLE public.royal_timing_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES royal_timing_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- RLS: sender or session owner or share recipient can read/insert
-- Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE public.royal_timing_messages;
```

### Storage
Use the existing `videos` bucket. Store at path `{user_id}/royal-timing/{session_id}/{filename}`.

---

## 2. Video Upload to Cloud Storage

**File: `src/components/royal-timing/RoyalTimingModule.tsx`**

On submit:
1. Upload video files (stored as state `File` objects, not just blob URLs) to `videos` bucket at `{user_id}/royal-timing/{session_id}/{slot}.mp4`
2. Get public URLs
3. Save paths in `video_1_path` / `video_2_path` columns
4. Keep local blob URLs for playback during the session; store `File` references alongside

Refactor `handleFileSelect` to store the `File` object in addition to the blob URL.

---

## 3. Session Library

**New file: `src/components/royal-timing/RoyalTimingLibrary.tsx`**

- Fetches all `royal_timing_sessions` for the user, ordered by `created_at desc`
- Displays: date, subject, sport, video count
- Actions: Open (loads session into the editor), Delete, Duplicate
- Collapsible section at the top of the Royal Timing page

**New file: `src/hooks/useRoyalTimingSessions.ts`**
- Query hook for fetching user's sessions
- Delete mutation
- Duplicate mutation (insert copy with new id)

**Update: `src/components/royal-timing/RoyalTimingModule.tsx`**
- Add "My Sessions" button/tab at the top
- When loading a session: populate video URLs (from storage signed URLs), subject, findings, AI response, timer data
- Add session state management (current session id, editing vs new)

---

## 4. Sharing System

**New file: `src/components/royal-timing/ShareSessionDialog.tsx`**
- Modal triggered by "Share Session" button (visible after session is saved)
- Recipient picker: queries `scout_follows` for linked coaches/players (accepted status)
- Optional message field
- Inserts into `royal_timing_shares`

**New file: `src/components/royal-timing/SharedWithMeSection.tsx`**
- Section in Royal Timing Library: "Shared With Me"
- Queries `royal_timing_shares` where `recipient_id = auth.uid()`
- Joins session data + sender profile
- Opens full session (read-only videos + notes + timer data)
- Shows sender's message

**RLS for shares:**
- Sender can INSERT (with check: sender is linked to recipient via `scout_follows`)
- Sender and recipient can SELECT their own shares
- Only session owner can DELETE the original session

---

## 5. Session Messaging Thread

**New file: `src/components/royal-timing/SessionMessages.tsx`**
- Chat-style thread inside a shared/owned session
- Realtime subscription to `royal_timing_messages` filtered by `session_id`
- Both session owner and share recipients can post messages
- Messages persist and load with session

**Realtime**: Subscribe to `royal_timing_messages` via Supabase Realtime for live updates.

---

## 6. Ask Hammer Context Expansion

**Update: `src/components/royal-timing/RoyalTimingModule.tsx`**

When Ask Hammer is triggered on a shared session, include:
- Original session inputs (subject, findings)
- All messages from `royal_timing_messages` for this session
- Timer data
- Shared message context

Pass expanded `royalTimingContext` to `ai-chat` edge function.

---

## 7. UI Text Fix

**File: `src/components/royal-timing/RoyalTimingModule.tsx`** line 317

Change:
```
"Get elite-level AI insight on your timing study"
```
To:
```
"Get elite-level insight on your timing study"
```

---

## Files Summary

| File | Change |
|------|--------|
| Migration SQL | Alter `royal_timing_sessions`, create `royal_timing_shares`, `royal_timing_messages` |
| `src/components/royal-timing/RoyalTimingModule.tsx` | Video file upload to storage, session load/save, Ask Hammer context, UI text fix |
| `src/components/royal-timing/RoyalTimingLibrary.tsx` | New — session list with open/delete/duplicate |
| `src/components/royal-timing/ShareSessionDialog.tsx` | New — share session to linked coach/player |
| `src/components/royal-timing/SharedWithMeSection.tsx` | New — view sessions shared with you |
| `src/components/royal-timing/SessionMessages.tsx` | New — realtime chat thread per session |
| `src/hooks/useRoyalTimingSessions.ts` | New — query/mutation hooks for sessions |
| `src/pages/RoyalTiming.tsx` | Minor layout update to include library |

