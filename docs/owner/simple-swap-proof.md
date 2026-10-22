# Simple Swap — proof (Oct 21)

## Current owner gate — October 22, 00:17 UTC

**Not proven. Do not set `swap_v2` to ALL.** The owner now requires all four positive real-plan phone proofs before broader enablement; earlier deferred-live wording below is historical.

### Work and verified evidence this continuation
- TEST college equipment was saved through the actual 390×844 review screen, including barbell, cable stack, foam roller and field. Existing saved answers were retained.
- The app's signed-in daily-plan build path was invoked for October 22–24. Existing plans were retained or adjusted through the supported `player_request` equipment-change reason; no artificial prescription was inserted.
- Today and Always missing-equipment records now share a scoped writer. Today remains dated; the future generator reads only Always records. `plan-swap` and `wk-generate-daily` were redeployed only for the authorized Swap equipment checks. A positive save and actual memory-row readback are **not verified**.
- Replacement choices now require current saved inventory, including a partner or safe space when the catalog declares one; neither is assumed available. Always-missing requirements are excluded even when no same-family fallback exists. Chronological confirmed-have answers clear earlier missing answers using the same normalized equipment names. Failed/incomplete equipment reads stop rather than silently ignore memory.
- Fresh phone check after deployment: the real TEST college player's Resist-Turning Press still returns HTTP 200 and the visible honest refusal. All three October 22–24 supported equipment-change builds returned `ok: true`; October 23 adjusted speed while keeping existing conditioning and lifts. These were normal app-client build calls, not three future-day UI walkthroughs or positive Swap proofs.
- The real phone sheet opened on today's saved Resist-Turning Press. Marking med ball missing returned live HTTP 200 and displayed “No safe swap found for this one; skip it today.” No swap or memory row was written. This is an honest refusal, **not** any of the four required positive proofs.
- Affected regression checks: 11 files / 72 tests pass. Latest preview build reports OK (00:13:31 UTC). The complete release suite has not been rerun in this continuation because ordered step 1 remains incomplete.

| Required case | Current status / exact missing capability |
|---|---|
| Machine → partner flips, Today | Not saved or phone-proven. Machine hitting drills live in generated skill blocks, not the `wk_prescriptions` rows that `plan-swap` accepts. Existing sport drill definitions include `machine_bp` and `flip_drill`, but the generated block lacks canonical replacement identity and a server-validated, reload-stable swap path. |
| No barbell, Always → next build avoids barbell | Not saved or phone-proven. Reviewed equipment and genuine rebuilds did not produce a barbell source row in these three TEST plans. The updated dated/persistent writer is unit-tested, not a substitute for the requested saved row and next-build proof. |
| No open field | No positive saved proof. October 23 has a real `1st → 3rd` field route. Its existing conditioning family has no declared field-free equal-intent option. Do not invent a running replacement or call a safe refusal a successful save. |
| No foam roller | Not saved or phone-proven. “Mobility + foam roll” is a generated recovery block. Its current dialog explicitly has no checked replacement, and legacy adjustments cannot rewrite it. Duration/intent-compatible catalog replacement and persisted readback are still missing. |

### Additional source audit
The generated machine-at-bats and recovery drills currently have no canonical slug in `dailyPlan.ts`. The two sport catalogs contain `machine_bp` and `flip_drill`, but do not declare equal swap intent or complete age/season/injury metadata; they also describe different intensity. Neither a copied 25-rep default nor a matching transfer label certifies this swap. The recovery source is a combined whole-body mobility/foam-roll drill, not the catalog's isolated thoracic or lat foam-roll row. The existing mutable coach snapshot is not server-owned prescription authority and is automatically overwritten from the local generated plan. Connecting it directly to a save would not establish a safe, reload-stable replacement. No such shortcut was implemented.

### Next required implementation, without a second builder
Connect canonical skill/recovery identities to a server-checked block Swap and the existing saved plan; preserve dose, safety and equipment requirements, and render the saved result after reload without the current automatic snapshot overwrite. Offer only verified same-intent catalog choices. No locks, Undo, made-up plan rows or invented alternatives.

Private evidence: `/tmp/browser/swap-owner-oct21` (`next-phone.log`, `no-safe-choice.png`, `next-build.log`, `next-regression.log`, plus earlier equipment review evidence). No publication, cron or iOS change; no Swap was saved. TEST equipment remains as authorized starting memory for the unfinished proofs. No Organization plan was reactivated in this continuation. Live switch readback remains `swap_v2 = off` with existing authorized exceptions; not ALL.

**Ready to publish: no.** Live: `plan-swap` (options + save), `wk-generate-daily` (honors "always missing"), new `swap_log` table. No publish, cron or iOS changes.

## Built
- Swap button on every saved-exercise card (lift, speed, conditioning, bat speed, windmill now included). Pitching outings are pitch-count records, not saved exercises, so they have no Swap. Coach-sent folder workouts are not plan rows; Swap is not mounted there yet.
- Sheet: "What's missing today?" gear checkboxes + one free-text line (AI may only pick from the card's own gear), Just today / Always, 1–3 choices with one-line reasons, or "No safe swap found for this one; skip it today."
- Choices: same category, family, intent (primary adaptation) and dose unit; no missing gear; age, season (incl. no in-season eccentric overload) and injury flags. Dose fields are kept, never changed.
- Save: one server call re-checks the choice, replaces today's row (keeps sets/reps), writes `swap_log`; "Always" writes `athlete_equipment_memory`.
- Builds: generator drops movements needing "always missing" gear when the same family has another option.
- Up-front equipment step removed from onboarding flow and the assessment review menu; saved answers kept and still editable from Review.

## Phone proof (390×844, TEST player via real sign-in form, password scrambled after)
- Med Ball Rotational Shot-Put, missing med ball → live 200, "No safe swap found for this one; skip it today." Correct: no same-intent (bat speed) alternative without a med ball exists in the catalog.
- Cross-Band Series, missing bands, Always → live 200, no safe swap; nothing written.
- Screens: `/tmp/browser/swap/3.png`, `4.png`; script `/tmp/browser/swap/proof.py`.

## Not proven — why
The four named cases (machine → partner flips, no barbell, no open field, no foam roller) cannot run: the TEST player's Oct 21 plan has no machine, barbell, field or foam-roller exercise, and inventing plan rows would be fabrication. The only field row is on the Apple-review child account, left untouched. Run on the next built plan that contains those exercises. "Next plan avoids barbell" is likewise unproven until a build occurs.

Also remaining: the Today plan's fielding "Confirm my equipment" card is still an up-front equipment question.

Tests: 28 files / 156 tests pass (incl. 5 new simple-Swap rules).
