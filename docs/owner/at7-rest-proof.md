# AT7 — Oct 21 rest / substitution audit and first implementation

## Delivered and checked

- Full equipment-question / existing-alternative audit: `oct21-equipment-swap-audit.md`.
- Single pure run-rest source: `_shared/wic/runRest.ts`; 10/30/50/60 yards → 60/180/300/300 seconds. Invalid/missing distance remains unknown, not guessed.
- Speed and lift sprint log timers and plan text use the capped rule. PAP stores explicit run distance and after-run rest, shows an after-run timer after rating, and retains the original lift-to-action rest bands and all stop/throw caps.
- Conditioning counter handles explicit existing base routes only, 30 seconds until four bases, then 300 seconds and reset. Confirming a rep in the counter does not credit completion or invent measurements. Single-double-single arithmetic and UI double-double transition tested.
- Important remaining conditioning scope: recovery/position movements and `repeat_43ft_sb` are NOT relabeled as base-running. Full game-like conditioning prescription conversion for both sports remains open; a 43-foot pitching-distance sprint is not a softball base.

## Tests and live status

- Fresh full suite: **458 files / 3,710 tests PASS**, four disjoint bounded batches, `/tmp/at7-full-{0,1,2,3}.log` (905 + 887 + 953 + 965 tests).
- `deno check --no-config supabase/functions/wk-generate-daily/index.ts` initially exposed three existing errors: untyped class-key indexing, missing mobility role in the local type, obsolete ignored `liftCount` argument. Corrected without changing valid class comparisons, mobility work, or watchdog behavior. Final check clean: `/tmp/at7-deno-check-final.log`; watchdog/conditioning/speed tests 46 PASS.
- Owner-authorized **wk-generate-daily redeployed**; live authenticated `verify_saved: true` on TEST player's existing Oct 20 plan returned 200. This verifies serving/read, not newly generated rest metadata or new conditioning routes.
- Actual TEST college player, real phone-size sign-in (390×844), existing Sport-Stance Reactive Start 60 feet: timer starts at 2 minutes and reads 1:59 with matching Why line. Screenshot inspected: `/tmp/browser/at7/speed-rest.png`. Zero page errors/overflow. Missing-distance sled retains unknown rest. No training logged.
- Conditioning phone fixture attempts could not complete: the existing evidence popup detached during interaction, both signed-out and signed-in. Not passed or claimed as hosted acceptance; component logic tests passed. Temporary fixture changes reverted.
- TEST temporary passwords scrambled in every proof's finally block. No equipment, goals, relationships, measurements, completions or swaps created. Coach service retained. No publish, cron or iOS changes.

## Still open — not implemented

- Every-card short AI Swap, full server-certified same-category/intent/dose legality, receipt/reason save and today/always availability memory.
- Four requested affected-player replacement/save-readback proofs (machine→flips, barbell, open field, foam roller).
- Up-front equipment-question removal is intentionally not done before safe saved replacement paths exist; existing inventory memory and owner Vault requirement metadata retained.
- Complete all-speed/PAP sprint paths with missing distance, every sport's base-running conditioning prescription and positive conditioning phone proof.

**Owner wording interpretation:** isolated “3 seconds” after a double treated as **30 seconds**, consistent with the approved rule; owner confirmation remains requested.

**Ready to publish: no.** Earlier AT6 open items and nightly acceptance remain open; no future scheduled run is claimed.