
# Phase 10.1 — Non-Negotiable Clarity + Direct Control Layer

Additive-only UX + control pass on top of the unified Day Control system. Zero changes to evaluator contracts, hammer scoring, or logs. `is_non_negotiable` already exists on `custom_activity_templates` and is consumed by `evaluate-behavioral-state`, `useQuickActionExecutor`, and `NonNegotiableProgressStrip` — but is invisible and unmanaged in the UI today. This pass surfaces and controls it.

---

## Part 1 — `NonNegotiableBadge` (new)

Create `src/components/identity/NonNegotiableBadge.tsx`:

- Pill: `bg-red-500/15 text-red-400 border border-red-500/40 rounded`
- Font: `text-[10px] font-black tracking-wider uppercase`
- Content: `<Flame className="h-3 w-3" /> NON-NEGOTIABLE`
- Wrapped in shadcn `Tooltip`: *"Required for your daily standard. Missing this breaks your discipline."*
- Tiny `compact` prop for ultra-tight rows (icon-only).

## Part 2 — `GamePlanCard` row upgrade

In `src/components/GamePlanCard.tsx → renderTask` (~line 981):

- Derive `const isNN = !!task.customActivityData?.template?.is_non_negotiable;`
- When `isNN && !task.completed`, append to outer row `className`:
  - `border-l-4 border-red-500`
  - `shadow-[0_0_0_1px_rgba(239,68,68,0.2)]`
- Inject `<NonNegotiableBadge />` in the title-badges row (line ~1067) for custom activity rows where `isNN`.

## Part 3 — Hard NN/Optional split inside the custom section

At the call site (line ~1930) where `customTasks` is rendered via `renderTaskSection`, split first:

```ts
const nnCustomTasks   = customTasks.filter(t => t.customActivityData?.template?.is_non_negotiable);
const optCustomTasks  = customTasks.filter(t => !t.customActivityData?.template?.is_non_negotiable);
```

Render two consecutive `renderTaskSection` calls:

1. **NON-NEGOTIABLES (REQUIRED)** — red accent (`text-red-400`, `bg-red-500/40`), subtitle "Required — standard is built here" rendered above the section line.
2. **OPTIONAL WORK** — existing emerald accent.

Manual-reorder ordered arrays (`orderedCustom`) get the same filter applied so drag groups don't re-mix sections. NN section is rendered FIRST regardless of `sortMode`. `timeline` mode is left untouched (timeline is time-ordered and global; NN border + badge still apply per-row).

Hide NN section entirely when `useDayState().dayType === 'rest'` (delegated to existing day-state hook already imported at the page level — pass a prop `hideNonNegotiables: boolean` from `Dashboard` → `GamePlanCard`).

## Part 4 — Inline NN toggle on each row

In `renderTask`, for `task.taskType === 'custom'` only:

- Add a small `Flame` icon-button (24px, far right of row, before any existing trailing controls):
  - ON: `text-red-400 fill-red-400`
  - OFF: `text-white/30` (outline only)
- `onClick` (stop propagation) calls a new function `toggleNN(template_id, next)`:
  ```ts
  await supabase
    .from('custom_activity_templates')
    .update({ is_non_negotiable: next })
    .eq('id', template_id)
    .eq('user_id', user.id);
  ```
- After mutation:
  - Optimistic local toggle via `useCustomActivities.updateTemplate(id, { is_non_negotiable: next })` (after Part 5 wiring).
  - Invalidate game-plan query and the NN progress strip query.
  - Fire-and-forget recompute:
    ```ts
    supabase.functions.invoke('evaluate-behavioral-state', { body: { user_id: user.id } });
    supabase.functions.invoke('compute-hammer-state',     { body: { user_id: user.id } });
    ```
- Toast (sonner):
  - ON: *"Set as Non-Negotiable — now required daily."*
  - OFF: *"Removed from Non-Negotiables."*

