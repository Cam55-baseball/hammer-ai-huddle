# Phase 12.1 — Strict NN Contract (Remove the Safety Net)

Goal: zero ambiguous NN cards. If a Non-Negotiable doesn't carry real, specific, actionable context, it does not exist in the UI. No filler defaults anywhere in the pipeline.

---

## 1. `src/lib/nnContract.ts` — Tighten validator, kill defaults

**Remove all default fill-ins.** Currently `safePurpose` and `safeSuccess` inject `"Locked-in daily standard."` and `"Logged complete on the day."` — these get deleted.

New rules enforced inside `buildNNContext`:
- `title` — required, **≥ 6 chars**, not in generic blocklist
- `purpose` — required, **≥ 10 chars**, not vague
- `action` — required (with `description` fallback only if it itself meets length), **≥ 10 chars**, not vague
- `successCriteria` — required, **≥ 8 chars**, not vague
- `source` — defaults to `'Custom'` (this is a tag, not user-facing context, so a default is acceptable)

Add forbidden title patterns (existing) plus a **generic-title blocklist** (case-insensitive exact / substring match on the trimmed title):
`['activity', 'task', 'standard', 'non-negotiable', 'nn', 'daily', 'reset', 'focus', 'mental reset', 'be disciplined', 'stay focused']`

Add a **vague-content blocklist** applied to `purpose`, `action`, `successCriteria` — if the *entire* trimmed value (lowercased) matches one of these, reject:
`['stay focused', 'be disciplined', 'mental reset', 'do it', 'be consistent', 'stay locked in', 'lock in', 'focus', 'discipline', 'reset', 'be ready', 'show up']`

Any failure → return `null`. No partial fill, no defaults, no salvage.

Export a small helper `validateNNFields(fields)` that returns `{ ok: boolean, errors: Record<'title'|'purpose'|'action'|'successCriteria', string | null> }` so the builder can show inline errors without duplicating rules.

---

## 2. `CustomActivityBuilderDialog.tsx` — Builder enforces quality

- Import `validateNNFields` from `@/lib/nnContract`.
- Compute `nnValidation` whenever `isNonNegotiable` is on, using current field values.
- Update each NN field block (Purpose, Action, Success Criteria) to:
  - Show a small **helper line** under the label describing what a strong answer looks like (examples already match — formalize as helper text, not just placeholder).
  - Show an inline **error message** in red when the field is touched and fails the rule (e.g. "Purpose must be at least 10 characters and specific — avoid 'stay focused'").
- Update the Save button at line 1017:
  ```
  disabled={!activityType || !title.trim() || saving || (isNonNegotiable && !nnValidation.ok)}
  ```
- Update the existing `handleSave` guard (line 291) to use `validateNNFields` and show the first specific error via toast instead of the generic "Add purpose, action, and success criteria" message.

No silent acceptance. No save until every NN field passes the same rules the renderer enforces.

---

## 3. `src/hooks/useNNSuggestions.ts` — Real auto-population or block

Remove the filler defaults in the `accept` flow:
- Drop `'Locked-in daily standard.'` and `'Logged complete on the day.'`.
- Build a candidate context from the suggestion's template:
  - `purpose` ← `tpl.purpose` if present, else **null** (do not invent).
  - `action`  ← `tpl.action` if present, else `tpl.description` (only if ≥ 10 chars and not vague).
  - `success_criteria` ← `tpl.success_criteria` if present, else **null**.
- Run the candidate through `buildNNContext`. If it returns `null`:
  - Block the accept with a clear toast: **"This activity needs more detail before it can be a Non-Negotiable. Open it in the builder to add Purpose, Action, and Success Criteria."**
  - Do not flip `is_non_negotiable`.
  - Do not mark the suggestion accepted (leave it active so the user can act on it via the builder).
- If validation passes, write the validated values back to the template (no defaults).

---

## 4. `GamePlanCard.tsx` — Render guard already correct, verify

The render guard already drops invalid NNs and logs `[HM-NN-INVALID]` in DEV. No change needed beyond confirming it still calls `buildNNContext` and renders `null` on failure. Once `buildNNContext` is strict (step 1), legacy weak rows will simply stop rendering — which is the desired behavior.

---

## 5. Database — leave existing rows alone

No migration. Legacy rows that don't meet the new contract will silently stop rendering as NNs (the underlying activity still exists; only the NN treatment is gated). Users can repair them via the builder.

The previously normalized "Daily Mental Reset" row already has full structured content (Purpose, Action, Success Criteria from the Phase 12 migration) and will continue to render — confirming the strict path works for valid data.

---

## 6. Verification (post-implementation)

1. Query `custom_activity_templates` for any NN row missing one of the four required fields or with vague content → confirm none of them appear on Game Plan.
2. Open builder, toggle NN on, type "focus" in Purpose → Save stays disabled, inline error shows.
3. Fill all three fields with strong content → Save enables, card renders with full structured display.
4. Trigger a suggestion accept on a template that only has a short/vague description → toast appears, NN is NOT activated.
5. Trigger a suggestion accept on a template with rich `description` (≥ 10 chars, specific) → NN activates with that description as `action`, no filler text in DB or UI.
6. Grep the entire `src/` tree for the strings `'Locked-in daily standard'` and `'Logged complete on the day'` → zero matches.

---

## Files touched
- `src/lib/nnContract.ts` — strict validator, new helper, no defaults
- `src/components/custom-activities/CustomActivityBuilderDialog.tsx` — quality validation, inline errors, disabled save
- `src/hooks/useNNSuggestions.ts` — remove filler defaults, block weak accepts

No DB migration. No new components. No scoring changes. No new events.