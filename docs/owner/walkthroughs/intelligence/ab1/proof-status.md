# AB1 — October 18, 2026

Ready to publish: **no**.

## Coach checkout and agreement votes
The kept Demo Coach signed in privately through the password API. Real `create-staff-checkout` returned 200. Two new live coupons and three new promotion codes were added during compatibility investigation; no existing Stripe object was edited or deleted. The first coupon was requested with a Coach-product restriction, but reads did not return that restriction. A second API-version-compatible creation also omitted it. Do **not** distribute these codes as proven Coach-only discounts.

Stripe's hosted phone checkout rejected all attempted codes with `payment_pages_promotion_code_invalid`, although API reads said active/valid, 100%, once, unused, and no first-time restriction. The account and checkout product matched. A fresh checkout did not resolve it. The root cause is unresolved; no more codes were created after these checks. No subscription or charge was created, so there is nothing to cancel. The unredeemed added objects remain unchanged under the add-only rule. No real coach vote was submitted and no paid-access bypass was used.

## Assessment
The kept college test player had no permanent Start timestamp or assessment. On a 390×844 screen, Start was disabled before Completed. Tapping Completed saved successfully; after reload Start was enabled. Both screenshots are saved here. No optional answers were required. The test assessment was deleted afterward, returning the account to its original absent assessment. Start was not pressed, so no permanent start or plan was created. Completed→Start unlock is proven; Start→generated-plan read-back remains open.

## Five-player access check
The General's Game IQ tab opened without horizontal overflow as the college/new-player, high-school hitter and two-way test accounts. The pitcher and softball accounts stopped at the existing updated-terms/signature gate. Those gates were not bypassed or silently accepted. The hitter has no logged games and the pitcher has no saved reports, so these accounts do not yet satisfy the requested 10+ games / 5+ reports proof cohorts. Empty access checks are **not** complete step 5–8 proof.

Screenshots: `new-player-game-iq.png`, `hitter-game-iq.png`, `two-way-game-iq.png`; actual blocking screens `pitcher-game-iq.png`, `softball-game-iq.png`.

## Verification and cleanup
Focused tests: 3 files / 12 tests passed (assessment completion/start rules and unchanged grades during agreement feedback). Preview build OK. No app code, deployments, migrations, publishing, cron or iOS changes in AB1. Kept test-account passwords were privately reset for approved role checks. No player game/report/measurement rows or vote rows were created. The temporary assessment was removed. No subscription was created. Stripe additions remain unused and are not certified for checkout.

## Still open
- Resolve Stripe promotion rejection, complete demo-coach checkout, prove real votes and cancel only that new subscription.
- Start→plan UI read-back, linked-parent positive proof, authenticated nightly outcome proof and measurement-grade rows.
- Complete Intelligence steps 5–8 with populated cohorts and all five player types; pitcher/softball updated legal acceptance is currently uncompleted.