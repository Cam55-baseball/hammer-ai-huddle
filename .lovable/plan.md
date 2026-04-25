# Phase 12.2 — NN Attachment + Verifiable Completion

Goal: every Non-Negotiable must be attached to a measurable completion signal. No floating "tap done" cards. If a NN can't bind to an in-app event or define an enforceable manual rule, it does not render and cannot be saved.

---

## 1. DB migration — add completion contract columns

Table: `public.custom_activity_templates`

```sql
ALTER TABLE public.custom_activity_templates
  ADD COLUMN IF NOT EXISTS completion_type text,
  ADD COLUMN IF NOT EXISTS completion_binding jsonb;
```

No CHECK constraint (per project rule — use validation triggers if needed; here we validate in app code, since legacy non-NN rows are allowed to be NULL).

Backfill the only existing NN row (`Daily Mental Reset`, id `e6120c59-965d-4301-82b0-a96c2503b05e`):

```sql
UPDATE public.custom_activity_templates
SET completion_type = 'manual',
    completion_binding = '{"type":"timer","min_seconds":120}'::jsonb
WHERE id = 'e6120c59-965d-4301-82b0-a96c2503b05e';
```

---

## 2. `src/types/customActivity.ts`

Extend `CustomActivityTemplate`:

```ts
completion_type?: 'in_app' | 'manual' | null;
completion_binding?: NNCompletionBinding | null;
```

New shared type:

```ts
export type NNCompletionBinding =
  | { kind: 'in_app'; event: 'NN_COMPLETED' | 'STANDARD_MET' | 'NIGHT_CHECKIN_COMPLETED'; match?: { templateId?: string } }
  | { kind: 'manual'; rule:
      | { type: 'timer'; min_seconds: number }
      | { type: 'count'; min_count: number; label: string }
      | { type: 'binary'; confirm_label: string } };
```

Note: `binary` is only allowed when `success_criteria` ≥ 12 chars and contains a measurable verb — enforced in `nnContract.ts` (see §3).

---

## 3. `src/lib/nnContract.ts` — extend the contract

Add `completion` to `NNContext`:

```ts
completion: NNCompletionBinding;
```

Extend `validateNNFields` signature to accept optional `completionType` + `completionBinding` and produce a `completion` error key.

New validation rules inside `buildNNContext` (in addition to current strict checks):

- `completion_type` must be `'in_app'` or `'manual'`. Any other value → reject.
- If `'in_app'`:
  - `completion_binding.kind === 'in_app'`
  - `event` must be one of the allowed enum values
  - if `event === 'NN_COMPLETED'`, `match.templateId` must equal the template's own id (self-binding) — prevents pointing at unrelated templates
- If `'manual'`:
  - `completion_binding.kind === 'manual'`
  - `rule.type === 'timer'` → `min_seconds` integer in `[30, 3600]`
  - `rule.type === 'count'` → `min_count` integer in `[1, 500]`, `label` ≥ 3 chars and not in vague blocklist
  - `rule.type === 'binary'` → only valid when `successCriteria.length ≥ 12` and matches `/\b(complete[d]?|finish|log|record|mark|did|performed)\b/i` (proves the success criteria itself is the gate). Otherwise reject — this closes the "blind tap done" loophole.

Any failure → `buildNNContext` returns `null`. No defaults.

Export `validateNNCompletion(type, binding, successCriteria)` helper for the builder so it can show inline errors per-rule without duplicating logic.

---

## 4. Builder — `CustomActivityBuilderDialog.tsx`

State additions:
```ts
const [nnCompletionType, setNnCompletionType] = useState<'in_app'|'manual'|''>(...);
const [nnBinding, setNnBinding] = useState<NNCompletionBinding|null>(...);
```
Hydrate from template on edit; default empty on new.

UI (rendered only when `isNonNegotiable` is on, directly under the existing Purpose/Action/Success block):

