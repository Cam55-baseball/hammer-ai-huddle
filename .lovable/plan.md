# Onboarding Reality Validation — Remediation Sprint Plan

## Section A — Critical Defect Root Cause (CONFIRMED)

**Issue A1 / A2 are the same crash.** "n.toLowerCase" is the minified form of "injury.toLowerCase".

**Location:** `src/lib/hammer/context/decisionFilters.ts:72-75`

```ts
const injury = (ctx.get<string>("injury_history")?.value as string | null) ?? null;
const injuryRegions = injury
  ? KNOWN_INJURY_REGIONS.filter((r) => injury.toLowerCase().includes(r))
  : [];
```

**Producer:** `src/hooks/useHammerOnboardingDirector.ts:59-62` writes `injury_history` as **either `[]` or `[{ note, reported_at }]`** — i.e., an array of objects, never a string. `PhysioHealthIntakeDialog` writes `string[]`. `usePhysioProfile` types it as `string[]`.

**Why it crashed only after answering the injury question:** before persistence the envelope reports the variable as `missing`, so the cast-to-string returned `null` and the filter no-op'd. As soon as the athlete answered "none" / free-text, the value became a truthy non-string array → `.toLowerCase` on an array → TypeError thrown inside `buildHammerDailyPlan` → React error boundary catches → "Save & Next" appears not to advance (this is Section B).

**Section B is a downstream symptom of A1**, not an independent navigation/persistence bug. The save succeeds; the next render crashes.

## Implementation (code changes — minimal, surgical)

**File:** `src/lib/hammer/context/decisionFilters.ts` (lines 72-75)

Replace with a defensive normalizer that accepts the three real shapes the spine actually produces (string, `string[]`, `Array<{note: string}>`), tolerates `null` / `undefined` / `""` / object / unknown, and never throws:

```ts
const rawInjury = ctx.get<unknown>("injury_history")?.value;
const injuryText = normalizeInjuryToText(rawInjury); // string | null
const injuryRegions = injuryText
  ? KNOWN_INJURY_REGIONS.filter((r) => injuryText.includes(r))
  : [];
```

`normalizeInjuryToText` (new local helper):
- `null` / `undefined` / `""` → `null`
- `string` → lowercased trimmed string (or `null` if empty)
- `string[]` → joined lowercased
- `Array<{note?: string}>` → join `note` fields, lowercased
- `object` with `note` → that note
- anything else → `null` (preserve missingness, never fabricate)

Public `AthleteContextProjection.injury` field changes from `string | null` semantics to the normalized text (no API consumer outside this file relies on its shape — `decisionFilters` only re-exports it in `lineage`).

**No other files touched in this fix.** No schema change. No new event. No doctrine change.

## Verification (Section H — completion walkthrough)

After fix, traverse via preview at `/onboarding/athlete` then `/command` for each persona and confirm no error boundary fires and the daily plan renders:

| Persona | injury_history value tested |
|---|---|
| Brand-new (skip injury) | missing |
| Youth | `"none"` → `[]` |
| High-school | free-text `"left shoulder soreness"` → `[{note}]` |
| College | `"hamstring, knee"` |
| Professional | `"UCL post-op"` |
| Injured | long free-text |
| Returning from layoff | `"none"` |

Also unit-cover `projectEnvelope` with: `null`, `undefined`, `""`, `"none"`, `"shoulder"`, `["shoulder","knee"]`, `[{note:"shoulder"}]`, `{}`, `42`. None throw.

## Sections C–G — Documentation Only (no code)

Write findings to `docs/asb/onboarding-reality-validation-remediation.md`:

**C. Context acquisition audit** — current `HAMMER_KNOWLEDGE_GAPS` captures: `goal_summary`, `goal_horizon`, `weekly_availability_days/hours`, `typical_session_length_min`, `training_focus`, `development_priorities`, `injury_history`. **Missing:** primary position, secondary positions, competition level, development stage, training age, detraining history, sport participation profile. Document intelligence / recommendation / roadmap / personalization impact per gap.

**D. Sport question restructure** — `sport_primary` is already in spine and resolvable via subscription/routing context. Recommendation: replace the sport-acquisition gap with `primary_position`, `secondary_positions`, `other_sports`. Rationale documented; no implementation.

**E. Development stage model** — recommend replacing `school_grade` with enum `{ elementary, middle_school, high_school, college, professional, adult_athlete }`. Assess against recruiting / roadmap / recommendation intelligence; document recommendation only.

**F. Training age** — recommend splitting `lifting_age_years` (experience) from new `current_training_continuity` (months currently training without break). Document the "10y lifting / 8mo detrained" example.

**G. Anthropometric gap analysis** — currently captured: none in onboarding spine (weight in `weight_entries` post-onboarding only). Map current → future → organism dependency for height, weight, body composition, limb length, wingspan. Identify which feed lift personalization, movement profiling, body-type recs, projections. Gap analysis only.

**H. Walkthrough log** — record each persona traversal outcome (pass/fail, screens reached).

## Deliverables

1. `src/lib/hammer/context/decisionFilters.ts` — defensive normalization fix (Sections A + B).
2. `docs/asb/onboarding-reality-validation-remediation.md` — root cause, sections C–G findings, walkthrough log, prioritized V1.x recommendations.
3. `docs/asb/reality-feedback-ledger.md` — append RFL entries for the crash (resolved) and each acquisition gap (open, prioritized).
4. `.lovable/plan.md` — sprint summary.

## Out of scope (explicit)

- No doctrine changes, no new ASB topics, no schema migrations, no new events.
- No implementation for Sections C–G — documentation and prioritization only.
- No changes to `PhysioHealthIntakeDialog`, `usePhysioProfile`, or any other `injury_history` producer — the spine accepts heterogeneous shapes by design; the consumer must tolerate them.

## Exit criteria

- Runtime crash on injury answer eliminated (verified across 9 input shapes).
- "Save & Next" advances for all 7 personas.
- Context acquisition gaps documented with intelligence impact.
- V1.x onboarding improvements prioritized in RFL ledger.
