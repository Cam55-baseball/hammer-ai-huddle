# Simple Swap — proof (Oct 21)

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
