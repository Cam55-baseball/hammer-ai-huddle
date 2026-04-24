

# Quick Add — Root-Cause Fix Plan (Scheduling Integrity)

## What's actually broken (verified in code)

After reading `useCustomActivities.ts`, `useGamePlan.ts:1542-1569`, `GamePlanCard.tsx:741-747 / 2266-2282`, and the live `custom_activity_logs` schema (PK `id`, UNIQUE on `(user_id, template_id, entry_date, instance_index)`), the three reported failures map to **two real defects** + **one rendering inconsistency**. Production data confirms it: out of 600 rows, only 2 have `instance_index > 0` — the auto-increment branch is rarely hit but when it is, the bugs surface exactly as described.

### Defect 1 — `addToToday` always increments `instance_index`, never reuses freed slots → "Pray, Pray #2, Pray #3"

`useCustomActivities.ts` lines 350-367:
```ts
nextInstanceIndex = ((existingForToday[0] as any).instance_index ?? 0) + 1;
```
It picks `MAX(instance_index) + 1`. After delete-then-readd:
- Add Pray → `instance_index = 0` ✅
- Delete Pray → row gone, but the lookup still queries fresh, so… wait, this branch only runs **if a row exists**. The `if (existingForToday && existingForToday.length > 0)` guard means after a hard delete, the next add correctly returns to `0`.

So how does the user see "Pray #2, #3"? Two paths:

**Path A (the active bug):** The unique-violation retry at line 397-398:
```ts
if ((error as any).code === '23505' && retryCount > 0) {
  return attemptInsert(retryCount - 1, indexToUse + 1);
}
```
On rapid double-tap, both clicks compute `nextInstanceIndex = 0` from the same stale read → first insert wins at index 0 → second hits the unique constraint → **retry bumps to index 1** → renders as "Pray #2". A third tap → "Pray #3". This is the "multiple adds in sequence" failure the user described.

