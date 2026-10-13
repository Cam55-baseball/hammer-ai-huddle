# Publish checklist — 2026-10-13

Plain-English list of what must be true before publishing. Current answer: **Ready to publish: NO.**

## Proven (PASS)

- Full test suite: 2,894/2,894.
- Player plans: 8-week simulations, 720 player combinations, 0 rule breaks. Plan 4 changed nothing in player plans.
- Existing data intact: 204 profiles, 191 active subscriptions, 69 consent records (read-only counts).
- Daily plan job: builds every day 2026-10-07 → 2026-10-12.
- Missed-workout marking: a past-dated workout flips to "Missed" (proven with a throwaway test workout, cleaned up).
- Renewal reminders: on for everyone, non-staff refused, staff practice run sends nothing when nothing is due.
- Fair use: in Terms version 2, coach/org buyers accept it at checkout, existing players are not asked again.
- Coach logging (Option 1 one player at a time, Option 2 lineup): wrong-player saves blocked, under-13 needs a parent present, backend-proven.
- Guest mode: nothing saved, under-13 needs parent permission, backend-proven.
- Cost tracking: main analyses + 5 smaller AI uses log model, tokens, cost.
- 30-per-hour fair-use limit: pauses and retries, never charges.
- Sponsorship (live Stripe): sponsor, pause, resume, cancel, and player-refusal all PASS.
- Staff plans: Organization plan turns on/off from real Stripe events within ~10 seconds.
- Phone-size pages open correctly signed in as test player, under-13 player, coach, org, parent.

## Still open (must pass before "Ready to publish: yes")

1. **Stripe checkout code box:** the checkout page rejected a valid one-time 100% code as "invalid". Cause unknown. The same code works when attached directly. Needs fixing or a decision.
2. **Sponsoring a player who already pays:** their own plan should end and org billing start with no double charge. Needs a test player with a paid plan.
3. **Real player checkout, renewal, cancel, Manage plan:** needs the owner's choice — enter a real card for the test (no charge with a 100% code), or let checkout skip the card when the total is $0.
4. **Real staff-plan checkout** (Coach $300, Org $1,000, extra seat $150): same card question.
5. **Flow-level phone proofs** signed in as test accounts: saving coach entries (both options) with the wrong-player block, the under-13 parent flow on the phone, check-ins with and without health consent, the Discipline tab, guest mode end to end.

## Owner decisions still waiting

- Test checkout: real card, or skip the card when the total is $0.
- When to turn on the coach-tools plan switch (coaches without a plan lose coach tools then).
- Rankings/MPI scores on 5s? Spaces stays OFF; Vault review queue.

## Leftover test data in Stripe

- Test customer for the Demo Organization (plan canceled, charged $0). My tools can't delete customers; you can delete it in Stripe if you like.

## Switches — 2026-10-13 (owner OK by name)

- Coach and Organization plans switch: `staff_plan_gate` in the backend settings table `app_settings` (not `wk_feature_switches`, not code/env). Was missing (= off); now `{"enabled": true}`. Proven: Pricing, Staff Plans and Demo Upgrade show Coach $300 and Organization $1,000 (+$150 seat) on a phone screen.
- Under-13 signup switch: `under13_parent_program` in `wk_feature_switches`. Already `all` (on) since 2026-10-06. Proven: signup answers enabled; the under-13 screen offers the parent path and its 3-step intro. Full signup (creates a real account + permanent legal consent record + card payment) not yet run — waiting on owner.
- Still open: owner's 3 test checkouts.

---

# Owner guide — every feature, how to use it, how to check it

## Player
- **Dashboard** — the home screen. Steps: sign in. Check: Identity card, Before You Start, then Hammers Today; at the very bottom, a quiet "For your coach or facility" pair.
- **Hammers Today** — today's training plan. Steps: open Dashboard → Hammers Today. Check: every exercise has sets/reps or time, with labels; it changes when the phase changes.
- **Video analysis** — upload a clip and get a report card. Steps: pick a module → Upload → wait. Check: grades in 5s (one decimal below 20), a band (Sub Par / Acceptable / Elite), and a date.
- **History** — every past report, test and grade. Steps: side menu → History. Check: each grade reads "Grade: 45 · Acceptable".
- **Vault** — check-ins, discipline, readiness, tests. Steps: side menu → Vault. Check: the Check-in, Discipline and Readiness tabs open.
- **Check-ins** — morning, before training and night questions. Check: coaches see answers only when the player turns health sharing on.
- **Game logging** — log your own games. Check: entries say "Source: athlete-entered"; coach entries ask "Yes, that's right / Something's wrong".
- **Initial assessment** — the 6-step starting test. Check: 1→2→3 in order, then 4–6 in any order.

## Parent
- **Teen waiver (13–17)** — a parent signs before physical training opens. Steps: the player taps "Ask my parent" → the parent opens the email link → signs. Check: "Signed. Thank you."; the player's plan opens; the same link can't be used again.
- **Under-13 account** — the parent creates and controls it. Steps: Sign up → under-13 birthday → "I'm the parent or guardian — continue" → details → sign → pay. Check: the account opens only after both the signature and the payment.
- **Parent controls** — pause, withdraw or delete the child's data.

## Coach
- **Hammers Coach plan ($300/month)** — opens all coach tools. Steps: Dashboard tile "Start Hammers Coach" → checkout. Check: the coach dashboard opens; without a plan, coach pages show the two plan tiles.
- **Coach dashboard** — the roster with each player's readiness, discipline, development, games and reports.
- **Game logging, one player at a time** — the page is locked to one player. Check: a save for any other player is refused.
- **Lineup mode** — tap the jersey number, then confirm the name. Check: the wrong number or name is refused.
- **On-the-spot assessment** — record a movement check in person. Check: the player sees "Coach-verified"; under 13 needs the parent present.
- **Guest mode** — analyze a player who has no account. Check: "Guest result — not saved"; nothing is stored.
- **Weekly summary, calendar, send workouts** — open them from the coach dashboard.

## Organization
- **Hammers Organization plan ($1,000/month, 5 seats; extra seat $150/month)**. Steps: Dashboard tile "Start Hammers Organization" → pick extra seats → checkout. Check: the seat count matches; the facility dashboard opens.
- **Add a coach** — invite by code. Check: the coach appears under staff and uses a seat.
- **Sponsor a player** — the org pays for a player's plan. Check: a player who already pays keeps his own plan to the end of his paid period, then the org's billing starts; there's no double charge.

## Scout
- **Scout view** — sees only athletes who allow it; minors only with a guardian's OK. Check: no plan advertising is shown to scouts.

## Owner
- **Switches** — Coach/Org plans (`staff_plan_gate`, in the settings table) and Under-13 (`under13_parent_program`, in the feature-switch list). Both are ON.
- **Stripe codes** — every test code is one-time, limited to one product, and expires in 7 days.
- **Before publishing:** finish the 3 test checkouts and the under-13 test checkout, and confirm each one is canceled afterwards.
