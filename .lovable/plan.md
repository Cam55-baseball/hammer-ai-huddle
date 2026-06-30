# Elite Quiz Feedback for Game IQ 101

Today the post-submit screen shows one line ("Correct" or "Actually: Bag") plus a single generic `scenario.explanation`. That isn't a learning moment — users don't see *why* their answer was wrong, *why* the right one is right, or what the rest of the field is doing.

We already store rich per-actor teaching content (`coaching_note`, `secondary_read`, `communication_call`, `common_mistake`, `elite_cue`) on every situation. We'll compose those into a structured, role-aware rationale — no DB changes required.

## What changes

Only the post-submit feedback block in `src/components/iq/IqScenarioRunner.tsx`. Everything before "Lock it in" stays as-is.

### New feedback layout

1. **Verdict banner** — Correct / Incorrect with the correct assignment label (kept).
2. **Why the right answer is right** — built from the actor object for the user's chosen position:
   - One-sentence "Your job on this play" (uses `coaching_note`).
   - "What to read" (`secondary_read`).
   - "What to call out" (`communication_call`).
   - "Elite cue" (`elite_cue`) — shown as a highlighted pull-quote.
3. **Why your answer missed** (only when incorrect) — generated explainer that contrasts the chosen assignment with the correct one in plain language, e.g. *"You chose Bag, but on a ball in the right-center gap the SS is the cutoff — covering 2B leaves no relay and the runner from 1st scores."* Pulls from `common_mistake` when present.
4. **Scenario context** — existing `scenario.explanation`, reframed under a "Big picture" heading.
5. **What the rest of the field is doing** — collapsible list of every other actor with role · assignment · one-line note. Lets the user learn the full play, not just their slot.
6. Existing "Try another position" / "Back to library" buttons stay.

### New helper

`src/lib/iq/feedback.ts` — pure function `buildScenarioFeedback({ scenario, actors, chosenRole, chosenAnswer })` returning a typed structure (`yourJob`, `read`, `call`, `eliteCue`, `whyWrong`, `othersOnField[]`). Keeps `IqScenarioRunner` thin and makes the rationale unit-testable.

### Wrong-answer rationale generation

Deterministic, no AI call. Templates keyed on `(chosenAssignment → correctAssignment)` pairs, e.g.:
- `bag → ball`: "You went to cover a base, but no one else can field this — your glove is the play."
- `ball → backup`: "You broke for the ball, but another fielder has a better angle. Your job is to back them up so a misplay doesn't compound."
- `backup → bag`: "You set up to back up, but with this runner advancing you're needed at the base to receive the throw."
- `read → execute`, `execute → read`, etc.

When `common_mistake` is set on the chosen actor, it is appended verbatim as "Coach's note".

## Technical details

- Files touched: `src/components/iq/IqScenarioRunner.tsx` (replace the `{submitted && …}` block).
- Files added: `src/lib/iq/feedback.ts`.
- No schema, no migration, no new queries — all data is already on `actors` and `scenario`.
- Styling uses existing tokens (`bg-green-500/10`, `bg-destructive/10`, `text-muted-foreground`, `border-border`). No hardcoded colors.
- Collapsible "rest of the field" uses the existing shadcn `Collapsible` primitive to keep the card compact on mobile (current route is 402px wide).

## Out of scope

- No AI "Ask Hammer follow-up" button this turn (can layer on later via `useWhyExplanation`-style hook).
- No edits to scenario/actor seed data — if a situation has thin `coaching_note`/`elite_cue` fields, the UI gracefully omits those rows.
- No changes to spaced-repetition scoring or attempt recording.