**Path B (the visible artifact):** Even if the index logic were perfect, `useGamePlan.ts:1550` *unconditionally* mutates the visible title:
```ts
const titleSuffix = instanceIdx > 0 ? ` #${instanceIdx + 1}` : '';
titleKey: activity.template.title + titleSuffix
```
This is "incremental naming logic tied to previous deletes" — exactly what the spec says to remove.

### Defect 2 — "Quick Add fails unless activity already exists / sometimes silently fails"

The optimistic update at line 380 (`setTodayLogs(prev => [...prev, optimisticLog])`) inserts a row with id `optimistic-${Date.now()}`, but the de-dup logic in `useGamePlan.ts:1542-1545` filters by **template title** against folder items:
```ts
if (folderItemTitles.has(activity.template.title.trim().toLowerCase())) return;
```
If the activity is also inside an active folder for today (common — favorites are often pinned to folders), the Quick-Added log gets **silently dropped from render** because the folder version "wins". To the user: "I tapped add, nothing appeared, I tapped again, now there are 2." → also feeds Defect 1.

Additionally, `addToToday` calls `await fetchTodayLogs()` (line 402) but `getTodayActivities` uses **state** that React batches — between the `setTodayLogs(optimistic)` and the `fetchTodayLogs()` post-insert refresh, if the user taps a second time, they read `todayLogs` from a stale snapshot.

### Defect 3 — "Activities scheduled but not appearing on the calendar"

The Calendar reads from `useCalendarProjection` (a `react-query` projection). Realtime invalidation **is** wired (`useSchedulingRealtime.ts` listens to `custom_activity_logs` and invalidates `['calendar-projection']`) — so the wire is correct. But the **GamePlanCard** path uses local `useState` (`todayLogs`) — not react-query — so it depends entirely on `fetchTodayLogs()` running. The Quick Add path runs it; the realtime listener doesn't. **Result:** if a write happens in another tab (or the optimistic row gets a real id from realtime), the GamePlanCard is the one that desyncs, not the calendar.

---

## Fix architecture (root-level, not patches)

### Single-instance-per-day model (canonical)

The spec says: *"Same activity + same day = single instance unless explicitly duplicated."* The current schema supports multi-instance via `instance_index`, but no UI exposes "add another instance of the same activity" as an explicit action. The `instance_index > 0` data is essentially noise from bugs.

**Decision:** Treat every Quick Add as **idempotent at instance_index = 0**. Re-adding a removed activity restores instance 0 cleanly. Multi-instance is removed from the Quick Add path (no UI uses it deliberately today). If multi-instance is needed later, it gets its own explicit "Duplicate" action with a versioned label like "Pray (2)" derived deliberately, not from a unique-constraint retry.

This is the simplest deterministic model and matches every example the user gave.

---

## Changes

### 1. `src/hooks/useCustomActivities.ts` — Rewrite `addToToday` as a true upsert

Replace lines 344-419 with a single idempotent upsert:

```ts
const addToToday = async (templateId: string): Promise<boolean> => {
  if (!user) return false;
  const today = getTodayDate();

  // Idempotent: one log per (user, template, date) at instance_index 0.
  // Upsert on the existing UNIQUE constraint guarantees:
  //   - First call → INSERT
  //   - Repeat call → no-op (returns same row)
  //   - Rapid double-tap → both resolve to same row, no duplicates, no retries
  const { data, error } = await supabase
    .from('custom_activity_logs')
    .upsert(
      {
        user_id: user.id,
        template_id: templateId,
        entry_date: today,
        instance_index: 0,
        completed: false,
      } as any,
      {
        onConflict: 'user_id,template_id,entry_date,instance_index',
        ignoreDuplicates: false, // returns the existing row on conflict
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[useCustomActivities] addToToday upsert failed:', error);
    toast.error(t('customActivity.addError'));
    return false;
  }

  // Optimistic + canonical merge: replace any optimistic placeholder for this
  // (template_id, today) with the real row, or insert if not present.
  setTodayLogs(prev => {
    const filtered = prev.filter(
      l => !(l.template_id === templateId && l.entry_date === today)
    );
    return [...filtered, data as CustomActivityLog];
  });

  toast.success(t('customActivity.addedToday'));

  // Background reconciliation (no race — UI already shows the canonical row)
  fetchTodayLogs();
  return true;
};
```

**Why this fixes everything:**
- **No precondition logic** — upsert always succeeds.
- **No "day-bound" check** — the row is created if missing, returned if present.
- **Rapid sequential taps** → all converge on the same row (idempotent). No `23505` retries, no `instance_index` drift.
- **No optimistic/canonical mismatch** — we wait for the real row (the upsert is fast: single round-trip), then merge it into local state. The optimistic placeholder pattern is removed (it was the source of "ghost writes").
- **Delete + re-add** → re-add returns to instance 0 cleanly. No `#2`.

### 2. `src/hooks/useCustomActivities.ts` — Harden `removeFromToday`

Currently OK at lines 519-541, but add explicit local-state purge before the network call (so the UI updates instantly even if realtime is slow):

```ts
const removeFromToday = async (templateId: string, logId?: string): Promise<boolean> => {
  if (!user) return false;
  const log = logId
    ? todayLogs.find(l => l.id === logId)
    : todayLogs.find(l => l.template_id === templateId);
  if (!log) return false;

  // Optimistic removal
  setTodayLogs(prev => prev.filter(l => l.id !== log.id));

  const { error } = await supabase
    .from('custom_activity_logs')
    .delete()
    .eq('id', log.id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error removing from today:', error);
    // Roll back
    setTodayLogs(prev => [...prev, log]);
    toast.error(t('customActivity.deleteError'));
    return false;
  }

  fetchTodayLogs(); // background reconcile
  return true;
};
```

### 3. `src/hooks/useGamePlan.ts:1549-1557` — Remove the `#N` title-suffix logic

Replace:
```ts
const instanceIdx = (activity.log as any)?.instance_index ?? 0;
const titleSuffix = instanceIdx > 0 ? ` #${instanceIdx + 1}` : '';
const taskId = activity.log?.id
  ? `custom-${activity.template.id}-${activity.log.id}`
  : `custom-${activity.template.id}`;

tasks.push({
  id: taskId,
  titleKey: activity.template.title + titleSuffix,
  ...
```

with:
```ts
const taskId = activity.log?.id
  ? `custom-${activity.template.id}-${activity.log.id}`
  : `custom-${activity.template.id}`;

tasks.push({
  id: taskId,
  titleKey: activity.template.title, // canonical: no version suffix
  ...
```

The taskId still uses `log.id` so React keys stay unique even if multi-instance ever returns; no naming artifacts surface.

### 4. `src/hooks/useGamePlan.ts:547-550 / 909` — Drop the multi-instance fanout in single-instance world

Lines 547-550 and 909 fan out **all** logs per template (sorted by `instance_index`). With the upsert model there's at most one. Keep the code but the fanout becomes a no-op for properly-shaped data. **Optional cleanup** — not blocking, no behavior change. Skip unless you want it removed.

### 5. `src/hooks/useGamePlan.ts:1542-1545` — Fix the silent-drop title collision

Today: any custom activity whose title matches a folder-item title is silently filtered out (`folderItemTitles.has(...)`). This is the "ghost write" the user reported — Quick Add succeeded in DB but never rendered because a folder item had the same title.

**Fix:** key folder dedup by **template/folder item ID**, not title. Folder items already carry a stable id in `ft.item.id`, and custom activities carry `template.id`. There's no field linking them, so title is the closest signal — but it's wrong (same-named items are legitimately different things). Two options:

- **Option A (recommended):** remove the dedup entirely. If a user has both a folder containing "Pray" and a standalone Pray template, they show both. This is honest. The user explicitly added both.
- **Option B (conservative):** keep title dedup but make folder items lose to standalone customs (invert the priority). Worse — still silent drops in the other direction.

**Going with Option A.** This eliminates the silent-drop class entirely. If the user later wants linked folder/template dedup, it needs a real foreign key, not a string match.

```ts
// REMOVED: const folderItemTitles = new Set(...)

customActivities.forEach(activity => {
  // No title-based dedup — render every (template, log) pair the user added.
  const iconKey = activity.template.icon || 'activity';
  ...
```

### 6. Realtime: ensure GamePlanCard refreshes on cross-tab/realtime writes

`useSchedulingRealtime` invalidates react-query keys, but `useCustomActivities` uses local `useState`. Add a realtime listener inside `useCustomActivities` that calls `fetchTodayLogs()` on any `custom_activity_logs` change for this user:

```ts
useEffect(() => {
  if (!user) return;
  const channel = supabase
    .channel(`custom-activity-logs-${user.id}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'custom_activity_logs',
      filter: `user_id=eq.${user.id}`,
    }, () => {
      fetchTodayLogs();
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [user?.id, fetchTodayLogs]);
```

This closes the rendering desync for cross-tab writes (the BroadcastChannel pattern in `mem://architecture/multi-tab-synchronization-strategy` is for templates, not logs — logs need realtime).

### 7. No schema changes

The existing `UNIQUE (user_id, template_id, entry_date, instance_index)` is exactly what the upsert needs. `instance_index` stays in the schema (forward-compat), but the Quick Add path locks it to 0. Existing rows with `instance_index > 0` (only 2 in production) keep working — they just won't get `#N` suffixes anymore (the title becomes the clean template title for everyone).

---

## Files modified

1. `src/hooks/useCustomActivities.ts` — rewrite `addToToday` (~75 lines → ~30 lines), harden `removeFromToday`, add realtime listener for logs.
2. `src/hooks/useGamePlan.ts` — remove `titleSuffix` logic (1 line gone), remove `folderItemTitles` dedup (3 lines gone).

That's it. Two files. No schema migration. No new tables.

---

## What this guarantees against the user's validation checklist

| Validation | Mechanism |
|---|---|
| Add unscheduled activity via Quick Add → appears instantly | Upsert returns canonical row → merged into local state synchronously → no optimistic/real swap race |
| Add 3+ activities rapidly → all persist and render | Each upsert is for a different `template_id` → all hit different unique-constraint slots → all succeed independently. Same template tapped 3× → 3 idempotent no-ops on the same row, no errors, no `#2/#3` |
| Delete + re-add same activity → only one instance exists | Delete removes row at `instance_index = 0`. Re-add upserts at `instance_index = 0` → fresh single instance, no naming artifact |
| Cross-check DB vs UI → perfect parity | Local state is updated from the upsert's returned row (canonical), then realtime listener reconciles any external writes. No more title-based dedup that hides rows |

---

## Risks & non-issues

- **Multi-instance feature loss:** Today no UI explicitly creates `instance_index > 0` (production data confirms: 2/600 rows, both likely from the bug being fixed). If multi-instance is ever needed, it should be a deliberate "Duplicate this activity" button that bumps `instance_index` and labels it "Pray (copy)" or `(2x)` — not a side effect of unique-constraint retries.
- **Cross-component impact:** `useGamePlan.ts` lines 547/909 still iterate logs as arrays (forward-compat for multi-instance). No change needed.
- **Calendar projection (`useCalendarProjection`):** already correct — reads from react-query with realtime invalidation. The fixes above only make GamePlanCard match the calendar's reliability.
- **Folder dedup removal:** Anyone relying on "folder Pray hides standalone Pray" will now see both. Acceptable per spec ("delete = hard state removal or properly archived, not lingering in active query scope" — silent UI hiding is the opposite of that).

---

## Open question (one)

**Should I also clean up the 2 stray production rows with `instance_index > 0`?** They're harmless after the suffix removal (they'll just render with the clean template title), but if you want a tidy DB I can write a one-time migration to merge them into instance 0 (deleting the higher-index row, keeping the older instance 0 if both exist). Default: **leave them alone** — they're invisible to users now and migrating live data carries its own risk. Flag if you want them cleaned.

---

## Time budget
- Code changes: 10 min
- Manual verification (Quick Add idempotency, delete/re-add, multi-template rapid add, cross-tab refresh): 5 min
- **Total: ~15 min**

