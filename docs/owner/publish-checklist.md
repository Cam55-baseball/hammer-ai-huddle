# Publish checklist — updated 2026-10-18

Plain-English list of what must be true before publishing. Current answer: **Ready to publish: NO.**

## Current Oct 17 fixes status (supersedes older checks below)
- Full suite: 2,937/2,937 PASS; preview build OK.
- Owner menu, Subscribers current-plan grouping, drill activity coverage, read-only settings, Stripe links and analysis-cost screen checked at phone size.
- Still required: 12 suitable real analysis clips (two per sport/type); coach agreement votes through the real UI; new-player Completed → Start → saved Today flow; parent sharing/scout visibility saves; completed health profile redo; populated History/practice/report/Train-next checks.
- First-start server guard is staged, not applied; owner must authorize that named migration. No publish, cron or iOS change made.
- Earlier “6/6 analyses” evidence is historical, not proof for the current Oct 17 request.

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

1. **Owner's 3 test checkouts** (Complete Pitcher, Hammers Coach, Organization + extra seat, each with its one-time 100% code from the private email). Once the Organization one is done I can prove on Stripe's real page: sponsoring a player, and adding seats later through Manage plan.
2. **Under-13 full signup** — the owner runs it himself with his card and the 4th code (private email "[PRIVATE] Hammers under-13 test code"). Afterwards: cancel that test subscription and flag the account + consent record as TEST.

## Resolved since 2026-10-13

- **Stripe checkout code box:** not an app problem — Stripe refuses codes typed by an automated browser. The codes' settings were fine; the owner's own typing works.
- **Sponsoring a player who already pays:** PASS — no double charge; the player's own plan runs to its paid end, then org billing starts. Both test subscriptions canceled.
- **Coach-tools plan switch:** ON (`staff_plan_gate`). Coaches without a plan see "Coach tools are now part of the Hammers Coach plan" with Subscribe and "Join through your organization". Owner and admins unaffected.
- **Every purchase path reaches Stripe's real checkout page** (proven signed in as each test account, phone + desktop, screenshots in docs/owner/walkthroughs/): Organization + 1 extra seat ($1,150/mo, both items listed), Coach ($300), Complete Pitcher ($200). Fair-use and auto-renew acceptances are saved before checkout. Cause of the owner's org-plan failure found and fixed: checkout opened in a new window, which phones block silently — now same-tab, with a visible error if checkout can't start.
- **Live video analyses:** 6/6 completed (baseball + softball × hitting, pitching, throwing; 21–38 s each), each with a plain-words summary, drills and a report card. Test videos and reports deleted (backup kept).
- **Human walkthroughs at phone size** (screenshots in docs/owner/walkthroughs/): player (college baseball), softball setup all 12 steps, pro/softball-pro/two-way/ramp-up players, teen with parent signature, under-13 player + parent, scout, coach, organization admin — all PASS. Every one of the 177 screens has a visible Back or Close (checked as owner and as player).
- **Owner-found fixes 1–9:** all done except the sponsorship/seats part of #8 (needs the owner's org checkout). Details at the top of roadmap.md.

## Owner decisions still waiting

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
- **Initial assessment** — optional starting checklist. Every answer/test can be skipped; tap Completed, then Start to build Today. Existing started players stay unlocked. Server enforcement and new-player proof remain pending.

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

## Changes 2026-10-14 → 10-16 (how to use, how to check)
- **Restored sign-up question** — Sign up → "Choose Your Role": Player, Scout/Coach, or Organization. Check: each choice opens its own sign-up.
- **Coaches without approval** — an adult (18+) is a full coach right after coach setup. Check: no "waiting for approval" step; coach tools still need the Hammers Coach plan.
- **Organizations active immediately** — Check: after sign-up the org shows "Active — you can add athletes and staff".
- **Scouts-only approvals** — Owner dashboard → Approvals shows only the Scouts queue. Check: approve/reject works as before.
- **Request buttons** — Coach Dashboard "Add a player" and Organization dashboard "Add athlete" (search and send, or share team code/QR). Check: the player sees the request in Requests and taps ✓ Accept; the coach list says "Connected"; the athlete appears on the roster.
- **Plan buttons** — Staff Plans "Check my plan" shows the plan and seats with a button to the right dashboard; "Manage my plan" opens Stripe's billing page (new tab inside the preview).
- **Side-menu dashboard entries** — "Organization dashboard" and "Coach Dashboard" right under Dashboard on every screen with the menu. Check: from Dashboard, open the menu and tap it.
- **Test purchases:** all owner test subscriptions found this week are cancelled.
