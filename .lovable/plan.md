

## Plan — Add Quick Note to all Game Plan views

### Problem
1. The Quick Note button only exists in the **timeline** branch of `GamePlanCard.tsx` (line 1774–1812). The manual/auto branch (lines ~1880–1920) has its own quick-action row that omits it.
2. "Only one note per day" — the `vault_free_notes` table has **no unique constraint** (verified) and `saveFreeNote` already does a plain `INSERT`, so unlimited notes are already supported at the data layer. The user's perception is likely tied to the dialog being only on timeline view.

### Fix

**`src/components/GamePlanCard.tsx`** — add the Quick Note button to the manual/auto quick-action row (around line 1916, right after the `quickAdd` favorites button), mirroring the timeline version exactly:

```tsx
<Button
  size="sm"
  variant="outline"
  onClick={() => setQuickNoteOpen(true)}
  className="gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
>
  <NotebookPen className="h-4 w-4" />
  Quick Note
</Button>
```

The dialog mount (`<QuickNoteDialog ... />` at line 2869) and state (`quickNoteOpen`, line 112) already exist and are shared, so no other wiring is needed.

### Verification
- Quick Note button visible in all three Game Plan view modes (timeline, manual, auto) on `/dashboard`.
- Tapping Quick Note → typing → Save → toast appears → dialog closes → tapping Quick Note again immediately allows another note (unlimited per day).

