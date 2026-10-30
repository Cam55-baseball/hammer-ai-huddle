# Item 20 — applied philosophy, October 29

## October 30, 02:31 run — TEST weights, on-screen Confirm and Undo

- Named `wk-generate-daily` deployment completed; the server now imports the same exact TEST identity list and setting projection as the client from the shared pure builder package (109 sources; six parity cases passed).
- At 390×844 the owner read the stored weights, entered defense **1 → 2** with hitting/baserunning/pitching unchanged at 1, reviewed the philosophy with Hammers, and tapped **Confirm settings**. The receipt showed version 2. The TEST player's real server build saved November 2 with Fielding **Goal #1**, Hitting **Goal #2**.
- The owner tapped **Undo settings** on screen (version 3); rebuilding that same TEST date restored Fielding **Goal #2**, Hitting **Goal #1**. Canonical global values were never written by either RPC; TEST overrides were restored. Evidence `/tmp/browser/items13-20/weights.log`, exact saved payloads, review and receipt screenshots.
- **Guide note:** a weekly minimum already at the safety maximum correctly has no further effect. Minimums cannot add days above youth/injury/availability/phase limits, reduce the canonical floor, or override dose/rest rules. Selection weights change the existing goal priority, not training amounts.
- Focused tests: 45 passed across three files, including concrete 1→2→1 shared-builder ranking and unchanged drill doses. No publish, migration, cron or iOS changes.

## October 29, 16:05 run — isolated standard/tag Confirm and Undo

- Authorized additive migration `0156_philosophy_test_settings_isolation.sql` applied live. Existing standards, owner drill metadata/fix-it fields, library tags and engine weights now have per-athlete `test_overrides`. RPCs permit only the two exact marked TEST identities, reject stale/duplicate changes, and atomically append principle version, Vault audit and conversation receipt. Undo restores the previous overlay or removes the field when none existed. Global values are not overwritten; TEST principles remain excluded from global picks.
- Existing Coaching Console conversation has a settings review section: saved old value, exact entered new value, Hammers review/clarification, explicit Confirm and receipt/Undo. Reader integrations are preview-only until publishing; server composer integrations are staged, not redeployed.
- Actual 390×844 owner review changed TEST standard **65 → 70** plus eligible video `7438efa4-434b-4704-937e-490c9b45b16a` tags by removing **Contact Hitting / Contact Point**. Confirm returned version 2. The affected TEST player's real saved swing report no longer offered “Executing Elite Contact with Manny” for its Barrel control/Contact Rate goals; other eligible tagged videos filled the shelf. No new clip, measurement or finding was invented. Earlier blocked informational-video attempt was undone, never unblocked or counted as matching playback proof.
- Undo returned version 3; fresh TEST login/reload restored General's **Elite 65+** and the Manny goal video. An earlier fresh signed-in General read explicitly showed **Elite 70+** during Confirm, then 65+ after Undo. The last standard screenshot caught loading and is not counted as visual standard proof. Screenshots/logs: `/tmp/browser/item20-settings/`; changed goal shelf was inspected visually, restored values through UI and canonical readback. Runtime page errors: zero.
- Global baseball/softball `elite_grade` remained 65; original library tag arrays stayed unchanged throughout. Scoped changes were undone. 8 focused files / **70 tests passed**; automatic preview build OK 16:19:15 UTC. No publish, edge redeploy, cron, iOS or real-player changes.

**Still OPEN:** minimum changes currently cannot increase the sustain ceiling (six days, youth/injury limits preserved); bunting/conditioning minimum consumers are not wired to the scoped values. Engine-dynamic weights have storage/Confirm isolation but no new daily-prescription consumer is claimed. Drill/fix-it and prescription-weight server integrations are staged and need a separately named rollout plus real downstream acceptance. This run proves the standard/tag path, not full adapter completeness or a fresh next-plan/server-analysis build.

**OPEN: partial canonical-setting implementation, not complete acceptance.**

## October 29, 12:32 run — beyond-cue adapters: BLOCKED, not live

- Reviewed the actual settings and their consumers; no Confirm/Undo adapter or live standard/tag proof is claimed in this run.
- Standards are existing `mastery_identity_settings`, keyed only by `sport` (baseball/softball). Coaching Console's `MasterySettings` and `PitchingStandardsSettings` write these shared rows; `useMasteryIdentity` reads them for every athlete of that sport. There is no TEST athlete discriminator. Changing one shared standard with a TEST-only receipt still changes real players.
- Existing drill tags/fix-it mappings are `owner_drills.placements`, `fault_keys`, `routine_role`, `skill_area`; `rowToDrills`/`mergeCatalog` and `ownerPlanDrills` consume them. These rows have no `visible_to` or equivalent athlete scope. Existing video tags are `library_videos.tags`/`formula_phases`, likewise without athlete allowlisting. A TEST name or receipt does not isolate either catalog.
- Existing `wk_movement_catalog.visible_to` **does** support server-enforced TEST-only scope, but cannot substitute its fields for Coaching Console standards or skill-drill/video tags.
- `engine_dynamic_weights` is used by `compute-hammer-state` and engine optimization, not the skill daily-plan prescription ranking. Editing it and calling it a prescription-weight adapter would misrepresent downstream behavior.
- Weekly minimums remain canonical code: `src/lib/hammer/week/weeklyVolume.ts` (hitting 3, defense 4, baserunning 1, bunting 2 and conditioning 2); `weeklyGoalBlocks` uses existing saved goal order and safety/availability. No existing persisted prescription-weight/minimum editor was found. No floor was weakened or replaced with a parallel rule system.
- Required next authorization: a **named additive TEST-isolation migration and existing-reader integration** for the current standards/drill/video surfaces, plus a named atomic multi-setting Confirm/Undo RPC. All affected client and deployed server readers must honor that scope before any standard+tag Confirm. Owner-selected new weight/minimum values are also needed when changing those binding rules; none were invented.
- No migration, deployment, shared settings edit, real-player effect, or fabricated downstream proof occurred. Item20 remains OPEN; previous cue-only receipts below are retained as historical proof, not beyond-cue acceptance.

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