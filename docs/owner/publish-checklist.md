# Publish checklist — updated 2026-10-20

## AK1 Assessment Mode and plan prompts — in progress
- Assessment Mode foundation is in preview: one screen per step, embedded S2/analysis/Vault entry, saved skips/navigation, X and Continue guard. TEST college phone proof shows both hitting and throwing buttons and completion enables Start. Evidence: `docs/owner/walkthroughs/assessment/ak1/`.
- Backend assessment navigation fields were added without removing data. `plan_prompts_v2` is OFF, buildable=false, awaiting owner cadence confirmation. Existing calendar game prompt stays on; subscribed scheduled-practice reminder is added to the one plan, with real PracticeHub completion, not tap-as-completion.
- Not ready: all-program/all-sport/$0 payment proof, completed embedded tests/analysis, coach/org shared mode, General/onlooker results, Start-to-saved-plan proof, remaining prompt adapters and full eight-week simulation. These are not covered by earlier final-stretch proofs.
- Game IQ and Report Card remain owner/admin-only, labeled Internal — not released. No publish, function redeploy, cron or iOS change in AK1.

Plain-English list of what must be true before publishing. Current answer: **Ready to publish: NO.**

## Latest AI3 status — Oct 19 04:05 UTC
- Scoped final-stretch inputs cleaned up after a timestamped private backup: 29 TEST games, 52 pitches, 42 at-bats, two coach entries and the retained sprint. Their remaining counts are zero. Phone check as the TEST college player shows empty Games and Game Reports.
- TEST Child is now marked as a system TEST account and excluded from rankings. Account and legal consents stay; TEST coaching principle stays OFF, Version 2, with the safeguard untouched.
- Still pending: first nightly result after 04:30 UTC, final retained-TEST exclusion sweep, confirmed live TEST subscription identities and cancellation at the very end, and final switch verification. Earlier billing notes conflict, so no plan was canceled in AI3.
- HEVC conversion is proven; camera measurement impact is not. The owner iPhone live-check note below remains required.
- Older dated sections below are historical evidence, not a claim that every current publishing check passed.

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
- **Live video analyses:** 6/6 completed (baseball + softball × hitting, pitching, throwing; 21–38 s each), each with a plain-words summary and drills (Report Card is now off for everyone — owner, Oct 18). Test videos and reports deleted (backup kept).
- **Human walkthroughs at phone size** (screenshots in docs/owner/walkthroughs/): player (college baseball), softball setup all 12 steps, pro/softball-pro/two-way/ramp-up players, teen with parent signature, under-13 player + parent, scout, coach, organization admin — all PASS. Every one of the 177 screens has a visible Back or Close (checked as owner and as player).
- **Owner-found fixes 1–9:** all done except the sponsorship/seats part of #8 (needs the owner's org checkout). Details at the top of roadmap.md.

## Owner decisions still waiting

- Rankings/MPI scores on 5s? Spaces stays OFF; Vault review queue.

## Leftover test data in Stripe

- Oct 19: democoach Coach plan and TEST Child plan cancelled through the app's own cancel function; both show cancelled, no modules.
- Nightly learning run Oct 19 04:30: succeeded (nothing to learn yet). Scheduled-jobs review: docs/owner/cron-audit.md.

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
- **Video analysis** — upload a clip and get the analysis. Steps: pick a module → Upload → wait. Check: findings are labeled Estimated / Not measured, and no video-based number grade shows anywhere — it reads "Grade coming with camera measurement". The Report Card is internal-only: owner and admin see it marked "Internal — not released"; everyone else never sees it.
- **Test results** — entered tests (sprint, jumps, verified maxes, radar or sensor speeds) still show their number, 20–80 grade and band, with source and date.
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

---

## Owner guide update — 2026-10-19 (AH7)

- **Report Card: INTERNAL ONLY (owner + admin, labeled "Internal — not released").** One switch (`report_card`, off). Players, parents, coaches, organizations and scouts see "Grade coming with camera measurement" wherever a video-based grade would show. Entered tests (sprint, jumps, radar velocity, verified maxes) still show number, 20–80 grade, band, source and date. Human coach/scout grades unchanged. Only the owner releases it.
- **Game IQ: INTERNAL ONLY (owner + admin, labeled "Internal — not released").** Switch `GAME_IQ_AVAILABLE_TO_ATHLETES` = off (owner turned it off: defective). Covers the General's Game IQ tab, game reports, heat maps, matchup planner (scouting profiles), Game IQ 101 and all their links/cards. Players, parents, coaches, organizations and scouts see none of it — no empty tab, no "coming soon"; game logging in Game Hub itself stays. Only the owner releases it. Proof: walkthroughs/intelligence/ai5.
- **Coaching Console (owner only):** add, edit (versions are kept, never overwritten) and switch off coaching principles. Badges: Seen = worked for 3 players; Proven = 10 players with at least 60% success. With fewer than 3 players the numbers stay hidden for privacy, and TEST accounts are never counted. Principles can't be deleted (that safeguard stays on).
- **My Connections:** coaches, players, orgs and scouts connect only through a request the other person accepts. Either side can end the connection, and that takes effect instantly. A coach can log a game for a connected player; the player then taps "Yes, that's right" or flags it, and flagged games stay out of ratings.

## Switch inventory — 2026-10-19 (intended = current)

- **Backend switches:** everything is `all` (on), except `facility_spaces`, which is `off` and should stay off until scouting/facility phase proofs.
- **Backend settings:** `staff_plan_gate` on; `lifting_v2_enabled` on; `rankings_visible` off (intended until you decide).
- **App code constants:** `REPORT_CARD_SWITCH` = off (your Oct 18 decision); `GAME_IQ_AVAILABLE_TO_ATHLETES` = true (owner-authorized athlete release, phone proof AI1); `TIPPING_DETECTION_ENABLED`, `ON_DEVICE_BALL_DETECTOR_ENABLED`, `ROOT_EVIDENCE_ENABLED` and all 10 `MEDIAPIPE_*` measurement switches = false (stay off until camera measurement exists); `US_ONLY_APP_STORE_RELEASE` = false (Option B storefront detection).
- **Scheduled job:** `intelligence-learning-loop-nightly` is scheduled (04:30 UTC) but has not run yet.

## HEVC check — AI2, Oct 19 04:00 UTC

- Real phone-size preview upload completed for the owner H.264 clip and a generated HEVC equivalent as the TEST pitcher. Both converted automatically to WebM and produced qualitative findings with the grade placeholder. All 507 frames preserved; duration 16.9 seconds, 30 fps; maximum timestamp gap 0.333 ms. Conversion tests passed 2/2.
- Dense body tracking timed out on both formats in headless Chromium with mobile Safari user agent. Measurement impact remains unverified; this is not physical iPhone proof. This check's three TEST reports and storage copies were removed; the original owner clip stays untouched.
- **Owner live check after publish:** upload one original HEVC clip on your iPhone and confirm it completes analysis without manual conversion; camera measurements remain off and their accuracy is not certified by this preview check.
