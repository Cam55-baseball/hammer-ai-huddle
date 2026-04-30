## Allow deleting coach-sent activities from the Game Plan + notify the coach

Currently the "Delete Activity" button in `CustomActivityDetailDialog` is shown only for self-created standalone custom activity templates — coach-sent activities (those a player accepted from a coach) are excluded. This plan extends deletion to coach-sent activities and notifies the original sender (coach) when the player deletes the activity.

### Behavior

- The "Delete Activity" button now appears for coach-sent activities on the Game Plan as well (still hidden for folder-snapshot items).
- Confirmation dialog text adapts: when the activity was sent by a coach, mention that the coach who sent it will be notified that you removed it from your Game Plan.
- On confirm:
  1. Soft-delete the player-owned `custom_activity_templates` row (existing flow → goes to Recently Deleted, restorable for 30 days).
  2. If the activity originated from a coach (i.e. there is a `sent_activity_templates` row with `accepted_template_id = <this template id>`), insert a row into `coach_notifications` for the original sender so they see it in their notifications panel.
  3. Toast still offers Undo (re-clears `deleted_at`); if Undo is used we do NOT delete the notification — the coach already saw it. Instead we insert a follow-up "restored" notification so history is accurate.

### Notification content

- `coach_user_id` = original `sent_activity_templates.sender_id`
- `sender_user_id` = the player (`auth.uid()`)
- `notification_type` = `'activity_removed'` (new value, additive — no enum on the column)
- `title` = "{Player full_name} removed an activity from their Game Plan"
- `message` = "{Activity title} • Removed on {locale date+time}"
- `template_snapshot` = the player's current template JSON (so the coach sees what was removed even after deletion)

For the Undo case we insert a second row with `notification_type = 'activity_restored'` and similar title/message.

### Technical details

Files to change:

1. **`src/components/GamePlanCard.tsx`** (the existing `onDeleteActivity` wiring near line 2446)
   - Remove the implicit "self-created only" restriction. Keep the guard that excludes folder-snapshot items (`!selectedCustomTask?.folderItemData`).
   - Before deleting, look up whether this template originated from a coach:
     ```ts
     const { data: sentRow } = await supabase
       .from('sent_activity_templates')
       .select('id, sender_id, template_snapshot')
       .eq('accepted_template_id', templateId)
       .maybeSingle();
     ```
   - Pass `wasCoachSent: !!sentRow` and the coach's display name (fetch from `profiles` if needed, or rely on `useReceivedActivities` cache) into the dialog so it can show the right confirmation copy.
   - After `deleteActivityTemplate(templateId)` succeeds and `sentRow` exists, insert a `coach_notifications` row (see SQL/insert shape below). Failure of the notification insert should NOT roll back the delete — log to console and continue.
   - In the existing toast Undo handler (which currently clears `deleted_at`), additionally insert an `activity_restored` notification when `sentRow` existed.

2. **`src/components/CustomActivityDetailDialog.tsx`**
   - Add an optional `isCoachSent?: boolean` prop and an optional `coachName?: string` prop.
   - When `isCoachSent`, swap the AlertDialog description to: *"Delete this activity? It will be moved to Recently Deleted and {coachName ?? 'the coach who sent it'} will be notified that you removed it from your Game Plan. You can restore it within 30 days from My Activities → Recently Deleted."*
   - No new button — reuse the existing destructive button + AlertDialog already added.

3. **Notification insert (no schema change needed)**
   `coach_notifications` already supports arbitrary `notification_type` strings (it's `text`, no CHECK). The existing INSERT RLS policy (`sender_user_id = auth.uid()`) already permits the player to write a notification addressed to the coach, so no migration is required.
   ```ts
   await supabase.from('coach_notifications').insert({
     coach_user_id: sentRow.sender_id,
     sender_user_id: user.id,
     notification_type: 'activity_removed',
     title: `${playerName} removed an activity from their Game Plan`,
     message: `${template.title} • Removed ${new Date().toLocaleString()}`,
     template_snapshot: sentRow.template_snapshot, // preserves what was sent
   });
   ```

4. **Coach-side notification rendering** — verify the coach's notifications UI (search `coach_notifications` consumers) renders unknown `notification_type` values gracefully. If it switch/cases by type, add an `'activity_removed'` and `'activity_restored'` branch with a red/amber icon. (One file, additive.)

### Out of scope

- No DB schema migration (column types already permit the new values).
- No change to folder-snapshot delete flow.
- No change to the existing Recently Deleted UI or 30-day restore window.
- No change to coach-sent activities still in `pending` status (those use the existing Accept/Reject flow on `PendingCoachActivityCard`).