1. **Completion Type segmented control** — "Track inside app" | "Manual confirmation". Required.
2. **If `in_app`**: dropdown of allowed events. For `NN_COMPLETED` we pre-fill `match.templateId` with the current template id (or `__self__` sentinel if creating; resolved on save). Helper text: "This NN auto-completes when you complete it from Game Plan."
3. **If `manual`**: sub-selector "Timer / Count / Binary".
   - Timer → number input `min_seconds` (default 120, min 30, max 3600). Helper: "User must run a full timer before Complete enables."
   - Count → number input `min_count` + label (e.g. "reps", "breaths"). Helper: "User must enter at least N before Complete enables."
   - Binary → text input `confirm_label` (default "I completed this honestly"). Disabled with tooltip if `successCriteria` doesn't pass the strict measurable-verb check from §3.

Wire `nnValidation` to call the extended `validateNNFields` (now including completion). Save button stays disabled until both context AND completion contract pass.

Persist to DB on save:
```ts
completion_type: isNonNegotiable ? nnCompletionType : null,
completion_binding: isNonNegotiable ? nnBinding : null,
```
Resolve `__self__` → actual template id after insert (do a follow-up update in the same save flow when creating new in_app NNs that self-bind).

---

## 5. `useNNSuggestions.ts` — block accept without contract

In `accept`, after the existing strict context check, also require a completion contract on the source template. Since suggestions today don't carry one, this means **all suggestion accepts now route the user to the builder** with a toast: "This standard needs a completion rule. Open it in the builder to set how it gets verified." (Same UX pattern as the existing context-missing toast.)

No silent default contract injection.

---

## 6. `GamePlanCard.tsx` — render + completion behavior

Render guard already calls `buildNNContext`. Once §3 lands, NNs without a valid contract auto-disappear — no extra guard needed.

Completion behavior changes (NN-only path):

- **`in_app` NNs**: keep current tap-to-complete behavior. The `NN_COMPLETED` event already fires from the existing completion handler (Phase 11), satisfying its own self-binding. No UI change beyond the existing structured display.
- **`manual` NNs**: replace the simple checkbox/done tap with a small inline gated control inside the NN card body:
  - **Timer**: "Start 2:00 reset" button → countdown UI → Complete button enables only when timer reaches 0. Persist start timestamp in component state; if user navigates away mid-timer, restart required (no fake completion). Optional: persist start to `localStorage` keyed by `${templateId}:${date}` so a refresh resumes.
  - **Count**: number stepper + "Log N" button. Complete enables when entered count ≥ `min_count`.
  - **Binary**: confirm dialog showing `confirm_label` + `successCriteria`, requires explicit "Confirm" tap (two-step), then completes.

On successful gated action, call the existing `markCustomActivityComplete` flow so all downstream analytics / engine triggers / Hammer recompute fire unchanged. Record the gate satisfaction in `performance_data` (e.g. `{ nn_gate: { type: 'timer', seconds: 120, satisfied_at: ts } }`) for auditability — no schema change needed (already jsonb).

Do NOT alter the non-NN completion path.

---

## 7. Verification

1. New NN, leave completion type empty → Save disabled, inline error.
2. New NN, choose `manual / binary` while success criteria is "stay focused" → Save disabled (binary requires measurable verb).
3. New NN, choose `manual / timer` 120s → Save enabled. On Game Plan, card shows "Start 2:00 reset", Complete disabled until timer ends.
4. New NN, choose `in_app / NN_COMPLETED` self-binding → completes on tap as before; analytics event fires once.
5. Existing "Daily Mental Reset" → after migration, renders with timer gate; tapping done without timer is impossible.
6. Suggestion accept on a template with no contract → blocked with toast routing to builder.
7. Legacy NN row missing `completion_type` → silently dropped from Game Plan (logs `[HM-NN-INVALID]` in dev).

---

## Files touched

- DB migration (add columns) + data update for the one existing NN row
- `src/types/customActivity.ts` — type extensions
- `src/lib/nnContract.ts` — extended validation, new `validateNNCompletion` helper, no defaults
- `src/components/custom-activities/CustomActivityBuilderDialog.tsx` — completion UI + save persistence
- `src/hooks/useNNSuggestions.ts` — block accept without contract
- `src/components/GamePlanCard.tsx` — gated manual completion controls inside NN card body

No new tables. No new components. No scoring changes. No new analytics events.
