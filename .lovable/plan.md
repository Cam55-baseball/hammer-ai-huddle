## Problem

The Nightly Recap shows "3/3 Check-ins completed" even when the user did not actually complete all three. Root cause is in `src/hooks/useNightCheckInStats.ts`:

```ts
const uniqueQuizTypes = new Set(quizzes.map((q) => q.quiz_type));
const checkinsCompleted = uniqueQuizTypes.size;
```

The hardcoded "/3" copy lives in i18n (`vault.quiz.nightSuccess.checkinsCompleted = "{{count}}/3 Check-ins completed"`), but the count is computed from **every** `vault_focus_quizzes` row for today regardless of `quiz_type`. The canonical 3 are `morning`, `pre_lift`, `night` — but other types are written to the same table (e.g. `confidence` from `ConfidenceTracker.tsx`, and `weekly_wellness` / partial entries from other flows). Any of those inflate the count, and submitting the Night quiz itself can push the visible total to 3/3 even when morning/pre_lift were never completed.

## Fix

Make the count strictly reflect the three canonical daily check-ins.

### 1. `src/hooks/useNightCheckInStats.ts`

- Define `const CANONICAL_QUIZ_TYPES = ['morning', 'pre_lift', 'night'] as const;`
- Filter the fetched quizzes to only those types before building the `Set`, so `checkinsCompleted` ∈ {0,1,2,3}.
- Keep the weight lookup as-is (any quiz row with `weight_lbs` is still valid).
- Confirm we still query `entry_date = today` (we do).

### 2. `src/components/vault/quiz/NightCheckInSuccess.tsx`

- Add a `checkinsTotal` to the `TodayStats` shape (always 3 for now, sourced from the hook) so the denominator is data-driven, not hardcoded in copy.
- Pass `total` into the i18n call: `t('vault.quiz.nightSuccess.checkinsCompleted', { count, total })`.

### 3. i18n strings (all 8 locales)

Update `vault.quiz.nightSuccess.checkinsCompleted` from `"{{count}}/3 ..."` to `"{{count}}/{{total}} ..."` in `en, es, fr, de, nl, ko, ja, zh`. Translations otherwise unchanged.

### 4. Verification

- Read back the updated hook + component to confirm types compile.
- Manually trace: with only `night` submitted today → count = 1 → renders "1/3". With morning + night → "2/3". With confidence + night → "1/3" (no longer inflated).

## Out of scope

- No DB schema changes.
- No changes to other surfaces that read `vault_focus_quizzes` (Vault page, GamePlanCard) — they already filter by explicit `quiz_type`.
- No changes to `workoutsLogged`, `weightTracked`, or tomorrow preview — those already use proper sources of truth.
