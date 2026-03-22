

# Royal Timing — Save Button & Message Deletion

## 1. Add "Save Session" Button at Bottom

**File: `src/components/royal-timing/RoyalTimingModule.tsx`**

Currently, the only save mechanism is the "Submit Study" button inside the Study Notes card (line 509), which requires subject/findings text. Users want a standalone save button at the very bottom that saves the full session including videos, even without notes.

- Add a prominent `Save Session` button **after** the Study Notes card (after line 522, before the closing `</div>`)
- This button calls a new `handleSaveSession` function that:
  - Creates/updates the `royal_timing_sessions` row with current video files, timer data, sport, subject, findings
  - Uploads video files to storage (reuses `uploadVideo`)
  - Sets `currentSessionId` on success
  - Does NOT require subject/findings to be filled (unlike Submit Study which needs at least one)
  - Disabled when `isReadOnly` or no videos loaded
- The existing "Submit Study" button stays for AI analysis flow; the new button is purely for saving

## 2. Message Deletion in Session Discussion

**File: `src/components/royal-timing/SessionMessages.tsx`**

- Add a small trash icon button on messages sent by the current user (`isMe`)
- On click, delete the message via `supabase.from('royal_timing_messages').delete().eq('id', msg.id)`
- Remove the message from local state on success
- Add confirmation or just instant delete with toast

**Database migration**: Add a DELETE RLS policy on `royal_timing_messages` allowing users to delete their own messages:

```sql
CREATE POLICY "Users can delete own messages"
  ON public.royal_timing_messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);
```

Also subscribe to DELETE events in the realtime channel so other participants see removals.

## Files

| File | Change |
|------|--------|
| `src/components/royal-timing/RoyalTimingModule.tsx` | Add Save Session button after Study Notes |
| `src/components/royal-timing/SessionMessages.tsx` | Add delete button on own messages, handle realtime DELETE |
| Migration | Add DELETE RLS policy on `royal_timing_messages` |

