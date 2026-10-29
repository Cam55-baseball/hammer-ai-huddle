# Item 20 — applied philosophy, October 29

**OPEN: partial canonical-setting implementation, not complete acceptance.**

## Built and live
- Existing `wk_movement_catalog.cue` is the actual setting, not a new rule catalog. Owner chooses an existing TEST-only exercise and enters exact replacement wording. Hammers asks clarifying questions; the proposal shows the current and replacement cue, and explicitly identifies unchanged settings.
- Owner-only `owner_confirm_test_cue` locks the canonical catalog row, compares the reviewed old value, verifies every allowlisted account is marked TEST, writes the cue, append-only principle version, existing Vault audit and conversation receipt in one transaction. Any failure rolls the transaction back.
- `owner_undo_test_cue` locks current version/catalog, refuses newer or externally changed values, restores the exact before cue, appends an Undo version and saves audit/thread receipt atomically.
- TEST principle receipts are explicitly excluded from `active_principle_picks`; no global teaching/ranking effect. Migration 0153 applied; no backend function redeployment, publishing, cron or iOS changes.

## Actual proof
- Owner at 390×844: selected TEST Item7 Exercise proof2 phone → requested clarification → answered with exact wording → preview showed From/To → Confirm returned version 2 → one-tap Undo returned version 3 → reload retained both receipts and conversation.
- Canonical change: “Follow the written movement and stay in a comfortable range.” → “Follow the written movement. Stay in a comfortable range.”
- Current principle readback is inactive with immutable versions 1, 2 and 3; version 2 contains the applied receipt and version 3 the undone receipt. Version 1 is the existing owner_save_principle creation, all within the same transaction.
- No player-plan or analysis was fabricated or run to claim downstream use. **TEST player's next analysis/plan showing the cue remains unproven.** The exercise catalog row's scope is checked by the server on Confirm and Undo, not trusted from a browser.
- Browser evidence `/tmp/browser/item20/`: clarification, before/after proposal, live receipt, Undo/reload. Several earlier model replies were refused as malformed or missing setting changes; those refusals caused no application.
- Tests: 3 files / 11 passed / 0 failed. Automatic preview OK at 05:58:03 UTC. Full suite not run.

## Remaining requested coverage
- Only existing TEST exercise cue text is executable through this conversation today. **Standards, drill/video tags, fix-it mappings, prescription weights and minimums are not wired to Confirm/Undo.** Some are existing database settings; other cue/minimum consumers are code-backed and need explicit canonical configuration integration, not an invented second rule system.
- No claim that the analysis model or Hammer chat reads this catalog cue. Existing plan consumers can carry catalog cues, but affected-player next-plan acceptance was not exercised.
- No real-player setting was edited; dose, safety, selection, weights, standards, tags, and minimums remain unchanged. Item 20 remains OPEN and publish readiness remains NO.