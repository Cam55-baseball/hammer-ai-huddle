
# Phase 12 — Context Integrity + Zero-Confusion Enforcement

## Root cause (confirmed)

The card "PHASE 9 NN: Daily mental reset" comes from a **single test row** in `custom_activity_templates`:

- title: `Daily Mental Reset`
- description: `Phase 9 NN validation template`
- is_non_negotiable: `true`

NN cards in `GamePlanCard.tsx` render `template.title` + `template.description` directly (via `useGamePlan.ts` → `titleKey`/`descriptionKey`). There is no structured contract — any template with vague or shorthand text leaks straight to the UI.

This phase introduces a hard structural contract for every NN, a render guard that drops invalid cards in production (warns in dev), a builder UI that enforces the contract for new templates, and a one-time DB normalization for the lone test row.

**Scope guardrails:** No scoring changes. No evaluator changes. No new components. No design overhaul.

---

## Part 1 — Schema: structured NN context fields

Add three nullable text columns to `custom_activity_templates` (migration):

- `purpose` text — 1 sentence: why this exists
- `action` text — 1–2 sentences: exactly what to do
- `success_criteria` text — how the user knows it's complete
- `source` text — `"Custom"` (default), `"Phase 9"`, `"Program"`, etc.

All nullable so legacy non-NN templates are unaffected. The contract is **enforced at render time for NN cards only**, not at the column level.

Update `src/types/customActivity.ts` `CustomActivityTemplate` with the matching optional fields. Update the Supabase select in `useCustomActivities.ts` (line ~303 field list) and `useNNSuggestions.ts` to include them.

## Part 2 — One-time normalization of the offending row

In the same migration, fix the lone existing NN test template:

```sql
UPDATE custom_activity_templates
SET title = 'Daily Mental Reset',
    description = 'Reset focus and clear mental fatigue before performance.',
    purpose = 'Reset focus and clear mental fatigue before performance.',
    action = 'Take 2 minutes to breathe slowly, clear your thoughts, and refocus on your next objective.',
    success_criteria = 'Completed a full uninterrupted 2-minute reset.',
    source = 'Phase 9'
WHERE id = 'e6120c59-965d-4301-82b0-a96c2503b05e';
```

No bulk backfill of other NNs — they're user-authored and already have human titles/descriptions; the render guard handles them gracefully (Part 4 fallback).

## Part 3 — Contract validator (`src/lib/nnContract.ts`, new)

Single source of truth:

```ts
export interface NNContext {
  title: string;
  purpose: string;
  action: string;
  successCriteria: string;
  source: string;
}

export function buildNNContext(tpl): NNContext | null {
  // 1. Map structured fields first
  // 2. Fallback: description → action, title → title
  // 3. Defaults: source = 'Custom'
  // 4. Reject shorthand: titles starting /^PHASE\s*\d+/i or matching /NN:\s*/i
  // 5. Reject if title/action missing or < 4 chars after trim
  // Returns null if invalid
}
```

Forbidden patterns rejected outright: `^PHASE\s*\d+`, `NN:\s`, raw `phase 9 nn` substrings in title.

## Part 4 — Render guard in `GamePlanCard.tsx`

In `renderTask`, before rendering when `isNN === true`:

```ts
const nnCtx = buildNNContext(task.customActivityData?.template);
if (isNN && !nnCtx) {
  if (import.meta.env.DEV) {
    console.warn('[HM-NN-INVALID]', task.customActivityData?.template?.id);
  }
  return null;
}
```

Non-NN tasks render unchanged (zero impact on the rest of the Game Plan).

## Part 5 — Display upgrade (no new components)

For NN cards only, replace the single `description` line (around line 1238–1243) with a structured stack inside the existing content `<div>`:

- **Title** — already bold (existing `h3`)
- **Purpose** — new muted line, `text-xs text-white/60`, under the title row
- **Action** — primary body line (replaces current description line, `text-sm text-white/80`)
- **Success Criteria** — small footer, `text-[11px] text-white/50 mt-1`, prefixed with a subtle "Done when:" label

Layout uses existing flex/spacing — no new components, no new files. Non-NN tasks keep current single-description rendering.

## Part 6 — Builder enforcement (`CustomActivityBuilderDialog.tsx`)

Add three new fields to the form **only when `isNonNegotiable` is true**:

- Purpose (single-line input, required, max 120 chars)
- Action (textarea, required, max 240 chars)
- Success Criteria (single-line input, required, max 120 chars)

Save button disabled with inline helper text if any are blank when NN is on. Source defaults to `"Custom"` (hidden field; only Phase 9 system rows use other values).

When user toggles `isNonNegotiable` ON for the first time, the fields appear inline (no new dialog). Toggling OFF preserves the values silently.

## Part 7 — Suggestion accept path (`useNNSuggestions.ts`)

When a user accepts a suggestion that flips `is_non_negotiable = true`, the template likely has no `purpose`/`action`/`success_criteria` yet. Two options handled in the hook:

- If `description` exists → auto-populate `action = description`, `purpose = "Lock in this daily standard."`, `success_criteria = "Logged complete on the day."`
- If `description` is missing → block accept with toast: `"Add a purpose and action before locking this in"` and open the builder for that template.

This keeps the contract intact without forcing a separate flow.

## Part 8 — Dev sweep

Code search confirmed:
- No code constants generate `"PHASE 9 NN"` or `"Daily mental reset"` strings.
- The only sources are the one DB row (fixed in Part 2) and user-authored templates (gated in Parts 4, 6, 7).

No additional code changes needed for the sweep — the render guard is the permanent backstop.

## Part 9 — Acceptance verification

After the migration runs:

1. Hard-refresh the app — the `Daily Mental Reset` card now shows full structured context.
2. In dev, manually insert a template with title `"PHASE 9 NN: foo"` and `is_non_negotiable=true` → it must NOT render and must log `[HM-NN-INVALID]`.
3. Open the builder, toggle Non-Negotiable on → three new required fields appear. Save is blocked until filled.
4. Accept an NN suggestion for a template with only `description` → auto-population kicks in and the card renders with full context.
5. Production build: `[HM-NN-INVALID]` string is absent from `dist/` (gated by `import.meta.env.DEV`).

---

## Files touched

**New**
- `src/lib/nnContract.ts` — validator + `NNContext` type
- `supabase/migrations/<ts>_phase12_nn_context_contract.sql` — add 4 columns + normalize the test row

**Edited**
- `src/types/customActivity.ts` — add optional `purpose`, `action`, `success_criteria`, `source`
- `src/hooks/useCustomActivities.ts` — extend select column list
- `src/hooks/useNNSuggestions.ts` — auto-populate or block on accept
- `src/components/GamePlanCard.tsx` — render guard + structured NN body block
- `src/components/custom-activities/CustomActivityBuilderDialog.tsx` — conditional NN context fields + save validation

**Untouched**
- All scoring, evaluators, behavioral engine, useDailyOutcome, useGamePlan ordering logic, analytics pipeline, RLS

## Risks & mitigations

- **Existing user NNs without structured fields** — mitigated by the `description → action` fallback in `buildNNContext`. Only templates with no description AND no action get blocked.
- **Suggestion acceptance friction** — auto-population on accept keeps the one-tap flow alive for templates with a description.
- **Migration safety** — additive columns only, all nullable, no constraints. Safe rollback: drop the columns.
