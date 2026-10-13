# Version 1 readiness audit — 2026-10-13

Plain-English results. "Fixed" means fixed in this round. "Proven earlier" points to the regression report entry. "Not yet" means not run this round, with the reason.

## a. Gaps, dead pages and things not working
Method: opened all 181 app pages on a phone-size screen as the test player, then the coach and organization pages as the test coach and test org.
- **Fixed:** the dashboard and every coach page crashed for a moment ("Something went wrong") while the new plan tiles were being added. Re-checked: no crashes.
- **Working as designed, not bugs:** staff-only pages (the runtime pages, recruiting standards, coach compliance) send a player away after a short moment. The Apple sign-in page hands off to Apple.
- **No dead pages found:** every page either opened or sent the visitor somewhere sensible.
- **Larger improvement for owner approval:** the redirect away from staff-only pages shows a blank screen for about 1–2 seconds first. A loading screen there would feel more finished.

## b. History tab
- **Fixed:** History showed a practice-session grade rounded to the nearest whole number (e.g. "47"), breaking the "20–80 by 5s" rule, with no label. It now reads "Grade: 45 · Acceptable".
- **Fixed:** the Vault History scout grades showed raw numbers with no band. They now use the same rule (5s at 20 and above, one decimal below 20) plus the band (Sub Par / Acceptable / Elite).
- **Consistent:** the coach report grades and the rating bands share the one grade rule (tests: ratingBand.test.ts).
- **Not yet:** a timed speed test of History with 5+ reports per type.

## c. Stress tests
- **Video analyses and report cards:** shared rules proven by the test suite (2,894/2,894 PASS this round). Guest analysis proven end to end (OO3). **Not yet run this round:** a live analysis of every type in each sport, with 5+ reports. Each one costs real AI credits, so it needs the owner's OK.
- **Game logging:** both coach options and the wrong-player block PASS (OO1); player confirm/flag labels PASS. Arm-ledger feed and heat maps are covered by tests only.
- **Hammers Today:** 8-week simulations, 720 combinations, 0 rule breaks (MM4). The rendered text was reviewed at phone size (MM7).
- **Coach and Organization plans:** plan on/off from Stripe events PASS. Extra seats PASS (5+2 seats, MM). Sponsorship PASS. **Adding a coach to an organization through real checkout** waits on the owner's 3 test checkouts.
- **Initial assessment:** order rules (1→2→3 locked, 4–6 any order) and the coach on-the-spot check PASS (OO3).

## d. Unity
- One player record: pairings go only through connection requests; no duplicate profiles were found in earlier rounds.
- One grade rule: the History fixes above remove the last two screens found with a different rounding.
- **Not yet:** a full screen-by-screen read for wording that contradicts other screens.

## e. First five minutes
- **New player:** the dashboard leads with Identity → Before You Start → Hammers Today. The Coach and Organization plans now appear as a quiet "For your coach or facility" pair at the very bottom.
- **New coach or organization without a plan:** used to hit a bare "Coach plan needed" page. **Fixed:** that page now shows the two Elite plan tiles with price, value and a Start button.
- **Scout:** sees no plan advertising (rule kept).
- **Unfinished feeling:** the privacy-update banner covers the bottom of the dashboard on first visit until it's closed. Shrinking it is a design change, so it's listed for owner approval.