## Part 5 — Persist `is_non_negotiable` through the builder

`src/hooks/useCustomActivities.ts`:

- Add `'is_non_negotiable'` to the `fieldsToCopy` array (line ~300) so `updateTemplate` actually writes it.
- Ensure `createTemplate` insert payload includes it (default `false`).

`src/components/custom-activities/CustomActivityBuilderDialog.tsx`:

- Add state: `const [isNonNegotiable, setIsNonNegotiable] = useState(template?.is_non_negotiable ?? false);`
- Reset in the same places `isFavorited` resets (lines 165, 234, 267).
- Persist in the save payload (line ~350): `is_non_negotiable: isNonNegotiable`.
- New row directly under the favorite toggle (line ~488), mirroring the `Switch + Label` pattern:
  - Label: `<Flame className="h-4 w-4 text-red-400" /> Make this a Non-Negotiable`
  - Helper text: *"This will be required daily and tracked in your standard."*

## Part 6 — `NonNegotiableProgressStrip` enhancement

`src/components/game-plan/NonNegotiableProgressStrip.tsx`:

- When `noneDone` (already computed), append text: `"Standard not met"` (replace existing `"Standard required"` chip).
- When `allDone`, append: `"Standard met"`.
- Keep the existing red glow on `noneDone`; add a soft red `animate-pulse` to the icon only (not the whole strip — avoid a flashing bar).

## Part 7 — Day-state interaction polish

Driven by existing `useDayState()`:

- **rest**: strip already returns `null`; pass `hideNonNegotiables` prop to `GamePlanCard` so the NN section header + badges + flame toggles are also hidden (rows still render under "OPTIONAL WORK").
- **skip**: NN section renders but with `opacity-60 grayscale pointer-events-none` wrapper around the section (banner already explains).
- **push**: NN section gets `ring-2 ring-amber-500/40 rounded-xl p-2` wrapper to reinforce importance.

## Part 8 — Language standardization

Global replace across `src/components/GamePlanCard.tsx`, `NonNegotiableProgressStrip.tsx`, and `BehavioralPressureToast.tsx`:

- "You haven't completed this" → "Standard not met"
- "Incomplete" → "Required"
- nn_miss event copy already authored by evaluator — leave server-side strings untouched; only edit hard-coded UI strings.

`rg -n "haven't completed|Incomplete" src/components` will scope the sweep.

## Part 9 — Zero breaking changes

- No evaluator, hammer, or log schema changes.
- No new tables or migrations.
- Single new column writes on existing `is_non_negotiable` (already in schema and `types.ts`).
- All other systems (skip/push/rest, streak, NN waiver, DDA) remain bit-identical.

## Files

**New**
- `src/components/identity/NonNegotiableBadge.tsx`

**Edit**
- `src/components/GamePlanCard.tsx` (renderTask row decoration + flame toggle + NN/Optional split at custom-section call site)
- `src/components/custom-activities/CustomActivityBuilderDialog.tsx` (NN switch row + state + persist)
- `src/hooks/useCustomActivities.ts` (add `is_non_negotiable` to `fieldsToCopy`; include in create payload)
- `src/components/game-plan/NonNegotiableProgressStrip.tsx` (Standard met / not met copy + softer pulse)
- `src/pages/Dashboard.tsx` (pass `hideNonNegotiables` from `useDayState().isRest` into `GamePlanCard`)

## Acceptance

- NN rows visually dominate (red bar + glow + badge) and always render above optional rows.
- One-click flame toggle on any custom row sets/unsets NN, with toast + recompute + progress-strip update inside 2s.
- Builder save persists `is_non_negotiable` and re-edit reflects it.
- Rest day hides all NN UI; Skip day grays it; Push day amber-rings it.
- Strip reads "Standard met" / "Standard not met"; no "Incomplete" copy remains.
- No regressions to evaluator, hammer, or skip/push/rest behavior.
