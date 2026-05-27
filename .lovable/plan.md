# WAVE 3.5 — Final Pass

Finish the remaining presentation-layer work. No backend, schema, replay, or doctrine changes.

## 1. IdentityCommandCard.tsx (edit)
- Import `pickRotatingAlert` from `src/lib/identity/rotatingAlert.ts` and `deriveTodaysStandard` from `src/lib/standard/todaysStandard.ts`.
- Replace the existing multi-alert / multi-pill block with **one** rotating alert (priority order already defined in `rotatingAlert.ts`). If none → render nothing (no empty shell).
- Add a single "Develop This Week" sentence sourced from the identity snapshot's current focus area (plain English, no jargon).
- Render Today's Standard sentence in the existing standard slot using `deriveTodaysStandard(...)` — no new card, no new strip.
- Add a bottom motivational line tied to the standard's `tone` (one short sentence).
- Language sweep on all visible copy in this file (emit→update, lineage→history, projection→summary, runtime→live, envelope→range, etc.).
- Reduce pill count above the fold; widen spacing; larger heading.

## 2. Cleanup
- Delete `src/components/runtime/YourNextStep.tsx` (already replaced by `CommunicationAI`; confirm no remaining imports first).

## 3. Verification
- Grep for `YourNextStep` references — must be zero.
- Grep visible-copy jargon list in `src/components/identity/` and `src/components/command/cards/` — must be zero user-facing hits.
- Visually confirm: Identity card shows tier, one alert, Develop This Week, Today's Standard, motivational line — in one breathable column flowing into CommunicationAI.

## Out of scope
GamePlanCard, ASB ledger, projections, replay, parity, capability gates, edge functions, migrations, identity tier engine, day state engine, behavioral events backend.

## Files
- edit: `src/components/identity/IdentityCommandCard.tsx`
- delete: `src/components/runtime/YourNextStep.tsx`
- edit (if jargon found): `.lovable/plan.md` status note
