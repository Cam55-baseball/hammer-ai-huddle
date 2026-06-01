# Phase D — Completion Plan (Remaining Items Only)

Scope: finish the three open items from Phase D. No new primitives, no RR-5…RR-10, no schema rewrites, no recruiter/injury/narrative/career/exposure work. Presentation-mode lock honored: bug fixes, copy, polish, resilience only.

## 1. Wire `send-parent-invite` into `ParentInvite.tsx`

- After `createParentInvite` succeeds (canonical event already emitted), invoke the `send-parent-invite` edge function via `supabase.functions.invoke`.
- New email input field (optional) — if empty, skip transport entirely and surface "Copy link instead" as the primary path.
- Transport result is **non-blocking**: relationship is created regardless. Surface a calm status row using `copy.ts` keys:
  - sent → "Invitation sent."
  - skipped_disabled → "Email isn't set up yet — copy the link instead."
  - failed → "We couldn't send the email. Copy the link instead."
- No red error styling. No retry spam — single dispatch per click, debounced.
- Pass `invite_url` constructed from current origin + `/parent-invite/accept?token=...`.

## 2. Phase D Operational Audit Doc

Create `docs/asb/phase-d-operational-audit.md` covering:
- Inventory of what shipped (tables, edge function, projections, pages, copy keys).
- Replay parity: confirm `safetyState` + `safeguardingNotifications` projection is deterministic given same row prefix + status snapshot.
- Failure isolation matrix: email failure ↛ canonical event failure; notification status row absence ↛ delivery decision change.
- Dedupe contract: `(source_event_id, route)` unique projection key verified by existing test.
- Mobile audit notes for 390/440 widths on `/safety`, `/relationships/settings`, `/parent-invite`.
- Three calm ratings: emotional clarity / parent trust / operational durability.
- Final verdict line: **READY / READY WITH CONDITIONS / NOT READY**.

## 3. Final Verification

- `bunx tsc --noEmit`
- Full relational test suite (`bunx vitest run src/lib/runtime/relational`)
- Spot-check `/safety`, `/relationships/settings`, `/parent-invite` at 440px via browser tool — confirm calm copy, single primary action per surface, no red panic styling, skeletons during load.

## Files

**Edited:**
- `src/pages/ParentInvite.tsx` — add optional email field, invoke edge function, status row
- `src/lib/relational/copy.ts` — add transport status keys if missing
- `docs/asb/phase-d-operational-audit.md` — new audit doc

**Not touched:** schema, edge function source, projection logic, emitters, App.tsx routing.

## Out of scope (stop gate held)

RR-5…RR-10, recruiter workflow, injury lifecycle, narrative/career/exposure systems, new primitives, schema rewrites, projection rewrites.
