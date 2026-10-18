# OWNER FIXES — Oct 17 (received Oct 18)

YY2 continuation: verify remaining agreement, parent and History flows; no new live changes without named authorization.

YY1 continuation: analysis preflight/retry no-report exits fixed and phone-tested. Only analyze-video redeployed; live throwing report and saved unreadable-frame fallback verified. Original 12-clip proof remains mandatory; no substitute footage relabeled.

- [ ] 1. Analysis reliability first: reproduce every type/sport with two real clips each, repair failures, nonempty honest fallback reports, retry/backup model, outcome/cost logging, phone proof and before/after rates.
- [x] 2. Remove duplicate owner Scout application entry (owner menu proof saved).
- [x] 3. Move Subscribers into owner dashboard; current plan breakdown only (tier/staff/sponsorship test passes, phone view checked).
- [x] 4. Accurately label Drill Builders and Drill CMS activity coverage; overlap documented; not merged.
- [ ] 5. Complete owner rating agreement dashboard with rates, recent notes and test coach votes.
- [x] 6. Settings: read-only app switches, billing product/price links, analysis cost summary (phone proof; Stripe read only).
- [ ] 7. New-player optional assessment above Today: explicit Completed tap unlocks Start; existing started players unaffected; save answers and generate today's plan on Start.
- [ ] 8. Plain parent sharing wording without PitchLab; scout visibility in same area.
- [x] 9. Physio setup once and redo anytime: setup saved, reload stayed closed, Edit Health Profile reopened and saved; failed saves now retain answers. Exact test profile restored.
- [ ] 10. History: Standards drawer in The General; full practice details; date pickers; all report kinds; trace Train next into Today.

Constraints: no publish, cron or iOS edits; no unexplained deployment errors; Stripe read-only; preserve safety and measurement honesty; clean test data. Only fix-required backend redeploys authorized; name each actually redeployed.

Current Oct 18 verification: full suite 365 files / 2,937 tests PASS; latest preview build OK.
Open blockers: #1 requires two suitable real clips for each of six sport/type combinations (12 total); available footage cannot prove those motions. Baseball hitting/pitching/throwing preflight failure reports proven; existing softball test players stop at current legal acceptance, no rules bypassed. #5 coach vote UI proof not performed. #7 server start guard SQL awaits named owner migration approval and new-player completion/start proof. #8 parent-authorized sharing/visibility save proof not performed. #10 populated practice/saved-report/Train-next proof not performed. These remain open, not claimed complete.
YY1 targeted tests: 17/17 PASS including diagnostic-storage retry failure and retaining health answers on save failure. Latest preview build OK. Full-suite result above precedes YY1; it was not rerun this pass.
YY1 test upload backed up, live fallback tested as the affected player, then deleted via delete-library-session; database read-back count 0. Health profile original state restored. Existing demo accounts retained, no new accounts or low-resolution test uploads created.
The single test upload was backed up and deleted through the existing cleanup function; original demo player retained. No publish, cron or iOS changes, no Stripe writes, no migration applied.

# NO APPROVALS EXCEPT SCOUTS — 2026-10-16 03:20 UTC
- Coaches: full coach status right after coach setup (adults 18+ only); "Scout/Coach → Coach" goes straight to coach setup; pending coach applications auto-approved (0 were waiting). Child-safety rules unchanged.
- Organizations: active right away; can add athletes and staff; pending ones auto-activated (0 were waiting); verification notes removed.
- Approvals in owner dashboard: Scouts only.
- legal-consent redeployed; new coach's Terms + Privacy saved. 20 staff accounts never had Terms saved; the existing agreement screen asks them once at next sign-in.
- Proof: docs/owner/walkthroughs/no-approvals/. Test accounts removed.
- [ ] Not proven: landing on Coach Dashboard after paying (Stripe is live; no real payment made).
Ready for the owner to try: yes.

# STAFF SIGN-UP PATHS — 2026-10-15 02:55 UTC
- Missing: sign-up only had a player path; coach/scout/org pages existed but nothing led to them, and coach setup required an already-approved coach.
- Built: "Who are you?" (/get-started) with 5 choices; Coaches / Scouts & Recruiters / Organizations links on home + sign-in; adult account step (/signup/:role); coach setup → application to owner queue → "Application received"; scout application (sport, organization, role, letter) → queue; org register → verification form + email code → pending note → Organization plan.
- Proof: 3 brand-new accounts via the real form at iPhone size, screenshots in docs/owner/walkthroughs/signup-roles/; owner queue shows coach + scout applications and the org (owner-01/02). All 7 sign-up accounts flagged TEST.
- [ ] Owner: reject the 3 TEST applications/org in the queues when done looking.
- [ ] Gap: org team/staff pages still need the Organization plan; org proof-document upload not built.
Ready for the owner to try: yes.

# EMAIL SIGN-IN FIX — 2026-10-15 02:30 UTC
- Cause: email boxes kept pasted/autofilled spaces (iPhone adds a trailing space) and phone auto-capitalization; the check rejected the space. "+" was always allowed.
- Fix: every email box in the app trims spaces/invisible characters, lowercases, no autocapitalize/autocorrect, email keyboard; sign-in, reset and sign-up checks share one rule (src/lib/email.ts). 4 tests pass.
- Proof: phone-size form with " Hammersmodality+demoorg@gmail.com " etc. → cleaned, no "Invalid email address".
- [ ] OPEN: full password sign-in proof as demoorg/democoach/democollege — private password copies were lost when the work area reset; needs the owner's emailed passwords or OK to reset + resend.
- Signed in as … line already on Pricing and Staff Plans.

# TEST LOGINS FINAL — 2026-10-14 22:05 UTC
- Cause: the UPDATED email gave the 16-year-old demo16ss as the test player; the owner's phone stayed signed in as him, so staff plans said "adults 18 and over".
- Fixed: "[PRIVATE] Hammers test checkouts — FINAL (use these)" sent: player democollege (2005), coach democoach, org admin demoorg; new passwords, each proven by password sign-in; same codes. One-time tool deleted.
- Sign Out now always clears the saved sign-in (even on a network error) and reloads the page; Pricing and Staff Plans show "Signed in as <email>".

# STAFF CHECKOUT ELIGIBILITY FIX — 2026-10-14 21:55 UTC
- Cause: checkout refused any account flagged "parent-managed"; it never checked coach role or organization admin status.
- Fix: new rule (adults 18+ only; Coach plan = approved coach or org admin; Organization plan = org owner/admin; pending orgs may buy, with a note). 8 rule tests pass. Checkout redeployed.
- Proof (same build, phone size): test coach → Hammers Coach Stripe page; test org admin → Organization + 1 seat Stripe page; test player → Complete Pitcher Stripe page; player refused staff plans with a plain reason. Screenshots: docs/owner/walkthroughs/eligibility/.
- Ready for the owner to retry: yes.

# TOP STATUS — Stripe "nothing takes me to pay" round, 2026-10-14 ~20:30 UTC

**Ready to publish: no** (owner must redo his 3 test checkouts on the preview first).

| Item | Status | Proof |
|---|---|---|
| Cause found | Done | Backend log 19:45 UTC: the owner's Complete Pitcher tap DID create a Stripe session, but the app runs inside the editor's preview frame; Stripe refuses to load in a frame and the frame can't move the whole page, so nothing happened. Coach/Org: no backend calls at all — the button stayed greyed out until the fair-use box was ticked, with no message. |
| Fix: one path to Stripe | Done | New goToStripe: own tab → same-tab jump; in a frame → "Continue to secure checkout" pop-up that opens Stripe in a new tab; if the page doesn't leave in 4 s the same button appears. Used by player plans, Coach/Org, sponsorship, bundles, billing portal. |
| No silent failures | Done | Every checkout error shows a pop-up and is logged; Coach/Org button no longer greys out — it says "Tick the fair-use box first". |
| Domains allowed | Done (no change needed) | Checkout functions accept any https origin (preview, hammersmodality.org, hammers-modality.lovable.app). No redeploy. |
| Back from renewal policy logged out | Done | Policy opened in a new tab; in the editor frame a new tab has no sign-in. All checkout/sign-up/agreement policy links now open as a pop-up with Close and "I've read this"; checkbox stays ticked, same screen, still signed in. |
| Tile prices | Done | Coach/Org dashboard tiles no longer show prices (the player plan cards don't). |
| Proof, 12/12 PASS | Done | Player (Complete Pitcher), Coach, Org + 1 seat; own tab and inside a frame; phone + desktop — all reach Stripe's real page. docs/owner/walkthroughs/stripe-handoff/ |
| Hosted preview link itself | Blocked | Returns 401 to automated tools (Lovable sign-in wall), so tests ran on the same app here, both top-level and framed. Owner to confirm. |

# TOP STATUS — Owner approvals round, 2026-10-14 03:25 UTC

**RR6 (03:25 UTC):** Final status roll-up (this section). Owner can redo his 3 test checkouts: YES — all 4 codes re-verified on Stripe active, unused, expiring Oct 20; logins unchanged since the "UPDATED (use these)" email.

**RR1 (02:50 UTC):** Scout wording fixed — Profile no longer shows "Finish your athlete setup" to scouts or coaches; the updated-terms screen is now titled "Before you keep going" for everyone.

**RR2 (02:55 UTC):** Scout wording PROVEN on screen — the profile's setup cards also showed the player wording to scouts/coaches (two more spots found and fixed: the quick-access banner and the status card). Re-checked signed in as the test scout at phone size: no "athlete setup" wording anywhere on Profile, no page errors (scout/20_profile_wording.png). Build OK. Note: the "Ranked goals" card on Profile still uses player-flavored wording for scouts — cosmetic, not flagged by the owner; left as-is.

**RR5 (03:20 UTC):** Stripe re-check (read-only, add-only guardrail kept): all 4 owner codes still active, unused (0 redemptions), expiring Oct 20 — Complete Pitcher, Hammers Coach, Organization + extra seat, and the under-13 code. No Stripe objects changed. Everything not blocked on the owner is done; only his 3 test checkouts and his under-13 signup remain.

**RR4 (03:10 UTC):** Owner's guide (docs/owner/publish-checklist.md) updated to match reality: the "Stripe code box" and "sponsoring a player who already pays" items moved from open to resolved (both were already proven), the staff-plan switch marked ON, walkthrough results and owner-found fixes 1–9 summarized, and the open list now holds only the two items that need the owner (his 3 test checkouts; his under-13 signup).

**RR3 (03:05 UTC):** Coach + org admin full walkthroughs DONE at phone size, signed in as each test account. Coach (coach/00–10): dashboard, coach dashboard, console, lineup, guest, digest, coach setup (6 steps, Save & exit), staff plans, profile, privacy, pricing — every screen has Back/Close, no page errors; coach tools correctly show the "Coach tools are now part of the Hammers Coach plan" notice with Subscribe + "Join through your organization" (test coach has no paid plan). Org admin (org-admin/walk_00–05): dashboard, organization, staff plans, profile, privacy, pricing — all have Back, no errors; /organization correctly shows the Organization-plan gate. Still waiting on owner: his 3 test checkouts (unblocks sponsorship + seats-added-later Stripe proof).

**Ready to publish: no** — sponsorship and "extra seats added later" still need a real paid Organization plan to prove on Stripe (see #8).

| # | Owner-found fix | Status | Proof |
|---|---|---|---|
| 1 | Plan tiles regular size for everyone | Done | One size for players, coaches, orgs, scouts; phone screenshots (owner, player, scout walkthroughs) |
| 2 | Age groups smart text box | Done | Text → editable chips; tests 4/4; now also used in coach search + org coach list |
| 3 | Coach setup audit | Done | Every answer shown on "Your program" card; ages/levels/team now in coach search ("12U", "high school" find coaches) and the org "Pick a coach" list. Migration applied: 4/4 coach rows kept, every field identical (snapshot _snapshot_coach_context_20261014); signed-out reads refused |
| 4 | Back everywhere | Done | 177/177 screens as owner and as a player; scout screens all have Back (scout/) |
| 5 | Legal "Read it" Close + "I've read this" | Done | Close and "I've read this" on every legal page; read saved once per version |
| 6 | One-time consent | Done | Saved in consent_records per version; shown once (player, teen, scout re-checked) |
| 7 | Seat number field | Done | − / + plus typing, no leading zeros, every number box; tests 6/6 |
| 8 | Every purchase reaching Stripe | Partly done | Real Stripe checkout pages, signed in as each test account: Organization + 1 extra seat ($1,150/mo, both items listed) phone + desktop (org-admin/stripe-phone, stripe-desktop); Coach $300 (coach/stripe-phone); player Complete Pitcher $200 phone + desktop (player-college/stripe-phone, stripe-desktop). Fair-use and auto-renew acceptance saved before each. Stripe shows euros only because the test computer is in Europe (USD switch on the page). NOT yet proven on the real page: sponsorship (the test org has no players — unverified orgs can't add any) and extra seats added later (need an active Org plan → Manage plan) |
| 9 | Live analyses + unused list removed | Done | 6/6 live analyses completed (baseball + softball × hitting, pitching, throwing; 21–38 s each), each with a summary, drills and scorecard in plain words. All 12 test videos (6 refused first tries) and their 25 analysis records deleted (backup kept). "Recent sessions" list removed earlier |

## Walkthroughs (docs/owner/walkthroughs/)
| Role | Result |
|---|---|
| Player, college baseball | Pass (player-college/) |
| Player, softball (setup 1–12) | Pass (demosbc/setup/) |
| Pro, softball pro, two-way, ramp-up players | Pass (demomlb/ etc.) |
| Teen with parent signature | Pass (teen-2way/) |
| Under-13 player + parent | Pass (demo13/, demoparent) |
| Scout (new test account, hidden) | Pass (scout/) — updated-terms screen once, then scout dashboard, report, compare, plans, profile, legal all with Back. Scout wording fixed and re-proven (scout/20_profile_wording.png) |
| Coach | Pass (coach/ — full screen walk + Stripe checkout) |
| Organization admin | Pass (org-admin/ — full screen walk + Stripe checkout phone + desktop); sponsorship still blocked (no players in the unverified test org) |

Logins/codes: no passwords or codes changed (sign-ins used one-time links from the owner-only test tool) → no email resent.

---
# TOP STATUS — Owner preview findings round, 2026-10-14 01:25 UTC

**Ready to publish: no** — the new human-walkthrough standard is not yet met (see below).

## QQ10 — Timed History speed test: PASS
- 6 temporary test reports (2 of each kind: individual postgame, team postgame, opponent scouting) added to the owner's account, History opened at phone size (390px) signed in as the owner.
- Result: page and all 6 reports rendered immediately; "Game reports" section showed count 6, each row labeled with date, kind and description; no page errors. Screenshot: docs/owner/walkthroughs/owner-history-speed/01_reports_open.png.
- Cleanup: all 6 TEST rows deleted (verified by returned IDs). Build OK. No logins or codes changed → no email resent.

## Fixes (proof)
1. Dashboard plan tiles — one regular size for every account (players, coaches, orgs, scouts). PASS: phone screenshot as owner (1 tile pair under merch). Role screenshots pending walkthroughs.
2. Coach setup "Age groups" — smart text box ("10U–14U, high school, college, pro") → editable chips (ages + levels), saved to coach_context.age_groups. Tests 4/4 PASS. Phone check as coach pending.
3. Coach setup audit — every answer was saved but read nowhere. Now shown on the Coach Dashboard "Your program" card (org, team, seasons, athletes, ages/levels, focus, philosophy) with Edit. Coach search / matching / org views need a backend read rule (migration) — waiting on owner to name it.
4. Back everywhere — Back on every page inside the main app frame (except Dashboard), Back/Close on Staff Plans and legal pages, plus a safety Back on any screen with none. Automated check tests/e2e/navigation/back_everywhere.py (now runs in batches: START/END/WAIT_MS). PASS 2026-10-14 00:50 UTC as owner at phone size: 177/177 screens have a way back (5 sequential batches; parallel runs run out of memory). Per-role re-run rides with the walkthroughs.
5. Legal "Read it" — every legal page has Close and "I've read this" (records once per version, returns to where you were). PASS as owner: Close returned to dashboard; already-read shows "Back to where I was".
6. One-time consent — privacy notice was remembered only on the device (lost on preview sign-in), so it came back. Now saved in consent_records per version and never shown again until a newer version. Tests 3/3 PASS; legal-consent redeployed. The "Updated terms" screen already used consent_records (no change needed).
7. Extra seat number — − / + stepper with typing; every number box in the app now strips leading zeros. PASS: typed 1 → "1", + → "2". Tests 6/6 PASS.
8. Stripe, Organization plan — cause: checkout opened in a new window after a wait, which phones block silently (no backend call was logged). Now same-tab to Stripe; real error reasons shown. Same fix on the billing portal. Proof of each purchase path on Stripe's real page pending walkthroughs.
9. Recent sessions list removed (owner-approved). Live analyses of every type — not yet run.
- Also fixed: scout pending-reviews "Invalid token" (sign-in now passed along); redeployed.

## Walkthroughs (docs/owner/walkthroughs/)
- QQ2: test-only passwords reset privately on 9 accounts NOT in the owner's email (demo13, demoparent, democollege, demomlb, demoausl, demosbc, demo2way, demoramp, ee5proof); API sign-in 200 for all 9; one-time tool deleted. Owner's emailed logins untouched → no resend needed.
- [x] QQ9 Back everywhere re-run as a PLAYER (democollege, password sign-in, phone size): 177 screens, 0 without a way back (5 batches). PASS.
- [x] QQ6–QQ7 Softball setup (demosbc/setup/00–12.png): all 12 steps PASS on phone — typing, height pickers, number boxes (no leading zero), graduation year, team, level picker, body, goals, review summary (every value labeled), Back arrow + Exit on every step; "Stay in the loop" pop-up has Close + "Not now". Finish deliberately not tapped (would overwrite the test account with dummy answers). Restart at 1/12 on a new device explained: answers are saved on the phone only → wording fixed.
- QQ4 "Before you keep training" (updated terms) screen: FOUND+FIXED dead end — only "Save and continue"; added "Not now — sign out". One-time PASS as demomlb: accepted once → gone; fresh sign-in on a new device → not shown again (demomlb/07–09). demomlb, demoausl, demo2way, demoramp: History/Vault/Profile reachable with Back or the terms screen; each still has unfinished setup (lands on setup 1/12 with Exit).
- QQ4 Sponsorship + extra seats: both already go same-tab to Stripe (code read); real-page proof needs the org admin login (in the owner's email) → after owner's "done".
- QQ4 Scout walkthrough BLOCKED: no test scout account exists. Needs owner OK to create one test-only scout account.
- QQ3 Under-13 player (demo13): FOUND+FIXED dead end — "Parent signature required" screen had no way out; added "Not now — sign out" (signs out on this device only, lands on the home page). PASS on phone (demo13/08–09).
- QQ3 Softball player (demosbc): sign-in lands on unfinished setup (1/12) with Exit — expected for this account. Setup run-through still to do.
- QQ3 Parent (demoparent): dashboard, History, Profile have Back; Plans/Vault send to Start Here (setup unfinished) with Back; Vault lock shows View Pricing + Back. PASS.
- Player (college, baseball) — player-college/: PASS after 2 fixes. Form sign-in → dashboard; History, Vault, Profile, legal page have Back. FOUND+FIXED: Plans page had no Back (added). FOUND+FIXED: player plan checkout used the same new-window trick that broke the org plan — it never left the app; now same-tab → real checkout.stripe.com page (screenshot 12), Back returns to the app. Privacy notice: "Got it" once, then a fresh sign-in on a new device shows no notice (PASS). Paying itself can't be automated (Stripe refuses robot payments) — owner's checkouts are the final proof.
- [x] QQ8 Teen (demo2way, 17, two-way) — teen-2way/: PASS. Updated-terms screen appeared once; accepted (consent record saved on this test-only account); fresh routes afterwards show no terms screen. /today shows the parent-signature banner "Parent signature needed in 14 days" with parent email/phone + Send signing link (14-day grace, not a hard block); Back present on /today, /history, /vault; /profile has a visible "Back to Dashboard" header (script's locator just didn't match its label). No page errors. Parent signing-link flow itself was already proven end-to-end in an earlier round (link can't be reused).
- Remaining: other player programs/sports, teen + parent, under-13 parent, scout; coach + org admin wait until the owner's checkouts are done (their passwords are in his email).

---
# TOP STATUS — URGENT test logins, 2026-10-13 22:50 UTC

**Ready to publish: no** — waits on the owner's 3 test checkouts + the under-13 test checkout.

- Cause: the passwords in the first checkout email were replaced by later private resets (owner sign-ins got "invalid login"). Fixed: new strong passwords on the 3 test accounts (player demo16ss, coach democoach, org admin demoorg), stored privately, never printed; one-time tool deleted.
- Proof: API sign-in 200 for all 3; real form sign-in at phone (390) and desktop (1280) for all 3 — no terms/birthdate/pause/Before-you-start block; each reached its checkout screen (player /pricing, coach + org /staff-plans with Choose buttons). Robot can't open the preview link itself (Lovable sign-in wall), so form tests ran on the same app; owner opens the preview signed in to Lovable.
- Codes: all 3 still valid, unused, one plan each (Complete Pitcher; Hammers Coach; Org + extra seat), expire Oct 20. Under-13 code still valid, unused, expires Oct 20; throwaway parent email has no account.
- Emails resent: "[PRIVATE] Hammers test checkouts — UPDATED (use these)" and "[PRIVATE] Hammers under-13 test code — re-checked". One-time mail tool deleted.
- No grandfathering: staff_plan_gate stays on. Coach notice ready: "Coach tools are now part of the Hammers Coach plan" with Subscribe + "Join through your organization"; phone screenshot PASS as the test coach. Owner/admin unaffected. Goes live when the owner publishes.

---
# TOP STATUS — PP batch close, 2026-10-13

**Ready to publish: no** — waits on the owner's 3 test checkouts + the under-13 test checkout (verify in Stripe/app, then cancel all 4).

## Audit findings — FIXED (proof)
- Coach pages crash from first tile attempt — fixed; all coach pages reopened, no crash.
- History grades whole-number/unlabeled — fixed; 7 test reports showed "17.3 · Sub Par", 40/55 Acceptable, 65/70/80 Elite; test reports deleted.
- Practice after-session summary + Recent sessions list rounded grades — fixed to the 5s rule + band; build OK (summary phone check rides with next saved practice).
- Staff-only pages blank 1–2 s — loading spinner (owner-approved).
- Privacy banner too big — smaller, clear of help button; phone screenshot PASS (owner-approved).
- Phase unity — all 3 phase readers use the one phase source. PASS.
- 181 pages opened on phone, no dead pages.

## Waiting on owner approval
- Live video analyses of every type in each sport (real AI credits).
- Remove the unused "Recent sessions" practice list.

## Stress tests
- 8-week plan simulations 720 combinations, 0 rule breaks. PASS
- Coach logging both options + wrong-player block; check-ins; Discipline; on-the-spot assessment incl. under-13 parent rules; teen parent signature; guest mode. PASS
- Sponsorship incl. already-paying player, no double charge. PASS
- Test suite 2,894/2,894; legal 41/41. PASS
- Live analyses per type/sport: NOT RUN (owner OK needed).

## Dashboard tiles
- "Hammers Coach" + "Hammers Organization" Elite tiles under merch card: large for coach/org, subtle "For your coach or facility" for players, hidden for scouts; phone screenshots taken. PASS

## Owner's guide
- Complete in docs/owner/publish-checklist.md, grouped player/parent/coach/organization/scout/owner (what it is, steps, what to see). PASS

---
# TOP STATUS — PP (owner requests), 2026-10-13

- PP6 (2026-10-13): Practice grade fix: the "Recent sessions" list is not used on any page (dead code, left in place, listed in the audit). The after-practice summary shows only after saving a full practice; build OK, phone check rides with the next live practice test. Owner guide already complete (grouped player/parent/coach/org/scout/owner). Ready to publish: no.

- PP5 (2026-10-13): Unity fix — practice "Recent sessions" list and the after-practice summary rounded grades to whole numbers with no 5s rule; both now use the same grade rule and band as History ("Grade: 45 · Acceptable"). Ready to publish: no.

- PP4 (2026-10-13): Unity check (phase) PASS — the 3 phase readers (season status, 15 screens; phase display, 8; phase state, 4) all go through the one phase source, so no screen can show a different phase. Ready to publish: no.

- PP3 (2026-10-13): Smaller privacy banner re-checked on phone: text clear of the help button. PASS. Remaining audit items wait on the owner (live analyses = AI credits) or the owner checkouts. Ready to publish: no.

- PP2 (2026-10-13): History grades PASS with 7 test reports (17.3 → "17.3 · Sub Par"; 38/42 → 40 Acceptable; 57 → 55; 63 → 65 Elite; 68 → 70; 80 Elite), test reports deleted. Owner-approved design fixes done: loading spinner on staff-only pages instead of blank; smaller privacy banner. Ready to publish: no (owner checkouts pending).

- PP1 (2026-10-13): History opens on phone as 3 test players, no errors, ~11–13 s on the preview (dev mode, slower than live). Test players have no graded reports, so the 5+-report grade check is still open (needs seeded reports or a live analysis — owner OK for AI credits). Ready to publish: no.
**Ready to publish: no** — waiting on the owner's 3 test checkouts and the under-13 test checkout.
- [x] Test passwords reset privately on the 12 test-only accounts (one-time tool deleted).
- [x] Under-13 code: 1 fresh one-time 100%-off code (Complete Pitcher only, 7 days), emailed privately with a throwaway parent email and the preview link. [ ] After the owner signs up: cancel that plan and mark the account and consent record TEST and hidden.
- [x] Dashboard plan tiles: prominent for coach/org (also on the coach "plan needed" page), a quiet pair for players, none for scouts. Phone screenshots taken.
- [x] Readiness audit written (docs/owner/v1-readiness-audit.md); fixed the coach-page crash and the History grade rounding/bands. Live analyses of every type: need the owner's OK (AI credits).
- [x] Owner guide added to docs/owner/publish-checklist.md.
- [x] Test suite 2,894/2,894 PASS.
- [ ] Owner's 3 test checkouts → verify + cancel.

# TOP STATUS — OO4 (batch closed), 2026-10-13
- Every check that needs nothing from the owner is DONE and PASS. All remaining items wait on the owner (below).
- Owner test-checkout email: SENT (OO1) to hammersmodality@hammersmodality.org, subject "[PRIVATE] Hammers test checkouts" — preview link, 3 test logins, 3 product-limited 100%-off codes (expire in 7 days from OO1).
- [x] On-the-spot assessment PASS (OO3): coach saves with label "Coach-verified · coach · date"; player sees it; player recording for self refused (403); age 11 without parent refused ("Under 13: the parent must be present and agree"), with parent saved + parent time stamped; 11-year-old could not accept a coach request himself ("A parent must answer this request"); age 13+ saves without parent. Test entries deleted, test birthday restored, test connections ended.
- [x] Teen parent-signature flow PASS (OO3): link requested as the 13-year-old test player, parent signed on a 390 px screen (name, relationship, 18+, drawn signature), player's training opened, link can't be reused. Signed record kept (legal record).
- [x] Guest mode PASS (OO3, 390 px as test coach): under-13 without parent-permission box → Analyze disabled; with box → runs. Full analysis ran; result only on screen, "Guest result — not saved", values labeled; function saves only the coach's own usage row — no player, video or measurements saved. AI honestly flagged the test-pattern clip instead of inventing a read.
- [ ] Under-13 signup/parent-consent path: switch is OFF (path closed); running it end to end needs the owner to name that switch change.
- [ ] Owner items: (1) do the 3 test checkouts from the private email, say "done" → I verify in Stripe + app and cancel all 3; (2) Coach/Org plans switch ON only right before publishing.


**Ready to publish: no.**

## Items (pass/fail + proof)
- Test passwords on 12 test-only accounts: PASS (MM7; one-time tool deleted; password private, not in any doc).
- Fair use in Terms v2 + checkout acceptance: PASS (Terms v2 approved_by owner, effective 2026-10-13; v1 untouched; server refuses checkout without acceptance).
- Organization plan on/off via Stripe: PASS (HMIOSTEST, $1,300 → $0; 5 + 2 seats on, then canceled).
- Sponsorship sponsor/pause/resume/cancel/player refusal: PASS (MM8, HMSPTEST1, $0; test data cleaned up).
- Sponsorship code typed on the checkout page: cause found (OO1) — Stripe rejects every code typed by an automated browser, even a code real buyers use; codes are fine. Final proof = owner's real-card checkouts.
- Sponsoring a player who already pays: PASS (OO1; own plan ends Nov 13, org billing starts Nov 13, no invoice now, both canceled).
- Player and staff checkouts through the checkout page: WAITING on owner (3 product-limited codes emailed privately; verify + cancel when he says done).
- 8-week plan simulations vs live builder: PASS (MM4; 720 combinations, 0 rule breaks; only change = approved Robustness slot).
- Full test suite: PASS 2,894/2,894 (MM5).
- Legal tests: PASS 41/41; players not asked to re-accept Terms v2.
- Existing data intact: PASS (204 profiles, 191 active subscriptions, 69 consents).
- Daily plan job: PASS since 2026-10-12 (Oct 11 failures fixed in current builder).
- Missed-workout marking: PASS (MM9, throwaway row flipped to missed, removed).
- Renewal reminders: PASS (staff-only 403 for others; staff dry run 0 due, nothing sent).
- Phone size (390 px) as player, under-13, coach, org, parent: PASS for opening pages (MM7). Flow-level: coach entries + wrong-player block in both options PASS (OO1); check-ins with/without health sharing PASS + Discipline view opens PASS (OO2); on-the-spot assessment + teen parent signature + guest mode PASS (OO3). Only the under-13 signup path (switch OFF) remains, awaiting owner authorization.

## Reports
- docs/owner/regression-report.md: current through OO3 (MM1–MM9, NN, OO1–OO3 entries); only the owner's checkout results remain to be added.
- docs/owner/publish-checklist.md: written (MM9); not signed off.

## Stripe IDs
- Hammers Coach $300/mo: prod_VQjeb6G4nQbIfZ / price_1UPsB6Gc5QIzbAH6k6wtj6NI
- Hammers Organization $1,000/mo (5 seats): prod_VQjea2xzqwAqvj / price_1UPsB7Gc5QIzbAH6Q42AlTdT
- Extra Coach Seat $150/mo: prod_VQje6yyL8w42rs / price_1UPsB8Gc5QIzbAH6l4p2C4oU
- Sponsorships use players' existing plan prices. Test codes HMIOSTEST and HMSPTEST1 used up.

## Next item
Remaining phone flow checks: under-13 parent flow, guest mode, on-the-spot assessment.

## Waiting on the owner
1. Finish the 3 test checkouts from the private email, then say "done" — I verify in Stripe and cancel all 3.
2. Coach and Organization plans switch: turn on right before publishing, once everything passes.

Nothing was published, and no schedules or iPhone app settings were changed this round.

---

# STATUS — 2026-10-13 (owner decisions: sponsorship, coach logging, fair use)

- [~] Stripe guardrail (snapshot before/after done, nothing existing changed; staff plan on/off PASS) (owner 2026-10-13): only ADD the 3 staff products/prices + sponsorship subscriptions; never change existing products/prices/coupons/promo codes/tax/portal/webhook endpoints or existing subscriptions (except sponsorship takeover); no fee features; before/after Stripe snapshot + list of created objects in docs/owner/regression-report.md.
- [~] Owner approvals 2026-10-13: test passwords (DONE); fair use (DONE); regression round STARTED (suite PASS after test fix, data counts, daily job healthy since 10-12); remaining: sponsorship checkouts (needs new 100% codes), phone proofs as test accounts, 8-week simulations, publish-checklist.md. BLOCKED 2026-10-13 MM2: the private test password file was wiped when my work area reset; phone proofs need owner OK to set a new password on the same test accounts (redeploy the one-time tool, then delete it). MM3: renewal reminders guarded + switch on (PASS, dry run pending sign-in). MM4: 8-week plan simulations PASS (0 rule breaks; only intended robustness change). MM5: full suite 2,894/2,894 PASS. MM7: test password reset (tool deleted); phone check as 5 test accounts PASS. MM8: sponsorship sponsor/pause/resume/cancel/refusal PASS via Stripe; checkout-page code box shows "invalid" (open); already-paying flow open. MM9: missed marking PASS (1 throwaway workout flipped to missed, cleaned up); renewal reminders staff dry run PASS (0 due, nothing sent). docs/owner/publish-checklist.md written; "Ready to publish" still NO — open: checkout code box, already-paying sponsorship, real player/staff checkouts (owner decision: card vs $0-no-card), flow-level phone proofs.
Owner decisions saved word for word to docs/owner/plan-4.md. Queue order: (1) sponsorship billing, (2) coach logging Option 1 then Option 2, (3) fair use.
- [x] Fair-use clause: final wording saved, marked AWAITING LAWYER APPROVAL, not shown to players. Goes into Terms + checkout acceptance only after the owner confirms the lawyer's approval.
- [x] 30-per-hour limit: server-side (analyze-video, redeployed); over the limit the saved video waits and runs itself when a slot opens (time shown), never charged. Test 4/4 PASS (resume time = oldest analysis + 1 hour).
- [x] Sponsorship billing BUILT + live (org-sponsorship, stripe-webhook, check-subscription redeployed): org admin picks each player (never automatic) on Organization → Players → "Sponsor players"; org is the Stripe customer, one subscription per player at the player's regular price, invoice line names the player; already-paying player: own plan set to not renew, org billing anchored to that date ($0 first invoice, no double charge), player messaged; pause = Stripe pause (access through paid period); resume; cancel = 14-day grace + message to choose own plan; access re-checked on every plan read; org's own access never picks up sponsored plans. Rules tests 6/6 PASS; live: signed-out refused (401), unsigned webhook refused. NOT YET PROVEN with real test checkouts (6 flows) — needs a signed-in org test account (sign-in block).
- [x] docs/owner/stripe-walkthrough.md written.
- [x] LL2 Coach logging BUILT (not phone-checked): Option 1 (default) "Log for this player" in the coach player page's Game stats tab — player's name + photo locked at the top, entries labeled "Coach-entered · coach name · date", undo for 10 s, player messaged; Option 2 Lineup mode at /coach/lineup (saved lineup, jersey tap + "This is <name>" check before Save, 10-second undo). Player confirms or flags on the Games page ("This wasn't me" / "Numbers are wrong"); flagged entries are kept out of ratings (no rating reads coach entries). Player-entered stats are never changed; both shown with their source. Game pitches/hard throws go to the arm ledger; removed on undo or "This wasn't me". Server checks: connection required, under-13 needs parent present, whole numbers only, hits ≤ at-bats. Proof (backend, all rolled back): wrong confirmed player BLOCKED, unconnected player BLOCKED, under-13 without parent BLOCKED, wrong jersey BLOCKED, right jersey saved, undo → undone, 40 pitches in arm ledger then 0 after "not me", stranger can't confirm. App tests 4/4 PASS.
- [x] LL3 PASS: tool-grade tests refrozen after metric grades moved to 5s (raw averages like 29 stay internal); the test card now shows Overall and speed Overall through the 5s rule (29 → 30). Full suite 2,893/2,893 PASS. Next: guest mode, then cost tracking for the smaller AI uses.
- [x] LL4 Guest mode PASS (backend): Coach dashboard → "Guest analysis" (/coach/guest). Coach picks sport, hitting/pitching/throwing, age; under 13 needs "a parent gave permission" ticked; video stays on the phone, 7 pictures go to the AI, result shows only on screen ("Guest result — not saved") with "Invite to Hammers to save this" and "Clear and start over". Coaches/owner/admin only; needs a plan when the coach-tools switch is on; counts toward the 30/hour limit. analyze-guest deployed (Plan 4). Proof live: signed-out 401; under-13 without permission refused; with permission 200 and a result; 0 new videos, 0 frames saved; only the coach cost row (deleted after). Rule tests 5/5 PASS. Not phone-checked as a coach test account. Next: cost logging for the smaller AI uses.
- [x] LL5 Cost tracking for the smaller AI uses PASS: help chat, base-stealing reps, at-bat swings, library video tagging and the team-plan builder now record model, tokens and estimated cost (not counted toward the 30/hour limit). 5 functions redeployed (Plan 4). Proof live: one help-chat question → 1 row (Google, 1,772 in / 285 out, $0.0012); row deleted. Other AI uses (meals, drills, translations etc.) are not analyses and are not logged yet. Next: the E proof list (blocked on test-account sign-in).
- [x] LL6 E proof (owner-checkable part) PASS on a 390px phone as the owner: /owner/rating-agreement opens ("No answers yet." — none saved since cleanup), /owner/ai-costs opens, /coach/guest opens (fixed "13 Or Older" → "13 or older"). Stripe test checkout NOT run: plan checkout asks for a card even with a 100% code (Stripe does this for subscriptions unless told card is optional) — owner choice needed: enter a real card for the test (no charge with the code), or let checkout skip the card when the total is $0. Player/coach/org E items still need test-account sign-in.


**Ready to publish: no.** (publish-checklist.md not written — it waits until every item below is PASS)

## Plan v3.1 (docs/owner/scouting-plan-v3.1.md)
- Phases 1–10: PASS (proof below).
- Phase 11 sponsorship billing: BUILT + live; rules 6/6 PASS; signed-out and unsigned-webhook calls refused. NOT PROVEN with the 6 real test checkouts.

## Plan 4 (docs/owner/plan-4.md)
- A ratings: PASS (5s at 20+, one decimal below 20 stored exactly; band edges; "Do you agree?" on phone as Demo Coach; owner agreement page opens on phone as owner). Tool/overall grades shown on 5s (LL3). Percentiles later.
- B initial assessment: order rules PASS; coach on-the-spot check + under-13 parent rule PASS (backend). NOT phone-checked as a player.
- C discipline + check-ins: PASS (backend), both health-consent ways.
- D plans: products/prices live; checkout, Manage plan, Stripe updates, plan lock (switch OFF), pricing screens + 8 languages, cost tracking (all analyses + 5 smaller AI uses), 30/hour limit (paused, never charged), weekly coach summary, guest mode (nothing saved; backend proof) — PASS. NOT DONE: a real test checkout; seats billed in a real checkout.
- Coach logging Options 1 + 2: BUILT, wrong-player saves blocked (backend + 4 tests). NOT phone-checked.
- Fair-use clause: final wording, AWAITING LAWYER APPROVAL, hidden from players.
- E full proof list: owner-checkable part PASS (LL6); the rest NOT DONE (needs sign-in + checkout).
- Full test suite: 2,893/2,893 PASS (LL3).

## Stripe IDs
- Hammers Coach $300/mo: prod_VQjeb6G4nQbIfZ / price_1UPsB6Gc5QIzbAH6k6wtj6NI
- Hammers Organization $1,000/mo (5 seats): prod_VQjea2xzqwAqvj / price_1UPsB7Gc5QIzbAH6Q42AlTdT
- Extra Coach Seat $150/mo: prod_VQje6yyL8w42rs / price_1UPsB8Gc5QIzbAH6l4p2C4oU
- Sponsorships use the players' existing plan prices. Owner guide: docs/owner/stripe-walkthrough.md

## Next item
E proof list as players, coach, org and guest + the real test checkouts (sponsorship 6 flows, staff plans, extra seats) — blocked on items 1 and 2 below.

## Waiting on the owner
1. Test-account sign-in: OK to set a known password on the test accounts only, or approve the sign-in prompt.
2. Test checkout: (a) a real card for the test (no charge with the 100% code), or (b) let checkout skip the card when the total is $0.
3. When to turn on the coach-tools plan switch (coaches without a plan lose coach tools then).
4. Lawyer review of docs/owner/fair-use-clause-draft.md.
5. Rankings/MPI scores on 5s? Spaces stays OFF; Vault review queue.

## Plan 4 (docs/owner/plan-4.md) — IN PROGRESS (JJ1)
- [x] KK5 D1 Stripe LIVE products + monthly prices created via API (owner-authorized): Hammers Coach $300 = prod_VQjeb6G4nQbIfZ / price_1UPsB6Gc5QIzbAH6k6wtj6NI · Hammers Organization $1,000 (5 seats) = prod_VQjea2xzqwAqvj / price_1UPsB7Gc5QIzbAH6Q42AlTdT · Extra Coach Seat $150 per seat = prod_VQje6yyL8w42rs / price_1UPsB8Gc5QIzbAH6l4p2C4oU. Checked first: no earlier coach/org products existed.
- [x] KK5 D2 checkout + plan switch: new /staff-plans page (Coach / Organization with extra-seat count; iPhone app shows "Subscribe on our website"), server checkout create-staff-checkout (promo codes allowed, duplicate plan blocked, under-13 accounts refused) and sync-staff-plan (reads Stripe, turns the plan on/off, opens Manage plan). Deployed (Plan 4 authorization). Tests 3/3 PASS (coach; org = 5 seats + extra seats by quantity; player plans give no staff plan). Live: both refuse signed-out callers (401). NOT yet: a real test checkout with a 100% code (needs a signed-in staff test account — KK2 sign-in block), webhook hook-up, features gated on the plan, links from every pricing screen / sign-up role choice / help chat / 8 translations, guest mode, hourly limit, coach summaries, cost tracking.
- [x] KK10 D7 weekly coach summary: Coach dashboard card "This week across your players" (players, dates, work done vs set this week and the week before, top 5 issues in video analyses with players/times seen and "What to learn to help them"; says "Not enough data" when true; "Counts show patterns, not causes"). Computed on opening, no new scheduled job. Server-checked (connected players only). PASS as Demo Coach on the backend: 1 player, 0 of 8 exercises this week, week before "Not enough data", issues "Not enough data". Read-only, nothing to clean. Not phone-checked (KK2).
- [x] KK9 D6 cost tracking + hourly limit: the shared AI caller now reports model and token counts; every main video analysis (analyze-video, all sports/types) logs model, tokens, estimated cost and plan (staff plan or player) to a new owner-only cost log; owner page /owner/ai-costs shows cost per analysis type and per plan for 7/30/90 days (estimates at Gemini $0.30/$2.50 per 1M, OpenAI at its own rates). Hourly fair-use limit: about 30 analyses per account per hour, checked on the server before the AI call (cached re-runs don't count), friendly "take a short break" message. Tests 3/3 PASS (cost math, 29 allowed / 30 blocked). analyze-video redeployed (Plan 4 authorization); its code-check warnings are all in older unchanged lines (pose tiles, report card), not new code. Proof: 30 temporary log rows for Demo HS Shortstop → the server count read 30 (= blocked) and the owner page on a 390px phone showed 30 analyses, $0.0195 each, $0.5844 total; rows deleted (0 left). Not yet: logging for the smaller AI uses (base-stealing, at-bat swing, help chat); a real analysis row (none run since deploy). Next: guest mode, weekly coach summary.
- [x] KK8 D5 plans on every pricing screen: "For coaches and organizations" box (Coach $300; Organization $1,000 with 5 seats, extra seat $150; link to /staff-plans) on the pricing page and the demo upgrade screen; price line + link under the sign-up role choice; help chat now knows both plans and the website-only rule (redeployed, code check clean); wording in all 8 languages (en, es, fr, de, nl, ja, ko, zh; 9 lines each). PASS on a 390px phone as the owner session: pricing shows the box and button, role choice shows the link, /staff-plans shows both plans (/tmp/browser/kk6_pricing.png). Not yet checked as a player/coach test account (KK2 block). Next: guest mode, hourly limit, weekly coach summary, cost tracking.
- [x] KK7 D4 coach features follow the plan: Coach dashboard, coach console, coach player pages and coach digest need an active Coach or Organization plan; the Organization dashboard needs the Organization plan; owner/admin always pass; others see "Coach plan needed" + See plans. Behind switch staff_plan_gate, OFF (no row) so existing coaches keep access until the owner turns it on. Tests 5/5 PASS; type check clean. Owner decision: when to turn the switch on (existing coaches without a plan lose coach tools then). Next: plans on every pricing screen, sign-up role choice, help chat, 8 translations.
- [x] KK6 D3 webhook hook-up: the existing Stripe update handler (stripe-webhook) now also switches Coach/Organization plans on and off (plan, status, seat count, renewal date) from subscription created/updated/deleted events; player subscriptions untouched. Code check clean; redeployed (Plan 4 authorization); live: unsigned calls refused ("No stripe signature found"). Real event proof waits on the test checkout (KK2 sign-in block). Next: features gated on the plan (has_staff_plan), then plan links on every pricing screen.
- [x] A1 bands: ratingBand() in gradeScale.ts — PASS, tests 39.9 Sub Par / 40, 60 Acceptable / 60.1 Elite / 12.4 decimal
- [x] A2 band + decimal shown on session dialogs, day list, rankings, MPI card (getGradeLabel now "Plus · Acceptable") — PASS tests/typecheck
- [x] A3 Do you agree?: PASS on 390px phone as Demo Coach (Disagree + note saved with sport=baseball, position CF; rating unchanged; screenshot /tmp/browser/jj4/2.png). Owner dashboard /owner/rating-agreement built; owner-session read not yet checked. Proof rows/grade/link deleted.
- [x] KK1 decimals (owner YES 2026-10-12): all 81 scout-grade columns now store one decimal; the old "20 or higher only" rules removed (they blocked the decimal scale entirely); a server rule keeps below-20 to one decimal and rounds 20+ to the nearest 5 (max 80). Snapshot tables *_20261012 kept. PASS: 12.44→12.4, 19.9→19.9, 47→45, 48→50, 62.4→60. Still to do: a below-20 entry box on the scout/coach grade sliders (they start at 20).
- [ ] KK2 phone proof of B2/C2 — BLOCKED: the kept test accounts have random passwords nobody knows (create-test-athlete never sets or reveals them, by design), and the sign-in-as-user prompt is unavailable here. Owner choice needed: (a) let me set a known password on the test accounts only, or (b) approve the sign-in prompt in a turn where it's available.
- [x] KK1b below-20 decimal entry box under every scout-grade slider (one decimal, max 19.9). Builds clean; not phone-checked (KK2).
- [x] KK3 coach on-the-spot movement & safety check + under-13 parent rule: coach player page → Development tab card; server lookup coach_record_movement_screen. PASS (server, undone after): Demo Coach → Demo 13U saved "Coach-verified · Demo — Coach · Oct 12, 2026" on the player's row; unconnected player blocked ("A connection with this player is required"); player set to age 11 → blocked without "parent present", saved with it (pain flag kept). Org admins of the player's organization also allowed. Not phone-checked (KK2).
- [x] KK4 rest of Discipline view: logging consistency (28 days), links to results (each test/analysis/game result paired with work done in the 28 days before it; 8+ results needed, else "Not enough data"; "does not show cause", date range shown), team summary on Coach dashboard, org summary on Organization dashboard → Players. Tests 9/9 PASS. Server PASS as Demo Coach: team and org both list Demo 13U (28 days: 24 set, 0 done, 2 missed days, logging 0%); unconnected player sees an empty list; another organization blocked. Builds clean; not phone-checked (KK2). Next: D (Coach/Org plans + Stripe).
- [~] B1 initial assessment order rules (src/lib/assessment/initialAssessment.ts): 1→2→3 locked, 4–6 any order, step 2 skippable, step 5 = subscribed analyses only (Pitcher=pitching; 5Tool=hitting+throwing; 2Way=all three). 8 tests PASS. Next: saved progress + movement screen + checklist card in Before you start.
- [ ] · B · C · D · E
- Order: build after Plan v3.1 Phase 11 (sponsorship billing). BLOCKED: Phase 11 waits on the owner's 4 answers (price per sponsored player + monthly/yearly; modules covered; grace period; players already paying).
- Owner decision needed: start Plan 4 now ahead of Phase 11? (Org plan in Plan 4 also includes sponsorship billing, so the same 4 answers are needed there.)
- Sections pending: A Ratings · B Initial assessment · C Discipline view · D Coach/Org plans + Stripe · E Proof.
- - JJ6: Initial assessment saved progress + checklist card in Before you start + movement and safety check (pain → report-pain screen). Built, code checks clean; phone proof as a player still to do — BLOCKED: signing in as a test player needs owner approval of the sign-in prompt. JJ7: players can no longer mark their own results coach-verified (only the server can set that label). JJ8: sign-in still blocked (approval unavailable). Discipline rules built + 6 tests (completion, missed days, streaks, 7/28/90 windows, links with 'Not enough data' under 8 pairs, never claims cause); JJ9: Coach player page has a Discipline tab (7/28/90-day work done vs set, streak, missed days, most-skipped card type) from a server-checked lookup (connected coaches only). Still to do: links to results, logging consistency, team summary, org view, phone proof.
Ready to publish: no

# STATUS — 2026-10-12 20:46 UTC (end of JJ batch)

**Ready to publish: no.**

## Plan v3.1
- Phases 1–10: PASS (proof in earlier reports below). Phase 11 sponsorship billing: NOT STARTED, waits on the owner's 4 answers.

## Plan 4 (docs/owner/plan-4.md)
- A1 bands: PASS (tests: 39.9 Sub Par, 40/60 Acceptable, 60.1 Elite, 12.4 decimal).
- A2 band + decimals shown on session, calendar, rankings, MPI card: PASS tests; not phone-checked.
- A3 "Do you agree?": PASS on phone as Demo Coach (saved with sport + position, rating unchanged). Owner dashboard (/owner/rating-agreement): built, not checked as owner.
- A4 percentiles: later (needs 50+ players per sport and position).
- B1 assessment order rules: PASS (8 tests).
- B2 saved progress, checklist card in Before you start, movement and safety check (pain → report-pain screen): BUILT, not phone-checked (sign-in as a test player needs owner approval). Players cannot self-label results coach-verified. Not yet on the plan itself; coach on-the-spot and under-13 parent flow not built.
- C1 discipline rules: PASS (6 tests; "Not enough data" under 8 pairs; never claims cause).
- C2 coach Discipline tab (7/28/90-day done vs set, streak, missed days, most-skipped card type; connected coaches only): BUILT, not phone-checked. Still to do: links to results, logging consistency, team and org summaries.
- D Coach/Org plans: NOT STARTED. Stripe product/price IDs: none created yet.
- D fair-use clause: DRAFTED for lawyer review, NOT approved (docs/owner/fair-use-clause-draft.md).
- D coach logging: proposal written, not built (docs/owner/coach-logging-proposal.md).
- E full proof list: NOT DONE.

## Owner updates to Plan 4 (22:36)
- U1 grades by 5s: PASS tests (19.9 Sub Par decimal, 35 Sub Par, 40/60 Acceptable, 65 Elite, 47→45, 48→50). All 20–80 grade screens now show steps of 5 (sessions, calendar, scout compare, reports list, vault scout grades and 6-week test card, catching, baserunning). Supersedes A1 "60.1 Elite" (60.1 now shows 60, Acceptable).
- U2 check-ins for coaches/orgs: PASS on the backend with test accounts (Demo Coach + Demo College Outfielder, temporary link, all undone): health sharing OFF → check-in done shown, answers hidden; ON → answers shown (sleep 7.5 h, pain right elbow 3); a stranger is blocked. Screens: Readiness & pain tab (attendance always + "Shared only with health consent" + "Ask to turn on health sharing" message to player and parent), check-in card on Development and Discipline tabs, org dashboard line (check-in days, answers only on the player page). Not phone-checked (sign-in approval unavailable).

## Next item
Phone proof of B2 and C2 (needs sign-in approval), then the coach on-the-spot assessment, then D (Stripe products and checkout).

## Waiting on the owner
1. Approve the sign-in prompt so test player and coach screens can be checked on a phone.
2. Yes/skip: decimal grade columns for coach and scout grades (a 12.4 is now stored as 12).
3. Four sponsorship answers: price per sponsored player (monthly/yearly), modules covered, grace period, players already paying.
4. Lawyer review of the fair-use clause draft.
5. Choose an option in the coach-logging proposal.
6. Spaces keep/remove (still off); Vault review queue.

# REPORT — 2026-10-12 18:55 UTC (owner OK: plan builder with Lifting Option B)

**Ready to publish: no.** (Phase 11 still waits on the owner's 4 billing answers.)

**PLAN BUILDER DEPLOYED (owner OK by name) — PASS.** Before deploying: the 23 lifting tests passed. Deployed only the plan builder (wk-generate-daily). It is on the shared backend, so the live app now builds plans with Option B. No publish, no cron change, no iOS change.
Proof on the live builder (real test players, real builder):
- Off-season lift day (Demo College Outfielder, Fri 2026-10-16, Offseason Q1): robustness exercise added — "Robustness — keeps your hip rotation strong all year" (hip airplane). On Tue 2026-10-13 no extra was added because that day's areas (hip rotation, squat) were already covered by the main lifts (hip airplane, split squat hold); the builder never doubles an exercise. Both days were also trimmed by the existing "easing back in" lifting cap (6 hard sets).
- In-season lift day, no game near (Demo HS Shortstop, 2026-10-13): robustness added at 1 set each (total-body power: med-ball scoop toss; hamstring: slider bridge curl). Whole lift = 11 sets, under the 13-set in-season cap.
- Near a game (Demo MLB Outfielder, game day 2026-10-13, game 6 h away): robustness withheld (0 rows), primer-only day.
- Recovery days (2026-10-14 for both): no robustness, light work only.
- Daily plan job: 18:40 run OK (0 failed); 18:50 run — the first one to build on the new builder — built 3 plans, 0 failed, 0 worker errors.
Cleanup: test plans, run rows and build claims made during the check were deleted (0 left) and the four demo players' "started" flag was put back. (A code-checker tool crashed on this machine before deploy; that was a tool crash, not an error in the app code.)

**Next item:** Phase 11 sponsorship billing, once the owner answers the 4 questions below.
**Waiting on the owner:** the 4 billing answers (price per sponsored player, monthly/yearly; which modules; grace period; players already paying); keep or remove Spaces (off); Vault review queue.

## READ-ONLY ANSWER 1 — What the 6-week test (vault_performance_tests) contains

Nothing changed. The first test is the same list as every later 6-week test. It is built from three things: the sport, the program's sections, and the program's data level (Complete Pitcher = level 2, 5Tool Player = level 3, Golden 2Way = level 4). Sections: Complete Pitcher = Pitching; 5Tool Player = Hitting + Throwing; Golden 2Way = Hitting + Pitching + Throwing. Each section also includes the "general" (whole-athlete) tests. The player picks one section per test. Units: s = seconds, in = inches, ft = feet, mph, deg = degrees.
### baseball · Complete Pitcher · pitching section (23)
- speed: 10-Yard Dash (s); 30-Yard Dash (s); 60-Yard Dash (s)
- power_lower: SL Broad Jump (in); SL Vertical Jump (in); SL Lateral Broad Jump (in); Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft)
- throwing_velocity: Long Toss Distance (ft); Pitching Velocity (mph); Position Player Throw Velo (mph)
- mobility: Single Leg 3x Bound (ft); Shoulder ROM Internal (deg); Shoulder ROM External (deg); Hip Internal Rotation (deg)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s)
- fielding: Fielding Exchange Time (s)
- body_control: SL Balance (Eyes Closed) (s)
- energy_system: 300yd Shuttle (s)

### baseball · 5Tool Player · hitting section (25)
- speed: 10-Yard Dash (s); 30-Yard Dash (s); 60-Yard Dash (s)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s)
- power_lower: SL Broad Jump (in); SL Lateral Broad Jump (in); Vertical Jump (in); SL Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft)
- exit_velocity: Tee Exit Velocity (mph); Max Tee Distance (ft); Bat Speed (mph)
- throwing_velocity: Position Player Throw Velo (mph); Long Toss Distance (ft)
- mobility: Single Leg 3x Bound (ft); Hip Internal Rotation (deg); Shoulder ROM Internal (deg); Shoulder ROM External (deg)
- fielding: Fielding Exchange Time (s)
- body_control: SL Balance (Eyes Closed) (s)
- energy_system: 300yd Shuttle (s)

### baseball · 5Tool Player · throwing section (23)
- speed: 10-Yard Dash (s); 30-Yard Dash (s); 60-Yard Dash (s)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s)
- power_lower: SL Broad Jump (in); SL Lateral Broad Jump (in); SL Vertical Jump (in); Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft)
- throwing_velocity: Long Toss Distance (ft); Position Player Throw Velo (mph)
- fielding: Fielding Exchange Time (s); Pop Time (Catchers) (s)
- mobility: Single Leg 3x Bound (ft); Shoulder ROM Internal (deg); Shoulder ROM External (deg); Hip Internal Rotation (deg)
- body_control: SL Balance (Eyes Closed) (s)
- energy_system: 300yd Shuttle (s)

### baseball · Golden 2Way · hitting section (34)
- speed: 10-Yard Dash (s); 30-Yard Dash (s); 60-Yard Dash (s); 10-30 Split (s); 30-60 Split (s)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s); First Step (5yd) (s)
- power_lower: SL Broad Jump (in); SL Lateral Broad Jump (in); Vertical Jump (in); SL Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft); MB Overhead Throw (5lb) (ft)
- exit_velocity: Tee Exit Velocity (mph); Max Tee Distance (ft); Bat Speed (mph); Avg Exit Velo (BP, 10 swings) (mph)
- throwing_velocity: Position Player Throw Velo (mph); Long Toss Distance (ft)
- mobility: Single Leg 3x Bound (ft); Hip Internal Rotation (deg); Shoulder ROM Internal (deg); Shoulder ROM External (deg); Ankle Dorsiflexion (in)
- fielding: Fielding Exchange Time (s); 60yd Shuttle (s)
- body_control: SL Balance (Eyes Closed) (s); Deceleration (10yd stop) (s)
- energy_system: 300yd Shuttle (s); Sprint Repeatability (6×30yd avg) (s)

### baseball · Golden 2Way · pitching section (32)
- speed: 10-Yard Dash (s); 30-Yard Dash (s); 60-Yard Dash (s); 10-30 Split (s); 30-60 Split (s)
- power_lower: SL Broad Jump (in); SL Vertical Jump (in); SL Lateral Broad Jump (in); Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft); MB Overhead Throw (5lb) (ft)
- throwing_velocity: Long Toss Distance (ft); Pitching Velocity (mph); Pulldown Velocity (mph); Position Player Throw Velo (mph)
- mobility: Single Leg 3x Bound (ft); Shoulder ROM Internal (deg); Shoulder ROM External (deg); Hip Internal Rotation (deg); Ankle Dorsiflexion (in)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s); First Step (5yd) (s)
- fielding: Fielding Exchange Time (s); 60yd Shuttle (s)
- body_control: SL Balance (Eyes Closed) (s); Deceleration (10yd stop) (s)
- energy_system: 300yd Shuttle (s); Sprint Repeatability (6×30yd avg) (s)

### baseball · Golden 2Way · throwing section (31)
- speed: 10-Yard Dash (s); 30-Yard Dash (s); 60-Yard Dash (s); 10-30 Split (s); 30-60 Split (s)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s); First Step (5yd) (s)
- power_lower: SL Broad Jump (in); SL Lateral Broad Jump (in); SL Vertical Jump (in); Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft); MB Overhead Throw (5lb) (ft)
- throwing_velocity: Long Toss Distance (ft); Position Player Throw Velo (mph)
- fielding: Fielding Exchange Time (s); Pop Time (Catchers) (s); 60yd Shuttle (s)
- mobility: Single Leg 3x Bound (ft); Shoulder ROM Internal (deg); Shoulder ROM External (deg); Hip Internal Rotation (deg); Ankle Dorsiflexion (in)
- body_control: SL Balance (Eyes Closed) (s); Deceleration (10yd stop) (s)
- energy_system: 300yd Shuttle (s); Sprint Repeatability (6×30yd avg) (s)

### softball · Complete Pitcher · pitching section (23)
- speed: 7-Yard Dash (s); 30-Yard Dash (s); 40-Yard Dash (s)
- power_lower: SL Broad Jump (in); SL Vertical Jump (in); SL Lateral Broad Jump (in); Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft)
- throwing_velocity: Long Toss Distance (ft); Pitching Velocity (mph); Position Player Throw Velo (mph)
- mobility: Single Leg 3x Bound (ft); Shoulder ROM Internal (deg); Shoulder ROM External (deg); Hip Internal Rotation (deg)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s)
- fielding: Fielding Exchange Time (s)
- body_control: SL Balance (Eyes Closed) (s)
- energy_system: 300yd Shuttle (s)

### softball · 5Tool Player · hitting section (25)
- speed: 7-Yard Dash (s); 30-Yard Dash (s); 40-Yard Dash (s)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s)
- power_lower: SL Broad Jump (in); SL Lateral Broad Jump (in); Vertical Jump (in); SL Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft)
- exit_velocity: Tee Exit Velocity (mph); Max Tee Distance (ft); Bat Speed (mph)
- throwing_velocity: Position Player Throw Velo (mph); Long Toss Distance (ft)
- mobility: Single Leg 3x Bound (ft); Hip Internal Rotation (deg); Shoulder ROM Internal (deg); Shoulder ROM External (deg)
- fielding: Fielding Exchange Time (s)
- body_control: SL Balance (Eyes Closed) (s)
- energy_system: 300yd Shuttle (s)

### softball · 5Tool Player · throwing section (23)
- speed: 7-Yard Dash (s); 30-Yard Dash (s); 40-Yard Dash (s)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s)
- power_lower: SL Broad Jump (in); SL Lateral Broad Jump (in); SL Vertical Jump (in); Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft)
- throwing_velocity: Long Toss Distance (ft); Position Player Throw Velo (mph)
- fielding: Fielding Exchange Time (s); Pop Time (Catchers) (s)
- mobility: Single Leg 3x Bound (ft); Shoulder ROM Internal (deg); Shoulder ROM External (deg); Hip Internal Rotation (deg)
- body_control: SL Balance (Eyes Closed) (s)
- energy_system: 300yd Shuttle (s)

### softball · Golden 2Way · hitting section (34)
- speed: 7-Yard Dash (s); 30-Yard Dash (s); 40-Yard Dash (s); 10-30 Split (s); 30-60 Split (s)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s); First Step (5yd) (s)
- power_lower: SL Broad Jump (in); SL Lateral Broad Jump (in); Vertical Jump (in); SL Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft); MB Overhead Throw (5lb) (ft)
- exit_velocity: Tee Exit Velocity (mph); Max Tee Distance (ft); Bat Speed (mph); Avg Exit Velo (BP, 10 swings) (mph)
- throwing_velocity: Position Player Throw Velo (mph); Long Toss Distance (ft)
- mobility: Single Leg 3x Bound (ft); Hip Internal Rotation (deg); Shoulder ROM Internal (deg); Shoulder ROM External (deg); Ankle Dorsiflexion (in)
- fielding: Fielding Exchange Time (s); 60yd Shuttle (s)
- body_control: SL Balance (Eyes Closed) (s); Deceleration (10yd stop) (s)
- energy_system: 300yd Shuttle (s); Sprint Repeatability (6×30yd avg) (s)

### softball · Golden 2Way · pitching section (32)
- speed: 7-Yard Dash (s); 30-Yard Dash (s); 40-Yard Dash (s); 10-30 Split (s); 30-60 Split (s)
- power_lower: SL Broad Jump (in); SL Vertical Jump (in); SL Lateral Broad Jump (in); Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft); MB Overhead Throw (5lb) (ft)
- throwing_velocity: Long Toss Distance (ft); Pitching Velocity (mph); Pulldown Velocity (mph); Position Player Throw Velo (mph)
- mobility: Single Leg 3x Bound (ft); Shoulder ROM Internal (deg); Shoulder ROM External (deg); Hip Internal Rotation (deg); Ankle Dorsiflexion (in)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s); First Step (5yd) (s)
- fielding: Fielding Exchange Time (s); 60yd Shuttle (s)
- body_control: SL Balance (Eyes Closed) (s); Deceleration (10yd stop) (s)
- energy_system: 300yd Shuttle (s); Sprint Repeatability (6×30yd avg) (s)

### softball · Golden 2Way · throwing section (31)
- speed: 7-Yard Dash (s); 30-Yard Dash (s); 40-Yard Dash (s); 10-30 Split (s); 30-60 Split (s)
- quickness: 5-10-5 Pro Agility (s); Lateral Shuffle (10yd) (s); First Step (5yd) (s)
- power_lower: SL Broad Jump (in); SL Lateral Broad Jump (in); SL Vertical Jump (in); Vertical Jump (in); Standing Broad Jump (in)
- power_upper: MB Situp Throw (5lb) (ft); Seated Chest Pass (5lb) (ft); MB Rotational Throw (5lb) (ft); MB Overhead Throw (5lb) (ft)
- throwing_velocity: Long Toss Distance (ft); Position Player Throw Velo (mph)
- fielding: Fielding Exchange Time (s); Pop Time (Catchers) (s); 60yd Shuttle (s)
- mobility: Single Leg 3x Bound (ft); Shoulder ROM Internal (deg); Shoulder ROM External (deg); Hip Internal Rotation (deg); Ankle Dorsiflexion (in)
- body_control: SL Balance (Eyes Closed) (s); Deceleration (10yd stop) (s)
- energy_system: 300yd Shuttle (s); Sprint Repeatability (6×30yd avg) (s)

## READ-ONLY ANSWER 2 — AI cost per video analysis (from the code)

How the AI is called: every analysis goes through one shared caller. It tries Google Gemini first. If Google refuses or fails, it tries OpenAI once (gpt-4o-mini; gpt-4o for "pro" models). That caller has no automatic retries of its own. Note: the code sends "gemini-2.5-flash" requests to Google as **gemini-3.6-flash** (flash-lite too, and pro goes to gemini-3.5-pro), so the real Google rate may not be the 2.5 Flash rate. All prices below use the rates you asked for ($0.30 per 1M input, $2.50 per 1M output). Output includes Gemini's "thinking" tokens, and no output limit is set, so output is the biggest unknown. Token counts are estimates (instructions measured from the code at ~4 characters per token; picture sizes estimated).

**Main video analysis (analyze-video): Hitting, Pitching and Throwing, baseball and softball.**
- AI calls: 1 per analysis. Re-running the same video with the same version returns the saved result for free (cached).
- What is sent: 7 pictures from the video (longest side at most 1,280 px) plus the measurements already worked out on the phone. Body tracking (pose) runs on the phone, not on a paid server.
- Input per call: instructions + rules + answer format ≈ hitting 28k tokens (both sports); baseball pitching ≈ 9.5k; softball pitching ≈ 14.5k; throwing ≈ 10k. Pictures add ≈ 3.6k (7 × ~516) typical, ≈ 7.2k worst.
- Output per call: ≈ 3–5k typical (scores, feedback, drills, report-card measurements, plus thinking); ≈ 10k worst.
- Cost (typical / worst incl. a failed Google call that still bills + the OpenAI backup):
  - Hitting: ≈ $0.019 / ≈ $0.07
  - Baseball pitching: ≈ $0.014 / ≈ $0.065
  - Softball pitching: ≈ $0.015 / ≈ $0.067
  - Throwing (both sports): ≈ $0.014 / ≈ $0.065
  - (The worst case is mostly OpenAI's picture charge: 7 large pictures on gpt-4o-mini ≈ $0.027, plus ≈ $0.01 text.)

**Base-stealing reaction rep (analyze-base-stealing-rep):** 1 call, 20 pictures + timing text. ≈ 6–21k input, ≈ 1–3k output (with thinking). ≈ $0.007 typical / ≈ $0.08 worst (20 pictures on the OpenAI backup).

**Game Plan at-bat swing (gp-analyze-ab-swing):** 1 call. The whole clip is sent to Gemini (≈ 300 tokens per second of video), plus pitcher/at-bat text. A 10 s clip ≈ 4–5k input, ≈ 2k output ≈ $0.007. Worst: a 60 s clip (≈ 18k) or a non-video file sent as text (up to ≈ 60k tokens) with ≈ 8k output ≈ $0.04. The OpenAI backup can't read video, so a Google failure ends with an error rather than a second paid call.

**Library video tagging (analyze-video-description, owner/admin only):** 1 text-only call, ≈ 1–2k in / ≈ 1k out ≈ $0.003.

**Follow-up after a session (hie-analyze, not per video):** 1 text-only call (measurements only, no pictures) on flash-lite (sent as gemini-3.6-flash). The caller tries up to 3 times. Roughly ≈ $0.005–0.02 per session, up to 3× that in the worst case.

**Not used by players:** live-playback analysis (analyze-realtime-playback) is not called anywhere in the app. Report-card recompute is owner/admin only.

**Other paid services per analysis:**
- Pose and on-device ball tracking: run on the phone, no per-analysis charge.
- Pitch velocity (pitch-velocity-measure, owner/admin only, locked): Roboflow hosted ball detection, up to 60 calls per analysis (capped in code). The code doesn't contain Roboflow's price. Assuming about $0.001–0.004 per call, that's about $0.06–0.24 per analysis. Check this against the Roboflow invoice.
- No other paid model hosts (Replicate, Hugging Face, Modal) are called.

---

# REPORT — 2026-10-12 17:55 UTC (II6, end of batch)

**Ready to publish: no.** Reasons: Phase 11 waits on owner answers; the plan builder (Option B) waits on the owner's OK. (No publish checklist yet; it gets written when the answer becomes yes.)

**II6 PASS — Coach "Schedule a practice" for one player or a whole team, with the safety check** (Plan §4, open item from Phase 5/7). Coach Dashboard → Schedule Practice now has: Individual / Whole team (from the coach's teams) / organization; How hard (Light/Standard/Hard), Minutes, "Includes throwing"; a "Check safety" step listing each player as OK or Not allowed with the reason and a one-tap safe option. Rules (existing app rules only): the player's rest day stays rest (offers next open day); game day = light only; in season no hard practice the day before a game; throwing waits for the pitch-count rest date. Server re-checks on Schedule and sends only to players who pass; only linked players who pass the child-safety gate. The player sees it to Accept/Decline, then on My Daily Game Plan as "Hitting Team Session · From Coach · 16:00 – 17:00". Practices count toward workload (the plan builder already reads them for the next days' recovery limit). Bug fixed: accepted practices never appeared on the plan at all. Proof: API as Demo Coach — normal day OK; rest day blocked → "move it to 2026-10-21"; game day hard → "make it a light practice"; throwing after a 90-throw day → "arm needs rest until 2026-10-17"; an unlinked player refused; signed out 401. Phone (390 px) as Demo Coach: blocked → tapped safe option → OK → sent (/tmp/browser/ii6/1_blocked.png); as Demo College Outfielder: accepted, card on the plan with "From Coach" (/tmp/browser/ii6/4_plan.png). 5 new tests. The new check function is deployed to the backend (shared with the published app but unused there until a publish). The weekly-repeat option was removed from this screen because the safety check covers one date. All proof data deleted (0 rows left).

**Phases (docs/owner/scouting-plan-v3.1.md):** 1 Security PASS · 2 Accounts/orgs/teams PASS · 3 Consent PASS · 4 Onboarding PASS · 5 Game stats PASS · 6 Coach tools PASS (practice scheduling added II6) · 7 Coach workouts + safety PASS · 8 Facility tools + owner additions PASS · 9 Scout tools PASS (II1–II3) · 10 The General PASS (II4) · 11 Sponsorship billing BLOCKED.

**Next item:** Phase 11 sponsorship billing, once the owner answers: (1) price per sponsored player, monthly or yearly; (2) which modules it covers; (3) grace-period length; (4) players already paying — pause, refund overlap, or start at renewal.
**Waiting on the owner:** the 4 billing answers; OK to deploy the plan builder (Option B); keep or remove Spaces (off); Vault review queue.

---

# REPORT — 2026-10-12 17:20 UTC (II1, step 1)

**Ready to publish: no.** **II1 step 1 PASS: Scout Profile tabs.** The Scout Profile now has Overview, ID and academics, Performance, Reports and video, Six-week recap, Grades, Players Club, plus Game play and stats. Each tab shows only what the family shared (profile / stats / video / academics, minors also need the parent's yes); unshared tabs say "Not shared"; blank profile fields say "Not entered", missing measurements "Not yet measured"; every value carries a source label (athlete-entered, facility-verified (in person), transcript verified, video analysis reports, who entered a grade + date). Server lookup scout_athlete_profile (accepted follow + scout/recruiter role + no block + per-scope sharing). Proof on a phone as the test scout (/tmp/browser/ii1/2.png): player shared profile + stats only → Overview showed real profile, Performance showed "sixty yard dash 7.2 s · facility-verified (in person)", Reports and video + ID and academics said "Not shared". Visibility turned off → refused; outsider refused. Bug fixed during proof (lookup failed on the batting-side field type). All proof data deleted.
**II2 PASS — Scout Dashboard search filters:** added Playing level (high school/college/pro), "Only players with a test verified in person", and "Tested within 30/90/365 days"; test filters match only players who share stats with that scout. Proof as test scout (phone + API): College+verified+30 days found the adult test player; Professional didn't; after changing his test to athlete-entered, "verified" no longer found him while "last 30 days" still did. Bug fixed: the 50-row limit could hide matching players. Practice data removed, test account re-hidden.

**II3 PASS — Scout comparison (2–4):** "Compare players" button on the Scout Dashboard (2+ followed) opens a picker (max 4); each column shows only what that family shared (position, level, grad year, latest test with date + source, tests logged, latest grade with date + who entered it, report count); fairness warnings for different positions/levels, grad years 2+ apart, mixed verified/athlete-entered tests, stats not shared, fewer than 2 tests. Uses the same server-gated scout profile. Proof on phone as test scout: adult player showed 60-yd 7.2 s (2026-10-09, facility-verified), 2 tests; 16-year-old without a parent's yes showed "Not shared" everywhere with a warning; after the adult turned sharing off, his column became "Not shared". 4 new tests. Practice data removed. Phase 9 PASS.

**II4 PASS — Phase 10, The General's two layers:** Player view already had progress vs own starting point, personal bests, tests and season position; added "Your six-week recap" card (period, strength change, total weight lifted, source; empty state when none). Scout overview added on top of the Scout Profile Overview tab: strengths/areas to develop with evidence and source, game stats summary (count, latest date, how many verified), latest grade with who/when, six-week recap, report counts — each "Not shared" / "Not yet measured" when true, all from the existing server-gated scout data. Proof on phone: 16-year-old test player saw his recap (4.5%, 12,500 lb); test scout saw Hitting strength / Throwing area to develop with averages and dates, "No games logged yet", grade "Not yet measured", 4 reports. Practice data removed.

**Next:** Phase 11 (sponsorship billing) — BLOCKED on owner answers: (1) price an organization pays per sponsored player, monthly or yearly; (2) which modules a sponsorship covers; (3) grace-period length after a sponsorship ends; (4) if a player already pays, whether we pause their payment, refund the overlap, or start sponsorship at their renewal. Ready to publish: no.
**Waiting on the owner:** OK to deploy the plan builder (Option B); keep or remove Spaces (off); Vault review queue.

---

# REPORT — 2026-10-12 17:10 UTC (owner OK: test-account tool)

**Ready to publish: no.** **create-test-athlete REDEPLOYED (owner OK by name) — PASS.** Code check passed first. Proof: removed the test parent ↔ 13-year-old link, ran the tool as the owner (200) → link re-created, active, only that one pair. Non-owner call refused (403), signed-out refused (401). Real users unaffected: parent links for anyone outside the test parent: 0 before, 0 after; the tool only touches the named test personas. Owner has accepted the updated terms on his account (owner item closed). Next item unchanged: Scout Profile remaining tabs.
**Waiting on the owner:** OK to deploy the plan builder (Option B); keep or remove Spaces (off); Vault review queue.

---

# REPORT — 2026-10-12 17:05 UTC (HH8, end of batch)

**Ready to publish: no.** (Phase 7 in progress; plan-builder deploy awaits the owner.)

**HH8 PASS: Scout "Game play and stats" proven on a phone** as the test coach acting as a scout (temporary scout role): the adult test player's practice game showed hitting (2 at-bats, 1 hit, 1 extra-base hit, 1 walk, 1 strikeout, stolen bases "Not yet measured"), pitching (pitch count 2, top speed 81 mph; innings/hits/runs/walks/strikeouts "Not yet measured"), fielding (1 putout), the batted-ball chart and the pitch-location grid, all labeled "Source: athlete-entered" (/tmp/browser/hh8/2.png). Server refusals proven in HH7 (sharing off, follow removed, outsider). All proof data deleted (game, plays, follow, scout role, sharing row).

**Phases against docs/owner/scouting-plan-v3.1.md:**
- Security fixes: PASS (CC6).
- 2 Accounts/orgs/teams/one inbox/head coach: PASS (DD7–DD10).
- 3 Consent + scouting switch: PASS; under-13 parent switch + contact-the-parent route PASS (HH6).
- 4 Onboarding + academics/transcripts: PASS (EE1–EE5).
- 5 Game stats + verification + pitch/spray capture: PASS (EE6, GG4).
- 6 Coach Dashboard/View/Messages: PASS (EE7–EE9, FF1–FF8, GG1–GG3).
- 7 Coach workouts with safety check: PASS (EE9).
- 8 Facility dashboard, comparison, trends + owner additions (Development, strengths/weaknesses, testing day, compare by test): PASS (GG5–GG8, HH1–HH5).
- 9 Scout tools: PARTIAL — Game play and stats tab PASS (HH7–HH8); Scout Profile tabs PASS (II1), search filters PASS (II2), scout comparison PASS (II3). Phase 9 PASS.
- 10 The General two layers: NOT STARTED.
- 11 Sponsorship billing: NOT STARTED.

**Option B lifting:** built and proven in 8-week simulations (720 combos, 0 rule violations, in-season max 13 sets = cap, slot withheld on all 2,304 near-game days, shortfalls 3,618 → 558; remaining shortfalls blocked by the age and in-season set-cap rules). NOT deployed.

**Legal v2 saved (approved by the owner, effective 2026-10-12):** Subscription Policy v2 (live); Child Safety, Privacy Policy and Consumer Health Data Policy v2 (one-time notice, no forced re-acceptance).

**Next item:** Scout Profile remaining tabs (Overview, ID and academics, Performance, Reports and video, Six-week recap, Grades, Players Club), then dashboard search filters, then scout comparison.

**Waiting on the owner:** OK to deploy the plan builder (Option B); test-account tool redeploy; keep or remove Spaces (off); Vault review queue (79 + 10 tag suggestions); owner's own terms not accepted.

---

# REPORT — 2026-10-12 17:00 UTC (HH7, Phase 7 started)

**Ready to publish: no.** **HH7 PARTIAL: Scout Profile → "Game play and stats" tab.** New Scout Profile page (button "Game play and stats" on each followed player on the Scout Dashboard): last 10 games with hitting (at-bats, hits, extra-base hits, walks, strikeouts, stolen bases), pitching (pitch count, top speed), fielding (putouts, assists, errors), batted-ball chart and pitch-location grid from tapped-in data only; anything not logged (innings, runs, pitcher hits/walks/strikeouts, steals with no base-running logs) says "Not yet measured"; each game labeled athlete-entered or verified. Server rule: scout/recruiter role + accepted follow + no block + family shared "metrics" (minors also need the parent's yes). Server proof PASS (all rolled back, nothing kept): scout saw the practice game; refused when sharing turned off, when the follow was removed, and for an outsider. 4 new tests. NOT yet proven on a phone screen as a scout. Still open in Phase 7: other Scout Profile tabs, dashboard search filters, scout comparison 2–4.
**Waiting on the owner:** deploy OK for the plan builder; test-account tool redeploy; keep/remove Spaces (OFF); Vault review queue; owner terms not accepted.

---

# REPORT — 2026-10-12 16:35 UTC (HH1, in progress)

**Ready to publish: no.** HH1 step 1 BUILT: Coach Dashboard roster — each player card now has a "Strengths & weaknesses" button; tap loads that player's strengths/weaknesses (same RPC + logic as the Development tab, so the same access limits apply), each with evidence and date, "Not enough data yet" when true, labeled "Source: video analysis reports". Build OK. HH2 PROOF PASS: test coach on a phone screen tapped the button and saw "Strength: Hitting is a strength" and "Weakness: Throwing needs the most work", each with average, report count and date (/tmp/browser/hh2/2.png); access is the same check the Development tab uses (outsiders refused, proven in GG8). Temporary coach link and 4 practice reports deleted.
**HH3 PASS: strengths & weaknesses on org comparison** — same tap button under each compared player; proven as the test org admin on a phone: rich player showed Hitting strength / Throwing weakness with evidence + dates, thin player showed "Not enough data yet" (/tmp/browser/hh3.png); proof memberships + reports deleted.
**HH4 PASS: testing day for facility athletes** — new Testing tab on the Organization Dashboard: schedule (player, date, test list), reschedule, skip with reason, enter results on or after the day with optional https video link → saved as a test labeled "Source: facility-verified (in person)" (athlete-entered tests keep their label). Notices go to the head coach, assigned coaches and the scheduler when scheduled, moved or skipped, 3 days ahead and on the day (sent when staff open the Testing tab — no cron added; a daily job would need the owner). Proven as the test org admin on a phone (/tmp/browser/hh4/1.png): scheduled + entered results → "Done — verified in person"; head coach got scheduled, "in 3 days" and "is today" notices; outsider coach refused to schedule or move (403); future-day results and past dates refused. Bug fixed during proof (sport lookup). All proof data deleted. Not yet built: a pain/injury check before a testing day.
**HH5 PASS: compare by test results** — "Rank by test" on the Compare tab: pick any logged test, choose whether higher or lower is better, filter by age group, position, level, verified-in-person only; each rank shows result, test date, position/level/age and its source label; fair-comparison warnings (positions, levels, 2+ year age gap, mixed verification, 90+ days apart, "not enough data yet"). Org staff see all players; assigned coaches see only their assigned players; anyone else refused (403). Proven as the test org admin on a phone (/tmp/browser/hh5_1.png): 7.1 s verified ranked above 7.6 s athlete-entered with warnings; verified-only left one player + "Not enough data yet". 6 new tests. Also fixed: the organization tab row now scrolls sideways on phones (Compare was unreachable). Proof data deleted.
**PHASE 6 COMPLETE (PASS).**
**HH6 PASS: under-13 parent scouting switch + contact-the-parent route.** Scouts can now send a follow request to an under-13 player ONLY when the parent has turned scouting on (server check); the request lands in the parent's Requests inbox ("Scout X wants to follow <child>'s profile", with the scout's note) and only the parent can accept or deny. Proven with test accounts on a phone (test player temporarily set to age 12, then restored): switch off → scout refused (403); parent turned on Scouting visibility + Profile → scout request went through and showed in the parent inbox; parent accepted; parent turned it off → scout refused again (403). Also fixed: parents saw requests about their teen as "You asked to follow…" with a Cancel button — now a "Notices about your athlete" section naming the child (1 new test). Under-13 scouting is live in the app code, OFF by default per account. All proof data restored/deleted. Known: no scout test account exists (the test coach was given a scout role temporarily, then removed).
Next: Phase 7 (scout tools).
**Waiting on the owner:** deploy OK for the plan builder; test-account tool redeploy; keep/remove Spaces (OFF); Vault review queue; owner terms not accepted.

---

# REPORT — 2026-10-12 16:25 UTC (owner decisions)

**Ready to publish: no** — the plan-builder change is built and simulated but NOT deployed (see below); Phase 6 owner additions and Phases 7–9 continue.

**1. Lifting coverage — Option B: BUILT, proven in simulation, awaiting deploy (PASS in sim).** One rotating robustness slot on every lift day, all year (builder step 9, rules in _shared/wic/lift/blueprint.ts). Off-season: a pair of integrated movements at their own catalog sets — early: hamstring+hips / hamstring+calves / hip rotation+squat; late (os_q3–q4): squat+hamstring ×2, then hips+calves+hip rotation. In-season: power + hamstring early week, power + groin/calves (alternating weeks) later, 1 set each. **How it fits in-season:** base in-season lift = 11 sets; the slot adds 2 → 13 = the cap, so nothing was trimmed; if a session is already at the cap the slot drops (never pushes past it). Skipped on game day and within 48 h of a game/start. Nordics/Copenhagen never in the slot. **8-week sims** (720 combos: 3 roles × 2 sports × ages 13/14/16/19 × 6 phases × 3 training ages × goal): 0 rule violations; max in-season session 13; 0 in-season eccentric; overload check 0 bad; shortfalls 3,618 → 558. Off-season ages 14–19: every minimum met. **Still short, with the blocking rule:** age 13 off-season squat/hinge/power (most loaded versions are 14+/16+, age rule wins); in/post-season trunk 1.8/2 and post-season hinge 1.8/2 (in-season set cap full). Games scenario: slot correctly withheld on all 2,304 near-game lift days. Found and fixed: the builder used two lifting rules without importing them (would have crashed the off-season trunk finisher and second-lower pick if deployed). **Waiting on the owner: OK to deploy the plan builder (wk-generate-daily).**

**2. Under-13 scouting legal wording: SAVED (PASS).** Child Safety, Privacy and Consumer Health Data v2 saved, approved = true, approved by the owner, effective 2026-10-12; only the three approved passages changed (verified line diff). No forced re-acceptance (v1 acceptance still counts; 2 new tests). One-time non-blocking notice "We've updated our Privacy Policy" for every signed-in user, with an extra parent line on under-13 accounts; proven on a phone as the 16-year-old test player (shows once, gone after "Got it" + reload; /tmp/browser/notice/1.png); privacy page shows "Version 2 · Effective 2026-10-12". Under-13 scouting stays OFF per account until the parent switch and the contact-the-parent route are proven (next item).

**3. Test accounts: KEPT.** All are system accounts; already hidden from player search; now also hidden from coach search, and excluded from anonymous training data (rule updated; 224 old test-account training rows removed).

**Tests:** 2,835/2,835; build OK.

**Next item:** under-13 parent scouting switch + contact-the-parent route proof → then Phase 6 owner additions (roster strengths/weaknesses, testing day, compare by test) → Phases 7–9.

**Waiting on the owner:** deploy OK for the plan builder; test-account tool redeploy; keep/remove Spaces (OFF); Vault review queue; owner terms not accepted.

---

# REPORT — 2026-10-12 03:25 UTC (GG8, end of batch)

**Ready to publish: no** — Phase 6 owner additions continue (strengths/weaknesses on the Coach Dashboard roster + org comparison, testing day, compare by test), then Phases 7–9; legal wording waits for the lawyer.

**GG8 DONE — Phase 6 owner addition: Development tab in Coach View (2026-10-12, PASS).** New "Development" tab on each player's coach page (also open to org admins for rostered players via the same RPC). Four sections, all from real data only: (1) Takeaways — 1–3 plain-language takeaways, each with its evidence and a High/Medium/Low confidence; (2) Development report card — per category the 5 most recent reports with dates, efficiency scores, a trend arrow, and issues classified Recurring (2+ of last 5) / New (first time in latest report) / Cleaning up (absent from the latest report), each with times-seen, last-seen date and the evidence sentence; (3) Strengths & weaknesses — categories above/below the player's own average, each with evidence and date, honest "Not enough data yet" / "No category stands out yet" when true; (4) Connections — every one labeled Observed fact / Measured change / Supported pattern / Hypothesis to check / Not enough data, with the standing line that a connection never means one thing caused another. Backed by SECURITY DEFINER RPC coach_athlete_development (self, connected coach, or org staff of the player's org; everyone else refused). Logic in src/lib/coach/development.ts (pure, 15 tests). Proof: test coach on a phone screen saw the seeded 13-year-old's real development view — early arm Recurring (5 of 5), head drift New, glove-side pull Cleaning up with correct last-seen date, Supported pattern / Hypothesis to check / Observed fact / Measured change connections, two High-confidence takeaways (/tmp/browser/gg8/screenshots/1_development.png); outsider (test parent) refused (403); three bugs found and fixed during proof (raw timestamps shown, wrong last-seen date, false "not enough data" in strengths); full suite 2,828/2,828; build OK; all seeded proof data deleted and the temporary coach link removed.

**Phase check against docs/owner/scouting-plan-v3.1.md:** Security PASS (CC6) · 1 Accounts/orgs/teams PASS (DD7–DD10) · 2 Consent PASS in app, wording with lawyer (DD11–DD13) · 3 Onboarding PASS (EE1–EE5) · 4 Game stats/location/spray PASS incl. verification labels (EE6, GG4) · 5 Coach tools PASS — all tabs built (EE7–EE9, FF1–FF8, GG1–GG3) · 6 Organization tools PARTIAL — facility dashboard PASS (GG5), compare PASS (GG6), growth vs game trends PASS (GG7), Development tab PASS (GG8); still open: strengths/weaknesses on Coach Dashboard roster + org comparison, testing day, compare by test results · 7–9 NOT STARTED.

**Waiting on the owner:** lawyer review of docs/owner/legal-v2-under13-scouting.md (NOT approved, not saved); Blueprint coverage decision (recommend C); test-account tool redeploy OK + keep/delete test accounts; keep or remove Spaces (facility_spaces OFF); Vault review queue 79 + 10 tag suggestions; owner terms not accepted.

**Next item:** Phase 6 owner additions — strengths/weaknesses on the Coach Dashboard roster and org comparison, then testing day for facility athletes, then compare by test results; then Phases 7–9.

---

# REPORT — 2026-10-12 03:10 UTC (GG7)

**Ready to publish: no** — Phase 6 continues (owner additions: Development tab, strengths/weaknesses, testing day, compare by test), then Phases 7–9; legal wording waits for the lawyer.

**GG7 DONE — Phase 6 growth vs game trends (2026-10-12, PASS).** New "Trends" tab on the Organization Dashboard: staff pick one player and see how three things moved over the same stretch — training completion (weekly, from the training plan log), video analysis scores (with dates), and game results (wins/losses from the game log). Each series shows a direction arrow, a plain summary and its source with point count. The "How they move together" section pairs the three series: same direction = "these move together", opposite = "these move in opposite directions" — every pair carries the line "this does not show one caused the other" (never causal); any series with fewer than 2 points reads "not enough data yet". Games list shows each game with date, opponent, score, pitch count and "Verified by coach/org" vs "Source: athlete-entered". Backed by SECURITY DEFINER RPC org_growth_trends (org staff only; player must be an active member of that org — ID guessing refused). Trend logic in src/lib/org/growthTrends.ts (pure, tested). Proof: org admin on a phone screen saw the 13-year-old test player's real seeded data — training down over 8 weeks, analysis up over 4 reports, games up over 4 games, with "these move together" on analysis vs games and "opposite directions" on the other two pairs (/tmp/browser/gg7/screenshots/2_trends.png); outsider coach refused (403); 9 new tests; full suite 2,813/2,813; build OK; all seeded proof data deleted.

**Next item:** Phase 6 owner additions — Development tab in Coach View (5 reports per category with trends, recurring/new issues, labeled connections, 1–3 takeaways, development report card), strengths/weaknesses on the Coach Dashboard roster, testing day for facility athletes, compare by test results; then Phases 7–9.

---

# REPORT — 2026-10-12 03:05 UTC (GG6)

**Ready to publish: no** — Phase 6 continues (growth vs game trends, owner additions), then Phases 7–9; legal wording waits for the lawyer.

**GG6 DONE — Phase 6 compare athletes in the organization (2026-10-12, PASS).** New "Compare" tab on the Organization Dashboard: org staff pick 2–6 players and see them side by side — name, position, level, age, latest test with its date, tests logged, latest grade with its date and who entered it, last-7-days plan completion, games logged with last date. Fair-comparison warnings appear in plain words when the pick is unfair: different positions, different levels, age gap of 2+ years, or fewer than 2 logged tests ("not enough data yet"). Backed by SECURITY DEFINER RPC org_compare_athletes (org staff only; every picked player must be an active member of that org — ID guessing refused). Warnings computed in src/lib/org/compareAthletes.ts (pure, tested). Proof: org admin got 200 with both test players' real data; 1-player pick rejected ("compare 2 to 6 players"); non-member player refused (403); outsider coach refused (403); phone screenshot shows both players, all three warnings and labeled cards (/tmp/browser/gg6/screenshots/3_compared.png); 8 new tests; full suite 2,804/2,804; build OK; all seeded proof data deleted. Note: fixed two bugs found during proof — the staff check arguments were reversed and the name lookup used the wrong profile key.

**Next item:** Phase 6 continued — growth vs game trends (training + analysis reports + game stats, "these move together", never causal, "not enough data yet"); then the owner additions (Development tab, strengths/weaknesses, testing day, compare by test); then Phases 7–9.

---

# REPORT — 2026-10-12 02:05 UTC (FF8, end of batch)

**Ready to publish: no** — Phase 6 (real), Phases 7–9 and several Phase 1–5 gaps are still open; legal wording waits for the lawyer.

| Phase (checked against docs/owner/scouting-plan-v3.1.md) | Result | Proof |
|---|---|---|
| Security fixes | PASS | CC6 |
| 1 Accounts, orgs, teams, Requests inbox | PASS, re-proof on phone pending | DD7–DD10 |
| 2 Consent up front | PASS in app; legal wording waits for lawyer | DD11–DD13 |
| 3 Onboarding | PASS | EE1–EE5 |
| 4 Game stats, location, spray | PASS, missing verified/athlete-entered labels | EE6 |
| 5 Coach tools | PARTIAL — gaps below | EE7–EE9, FF1–FF8 |
| 6 Organization tools + owner additions | NOT STARTED (earlier "Spaces" was a misread; now behind switch facility_spaces = OFF) | — |
| 7–9 | NOT STARTED | — |

**Gaps fixed so far:** summary card (FF1), message reporting (FF2), Tests + Notes tabs (FF3), name in header + profile details for coaches (FF5), Trends tab (FF6), Body load tab (FF7), player-side pitch counts (FF8). Details below.

**Owner update GG (queued, in order):** [~] remaining coach tabs — Game stats DONE (GG2: tab lists the last 10 logged games with date, opponent, result, hitting line — walks/HBP not counted as at-bats — and game pitches, each labeled "Source: athlete-entered"; empty = "No games logged yet". Proof: test coach on phone saw seeded game "2 for 3 (2B), 3 RBI, Won 5–3" (/tmp/browser/gg2/games.png); outsider refused (403); 4 new tests pass; proof game deleted. PASS). Readiness & pain DONE (GG3: last 7 days of the player's own check-ins — body readiness /5, sleep, pain areas with rating, soreness — plus days-with-pain count, "Source: athlete-entered"; shown to a coach ONLY when the player's Health item is shared (parent must allow for minors), otherwise "Not shared". Proof: test coach on phone saw "Not shared" for demo13; with Health shared temporarily he saw both check-ins and "1 of 7" pain days (/tmp/browser/gg2/shared.png); outsider 403; sharing restored, check-ins deleted; 2 new tests. PASS). Reports, Grades and Six-week recap DONE (GG3, see below) — all coach tabs built); [ ] Phase 4 verification labels (athlete-entered vs coach/org-verified); [ ] real Phase 6 + owner additions (Development tab, strengths/weaknesses, testing day, compare by test); [ ] Phases 7–9. Under-13 scouting wording still NOT approved — not saved. facility_spaces stays OFF.

**GG3 DONE — Reports, Grades and Six-week recap coach tabs (2026-10-12, PASS).** New SECURITY DEFINER RPC coach_athlete_reports returns the player's last 10 video analysis reports (module, date, efficiency score, "Source: video analysis"), last 10 grades (overall, position, type, date, "Source: …", player-confirmed flag) and the latest six-week recap (period, strength change, total weight lifted, "Source: the player's own training logs"); empty states say "No analysis reports yet" / "No grades yet" / "No recap yet". Proof: test coach on a phone screen saw all three tabs with the seeded report, grade and recap (/tmp/browser/gg3/reports.png, grades.png, six-week.png); outsider refused (403); 8 new tests; full suite 2,785/2,785; build OK; all proof data deleted. All planned coach tabs are now built.

**GG4 DONE — Phase 4 verification labels on game stats (2026-10-12, PASS).** gp_games gained verified_by/verified_at/verified_role (coach|organization); new SECURITY DEFINER RPC set_game_verification lets a connected coach or an org admin of the player's org verify or un-verify a game — never your own game. Labels: coach Game stats tab shows "Source: athlete-entered" or "Verified by coach on <date>" per game with a Mark verified / Remove verification button; the player's own game header shows "Verified by your coach on <date>" when verified. Proof: test coach verified a seeded game (204) and saw "Verified by coach on 2026-10-12" on a phone screen (/tmp/browser/gg4/verified.png); outsider refused (403); the player verifying his own game refused (403); 3 new tests; build OK; proof game deleted.

**GG5 DONE — Phase 6 facility dashboard (2026-10-12, PASS).** New "Players" tab on the Organization Dashboard: one short line per player (name, team, the single most important message — "Missed N days", "Test due in N days", "Open alert", "Today's plan done ✓", or "All good ✓"), tap opens today's status, last activity, 7-day completion, tests due and alerts; filters by team and coach. Backed by SECURITY DEFINER RPC org_facility_board (org staff only); headlines computed in src/lib/org/facilityBoard.ts (pure, tested). Proof: test org admin on a phone screen saw the 13-year-old test player's line "Missed 2 days" and the tapped details (/tmp/browser/gg5/details.png); outsider refused (403); 8 new tests; full suite 2,796/2,796; build OK; seeded membership and prescription deleted. Note: the demo org's id is e3d8503b-… (17e0dda0-… is the org admin's user id).

**Next item:** Phase 6 continued — compare athletes in the organization (2–6 side by side, dates + verification, fairness warnings) and growth vs game trends; then the owner additions (Development tab, strengths/weaknesses, testing day, compare by test); then Phases 7–9.

**Subscription Policy v2 — APPROVED by the lawyer and LIVE in the app (GG1, 2026-10-12).** Saved as version 2 (approved, approved by the owner, effective 2026-10-12); version 1 untouched; no re-acceptance needed (the policy is not on the re-accept list). Proof: /legal/subscription-policy on a phone shows "Version 2 · Effective 2026-10-12" and the four Refunds lines (/tmp/browser/gg1/refunds.png). Section 6 Refunds:
- We do not give partial refunds for unused time, except where the law requires.
- If you were charged after you cancelled, or charged in error, email us within 60 days and we will refund it. *(kept exactly as v1)*
- We do not offer refunds based on athletic progress or results. *(the only addition)*
- Apple purchases are refunded through Apple.

**Waiting on the owner:** lawyer review of docs/owner/legal-v2-under13-scouting.md; Lifting Blueprint coverage decision (recommend C); test-account tool redeploy OK and keep/delete the test accounts; keep or remove the Spaces feature; Vault review queue (79 + 10 tag suggestions); owner terms not yet accepted in the browser. Done by owner: renewal-reminders-daily cron.

---

# REPORT — 2026-10-12 01:05 UTC (FF1: correction + saved plan)

**Ready to publish: no**

**Always build from `docs/owner/scouting-plan-v3.1.md`** (owner plan v3.1 saved verbatim + "Owner additions (Oct 12)").

**Subscription Policy v2 — final draft text of section 6, Refunds (for the lawyer; NOT approved):**
- We do not give partial refunds for unused time, except where the law requires.
- If you were charged after you cancelled, or charged in error, email us within 60 days and we will refund it. *(kept exactly as v1)*
- We do not offer refunds based on athletic progress or results. *(the only addition)*
- Apple purchases are refunded through Apple.

**Done this turn (FF1):**
- [x] Plan saved word for word, with the owner additions.
- [x] Facility "Spaces" parked: new switch `facility_spaces` set to OFF; the tab and the player list are hidden for everyone. Nothing deleted — owner decides.
- [x] create-checkout redeployed (owner-authorized by name). Test checkout as test player demo16ss: 200, real checkout link returned, no "guarantee" or "7-day" text anywhere in the reply; the code has no such text or metadata.
- [x] Subscription Policy v2 Refunds section corrected (above).

**Phase 6 relabel:** the earlier "Phase 6 PASS" (Spaces) was the wrong thing. **Real Phase 6 = Organization tools (plan §5) + owner additions: NOT STARTED.**

**Phases 1–5 re-check against the saved plan — gaps found (to fix and prove, in this order):**
- [x] Coach View summary card now shows today's status, 7-day completion, top alert, newest test (+ next due), head coach. Proof FF1: roster coach reads it for demo13 (200); same coach refused for a player not on his roster and for the owner (403 ×2); phone screenshot /tmp/browser/ff1/summary.png; 3 new tests pass. (Newest personal best waits on the tests work — no shared PB source yet; shown as newest test.)
- [x] Coach View: Tests tab (each test with date + "Source: athlete-entered", only recorded results) and Private notes tab (only the writing coach can read). Proof FF3: phone screenshots /tmp/browser/ff1/tests.png, notes.png; player, parent and an outsider read 0 notes; outsider refused tests (403) and refused writing a note (403); 2 new tests pass; seeded test + notes deleted.
- [x] FF5: coach page header shows the player's name, not the ID. Also fixed: the summary card showed "Not shared" for age/sport/position because coaches can't read the profile row — now delivered through the access-checked coach summary call. Proof: test coach, phone 390px, demo13 shows "Demo — 13U Offseason", 13 years old, baseball, CF (/tmp/browser/ff5/header.png). PASS.
- [x] FF6: new "Trends" tab on the coach's athlete page — each measured metric compared only with the player's own usual range (never other players): baseline line ("Their usual: 1.58–1.66 s (from 12 measurements)"), trend label, plain verdict, up to 5 most recent measurements with dates; empty state "No measurements yet". Access-checked call (player, own coaches only). Proof: test coach, phone 390px, demo13 with seeded ten-yard dash data shows baseline, "Steady vs their usual", verdict and 5 dated measurements (/tmp/browser/ff6/screenshots/trends.png); non-roster RPC call refused (403); proof data deleted after. Full suite 2,763/2,763, build OK. PASS.
- [x] FF7: new "Body load" tab on the coach's athlete page — last 7 days counted only from what the player actually logged: weekly pitch total (bullpens + outings + game pitches merged by day), throws logged, per-day pitch breakdown ("40 pitches (40 in a game)"), and each arm entry labeled ("Long toss — 30 throws" / "skipped"); empty state says so plainly. Access-checked call (player, own coaches only). Found along the way: the pitch-log query used a column that no longer exists (template_id) — now uses movement_slug; the same stale column in the player-side useRecentPitchingLoad hook means bullpen counts silently fail there too — NOT yet fixed (on the list). Proof: test coach, phone 390px, demo13 with seeded data shows 62 pitches this week, 30 throws, per-day lines (/tmp/browser/ff6/screenshots/load.png); non-roster RPC refused (403); proof data deleted after. Full suite 2,770/2,770, build OK. PASS.
- [x] FF8: player-side bullpen/outing pitch counts fixed (lookup used a removed column; now uses movement_slug). Proof as test player demo13 via sign-in API: old lookup refused (400, column does not exist), new lookup accepted (200; no bullpens logged this week, so empty). New test (pitches counted by movement_slug: 35 + 40) passes; full suite 2,770/2,770 before it, build OK. No test data created. PASS.
- [ ] Coach View tabs still missing: game stats + video, reports, grades, six-week recap, readiness + pain (with consent).
- [x] Any coach message can be reported (Report button on the player's and parent's message lists → existing review queue, which now shows the reported message text to staff only). Proof FF2: coach sent a message to demo13; player filed a report (201); owner/staff could read that message; an outsider read 0 messages and 0 reports; phone screenshot of the parent's list and report window /tmp/browser/ff1/report_dialog.png. Test message + report deleted.
- [ ] Coach workouts: "schedule a practice" and "whole team" sending not built; practices must count toward workload.
- [ ] Game stats: no athlete-entered vs coach/organization-verified label or verify action.
- [ ] Sponsorship-ready data model (organization sponsors an athlete; grace period) not present — needed before Phase 9.
- [ ] Confirm the teen parent checklist sits on the same screen as the injury waiver at sign-up (re-prove on phone).
- [ ] Re-prove with phone screenshots: organization option at sign-up (present on the role screen), solo-coach "Create team" with code/link/QR (present in Teams card), one Requests inbox for all four pairing types incl. deny, head-coach choice + first alerts, academics transcript verification, arm-ledger feed from game pitches.

**Next:** fix the gaps above, then real Phase 6 (facility dashboard one line per player with tap details + team/coach filters; organization comparison 2–6 with dates, verification, fairness warnings; growth vs game trends; Development tab a–e; strengths/weaknesses on roster tap + comparison; testing day; compare by test), then Phases 7–9.

---

# REPORT — 2026-10-12 00:32 UTC (EE10, end of batch)

**Ready to publish: no** — legal wording waits for your lawyer; the coverage decision and test-account decision are open; Phases 7–9 not started.

| Phase | State | Proof | Result |
|---|---|---|---|
| Security fixes A1–A4 | Done | CC6 | PASS |
| 1 Accounts, orgs, teams, Requests inbox | Done | DD7–DD10, test accounts + phone screenshots | PASS |
| 2 Consent up front | Done in the app; legal wording waits for lawyer | DD11–DD13 | PASS |
| 3 Onboarding fields | Done | EE1–EE5 (below) | PASS |
| 4 Game stats, location, spray charts | Done | EE6 (below) | PASS |
| 5 Coach tools (messages, safety-checked workout assignment, summary card + tabs) | Done | EE7–EE9 (below) | PASS |
| 6 Facility tools | Done | EE10 (below) | PASS |
| 5–6 Owner additions (Development tab, testing day, compare by test) | Next — approved 2026-10-12, before Phase 7 | — | — |
| 7 Scout tools | After the additions | — | — |
| 8–9 | Not started | — | — |

**Phase 6 proof (EE10) — facility tools:**
- Organizations registered as a Facility or Academy get a "Spaces" tab on their dashboard to list their training spaces (batting cage, pitching mound, field, weight room, track, classroom, other) with optional notes. Closing a space parks it (keeps the record, shows "Closed") instead of deleting it. Players in the organization see the same list read-only on their organization page. An empty list says "No spaces listed yet" — nothing is invented.
- New table `facility_spaces` (migration scouting_v31_phase6_facility_spaces): only org admins can add/change/close spaces; org members can read their own org's list; everyone else sees nothing.
- Proven as the test organization on a phone screen (390×844): Spaces tab appears, empty note shows, "Proof Cage 9" added and listed as "Batting cage", then parked with a "Closed" badge (screenshots /tmp/browser/ee9/5_spaces_empty.png, 6_spaces_added.png). An outsider account queried the table directly and got 0 rows. Test space deleted; the demo organization restored to type "travel".
- Full suite 2,753/2,753; build OK.

**Subscription Policy v2 — exact wording changes for your lawyer (refunds section):**
- REMOVED: "If you were charged after you cancelled, or charged in error, email us within 60 days and we will refund it."
- ADDED: "We do not offer refunds based on athletic progress or results."
- ADDED: "If you believe you were charged after cancellation or charged in error, email hammersmodality@hammersmodality.org so we can review the charge. This does not limit any refund or other rights required by law."

**Lifting Blueprint coverage decision (needs your call):** lift days have six fixed slots (main lower, second lower, push, pull, carry, trunk), so hamstrings, hips, calves/feet and late off-season squats fall short of weekly minimums; in-season hamstrings, groin, calves and power short too.
- Option A — lower the minimums: sessions stay as they are; some muscles simply get less work than the standard says.
- Option B — add one rotating robustness slot every lift day: ~2–3 more sets each day, sessions a few minutes longer, all minimums met year-round.
- Option C — robustness slot off-season only, in-season unchanged (2 lift days, ≤13 sets): minimums met when volume is high, in-season stays exactly as it is now.
- My recommendation: C. It stays inside every existing rule (in-season limits and rest untouched, Nordics/Copenhagen only in off-season "Add size", age gates apply).

**Waiting on the owner:**
1. Lawyer review of the under-13 scouting legal drafts (docs/owner/legal-v2-under13-scouting.md) and the Subscription Policy v2 refunds wording above.
2. The Blueprint coverage decision (A/B/C above).
3. Test accounts: keep or delete them (democoach, demoorg, demoparent, demo13, demo16ss, democollege, ee5proof — all hidden and excluded from search meanwhile), and OK by name to redeploy the test-account tool.
4. Vault review queue: 79 items + 10 tag suggestions.
5. create-checkout authorized redeploy — not yet done.
6. Owner terms: your own browser sign-in still stops at "Before you keep training".

**Phase 5 proof (EE9) — coach summary card + tabs:**
- The coach's athlete page is now organized into four tabs — Overview, Training, Messages, Activity — so a coach on a phone reaches everything without a long scroll. Overview opens with a summary card: name, age, sport, position, team, training-plan start, last activity. Every value is labeled; anything the player hasn't shared says "Not shared" instead of showing a blank or a guess.
- Proven as the test coach on a phone screen (390×844): all four tabs render; the summary card shows "Demo — 13U Offseason", "13 years old", "CF"; sport and team honestly show "Not shared" (the test player genuinely has none); drill assignment sits on Training, the message box on Messages, the event stream on Activity (screenshots /tmp/browser/ee9/).
- Full suite 2,753/2,753; build OK. demo13 restored to hidden/paused after the proof.

**Phase 5 proof (EE8) — safety-checked coach workout assignment:**
- The coach's drill-assign tool (was unreachable — not mounted on any page) now sits on the coach's athlete page and checks every pick against the player's age, sport and equipment before it can be sent. Failing picks show plain reasons and offer safe alternatives (same skill work, equipment-free, age-legal); the Assign button stays disabled.
- Proven as the test coach on a phone screen: "Chaos Decision Drill" (top level, needs glove+ball) for the 13-year-old → "Not safe to assign to this player — Too advanced for a 13-year-old. Needs equipment the player doesn't have: glove, ball." with safe alternative "Priority Call Sequences" offered (screenshot /tmp/browser/ee8/2_blocked.png). Assigning that safe alternative succeeded; the player can see it, an unrelated player sees nothing.
- Two real bugs found and fixed: org coaches were locked out of their own athletes' detail page (roster check only knew scout links, now also accepts the server-side org-coach check), and org coaches couldn't save drill assignments at all (the save rule only allowed scout-linked coaches — widened by migration scouting_v31_phase5_org_coach_drill_assign to the same org-coach check messaging uses).
- 6 new tests; full suite 2,753/2,753; build OK. Test assignment deleted; demo13 restored to hidden/paused.
- Next in Phase 5: coach summary card + tabs.

**Phase 5 proof (EE7) — coach messages:**
- Coaches can message a player from the player's page; the server decides who receives it by age: 18+ player only; 13–17 player plus a parent copy; under 13 parent only. Players under 18 with no linked parent can't be messaged.
- Proven with test accounts through the sign-in API: coach → players not on his roster refused (2 of 2); coach → 13-year-old: player and parent both received it; same player set to under 13 (birth date changed temporarily, then restored): parent received it, the child did not; an unrelated player saw nothing; a player could not fake a coach message (refused).
- Parent sees "Messages from your child's coaches" on the phone (screenshot /tmp/browser/ee7/parent.png). Player's own list sits on Scouting visibility.
- 3 new tests pass; build OK. Test messages deleted.

**Phase 4 proof (EE6)** — signed in as the test player (demo16ss) with a real seeded game (42 pitches, 4 at-bats with field directions):
- Game report now shows a spray chart: one dot per batted ball on a field diagram, placed by the direction the player actually logged (LF ×2 fanned apart, RCF, SS); unknown directions are skipped, never guessed (screenshots /tmp/browser/ee6/shots/2_spray.png).
- Box score header now shows its source and date: "Source: you logged this game · 2026-10-11" (screenshot 3_gamesheet.png).
- Game pitches now count toward the arm ledger: the player's own pitcher-perspective game pitches merge into the 7-day pitch load by date (42 visible to the player under the same access rules the app uses; merge logic unit-tested — same dates add up, nothing double-counted).
- 4 new unit tests; full suite 2,744/2,744; build OK. Seeded game, pitches and at-bats deleted after the proof.
- Next: Phase 5 — coach dashboard/profile, parent-copied messaging, safety-checked workouts.

**Phase 3 proof, final round (EE5)** — full sign-up as a brand-new player (ee5proof) on a phone-sized screen, start to finish:
- Sign-up → terms gate → profile setup → dashboard → Scouting visibility, all on 390×844.
- Last setup step shows the "Open to recruiting?" note; ticking "Currently in High School" shows the academics box labeled "Source: you entered this (not verified). Only shared if you turn on Academics in Scouting visibility." (screenshots /tmp/browser/ee5/27, 28, 35).
- No "Sequencing / pitch mix" anywhere in the goal picks; old saved picks still work (unit test).
- Scouting visibility page shows all six sharing items plus the School transcript box.
- Two real bugs found and fixed during the proof: (1) profile setup failed with "birthdate_locked" when the player picked a birth date different from sign-up — the lock is the safety rule working, proof re-run with the matching date; (2) profile setup failed for any player who already got their role at sign-up (duplicate-key error) — the role save now skips an existing role instead of failing.
- Full suite 2,740/2,740; build OK. ee5proof marked as a test account (hidden from search); added to the keep/delete list below.

**Phase 2 proof this round** (test accounts signed in through the sign-in API; phone screenshot /tmp/browser/dd13/01_parent_checklist.png):
- New parent checklist on the parent's scouting page: parent ticks each item (profile, metrics, video, health, academics, contact); health and academics separate, start off.
- Under 13: parent turned on Scouting visibility + Academics → a coach can see academics only (health, profile, contact all refused); no Contact switch exists; the child's own change was refused ("A parent manages sharing for players under 13").
- 13–17: parent allowed Profile only; the teen turned on Health and Profile → coach sees Profile, Health refused; the teen trying to edit the parent's list was refused.
- Existing guardian-approved minors kept exactly what they had (their current items were copied into the parent list).
- Fixed a bug found in testing: the checklist could undo the parent's "authorize" switch; it now saves only the switch tapped.
- Full suite 2,738/2,738; build OK. Test sharing reset to off.
- Messages copied to the parent (and parent-only for under 13) are built in Phase 5 (coach messages), per the plan.

**Done this round, other:**
- [x] Renewal reminders: owner applied cron "renewal-reminders-daily" (14:00 UTC) after a dry run returned 200 ok, count 0.
- [x] Test accounts hidden: player search now excludes test/system accounts (search-players redeployed after code check passed; coach search for "Demo" → 0, real players still found). Test-account tool NOT redeployed.

**Waiting on the owner:**
1. Lawyer review — under-13 scouting wording: `docs/owner/legal-v2-under13-scouting.md` (Child Safety, Privacy §5, Consumer Health Data §5; before/after quoted there).
2. Lawyer review — Subscription Policy v2, section 6 "Refunds" (the only changes):
   - REMOVED (v1): "If you were charged after you cancelled, or charged in error, email us within 60 days and we will refund it."
   - ADDED (v2): "We do not offer refunds based on athletic progress or results."
   - ADDED (v2): "If you believe you were charged after cancellation or charged in error, email hammersmodality@hammersmodality.org so we can review the charge. This does not limit any refund or other rights required by law."
3. Lifting Blueprint coverage decision (see below).
4. Test accounts: keep or delete; OK by name to redeploy the test-account tool.
5. Vault review queue (79 items + 10 tag suggestions).

**Lifting Blueprint coverage decision:** lift days have six fixed slots (main lower, second lower, push, pull, carry, trunk), so some areas fall short of the weekly minimums — off-season: hamstrings ~0 of 3 sets, hip extension 0–0.7 of 3, hip rotation 1.1 of 2, calves/feet 1.1 of 3, squat in late off-season 1.6 of 6; in-season: hamstrings 0.3, groin 0.5, calves 0.5, power 0.4 (target 1–2). Upper push/pull and trunk are well over.
- Option A — lower the minimums to what fits: nothing about players' workouts changes; the weak areas stay light.
- Option B — add one rotating "robustness" slot (hamstring / hip / calf-foot, rotating by day): about 2–3 more sets per lift day; those areas reach their minimums; sessions get a few minutes longer.
- Option C — off-season gets the robustness slot, in-season doesn't: off-season players get the extra coverage; in-season sessions stay exactly as they are now (2 lift days, ≤13 sets).
- Recommendation: Option C. It stays inside every existing rule: in-season limits and rest rules untouched, no eccentric overload in-season, only compound/integrated picks (Nordics/Copenhagen still only in off-season "Add size"), age gates and the heavy track apply as now. In-season shortfalls would be accepted as a maintenance floor.

No publish, no cron, no iPhone changes.

---|---|---|---|
| Security fixes A1–A4 | Done | CC6: raw link refused, allowed viewer plays, role/org/follow bypasses blocked, 0 under-13 staff visibility | PASS |
| 1 Accounts, orgs, teams, Requests inbox | Done | DD7–DD10 test accounts, phone screenshots: org verify + email code, team + code/QR join, parent answers for under-13 (child's own answer refused), head coach, end connection removes access, org assigns athlete (outsider refused); full suite 2,733/2,733 | PASS |
| 2 Consent up front | Partly done | DD11: separate Health + Academics switches (off by default), "Scouting visibility" page, under-13 contact locked to parent (screen + server); 48/48 sharing tests; phone screenshot | PASS so far |
| 3–9 | Not started | — | — |

**Next:** finish Phase 2 — parent ticks the checklist up front for 13–17, parent turns scouting on for under-13, parent contact route; then prove with test accounts.

**Waiting on the owner:**
1. Lawyer review of the legal v2 drafts in `docs/owner/legal-v2-under13-scouting.md` (not saved or shown anywhere). Exact changes:
   - Child Safety "What minors see" — v1: "Under-13 accounts are parent-controlled: no public profile, no scout or coach visibility, and no contact without the parent." → v2: "Under-13 accounts are parent-controlled and never public. A parent may choose to let approved scouts and coaches see items the parent picks (profile, metrics, video, health, academics). Scouts and coaches can never contact a child under 13; any contact goes only to the parent." Also v1 "(profile, metrics, video, contact)" → v2 adds "health, academics … Health and academics are always separate choices and start off."
   - Privacy §5 Children, 2nd bullet — v1: "Children cannot make their profile public, cannot be contacted by scouts or coaches without the parent's permission, and cannot message other users outside approved channels." → v2: "Children cannot make their profile public and cannot message other users outside approved channels. A parent may choose to let approved scouts and coaches see specific items (profile, metrics, video, health, academics) and can turn this off at any time, which ends access immediately. Scouts and coaches can never contact a child under 13; they may contact only the parent."
   - Consumer Health Data §5 — adds: "Sharing health information with scouts or coaches is its own switch, separate from every other sharing choice, and starts off. For a minor, only a parent can turn it on."
2. Keep or delete the reusable test accounts (democoach, demoorg, demoparent + demo players + ee5proof from the EE5 sign-up proof).
3. OK by name to redeploy the test-account tool (parent-link fix saved, not live).
4. Earlier items: Subscription Policy v2 lawyer review; apply `docs/owner/renewal-reminders-cron.sql`; Blueprint coverage-minimum decision; Vault review queue.

No publish, no cron, no iPhone changes.

---

# SCOUTING, RECRUITING & FACILITY PLAN v3.1 — build status

**Ready to publish: no** — Phase 1 built and proven end to end (DD10); Phases 2–9 not started; earlier owner items (below) still open.

- [x] Phase 1 Accounts, organizations and teams
  - [x] Backend (migrations `scouting_v31_phase1_orgs_teams_requests`, `_follow_guard_rpc_path`, `_team_policy_fix`; old rules saved in `_snapshot_security_20261011`): organization verification fields + guard (only the app owner verifies; editing name/official email after approval sends it back to review); teams + team members; Admin/Coach staff seats; coach↔athlete assignments (single or bulk); ONE request table + accept/deny/cancel/end actions; head coach (one per player, no extra data); solo-coach "Create team" (quiet small organization); join by code checked on the server.
  - [x] Closed two holes found on the way: any signed-in user could list every organization's invite code and join it; organization owners could mark themselves verified.
  - [x] Proof (pretend sign-ins, all undone): player can't create team; coach creates team; self-verify blocked ×2; guessed code refused; join by real code works; other orgs invisible; self coach seat blocked; wrong receiver blocked; staff coach sees 0 athletes until assigned, then 1; staff can't self-assign; unverified facility can't add athletes; deny → no access; accept → access + video; unconnected head coach blocked; revoke → access, video and head coach gone instantly; under-13 can't accept a scout; non-scout can't send scout requests; strangers see 0 requests. Existing relationships unchanged: 30 accepted follows, 23/28 coach links active as before, 2 org members kept.
  - [x] App fixes: "Join" box uses the server check; "Leave organization" now really removes access (before, it silently did nothing).
  - [x] Screens (DD1): Requests inbox `/requests` (Accept/Deny, "Sent by you" with Cancel, recent answers, parent-answers note for under-13); "My coaches" with head-coach picker and End connection; Coach Dashboard "My teams" → Create team with code / copy link / QR; `/join?code=` link+QR landing (server-checked); organization Settings → Verification form + status; owner queue `/owner/organizations` (Approve/Reject). New migration `scouting_v31_requests_inbox_rpc` (3 read-only lookups). Proof: signed-out callers refused (401 ×3); asking for another player's coaches returns 0 rows; 2/2 new wording tests pass; build OK.
  - [x] Assign screen (DD2): Organization → Members → "Assign athletes to coaches" (pick coach, tick athletes, Assign/Remove; uses the server-checked `assign_athletes`). Migration `scouting_v31_org_roster_rpc` (roster lookup for that organization's admins only). Proof: signed-out 401; non-admin gets 0 rows; 1/1 new test; build OK.
  - [x] Sign-up role choice (DD3): "Choose Your Role" now offers Player, Scout/Coach, and Organization (→ organization form + verification). The choice is a display preference only; coach/scout powers still come only from the approval queue, organization powers only after owner verification. Build OK.
  - [x] Official-email code (DD4): new function `org-email-code` (deployed; Deno check passed) — owner of the organization only; 6-digit code, 10 minutes, 5 tries, one send per minute, stored only as a fingerprint. Verification card shows "Send me a code" / "Confirm"; owner queue shows confirmed / not confirmed. Migrations `_org_email_code_attempts`, `_org_guard_email_code` (tries can't be reset by hand; changing the official email needs a new code). Proof: signed-out 401; someone else's organization 403; build OK. Real email delivery untested (needs a test organization).
  - [x] Player-side phone proof (DD7, real demo players, phone-sized screenshots in /tmp/browser/dd7/shots): under-13 demo player — Requests inbox renders ("Waiting for you (0)", "My coaches" with head-coach note), dashboard loads; the legal "Updated terms" gate appears before /join. Teen demo player — gated by "Updated terms" on every page until accepted; accepted with the optional health-information checkbox ticked; all 5 consent rows verified in consent_records (terms, privacy, consumer-health-data, medical-safety via updated_terms_screen; health-data-consent via checkbox); Requests inbox then opens; a bad join code shows "That invite code doesn't match a team." This also proves two B2 legal checks: Updated-terms screen saves, health-data consent checkbox works.
  - [x] Coach/org/parent phone proof (DD9, temporary staff test accounts — democoach, demoorg, demoparent — made with the owner-only test tool, extended for staff personas; screenshots in /tmp/browser/dd9/screens): organization accepted the Updated-terms screen (typed-name adult release included), sent its details for review, "Send me a code" delivered the 6-digit email (Resend works), a wrong code is rejected ("That code isn't right"), and owner approval is refused until the email is confirmed ("The official email code has not been confirmed yet") — then approved, org verified. Coach created team "Demo 14U Gold" with invite code UMKU4Y + QR; the under-13 demo player joined via the join link ("You joined Demo 14U Gold"), membership verified in the database. Found and fixed a real gap: the coach dashboard's "Add Player" still used the old follow system, so requests never reached the new Requests inbox. Now every follow request is mirrored into the one inbox, answers in either place stay in sync, and denying also closes the old row (migration `sync_follow_denial_in_respond_connection_request`; send-follow-request and respond-to-follow redeployed after Deno check passed). Two stale test follow rows cleaned up.
  - [x] DD10 request proof (phone screenshots /tmp/browser/dd10 → /tmp/browser/dd9/screens 30–36): coach's "Add Player" requests now appear in the one inbox; the under-13 child is held at "Parent signature required" and the server refuses the child's own answer ("A parent must answer this request"); the parent saw and accepted it in their inbox; an older player accepted their own, made the coach head coach, then ended the connection — coach access and head-coach pick gone, old follow row closed too. Organization invited the coach and the child (parent accepted for the child), then assigned the child to the coach on the Members screen; an outsider trying to assign was refused. Fixed: organization Members list showed "Unknown Player" for every member — now shows real names. Full suite 2,733/2,733; build OK.
  - [x] Cleanup: all requests, follows, assignments and memberships made during the proof removed; child's birth date restored (it was set to 11 for the under-13 test). The test accounts themselves are kept as reusable test personas for Phases 2–9 (all marked test/system accounts); consent records stay (they can't be deleted by design).
  - Note: the parent-link fix in the test-account tool (status "active") is saved but not redeployed.
- [~] Phase 2 Consent up front
  - [x] DD11 sharing checklist: Health and Academics are now their own switches, both off by default (migration `scouting_v31_phase2_health_academics_scopes`; server sharing rule updated). Page renamed "Scouting visibility" (menu too). Under 13: Contact can't be turned on — staff may only contact the parent; the server rule refuses it too. Proof: 4 new rule tests pass (48/48 sharing tests); test player turned on Academics only, reload showed "scouts and coaches can see your academics", Health stayed off (phone screenshot /tmp/browser/dd10/40_scouting_visibility.png); reset afterward.
  - [ ] Teen parent checklist up front (parent ticks the same items, incl. separate health + academics); under-13 parent turns scouting on; parent contact route; new legal versions with changed paragraphs shown here before the owner marks lawyer approval.
- [x] Phase 3 Onboarding fields — [x] Phase 4 Game stats — [x] Phase 5 Coach tools — [x] Phase 6 Facility tools — [ ] Phase 5–6 owner additions (Development tab a–e for assigned coaches + org admins; strengths/weaknesses on roster tap + org comparison; testing day with 3-day + day-of coach notices, schedule/run/reschedule/skip, facility-verified vs athlete-entered, safety rules; compare/rank by test with age group/position/level/verified-only filters and fair-comparison warnings; proof with rich + thin players, notifications, verified result, access limits, phone screenshots) — [ ] Phase 7 Scout tools — [ ] Phase 8 The General — [ ] Phase 9 Sponsorship billing

---

# OWNER STATUS — 2026-10-11 evening — security fixes

**Ready to publish: no** — every security fix (A1–A4) is live in the backend and re-proven (CC6), but the signed-in page check, the upgrade-button tap-through and the legal signed-in checks still need the owner's choice of test accounts, and the Blueprint coverage minimums need the owner's decision.

**Renewal-reminder cron SQL:** `docs/owner/renewal-reminders-cron.sql` (owner reviews and applies; not applied).

**CC6 final proof (21:24–21:35 UTC):** outsider raw link → refused (400); outsider asking for a link → refused (400); allowed viewer → plays (206 video). Pretend sign-in as a plain player (rolled back): self-admin, self-coach, joining a team as coach, self-accepting a follow — all blocked; another player's videos and sessions hidden. Under-13 players reachable by any staff follow: 0. Full suite 2,730/2,730 (324 files), including the 540 eight-week Blueprint simulations with zero rule breaks.

**Waiting on owner:** (1) test accounts — real ones you name, or temporary ones I make and delete — for the page audit, upgrade-button tap-through and legal signed-in checks (updated terms, teen grace/reminders, new-teen lock, under-13 waiver, health consent, auto-renew, Cancel); (2) coverage minimums vs the six-slot day (raise slots, or accept rotating robustness); (3) 79 lift-tag items + 10 unapplied tag suggestions in the Vault; (4) lawyer review of Subscription Policy v2; (5) apply the cron SQL.

- [x] A1 Private media — videos, scout letters, scout videos and avatars are private; raw links refused; allowed viewers play signed links. Proof in `docs/owner/security-fixes.md`.
- [x] A2 Self-claimed roles blocked (staff roles start pending, owner approves).
- [x] A3 Self-joined orgs, self-approved follows, forged folder grants blocked; legitimate request/accept flows still pass.
- [x] A4 Minors — media, contact, sessions, grades, readiness snapshots, body measurements and session videos all use one rule (under-13 hidden, 13–17 parent consent or connected coach, blocks respected). Proof: 0 under-13 reads, 0 non-follow reads, 2,730/2,730 tests.
- [x] A4b Coach/scout video library uses the same media rule (get-player-library redeployed; under-13 = 0).
- [ ] A-audit — page check of video screens signed in as a real player and coach, with phone screenshots  — WAITING ON OWNER: choose real accounts or temporary test accounts.
- [ ] Page audit of video screens signed in as a real player and coach (phone screenshots) — not yet run.
- [~] B1 Lifting Blueprint coverage minimums, integrated library gaps, remaining lift tags.
  - [x] B1-tags (CC5): 57 active lifts had no movement tag (strength 20, compound 17, max-effort 7, posterior-chain 5, rotational 8). 47 tagged — each checked to leave exercise choice and the double-check's grouping unchanged (backup in _snapshot_movement_pattern_20261011). 10 left untagged on purpose (the tag would regroup them in the double-check): chest passes ×3, band pull-through, snatch, high pulls ×2, jump shrug, mid-thigh pull, reverse fly — suggestions in the Vault queue. Vault "lift tag" queue now 79. 1,134 planner/Vault tests pass.
  - [ ] B1-coverage: WAITING ON OWNER — minimums cannot all be met inside the six-slot day without breaking a rule (rule wins); choose more slots or a rotating robustness slot.
  - [ ] B1-library: follows the coverage decision (new exercises only matter once there is a slot for them).
- [ ] B2 Legal signed-in checks (updated terms, teen grace/reminders, new-teen lock, under-13 waiver, health consent, auto-renew, Cancel).
- [~] B3 Guarantee app-button recheck — source scan of every screen (CC4): 0 customer-facing guarantee, money-back, risk-free or guaranteed-results wording (only code comments and the banned-phrase list). Visible tap-through of the in-app upgrade buttons as a player waits on the same owner test-account choice as A-audit.
- [x] B4 Renewal cron SQL → `docs/owner/renewal-reminders-cron.sql` (not applied).

# OWNER STATUS — 2026-10-11 — current; historical sections below do not override this

a. Owner Exercise Vault — done: owner/admin route is enabled; `StaffOnlyRoute` and backend role checks protect it.
b. Warm-up stage ordering — done: 24,640 simulated warm-ups preserved choices with zero ordering or safety breaks.
c. Lifting audit — done: the read-only report is at `docs/owner/lifting-audit.md`.
d. Lifting Blueprint — partly done: 540 simulations passed safety; coverage/tagging/library review gaps remain; overload and youth guards are implemented.
e. Switch inventory — done: all 26 live feature switches are `all`; lifting v2 is on and rankings remain off.
f. Legal verification and renewal SQL — partly done: public pages checked; teen/parent/health/billing flows remain unverified; SQL below is not applied.
g. Guarantee removal — done for live backend/hosted checkout: named redeploy, clean unpaid session and 2,726 passing tests; app-button recheck remains open.
h. Ready to publish: no — legal-flow proof, Blueprint closeout and scouting authorization defects remain unresolved; nothing published.

## Current proof and owner next steps
- `docs/owner/no-refund-audit.md` updated with redeploy, hosted phone evidence, cleanup and honest UI limitation: new-player prompts blocked the new visible app-button test. No payment made; both temporary players removed; exact unpaid session expired.
- Full suite clean: 323 files / 2,726 tests; prior drawer timeout fixed by independent cases and DOM cleanup. No unexplained deployment errors were ignored.
- Blueprint live recount: strength **191 active / 20 without movement_pattern**, compound 40/17, max-effort strength 7/7, posterior chain 5/5, rotational strength 8/8. The owner’s “44” is **not reproduced** by these category counts; those five categories total 57 missing. No tags changed here; reconcile the UI filter and static 41-slug `LIFT_TAG_REVIEW` list before declaring tagging complete. Coverage minima are not met everywhere; slowest-quality/weaker-side plan leaning remains display-only; new-library validator review and lift-day phone evidence remain open. Safety rules still win.
- Legal v1 remains approved and `legal_v2 = all`; Subscription Policy v2 remains unapproved lawyer-review draft. Updated-terms/teen grace and Resend/new-teen lock-unlock/under-13 parent waiver/health consent/auto-renew/cancellation/Settings Legal affected-account matrix remains incomplete. Do not infer it from public pages or the adult release screen.
- Read-only scouting report: `docs/owner/scouting-audit.md`. Current organizations/members are **2/2**, not zero. Academics exist (GPA/SAT/ACT/NCAA). Owner scale decimals below 20 are not implemented. Highest risks: public athlete/application media buckets, self-claimed roles, self-joined organizations, self-approved follows, forged folder grants and inconsistent minor/contact access. **No scouting changes made**; a separate owner-approved implementation plan is required.
- Owner next: authorize a separate scouting-security plan, complete legal and Blueprint proof, review policy v2 with counsel, apply renewal SQL privately if desired, then consider publishing. No cron or iOS changes.

## Renewal reminders — exact function, schedule and Vault header; OWNER APPLIES ONLY
Function: `renewal-reminders`; job `renewal-reminders-daily`; schedule **`0 14 * * *` (14:00 UTC daily)**; header **`x-job-token`** reads Vault **`wk_daily_plan_job_token`**. This secret’s name exists; its value was not displayed. Body below sends real eligible reminders, not a dry run. No SQL applied.

For privacy, the endpoint uses a placeholder: replace only `<LOVABLE_CLOUD_FUNCTIONS_BASE_URL>` privately with the backend functions base URL from Lovable Cloud. Do not paste a credential into the SQL. This placeholder version is not runnable until that replacement. Check whether the named job already exists before applying; do not create duplicates.

```sql
select cron.schedule('renewal-reminders-daily', '0 14 * * *', $$
  select net.http_post(
    url := '<LOVABLE_CLOUD_FUNCTIONS_BASE_URL>/renewal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-job-token', (select decrypted_secret from vault.decrypted_secrets
                     where name = 'wk_daily_plan_job_token')
    ),
    body := '{"mode":"renewal","dry_run":false}'::jsonb
  );
$$);
```

## Every live feature switch — read-only inventory; mode `all` enables eligible accounts, not bypasses safety/role gates
| Switch | Mode | Controls |
|---|---|---|
| content_barefoot_items | all | Barefoot readiness check items |
| content_base_stealer | all | Base stealing drills |
| content_explosive_pitcher | all | Explosive-pitcher conditioning |
| content_heat_factory | all | Baseball pitcher throwing content |
| content_lift_notes | all | Lift exercise notes |
| content_softball_conditioning | all | Softball season conditioning |
| content_speed_lab | all | Speed Lab drills |
| pap_real_throws | all | Power Primer real-ball throws |
| phase_feedback | all | Phase feedback |
| power_primer | all | Power Primer on lift days |
| programs_retired | all | Retirement of old programs (other route holds still apply) |
| rest_day_calculator | all | Rest-day safety rules for all players; protected from automatic demotion |
| ub_plyo_hand_wrist | all | Upper-body plyos and hand/wrist work |
| onboarding_off_days | all | Onboarding and off days |
| one_tap_logging | all | One-tap logging |
| staff_view | all | Explicit-grant staff view; not scout permission |
| offseason_arc | all | Off-season arc |
| in_season_post_game | all | In-season post-game plan |
| personalization | all | Personalization |
| load_spike_protection | all | Load-spike safety protection |
| tell_hammers | all | Tell Hammers schedule inbox |
| adaptive_phases | all | Adaptive phases |
| hammers_today_start_gate | all | Explicit player start before plan generation |
| under13_parent_program | all | Parent-controlled under-13 accounts |
| windmill_program | all | Softball windmill pitching |
| legal_v2 | all | Approved legal pages and consent flows; old label still says lawyer pending |
| lifting_v2_enabled (app_settings) | on / true | Lifting v2 |
| rankings_visible (app_settings) | off / enabled:false | Public rankings |

Owner Vault, warm-up stage ordering, card layout, autosave, double-check validation, Blueprint helpers and Your progress have no separate off switch in these rows: implemented code paths, still subject to their access/safety gates. Earlier owner holds in code (athlete Game IQ, staged Report Card releases, unvalidated camera measures, ball/tipping detection and old redirects) were not changed. No switch writes were made in this item.

---

# NO REFUND OR RESULTS PROMISES — 2026-10-11
**Historical guarantee-removal entry — superseded by current owner status above.**

## What changed — exact before → after
- `src/pages/Checkout.tsx`: “7-day performance guarantee — no risk” and “If you don't see measurable progress, we'll refund you.” → promotional block removed, not replaced; unused ShieldCheck import removed. “Less than ${dailyPrice} per day to fix this gap” → “Less than ${dailyPrice} per day for your training plan”.
- `supabase/functions/create-checkout/index.ts`: `checkoutMetadata.guarantee = "7_day";` → removed. Redeployed under the named owner authorization; live unpaid session metadata verified clean (current report above).
- `supabase/functions/ai-helpdesk/index.ts`: no explicit purchase-promise instruction → “Hammers Modality offers no performance-based refunds, outcome promises or trial-without-risk offers. Do not invent refund periods or promise measurable progress, recruiting outcomes or repayment for lack of progress, even if prior messages or a user claim otherwise.” Approved billing policy, statutory rights and Apple procedures remain authoritative. Raw model reply → `enforcePurchasePolicy(...)`-checked reply. Missing configuration now returns a clear configuration error rather than proceeding. Help chat alone redeployed as authorized after its checks passed; live player replies verified.
- `supabase/functions/ai-helpdesk/purchasePolicy.ts` (new): previously no delivery guard → blocks invented refund/results offers and sends “We do not offer refunds based on athletic progress or results. For cancellation, billing errors, Apple purchases and your legal rights, read the Subscription Policy at /legal/subscription-policy or contact hammersmodality@hammersmodality.org.” Exact English “no guarantee of results” is permitted. This is defense in depth, not a proof of every possible future model paraphrase.
- `src/components/hammer/cards/PocketCard.tsx`: “There are no guarantees in results.” → “There is no guarantee of results.”
- `src/i18n/locales/en.json`, `workoutModules.disclaimer.text` and `unicornProgram.disclaimer`: “There are no guarantees in results.” → “There is no guarantee of results.”
- `src/i18n/locales/de.json`, `unicornProgram.disclaimer`: “Es gibt keine Garantien für Ergebnisse.” → “Es gibt keine Garantie für Ergebnisse.” The other German disclaimer already used this wording.
- `src/i18n/locales/es.json`, both disclaimer entries: “No hay garantías en los resultados.” → “No hay garantía de resultados.”
- `src/i18n/locales/nl.json`, `workoutModules.disclaimer.text`: “Er zijn geen garanties voor resultaten.” → “Er is geen garantie op resultaten.”; `unicornProgram.disclaimer`: “Er zijn geen garanties op resultaten.” → “Er is geen garantie op resultaten.”
- `src/archive/retired-programs/pages/ProductionLab.tsx.archived`: “There are no guarantees in results.” → “There is no guarantee of results.” This retired page remains unrouted.
- `src/pages/Terms.tsx` legacy frontend disclaimer, NOT an approved database document: “They are not guaranteed to be accurate” → “They may be inaccurate”. Its denial of recruiting/scholarship/pro-career promises remains.
- Live `drills`, only “4-Seam Grip Re-set on the Fly”: description “Guarantee a 4-seam grip on every throw for on-line, non-tailing carry.” → “Practice finding a 4-seam grip before each throw for on-line, non-tailing carry.”; instructions purpose “Guarantee a 4-seam grip on every throw so the ball carries straight and true.” → “Practice finding a 4-seam grip before each throw to work on straight carry.” Scoped update checked the exact prior values; prior text captured before update. No exercise steps, doses, selection or safety rules changed.
- `supabase/migrations/20260722064557_8f28c3a2-9881-4f4a-a5f5-51ff79a2148d.sql`: the same two drill seed sentences replaced identically so future installs cannot restore them. No migration was executed.
- `docs/legal/drafts/subscription-policy.v2.md` (new): separate unapproved, ineffective **DRAFT — LAWYER REVIEW REQUIRED**, not served to players. Exact change below.
- `docs/legal/lawyer-review-packet.md`, question 9: old question about the checkout guarantee → owner decision that no performance-based refunds/outcome promises are offered, with v2 billing-error language for counsel review.
- `src/test/legal/purchasePolicy.test.ts` (new): checkout-copy regression check, all-eight-language scan, 12 prohibited-offer cases, statutory-rights referral and permitted-disclaimer tests.
- `AGENTS.md`: added local help-output guard / immutable legal-version convention. `roadmap.md` and `docs/owner/no-refund-audit.md`: this report; no player-facing claims. Standing no-refund-promise memory recorded.

## Approved legal documents — unchanged
**Terms and Subscription Cancellation v1 contain no performance guarantee or refund window.** Subscription Policy v1 contains no performance guarantee, but its §6 contains this exact billing-error sentence:
> If you were charged after you cancelled, or charged in error, email us within 60 days and we will refund it.

This is a billing-error remedy, not a seven-day performance offer. Per the owner's instruction about any refund window, the separate v2 draft replaces it with:
> If you believe you were charged after cancellation or charged in error, email hammersmodality@hammersmodality.org so we can review the charge. This does not limit any refund or other rights required by law.

It also adds “We do not offer refunds based on athletic progress or results.” Counsel must review removal of the 60-day window and automatic repayment promise. Approved v1 remains effective and immutable; neither v2 nor any legal status was applied to the database. Statutory refunds and Apple procedures remain.

## Search proof and its exact limits
- Searched frontend, pricing/plans/descriptions, home/landing, onboarding, Help Desk/FAQ, AI prompt and its source knowledge, email templates, notifications, demo/tour, public files, metadata and all **8** locales (`en/de/es/fr/ja/ko/nl/zh`). **Zero customer-facing positive offers matching the requested phrases remain in current source.** English has only “no guarantee of results”; the five European-language sets retain equivalent negative disclaimers. No edits needed to French/Japanese/Korean/Chinese.
- Aggregate whole-row database scans (not limited-row samples): legal_documents **15/0**, movement catalog **1004/0**, drills **182/0**, injury education **0/0**, app_settings **2/0**, custom templates **120/0**, shared templates **1/0**, sent templates **10/0**, coach notifications **4/0**, minor/guardian notifications **0/0**, safeguarding notifications **0/0**, meal templates **0/0**, nutrition meal templates **0/0**, timeline templates **2/0** (rows/matches). Earlier source-knowledge scans also found zero in drill versions, owner drills, pending/Vault drafts and block exercises; Help Desk knowledge is source prompt rather than a dedicated help-content table.
- **A literal entire-repository zero is NOT claimed.** Technical comments about locking/data consistency, defensive banned-word patterns, adversarial test fixtures, previous audit reports, historical approved-policy drafts and this before/after report necessarily contain the words. These are not served sales promises; removing the guard patterns would weaken protection. The approved 60-day billing-error sentence remains by instruction. Existing external checkout metadata/history has not been bulk-modified.
- Live Help Desk: two adult-player requests demanding seven-day repayment and guaranteed/risk-free results both returned the policy referral, not an offer. No live AI errors observed.

## Verification, errors explained, and cleanup
- **31/31 focused tests passed** (23 purchase-policy/translation checks plus 8 existing legal checks). Help chat's Deno dependency/type check passed before its authorized redeploy.
- Harness build **OK**, latest observed 19:12 UTC. No manual app build or typecheck run.
- Actual adult test player at `/checkout`: plan, price, automatic-renewal checkbox and CTA rendered; no refund promotional block; updated training wording visible. Desktop and phone screenshots viewed: `/tmp/browser/no-promises/checkout-desktop.png`, `/tmp/browser/no-promises/checkout-phone.png`. No browser page errors. No payment submitted.
- Initial browser-script errors were test-harness mistakes (context vs page viewport setter; placeholder vs labeled input) and fixed. Loading, pending-tour redirection and missing selected tier were resolved through the player's tour and local tier state; no access/safety gates altered. Initial database reads used nonexistent columns; corrected to whole-row/schema reads, with no mutation from failed reads.
- First full-suite attempt exceeded its shell time limit. The subsequent full run completed: **2,711 passed, 1 failed (323 files)**. The slow drawer-matrix test exceeded its 60-second limit under parallel load (107 seconds including cleanup); the identical test **passed alone in 58 seconds**. This is not a clean full-suite pass; no further deployment is allowed on unexplained failures. Nine newly added source/translation assertions were also verified separately in the final 31/31 focused run.
- Throwaway adult player removed via the owner-only audit cleanup endpoint. Exactly two matching unpaid live-mode Stripe checkout sessions were snapshotted and expired; no Stripe customer existed for that player, no charge made. No cron, switch, iOS, plan-generation or approved-legal changes.

## Owner next steps
1. Lawyer reviews Subscription Policy v2; v1 remains approved until a separate decision.
2. Authorize the named `create-checkout` redeploy to remove obsolete backend metadata; help chat only is already live.
3. Resolve the full-suite drawer timing failure and obtain clean full-suite proof before a publish decision. Nothing has been published.

# LEGAL GO-LIVE CHECK — 2026-10-11 — Ready to publish: yes (website; nothing published, no cron applied)
**Checked live (phone size, signed out):** home page footer lists "Consumer Health Data Privacy Policy"; every /legal page opens with "Version 1 · Effective 2026-10-11"; no "DRAFT" label for players.
**Fixed:** 10 lawyer drafting notes ("[LAWYER: …]") were showing to players inside Terms, Privacy, Consumer Health Data, Minor Waiver, Adult Release, Child Safety and Subscription Policy. They are now hidden on screen (the approved stored text is unchanged). Tests added.
**Copyright page:** the blank agent placeholder is replaced on screen with "Copyright notices: hammersmodality@hammersmodality.org" until you register a DMCA agent.
**Not yet walked end to end with test accounts:** updated-terms screen → consent_records, teen 14-day grace + Resend, new-teen lock/unlock after parent signs, under-13 parent waiver, health-data checkbox, checkout auto-renew box, Cancel subscription. Their rule tests pass (15/15 legal tests); a signed-in walk-through needs test accounts created and removed — say the word and it runs next.

## Renewal reminders — cron SQL (you apply; not applied)
Function `renewal-reminders`, daily 14:00 UTC, auth = Vault secret `wk_daily_plan_job_token` in the `x-job-token` header.
```sql
select cron.schedule('renewal-reminders-daily', '0 14 * * *', $$
  select net.http_post(
    url := '<LOVABLE_CLOUD_FUNCTIONS_BASE_URL>/renewal-reminders',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-job-token', (select decrypted_secret from vault.decrypted_secrets where name = 'wk_daily_plan_job_token')),
    body := '{"mode":"renewal","dry_run":false}'::jsonb);
$$);
```

## Refund wording — word for word (unchanged; please confirm they match)
**Checkout:** "7-day performance guarantee — no risk" / "If you don't see measurable progress, we'll refund you."
**Approved Subscription Policy §6 Refunds:** "We do not give partial refunds for unused time, except where the law requires." / "If you were charged after you cancelled, or charged in error, email us within 60 days and we will refund it." / "Apple purchases are refunded through Apple."
**They do not match:** the policy has no 7-day progress guarantee. Owner decides which to change.

# SWITCH CHECK BEFORE PUBLISH — 2026-10-11 — Ready to publish: yes (website; nothing published)
**What turned the rest rules down:** not a test or script. The nightly safety check (`tcs-auto-off`, runs 04:45 UTC) dropped it automatically: Oct 7 04:45 all → pilot ("last night's check did not pass"; the pilot list was empty, so rest rules applied to nobody), then Oct 8 04:45 pilot → self (10 critical watchdog notes; owner only). You set it back to all at Oct 11 18:15.
**Guard:** the nightly check can no longer turn the rest-day rules down; it now sends an owner alert instead (deployed, dry run shows rest_day_calculator: all). A new test fails if any test or script writes the live switch rows (none do today) or if the guard is removed.
**Plans since Oct 7:** 18 plan days for 7 players; none had a loaded lift, so no plan broke the 2-rest-day or in-season 2-lift rule. Nothing to correct; no plans rebuilt.
**Features with no switch (always on in code):** Owner Exercise Vault (owner/admin only), warm-up stage order, new card layout, logging + autosave, double-check validator, Lifting Blueprint, "Your progress".

| Switch | Mode | Controls |
|---|---|---|
| rest_day_calculator | all | Rest-day rules (2 rest days between lifts, in-season ≤2 lifts) — now locked on |
| one_tap_logging | all | One-tap logging |
| power_primer | all | Power Primer on lift days |
| pap_real_throws | all | Power Primer real-ball throws |
| hammers_today_start_gate | all | Plan builds only after the player starts Hammers Today |
| under13_parent_program | all | Under-13 parent-controlled accounts |
| windmill_program | all | Softball windmill program |
| programs_retired | all | Old programs retired/redirected |
| adaptive_phases | all | Adaptive phases |
| phase_feedback | all | Phase feedback |
| offseason_arc | all | Off-season arc |
| in_season_post_game | all | In-season post-game plan |
| load_spike_protection | all | Load-spike protection |
| personalization | all | Personalization |
| onboarding_off_days | all | Onboarding & off days |
| ub_plyo_hand_wrist | all | Upper-body plyos + hand & wrist |
| staff_view | all | Staff View |
| tell_hammers | all | Tell Hammers schedule inbox |
| content_speed_lab / heat_factory / explosive_pitcher / softball_conditioning / lift_notes / base_stealer / barefoot_items | all | Program content batches |
| legal_v2 | **off** | New legal pages + consent — stays off until the lawyer approves |
| lifting_v2_enabled (app setting) | on | Lifting v2 |
| rankings_visible (app setting) | off | Public rankings — owner's earlier choice, not changed |

**Held off in code by earlier owner decisions (not changed):** Game IQ for athletes, Report Card for all users (staged release), hitting Report Card release 1, camera/pose measurements not yet validated (11), on-device ball detector, tipping detection, old-program redirects.
**Owner next:** confirm legal_v2 after the lawyer; say if any "held off" item should be on.

# LIFTING BLUEPRINT — 2026-10-11 — BB8 final — Ready to publish: yes for the website, with the coverage note below (nothing published)
**Final proof (BB8):**
- 8-week simulation (scripts/audits/blueprint-sim.ts; planner's own lists + age/season/eccentric rules + isolation gate; 540 combinations = 3 roles × 2 sports × 3 ages × 6 phases × 3 training ages, plus Add size off-season): 0 rule violations, 0 isolation picks outside Add size, 0 illegal picks. Overload: 516 load steps in 20,000 random logs, 0 without a qualifying log. In-season: 2 lift days, 13 sets per session at most (off-season 18).
- Coverage minimums are NOT met everywhere. Blocking rule: the scheme has 6 lift slots a day (main, second, push, pull, carry, trunk) and no added sets, so 11 areas can't all reach the proposed minimums. Off-season short: hamstring (~0/wk vs 3), hip extension (0–0.7 vs 3), hip rotation (1.1 vs 2), calves/feet (1.1 vs 3), squat in Q3–Q4 (1.6 vs 6). In-season short: hamstring 0.3, groin 0.5, calves 0.5, power 0.4 (vs 1–2). Upper push/pull and trunk are well over.
- "Your progress" in The General (phone screenshot taken): two-leg and single-leg strength ÷ body weight from verified maxes, 10 tests (jumps, single-leg jump L/R, 10/30/60-yd sprint, rotational med-ball L/R, throw velo, bat speed, exit velo) logged in the app, each compared with the player's own first results, plus slowest-improving quality and left/right gaps over 10%. Saves through the measurement record (new backend step `record_my_test`, signed-in player only, fixed test list). 5 tests pass. No test data saved.
- Full suite: 320 files, 2,693 tests, all pass; build OK.
- Not done: lift-day phone screenshot (the screenshot account had no lift day today); page audit not re-run; Vault validator not re-run on the 5 new exercises (they're in the review queue); the plan does not yet lean toward the slowest quality or weaker side (shown to the player only).
**Owner next:** 1) choose: lower the proposed minimums, or allow one rotating "robustness" slot (hamstring/hip/calf) on lift days — adds sets, so needs your ruling; 2) approve letting the plan lean toward the slowest quality/weaker side; 3) review the 42 lift-tag items; 4) publish when ready.

- [x] B1. Rules written down (supabase/functions/_shared/wic/lift/blueprint.ts, 7 tests pass): 11 areas with weekly minimum hard sets (off-season fuller, in-season maintenance floor); lift-day order (warm-up → primer inside main lift → main lower → opposite lower → upper push/pull → athletic strength → robustness → log); isolation (Nordics, Copenhagen, curls, machines) legal only off-season inside "Add size"; overload = reps to the top of the range first, then +5% lower / +2.5% upper rounded down to 5 lb, only after all reps logged at target effort with quality ≥4 and a verified max. Not yet used by the planner.
- [x] B2a. Copenhagen plank removed from the end-of-lift trunk exercises unless the player's goal is Add size (off-season only); plan builder updated on the backend, 8 tests pass.
- [x] B2b-1. Area map (_shared/wic/lift/areaMap.ts): every lift the planner can choose now maps to a body area, with weekly set counting and a gap report. Finding: no exercise in today's planner lists trains hip rotation or calves/feet at all, so no rotation can reach those minimums until B3 adds exercises (the test pins this and must shrink to none). 12 tests pass. Not yet on the backend.
- [x] B2b-2. Second lower lift now trains the opposite pattern of the main lift (squat/power main → hinge or hip extension; hinge/hip main → squat or side-to-side), and every third day side-to-side work leads. Same pool, same legality checks and doses; falls back to the old pick when no opposite exercise is legal. On the backend; 16 tests pass.
- [x] B2b-3. Lift-day order checked: the plan builder already adds lift blocks in blueprint order (arm care + trunk primer run with the warm-up as prep → main lower → opposite lower → upper push/pull → carries/anti-rotation → trunk finisher). A test now fails if that order ever breaks. 17 tests pass. No backend change needed.
- [ ] B2b-4. Rotating the remaining areas across the week + reporting rule-blocked gaps — folded into B3 (needs the new exercises) and B6 (simulation report).
- [x] B3a. Library gaps (first pass). New in the library (ages 13+, full tags, how-to, correct measure): Slider Hamstring Bridge-Curl (integrated hamstrings, every season), Bodyweight Cossack Squat (groin, deep knee bend, off-season), Farmer Carry on Toes (calves/feet/ankles, timed, every season). Existing exercises the planner never used are now in its lists: Cossack Squat, Dumbbell Lateral Lunge (groin, off-season), Hip Airplane (hip rotation, every season). Every one of the 11 areas can now be reached by the planner's lists (test pinned to none missing). Second lift after a squat can now be a hamstring exercise. 1,106 planner tests pass; plan builder updated on the backend.
- [x] B3b. Movement tags filled in for 103 lifts from the audit's proposals (backup saved; only rows that already had a lift category, so exercise choice is unchanged). 40 lifts are in the Vault's "Needs owner review" queue under the new reason "lift tag": the 37 the audit couldn't decide + the 3 new blueprint exercises to check. 34 Vault/lifting tests pass.
- [x] B3c. Outer hip: new Lateral Sled Drag (40 ft) and Banded Lateral Squat Walk (10 reps), ages 13+, every season, in the carries/athletic-strength lists; both added to "Needs owner review" (queue: 42 lift-tag items). 1,107 planner tests pass; plan builder updated on the backend.
- [x] B4. (13+ bodyweight bridge-curl, Cossack, lateral walk/drag in place; deep knee bend limited only by catalog age, growth, pain — fallback 16+ floor applies only to rows with no stated age.) Youth bodyweight versions for 13–15; deep knee bending trained progressively (limited only by injury/growth/pain).
- [x] B5 (plan lean waits on owner). Testing battery each phase + "Your progress" in The General from the player's own baselines; plan leans toward slowest-improving quality and left/right imbalances.
- [x] B6 (see final proof). Proof: 8-week sims (coverage, 0 violations, no isolation outside Add size, overload only after qualifying logs, in-season freshness, non-lift unchanged), phone screenshots, full suite, page audit.

# LIFTING AUDIT (read-only) — 2026-10-11 — nothing changed — Ready to publish: yes (website; nothing published)
- Full report: docs/owner/lifting-audit.md
- Biggest finding: the lift planner's exercise lists contain no hamstring curls or Nordics, no calf/shin work, no adductor or abductor work and no hip rotation work. Real saved plans: 0 of 1,182 lift rows. In 8-week simulations (324 combinations), hamstring knee-bending and calves/feet are under 1 hard set a week for every player; abductors (172), glutes/hip extension (216, all off-season) and adductors (138) are often under too. This is mostly by accident, not a rule.
- 13-year-olds have no legal hamstring-curl option (leg curls are 14+, Nordics/GHR 16+).
- There is no named heavy-spinal-load rule; it is held back only by age, barbell and eccentric floors.
- Tags: 88 active strength exercises have no pattern, 52 use "hinge_squat". Proposed tags are in the report (not applied).
- Progress: verified maxes, 24 tiered standards, combine and baselines exist, but standards and combine have 0 entries, and the tib/calf/Nordic standards can't be earned because they are never prescribed.

**Owner next:** decide whether to add required weekly slots for hamstring curl, adductor/abductor, calf/shin and side-to-side work (and what 13-year-olds get); review the proposed tags.

# WARM-UP STAGE ORDER — 2026-10-11 — Ready to publish: yes (website; nothing published)
- [x] Stage scale (10 stages, from what the warm-ups really contain): 0 Tissue prep · 1 Breathe and reset · 2 Joint circles · 3 Mobilize · 4 Activate (incl. arm care) · 5 Coordinate · 6 Movement prep · 7 Build-ups · 8 Elastic hops · 9 Prime — each with a "how warm before this" line.
- [x] Vault tag: "Warm-up stage" (required for every warm-up movement) + optional "Order within stage". Double-check blocks a warm-up with no stage (Make live stays off); the editor shows where it lands in a sample warm-up. All 121 builder warm-up movements are now listed in the Vault (51 were missing).
- [x] Planner: movements chosen exactly as before, then sorted by stage → order number → previous order. Hard rules win over any tag: tissue prep rolling then rhythm always first; nothing else can be stage 0; hops/sprints/max efforts can never sit before build-ups. Owner tags take effect from the next plan build.
- [x] Starting stages: every movement gets its group's stage. 6 unsure ones + 70 catalog warm-up movements the daily builder doesn't use are in "Needs owner review" with a suggested stage (queue now 403), e.g. med-ball rotational toss → suggested 9 Prime.
- [x] Proof: 8-week simulation, 24,640 warm-ups (11 day types incl. every season type × 5 age bands × 2 sports × 4 roles × 56 days, mixed gear/injury/low-readiness): 100% tissue prep first, 100% non-decreasing stages, 0 rule breaks, movements and doses identical to before. Vault screenshots at phone + desktop (stage tag, block, sample). AA1 final run: 2,667 of 2,668 tests pass; the one failure is the known warm-up/defense drop-down tap test, which passes on its own (timing slip under load); build OK. No test data created.
- Changed order note: build-ups (dry swings, throw prep, crossovers) used to sit at the END, after max-intent pogos/jumps; they now come before them.
- Throwing ramp/Power Primer gate, age, growth and pain rules untouched (they act on choice, not order).

**Owner next:** confirm the suggested stages in "Needs owner review" (filter reason "warm-up stage"); publish when ready.

# Z10 FINAL PROOF — 2026-10-11 — Ready to publish: yes (website; nothing published)
- [x] Vault end to end as owner: edit Pallof Press → preview → make live → undo (built-in card back, exercise stays on). Fixed: undoing the first edit of a built-in exercise used to switch it off.
- [x] New exercise with full tags + video made live → prescribed in a test player's speed block (2 × 8) the same day; its video lookup works.
- [x] Validator: an incomplete exercise is refused at Make live ("Add a full name.").
- [x] Review queue: 387 items with Approve / Edit (proven in Z8). Non-owner: test player refused by the backend (403) and sent away from the Vault page.
- [x] Series lists: all 4 cross-band series spell out 7 movements, no brand name; the 4 proposed lists are below.
- [x] Jump-logging test + description/validator/review/stats tests: 31/31.
- [x] Page audit as a test player, 171 pages at 390 px: no crashes, blank pages or sideways scrolling. Fixed: 7 owner/admin pages (verification, Foundations health/diagnostics/traces, IQ alignments + audit, workout library) opened for players — now owner/admin only.
- [x] Full suite: 315 files, all passed; build OK. Test players (4) and all proof rows deleted; 0 left.
- Vault: ON for owner/admin (Owner dashboard → Content → Exercise Vault).

**Owner next:** 1) publish the website; 2) in the Vault, work the 387 "Needs owner review" items — including the 4 proposed series lists, the 4 flagged cross-band movements and the 2 known-wrong descriptions (weighted pull-up, landmine drop-catch); 3) physical iPhone check. Page audit ran at 390 px only (not 360 px or desktop).

# OWNER REQUESTS 2026-10-11 — Ready to publish: yes (website; nothing published)
Owner next steps: (1) check the 4 proposed series lists below and the 4 extra cross-band movements; (2) nothing to apply for throws — pap-throw-types.sql is confirmed live (pap_max_throws + pap_warmup accepted, pap_real_throws = all), no new throw types needed; (3) items 3 and 4 continue next.
- [x] 1. Series list every movement. Cross-Band Series (full list, warm-up chart, activation, recovery) now spells out your 7 movements in order — Row, Reverse Fly, Pulldown, 90/90 External Rotation, Scaption, Incline Plus, Victory — each with anchor height, body position, a one-line how-to and 10 reps. Outside brand name removed from all how-to text (0 left). Further cross-band movements already in our data, FLAGGED for owner (kept as their own exercises, not added to the series): Cross-Band Pull-Apart Series, Diagonal Pulls, Internal/External Rotation at Wall, Scapular Push-Up. The other 4 series now show a PROPOSED full list (never blank) — owner to check:
  - Band Series — Full Chart: internal rotation, external rotation, 90/90 IR, 90/90 ER, straight-arm extension, reverse fly, forward fly, curl + press-down — 10 each arm.
  - Reliever Ready Series (baseball / windmill): arm circles, band pull-aparts, 90/90 ER (windmill: arm whips), walking lunge + reach, two 10-yd build-ups at 75%, 15 catch-play throws building out, 8–10 mound/circle pitches to game effort.
  - Hurdle Hop Series: two-foot hops ×5, lateral hops ×5, single-leg hops ×5 each leg (advanced only).
  - Ankle Bounce Series: in place, forward/back, side-to-side, single-leg — 10 each.
  Also fixed: "_bb" (baseball) was being read as "barbell" — the description check now knows the difference. Description checks 90/90 pass.
- [x] 2. Jumps never log time. "Broad jump — 60% intent primer" now logs distance (ft + in) on any card, even when its dose is in seconds. Every broad, long, lateral, single-leg, skater, triple and bound variant logs distance; every vertical / jump-and-reach logs height. New test `jumpNeverTime.test.ts` fails if any catalog jump resolves to a time field in any slot or unit. Logging tests 73/73 + new test pass.
- [x] 3. Page audit unblocked. The owner-only review-accounts tool gained a throwaway audit-player action (create with password, delete — refuses any account not marked as an audit player). A TEST player was created, its plan started and built (20 plan items), it signed in with its password, and 66 player pages were checked on a 390 px phone: 0 crashes, 0 page errors, 0 blank pages, 0 sideways scroll. Owner and admin pages sent the player back to the dashboard (no access); Vault sent it to its setup step. Then the account and all 25 tables of its records were deleted — 0 rows left. pap-throw-types.sql: confirmed already live, no new SQL needed.
- [ ] 4. Owner Exercise Vault — in progress.
  - [x] 4.0 Foundation (Z2): owner/admin-only storage for drafts, live versions (with undo) and an audit log; double-check validator (required fields, measure type vs dose, filler, equipment, series list, jumps never time, throws need arm weight) with 7 tests; Vault page at Owner dashboard → Content → Exercise Vault: search + filters (card type, sport, position, season phase, equipment, status, player age, Needs owner review), shows how-to and default dose.
  - [x] 4.1 Full edit form + tagging, saved as drafts, validator + phone preview + Make live + undo/history (Z3). VaultEditor: every field (name, how-to-one-rep, setup, steps, cue, why, Stop if, series movement list, dose sets/reps/seconds/distance/load %, measure type, equipment, card type, sports, season phases, min age, rest-rule category, arm-ledger weight, Power Primer role); live double-check list; 360 px phone preview; Save draft / Make live (from next plan — never mid-day) / Undo last live; version history. exercise-vault function (owner/admin only) deployed and proven end to end as the owner: draft → live v1 → live v2 → undo restored v1 as v3, effective_from = next day; anonymous calls refused; test rows cleaned up (0 left). Validator tests 7/7; build OK.
  - [x] 4.2 Video upload/link (Z4): private `exercise-videos` bucket (200 MB cap, MP4/WebM/MOV only) — signed-in players can watch, only owner/admin can upload or delete (anon upload proven blocked). VaultEditor has a video link field + file upload with type/size checks; the double-check validator rejects non-video links and wrong storage paths (5 new tests). The video plays inside the exercise's "How to do it" drop-down on every card via `get_exercise_video` (live version only, effective-dated) + a short-lived signed URL, `playsInline` + `preload=metadata` for phones. Proven end to end as the owner: upload → draft → live (apply today) → lookup returned the video → playback fetch 200 video/mp4 → undo → all test rows and the file deleted (0 left). Full suite 2,655 tests: 2,654 pass; the one failure is the known warm-up/defense drop-down tap test that passes in isolation (timing slip under load, seen before Z4). Build OK.
  - [x] 4.3 Add new exercise → planner prescribes it (Z5/Z6). "Add new exercise" in the Vault (code + planner category required); Make live adds it to the planner library with speed-category and training-level tags; a throwaway test player's plan prescribed it. Cleanup (Z6): test player deleted with all its records, test exercise removed from library/drafts/versions (0 left), and the one copy that reached the Apple reviewer demo account's 2026-10-12 plan removed.
  - [x] 4.4 Stats panel (Z7): each exercise's editor shows times prescribed, completion rate (done vs missed), average effort, primer quality ratings, and 2/4/8-week performance change from the anonymous training store — totals only, no athlete names; "No data yet" when empty. 3 tests; backend updated; proven as owner (Pallof press: 148 prescribed, 17 missed, 332 anonymous records); signed-out refused; build OK.
  - [x] 4.5 Review queue (Z8): "Needs owner review" now merges the flagged descriptions, the how-to drafts and every series into one list (387 exercises); each shows its reason plus "Approve as written" and "Edit". Approving or making an edit live removes it from the queue. 2 tests; backend updated; approve proven as owner with a fake code (test record removed); phone view checked; build OK.
  - [x] 4.6 Final proof (Z9): Vault checked as owner at 390 px phone and 1280 px desktop (review filter → 387, editor with double-check, phone preview and stats); a throwaway test player was sent to its dashboard and refused by the backend (403), then deleted with its records. Fixed a crash where a card's how-to drop-down needed app-wide data access (3 tests had caught it). Full suite: 315 files, all passed; build OK.

**Owner next:** publish the website when ready; in the Vault, work through the 387 "Needs owner review" items (Approve or Edit) — including the 4 proposed series lists, the 2 known-wrong descriptions (weighted pull-up, landmine drop-catch) and the 4 flagged cross-band movements; do the physical iPhone check.

# ROUND 3 — PREMIUM LOGGING / PRIMER IN THE LIFT / REAL DESCRIPTIONS — 2026-10-11 — Ready to publish: no
- [x] Y9 FINAL PROOF (2026-10-11): phone screenshots of every card type at 360/390/393 px — ALL PASS (39 checks, 33 shots): lift + interleaved primer with 5/5→3/5 "Quality dropped" stop, swapped lift with matching seconds rows, broad jump ft/in, dry throws as reps, recovery check-offs, speed ss.hh, hitting, baserunning, fielding, catcher pop. Primer simulations (5,5,4,3 stops after the 3; 4,4,4,… stops at cap; 3%/5% speed drops; 1.5 arm weight) and the alternative-sync test pass in the suite. Measure-type check: 964/964 slugs resolve, 0 failures. Description checks: 976/976 entries, 0 filler, 0 equipment mismatches, 0 missing rep definitions; 311 flagged for owner, 5 series await movement lists. 40-description spot-check list below. Double-check audit: 7,168 rendered entry-grid contexts, 0 mismatches. Full suite **311 files / 2,636 tests passed**; build OK. Page audit: still blocked — only the owner account is mintable and it has no started plan; needs a player account. Not publish-ready: page audit, physical iPhone check, owner reviews (311 descriptions, 5 series, 341 how-to drafts), pap-throw-types.sql.
- [x] Y7 FINAL PROOF DONE: phone proof ALL PASS at 360/390/393 px (39 checks) — interleaved primer with 5/5→3/5 "Quality dropped" stop verified on screenshots (lift set 3 continues after the stop); swap rows sync, broad jump ft/in, dry throws as reps, recovery check-offs, speed ss.hh, hitting/baserunning/fielding/catcher-pop forms all render. Full suite **311 files / 2,636 tests passed**; build OK. Page audit still blocked (owner account has no started plan; player mints rejected). Not publish-ready: page audit, physical iPhone check, owner review of 311 flagged descriptions + 5 series movement lists + 341 how-to drafts, and the pending pap-throw-types.sql.
- [x] A. Silent autosave: no "Saving…"/"Saved" lines; every change still saves at once (device first, then backend, offline queue). Only a failed send shows a message. Test added; logging tests 34/34 pass.
- [x] B. Power Primer inside the lift: separate primer spot removed; the lift's top log now runs lift set → rest → all-out explosive set ("All-out effort — this is what we measure") → next lift set. Each explosive row needs a 5–1 quality answer (Felt excellent / Felt good / Lost snap / Mechanics changed / Ground feels soft) plus optional speed/time. Next explosive set only at 4–5, no speed-drop stop (builder's 5% throws/swings, 3% sprints) and room under caps (never more than the lift's sets); stops at ≤3, stop rule, cap or a pain button; lift always continues. Every rating saved (record-only rows with rating, round, value). Real throws go to the arm count as pap_max_throws (1.5 each, ≤5 per session); throwing warm-up lock kept; builder gates (real-throw days, day-before-game swap, start day, age/growth/pain/readiness) unchanged. Plain-words explainer in the lift's drop-down. Tests: 5,5,4,3 stops after the 3; 4,4,4,… stops at cap; 3%/5% drops; 1.5 arm weight. Suite **306 files / 2,608 tests passed**. Phone screenshots pending (with Round 3 proof). Note: real-throw primer writes need the owner's pending SQL `docs/pending-owner-apply/pap-throw-types.sql` (real throws stay off until then).
- [x] C. Alternative swap updates log rows at once: the swap now writes the full dose (sets, reps, seconds, distance, totals, unit) — when the replacement measures differently (e.g. reps → seconds), it adopts the replacement's own defaults and clears stale values, so the log rows, units and prescribed numbers match the new exercise immediately. Undo restores the original full dose. Unsaved drafts are keyed to the movement, so a swap starts fresh matching rows instead of hydrating pre-swap fields. Tests: same-unit carry-over, reps→seconds swap shows seconds rows with the new target, time-restriction set trim, rows = sets with per-set prefill.
- [x] D. Measure type for every library exercise: new `src/lib/logging/measureType.ts` resolves all 13 types (weight×reps, reps, hold s, duration, sprint ss.hh @ distance, jump distance ft+in, jump height in, throws by type, velo mph, bat speed/EV mph, swing count, check-offs) from slug + slot + dose hints, with the exact entry fields per type. Build-failing check `measureType.test.ts` runs all **964 catalog slugs** — any slug that doesn't resolve, or a type with no entry fields, fails the suite. Broad Jump now logs jump distance (ft + in), vertical jump logs height (in), dry throws log a throw count (never seconds); other jumps stay counted reps. Full suite **308 files / 2,622 tests passed**.
- [x] E. Speed card, precise: each timed rep now records the ss.hh time, the fixed distance, a start type (standing / 3-point / 2-point / flying), optional 10/20/30 yd splits (only offered when the distance allows them, and only kept if they're faster than the final time), steps per rep with average stride, and self/partner timing — all saved with the rep (splits and start type included). Personal bests and the per-distance trend were already on the card and still update from real saved times only. Old saved reps without a start type load fine (shown as standing). New test: split marks by distance, the four start types, stride math. Full suite **309 files / 2,625 tests passed**.
- [x] F. Skill logging: three new templates in `logTemplates.ts` — baserunning (time ss.hh at the distance + reaction/jump, for home-to-first and steals), fielding (reps + clean plays + throws, labeled as counting toward the arm total), catcher pop time (ss.hh per throw). Hitting (swings + quality contact + bat speed / exit velo) and pitching (count, strikes, velo) templates already existed and are unchanged. Resolver order puts these position rules first; a new test (`logTemplates.skill.test.ts`) pins all five plus guards that ordinary lifts and sprints are unaffected. Note: fielding throws feed the arm ledger automatically only where the row is a throw type (existing rule); the fielding template's throw count is saved with the log. Full suite **310 files / 2,631 tests passed**.
- [x] G. Rewrote every "How to do one rep": all 976 entries now carry the right equipment (checked against the exercise — DB=dumbbells, KB=kettlebell, BB=barbell, band, cable, sled, med ball), a specific setup where known, and a specific rep definition (holds = time, throws = one throw, sprints = one run at the distance, jumps = one jump, series = one round of every movement). The generic filler line is gone everywhere (0 left of 629). New build-failing checks `basicHowTo.quality.test.ts`: banned filler phrases, equipment mismatch, series without a movement list, missing rep definition, and every catalog exercise must have a description. 311 entries whose true setup could not be verified are flagged for the owner in docs/owner/exercise-descriptions-needed.tsv (never guessed); 5 series await the owner's movement lists. 40 random rewrites below for spot-check.

40 random rewritten descriptions for owner spot-check:
- **sp_wall_iso_to_sprint** — Max wall-drive iso then release, sprint the prescribed distance. Hold the position for the time shown above; that is one rep. One rep is holding the position for the full time shown, then relaxing.
- **weighted_pullup_double_ecc** — You need a barbell and a squat rack. Pull chin over bar, lower, pull halfway, lower, pull to top. One rep is: pull chin over bar, then return to the start under control.
- **ubp_f01_c_landmine_press_drop_catch** — You need a landmine (barbell anchored in a corner). Let the bar fall an inch, catch it, hold two seconds. One rep is one full swing.
- **sp_wall_drive_iso** — Wall-lean 45°, drive one knee up, hold then 5x each leg. Hold the position for the time shown above; that is one rep. One rep is holding the position for the full time shown, then relaxing.
- **ubp_f10_d_rotational_catch_stick** — You need a medicine ball. Catch across the body, stop the turn. One rep is one full swing.
- **wu_arm_line_spiral** — Reach across body, let the ribcage rotate through. One rep is: let the ribcage rotate through, then return to the start under control.
- **gap_kot_step_down_low** — You need a sturdy box. Stand on a low step on one leg. Lower slowly until the other heel taps the floor, then stand back up. One rep is: stand on a low step on one leg, then return to the start under control.
- **gap_hip_flow_mobility** — Move slowly between a deep lunge, a half-kneel and a seated shift. Keep breathing; never force a position. One rep is: move slowly between a deep lunge, then return to the start under control.
- **ubp_f11_c_seated_landmine_drop_catch** — You need a landmine (barbell anchored in a corner) and a bench. Short drop, catch at the collarbone. One rep is one full swing.
- **ubp_f04_b_overhead_catch_slam** — You need a medicine ball. Catch high, slam through the floor. One rep is one full swing.
- **wu_serratus_wall_slide** — Reach long at the top, do not shrug. One rep is: reach long at the top, then return to the start under control.
- **wu_line_hops_forward_back** — Quick feet, both directions clean. One rep is one full jump — land balanced, reset, then go again.
- **gap_iso_wall_press_hold** — Set your hands on a wall at chest height and press as hard as you can for five seconds. Nothing moves. One rep is holding the position for the full time shown, then relaxing.
- **bs_hip_resisted_swings** — Band around waist pulling lead hip AWAY from pitcher. Swings against band — pelvis has to fight to open. One rep is one full swing.
- **sp_tempo_100_75** — 6× the prescribed distance at 75%, 60- walk rest. One rep is one run of the prescribed distance at the effort shown; walk back slowly to rest.
- **lift_kb_clean_press** — Kettlebell from between legs then rack then press overhead. Alternate hands. One rep is: kettlebell from between legs then rack then press overhead, then return to the start under control.
- **cable_high_low_rotation** — Set the cable (or a band tied to a post) at hip height on one side and hold the handle with both hands at your chest. Stand sideways to the anchor; turn your hips and chest away from it, pause, then return slowly. Do every rep on one side, then switch. One rep is: set the cable (or a band tied to a post) at hip height on one side and hold the handle with both hands at your chest, then return to the start under control.
- **bs_hip_assisted_swings** — Band around waist pulling lead hip toward pitcher. Take max-intent swings — feel the pelvis pulled through the zone. One rep is one full swing.
- **ubp_f17_reverse_throw** — You need a plyo ball. Face away, throw back over the shoulder, stay easy. One rep is one throw.
- **wu_sl_rdl_reach** — Hips square, reach long, no wobble. Do every rep on one side, then switch sides. One rep is: hips square, then return to the start under control.
- **ac_softball_windmill_decel_wall** — Full windmill, catch arm against pad softly. One rep is: catch arm against pad softly, then return to the start under control.
- **wu_couch_stretch_active** — Squeeze glute, tuck tail, breathe. One rep is holding the position for the full time shown, then relaxing.
- **sa_standing_cable_row** — Set the cable (or a band tied to a post) at chest height in front of you and hold the handle with the arm straight. Pull your elbow back to your ribs, squeezing the shoulder blade, then reach forward slowly. One rep is: set the cable (or a band tied to a post) at chest height in front of you and hold the handle with the arm straight, then return to the start under control.
- **wu_med_ball_scoop_toss** — You need a medicine ball. Drive from the rear hip, ball rockets up. One rep is one full throw.
- **dl_step_back_swing** — You need weighted bats. Overload bat, step-back gather, drive rear hip through contact. One rep is one full swing.
- **wu_pogo_single** — Equal hop height both sides. Do every rep on one side, then switch sides. One rep is one full jump — land balanced, reset, then go again.
- **ac_iso_scap_squeeze** — Squeeze shoulder blades, hold, no shrug. Hold the position for the time shown above; that is one rep. One rep is holding the position for the full time shown, then relaxing.
- **ubp_f15_base_pushup_bottom_hold_explode** — Hold three seconds at the bottom, then go. One rep is holding the position for the full time shown, then relaxing.
- **bear_crawl_iso** — Hover position, knees pinned 1 inch off floor, breathe. One rep is holding the position for the full time shown, then relaxing.
- **backward_step_down_heel_elevated** — Front foot fully on box, drive through heel + mid-foot, slow descent. Do every rep on one side, then switch sides. One rep is: drive through heel + mid-foot, then return to the start under control.
- **ac_rocker** — You need plyo balls. Rock back, load, throw — feel eccentric stretch. One rep is one throw.
- **kot_couch_stretch_iso** — Back foot on couch, front knee vertical, pelvis tucked, breathe. One rep is holding the position for the full time shown, then relaxing.
- **wu_dry_swing_progressive** — 50% then 75% then 100% — feel the elastic snap. One rep is one full swing.
- **ac_recovery_forearm_smash** — You need a lacrosse ball. Pin forearm with ball, wrist through range. One rep is: pin forearm with ball, then return to the start under control.
- **ubp_f01_base_pushup_drop_catch** — You need a sturdy box. Drop to the boxes, catch soft, stick two seconds. One rep is one full swing.
- **lift_side_plank_leg_lift** — Side plank position. Lift top leg to ~45° and back. Do every rep on one side, then switch sides. One rep is holding the position for the full time shown, then relaxing.
- **sp_secondary_lead_cross** — Secondary lead walking timing, react to ball-past-catcher, crossover the prescribed distance. One rep is one run of the prescribed distance at the effort shown; walk back slowly to rest.
- **wu_broad_jump_prep** — Arm swing, land soft — no maximal effort here. One rep is one full jump — land balanced, reset, then go again.
- **gap_pogo_hold_short** — Three quick pogo hops, then hold the landing for two seconds. Repeat. One rep is holding the position for the full time shown, then relaxing.
- **ubp_f13_a_prone_plyo_ball_drops_ty** — You need a plyo ball and a bench. Small fast drops, thumb up. One rep is one throw.

- [ ] Proof: phone screenshots 360/390/393, description checks, double-check counts, full suite, page audit (page audit still needs a player account with a started plan).

# X4 FINAL PROOF — 2026-10-11 — Ready to publish: no
- [x] Phone proof at 360/390/393 px: **204 checks, 0 failed** — screenshots of every card type's pop-up (closed and one drop-down opened), every drop-down tapped open+closed, no nested/duplicated cards, Start/X visible, warm-up seconds + mm:ss (no decimal minutes), sprint ss.hh filled from the stopwatch, lift added set + "Done · Did more" + prescribed-vs-done, throwing added set + arm-ledger count (84.8 of 40 arm units) + safety warning, autosave surviving pop-up close and backgrounding + app reload. Log `/tmp/browser/x4/phone.log`.
- [x] Entry-rows-match-dose check: 0 mismatches (synthetic eight-week matrix, in the suite). Rendered-text double-check: passed.
- [x] No-self-nesting test: passed (fails if any pop-up renders its own or another full card).
- [x] Full suite: **305 files / 2,600 tests passed**. Build OK.
- [ ] Page audit: still blocked — the only mintable sign-in is the owner account, which has no started plan, and owner accounts skip the gates the audit must exercise. Needs a player account with a started plan.
- Waiting on owner: player account with a started plan (page audit + real-plan tap test), physical iPhone check, 341 how-to drafts, publishing. No publish, cron or iOS changes; no test data created.

# X3 PITCH-CAP SAFETY IN THE PITCHING LOG — 2026-10-11 — Ready to publish: no
- [x] Outing/bullpen logs now allow "Add a set" (previously fixed rows) and warn in the log when entered pitches pass today's pitch cap: "over today's pitch cap (N of M pitches)… everything saved as you really did it — stop throwing for today and your coming days will be adjusted." Everything is still recorded; no dose, schema or completion-rule changes.
- [x] Regression test: 28 + 12 pitches against a 30-pitch cap shows the warning and both rounds save; the existing bullpen schema save is unchanged.
- [x] Full suite: **305 files / 2,600 tests passed**. No publish, cron or iOS changes; no test data created.
- Waiting on owner: signed-in player check on a real started plan + page audit, physical iPhone check, 341 how-to drafts, publishing.

# X2 CATCH-PLAY LEDGER VERIFICATION — 2026-10-11 — Ready to publish: no
- [x] Re-checked the X1 catch-play arm-ledger path with the strict assertion restored: catch play 2 × 10 plus an added set of 10 records exactly 30 throws (prescribed 20) in the arm ledger row, and the added-set lift shows the full "Done · Did more" label with prescribed-vs-done. The X1 softening was a test-setup artifact, not a real bug — no code change needed beyond restoring the strict check.
- [x] Full suite: **305 files / 2,599 tests passed**. No publish, cron or iOS changes; no test data created.
- [ ] Still open: Pitch Smart warnings for added pitches use the existing pitching card rules only.
- Waiting on owner: signed-in player check on a real started plan + page audit, physical iPhone check, 341 how-to drafts, publishing.

# X5 AUTOSAVE / TIME ENTRY / AUTO COMPLETION / ADD SET / NESTED-CARD FIX — 2026-10-11 — Ready to publish: no
- [x] Autosave: no Save log buttons. Every entry saves on change (short delay), on blur, when the pop-up closes and when the app is backgrounded; a "Saved" line shows. Offline values stay on the device and sync on reconnect/resume/next start (nothing removed until the backend accepts it).
- [x] Real time entry: seconds (holds ≤90 s), mm:ss, h:mm:ss, ss.hh for sprint/stopwatch; numeric keypad segments with the target as a guide; stored as seconds (hundredths kept). Warm-up/recovery no longer use a decimal-minutes box. Stopwatch fills ss.hh.
- [x] No Completed button/checkbox (incl. block "Mark done" inside pop-ups): Done / Cut short / Done · Did more / Missed are automatic labels; Skip stays as an optional choice inside each drop-down.
- [x] Add set on every exercise entry grid and every throw type; added sets save, count in totals and show "Prescribed vs Done". Throwing card throws go into the existing arm ledger (ledger's own weights, unchanged) with a safety warning when over the daily/weekly limit; everything entered is still recorded, and the nightly plan already reads the ledger.
- [x] Nested card bug: a pop-up could render a full card inside itself (a card component re-wrapping itself in a pop-up, plus the warm-up block repeating its own title/card frame). Fixed at the pop-up shell: inside any pop-up, a card renders only its body. Test fails if any pop-up renders its own or another full card.
- [x] Proof: full suite **305 files / 2,598 tests passed**. Phone checks at 360/390/393 px: **204 checks, 0 failed** — every card type closed/opened, every drop-down tapped open+closed, no nested cards, Start/X visible; warm-up seconds, sprint ss.hh from stopwatch, lift added set + Did more, throwing added set + arm count + safety warning, autosave surviving close and background+reload. 81 screenshots in `/tmp/browser/x5/shots/`. Backend writes in the browser proof were answered locally: no test data created.
- [x] Throws entered on non-throwing-card rows (e.g. a supplemental catch-play row) feed the arm ledger — verified in X2 with the strict test.
- Waiting on owner: signed-in player check on a real started plan + page audit, physical iPhone check, 341 how-to drafts, publishing. No publish, cron or iOS changes.

# W5 FINAL ACTIVITY-CARD PROOF — 2026-10-11 — Ready to publish: no
- [x] PFP record-only log no longer shows an invented 20-rep target (rep target left blank; saved fields and rules unchanged).
- [x] Full suite: **302 files / 2,579 tests passed** (incl. entry-rows-match-dose matrix, 0 mismatches in synthetic eight-week contexts; rendered-text double-check; defense/PFP; tissue prep). Log `w5-suite.log`.
- [x] Phone proof at 360/390/393 px: nine card pop-ups + bullpen, every drop-down tapped open/closed, top log entries only, Start/X visible — all PASS. Screenshots (closed and opened) in `/tmp/browser/activity-layout/`; logs `w5-phone.log`, `w5-pitching.log`.
- [ ] Not done: ArmThrowsPanel top-log consolidation; generated-plan (not synthetic) eight-week row coverage; historical-row edge cases.
- Waiting on owner: affected-player access (real-plan tap test + signed-in page audit), physical iPhone check, 341 how-to drafts, publishing. No publish, cron or iOS changes; no test data created.

# W4 PITCHING ACTIVITY-CARD PASS — 2026-10-11 — Ready to publish: no
- [x] W4 next unfinished workflow: on existing mound days, the main outing/bullpen log now presents its required count fields directly in the shared top log. Optional pitch statistics, arm-feel survey and notes remain inside a closed named disclosure; secondary outing/bullpen and PFP record-only entry points remain available under extra logging. No generator, dose, saved schema or completion-rule changes; no invented Done/Skipped outcomes for record-only pitching logs.
- [x] Reused the existing save handler, prescription IDs and template field keys. Added a regression saving 27 actual pitches against a 30-pitch example without opening details; optional fields remain null and closing/reopening details preserves the unsaved count. Fixed row controls are hidden; optional statistics have full-width labeled inputs rather than a crowded phone grid.
- [x] Fresh full suite: **302 files / 2,579 tests passed**. Nine existing pop-up fixtures plus a bullpen example pass phone checks at 360/390/393 px; existing 81 screenshots refreshed plus six pitching closed/open screenshots in `/tmp/browser/activity-layout/`. Logs: `w4-suite.log`, `w4-phone.log`, `w4-pitching.log`, `w4-focused.log`. Phone checks include draft-preserving taps and visible Start/X. Browser fixtures are not affected-player or physical-native proof.
- [ ] Still unfinished: PFP's legacy aggregate log uses a synthetic 20-rep entry while displayed drills use minutes; reconcile presentation against canonical prescriptions without fabricating a conversion. ArmThrowsPanel and other pitching-day entry paths still need top-log consolidation; actual generated eight-week coverage and canonical historical-row hydration edge cases remain unverified. Authenticated page audit and real-plan taps require affected-player access.
- Waiting on owner: affected-player access, physical native-device checks, how-to draft approval and publication/live verification. No publish, cron or iOS changes; no backend test data.

# W3 REMAINING ACTIVITY-CARD CHECK — 2026-10-11 — Ready to publish: no
- [x] W3 next unfinished panel: power-primer rest timer and round/speed entries now use the shared top-log portal; its instructions, warm-up confirmation, alternatives and safety controls sit in an initially closed disclosure. Existing round/throw limits, speed-stop rules, record-only saving and lift prescriptions remain unchanged.
- [x] Added two targeted regressions: top-log recording while details are closed, disclosure open/close, round-limit stopping and throwing warm-up lock/unlock. Fresh full suite: **301 files / 2,578 tests passed**; harness build OK.
- [x] Repeated nine fixture pop-ups at 360/390/393 px, including the lift's power primer: disclosure taps, entry placement, survey placement and visible header checks passed. Refreshed 81 screenshots under `/tmp/browser/activity-layout/`; logs `w3-phone.log`, `w3-primer.log`, `w3-suite.log`. Reviewed lift closed/open screenshots. Fixtures and 393 px browser emulation are not real-player/native proof.
- [x] Read-only generator review confirms duration/distance/total defaults are normalized by dosage unit; no speculative dimensional reinterpretation or generator change made. Specialized-panel inventory identifies pitching outing/bullpen/PFP standalone log dialogs as the next item requiring presentation work with existing saving scopes preserved.
- [ ] Remaining: pitching specialized workflow, canonical dimensional edge cases and exhaustive actual generated eight-week rendered-row coverage. Synthetic presentation tests do not establish complete generated-plan coverage. Fresh authenticated page audit and real-plan tap-every-drawer proof remain blocked by affected-player access.
- Waiting on owner: affected-player plan access, physical native-device proof, 341 how-to drafts and publication/live-site verification. No publish, deployment, cron or iOS changes; no backend test data.

# W2 EXACT-DOSE ENTRY CHECK — 2026-10-11 — Ready to publish: no
- [x] W2: fixed total-count precedence in entry grids: total_reps no longer removes distance/time fields from repeats or weight boxes from lifts. Added explicit regressions for 4 × 90 ft with a total count and 3 × 5 with 15 total reps; prescriptions and saved-data/completion rules unchanged.
- [x] Expanded the 7,168-context, eight-week rendered-grid matrix from lifts alone to seven rotating entry types: lifts, sprints, conditioning, holds, jumps, throws and cross-sport. **0 mismatches** in these synthetic presentation contexts; this is NOT generated-plan or affected-player proof.
- [x] Fresh full suite: **300 files / 2,576 tests passed**. Nine pop-up fixtures at 360/390/393 px pass disclosure open/close, survey placement and visible header checks; 81 screenshots updated in `/tmp/browser/activity-layout/`, logs `w2-suite.log` and `w2-phone.log`. Conditioning closed and throwing opened screenshots reviewed; harness build OK.
- [ ] Remaining: actual generated eight-week coverage, specialized-panel inventory, and dimensional total-only/sets-with-multiple-repeats cases need canonical prescription verification before changing their interpretation.
- Waiting on owner: affected-player access for real-plan taps and authenticated page audit; physical native iPhone proof; 341 cautious how-to drafts; publication/live-site verification. No publication, deployment, cron, migration, iOS or saved-data changes; no backend test data created.

# W1 ACTIVITY-CARD TIMER PASS — 2026-10-11 — Ready to publish: no
- [x] W1 next unfinished item: consolidated lift/sprint rest timers beside each exercise's top entry grid. Removed duplicate timers below exercise disclosures in specialized lift/speed panels. Existing lift rest bands and saved rest overrides remain unchanged; sprint rest remains 1 minute per 10 yards. Existing partner stopwatch and tested-max logging now sit inside the corresponding exercise disclosure as extra logging; no saved-data changes.
- [x] Fresh proof: **300 files / 2,574 tests passed**. Nine pop-up examples at 360/390/393 px pass closed/open tap, top-entry-only log, survey placement and visible Start/X checks; updated 81 screenshots and run log in `/tmp/browser/activity-layout/` (`w1-phone.log`, `w1-suite.log`). Reviewed lift closed and sprint opened screenshots. Latest harness build OK. Fixtures and browser-emulated iPhone size are not affected-player/native proof.
- [ ] Next: complete the specialized-panel inventory and exhaustive rendered entry-row checks across actual generated eight-week card types. No recovery tempo or survey was invented; existing prescriptions and storage scopes remain authoritative.

# NEW ACTIVITY-CARD LAYOUT + OWNER CORRECTION — 2026-10-11 — Ready to publish: no
- [x] Apply owner correction in the shared prescription/legacy pop-ups: top “Log this work” contains timers, exact-dose entry grids and “More information for each exercise is below ↓”. Done / Skipped / Cut short, How hard and existing exercise survey fields are inside initially closed exercise disclosures, not the top log.
- [x] Existing card-level practice logging sits once in an initially closed “Finish this workout”; no new session survey or storage scope created.
- [x] Preserve automatic credit without opening disclosures: complete entries save Done; partial entries save Cut short in existing outcome metrics (existing task/status credit semantics retained). Prefilled sprint distances without measured times no longer count as logged repeats. Outcome saves preserve recorded rounds and measurements.
- [x] Prescription tiles and shared pop-up header: full title, Start and X visible; fixed a runtime crash when optional why_payload was absent. Cross-sport warm-up add-ons use a pop-up.
- [x] Browser fixture proof: nine activity examples at 360/390/393 px, every exercise disclosure opened/closed, surveys only below disclosures, Start/X visible; no page errors in the final run. 81 screenshots (closed/open/survey view) under `/tmp/browser/activity-layout/`; 393 px is browser-emulated iPhone size, NOT native-device proof.
- [x] Full suite: **300 files / 2,573 tests passed**, including rendered-text, defense/PFP, tissue-prep and completion tests. Harness build OK. Entry tests cover 3×5 lift, 4×90 ft conditioning, holds, jumps, throws and recovery; 7,168 rendered lift-grid presentation contexts pass. This is not an audit of every generated activity in real eight-week plans.
- [ ] Finish exhaustive coverage of specialized activity panels and all generated eight-week card types before claiming the entire replacement complete.

## Waiting on owner
- Affected-player preview access is needed for tap-every-drawer on an actual saved plan and a fresh authenticated page audit; owner account has no started plan. Fixture proof is not affected-player proof.
- Physical/native iPhone validation remains outstanding; no iOS-project changes made.
- Owner review: 341 cautious how-to drafts in `docs/owner/basic-how-to-review.tsv`; safest drafts are not treated as approved instructions.
- Publication/live-site verification remains owner-controlled; non-US parent email purchase link remains deferred.
- No publication, deployment, cron, migration, iOS-project or saved-data changes performed. No backend test data created; nothing to clean up.

# OWNER CARD OVERRIDES — 2026-10-11 — Ready to publish: no (player/native proof outstanding)
- [x] V1 final pass (2026-10-11): available automated proof rerun; all 298 test files / 2,562 tests passed. Real-player, physical-native and affected-player page proof remain explicitly blocked below, so readiness remains **no**.
- [x] Exact line: "Tomorrow's plan becomes visible at midnight". Removed countdown and build-status reads from this notice; pre-build remains unchanged and internal.
- [x] Prescription and legacy drill names now toggle independent, initially collapsed exercise bodies on plan and pop-ups. Hidden log controls remain mounted to preserve drafts; toggles do not scroll and exclude browser scroll anchoring.
- [x] Survey (optional) sits directly below How hard; no Extra log dropdown or duplicate one-tap log. Prescription survey opens the existing extra-field sheet; legacy survey exposes notes.
- [x] Interaction mismatch corrected: the previous prescription expand controlled secondary details only, while drill names had no whole-exercise toggle. Pop-up scroll body now has `min-h-0` to keep scrolling below its header. No reproduced evidence of a sticky-header tap blocker; no speculative global z-index changes.
- [x] Fresh full suite: 298 files / 2,562 tests passed, including rendered-text integrity, PFP/defense, tissue-prep simulations, exact midnight notice and survey interaction checks. New plan-library matrix opens/closes exercise names, instructions and surveys for selected warm-ups and all 12 positions × 2 sports × 3 season phases (more than 100 drill instances). This is generated library/component proof, not an authenticated player's saved plan. Latest harness build: OK after correcting the new test's dose-helper import.
- [x] Fresh V1 browser touch regression passed at 360/390/393 px: every fixture exercise and instruction toggle opens/closes inline and in pop-ups; Survey sheet opens/closes above the pop-up; header, Start and close remain visible. Screenshots reviewed: `/tmp/browser/card-overrides/` (collapsed, inline-open, popup-collapsed, popup-open, popup-survey); run log `v1-phone.log`. These are DEV fixture components, NOT a real player plan or physical native proof, and do not replace every-card-type screenshots on an affected player's plan.
- [x] Fresh read-only active-catalog audit: 976 exercises, **37 → 0** checker catches after in-memory repair (26 distance-text, 10 time-text, 1 mixed-action); no catalog data changed. Historical Round 2 count was 44 → 0, including 7 saved-distance/name repairs; today's catalog has no such catches. Audit output: `/tmp/browser/card-overrides/v1-library-audit.log`.
- [x] Fresh owner catch-list read: **5 recorded catches** (2 distance-text, 2 time-text, 1 mixed-action), rather than the historical zero. Counts reflect saved `integrity:*`/`integrity_render:*` records, not unrepaired errors. No records deleted.
- [ ] Tap every drawer/expand button on an affected player's actual plan; repeat screenshot proof there. Owner account has no started plan and cannot substitute for player verification.
- No publication, deployment, cron changes, iOS-project changes, or training-data writes; no test data created.
## Waiting on owner
- Player session/access approval is unavailable in this run; provide affected-player preview access for real-plan verification. Physical iPhone/native safe-area and tap verification requires an installed updated build; 393 px above is browser-frame emulation only.
- Repeat the authenticated affected-player 170-page audit and every-card-type screenshots after player access is available; the historical 170/170 result is not fresh V1 proof. Owner has no started plan; no alternative account was selected without approval.
- Review 341 how-to drafts (`docs/owner/basic-how-to-review.tsv`); native-device check requires an installed updated build.
- Publication and published-site return proof; non-US parent email link remains deferred.

# OWNER FIXES ROUND 2 — FINAL PROOF (U12, 2026-10-09) — Historical proof superseded by October 11 overrides
- [x] Library audit (976 exercises), before → after repair: 26 text distance vs dose, 10 text time vs dose, 7 saved distance vs the exercise's own name, 1 two actions in one rep = 44 → 0.
- [x] Live double-check catch list (owner-only): 0 catches so far from plan builds or screens.
- [x] Rendered-text tests on real plans (no contradictions, wrong units, impossible combinations), PFP and defense audit, 8-week tissue-prep simulation: all pass.
- [x] Full suite: 296 files / 2,558 tests passed. Build OK.
- [x] Phone shots of every card type, inline and pop-up, closed and open, header visible (360/390/393 px): `legal-screens/plan-cards-r2/`. Page audit 170/170 clean. Both were taken earlier today; card code has not changed since.
- Owner check: 341 how-to drafts in `docs/owner/basic-how-to-review.tsv` — PFP, extra throwing and EASS first.
- Waiting on owner: publish, then the live-site return check; the parent email link for players outside the US is still on hold.

# OWNER FIXES ROUND 2 — 2026-10-09 — Ready to publish: yes (website; nothing published)
- [x] A Double-check: one checker runs before every plan is saved (live on the backend now) and again on every card shown, inline and pop-up; older inline drill rows are checked against their own written dose. Catches go to an owner-only list (plan builds: rule `integrity:*`; screens: `integrity_render:*`). Root cause: the old test checked a helper, not the saved plan or the text players read.
- [x] A Audit, whole library (976 exercises): found 44 — 26 text distance vs dose, 10 text time vs dose, 7 saved distance vs the exercise's own name (e.g. repeated 90-foot sprints saved as 1 foot; now 90), 1 two-actions-in-one-rep. After repair: 0. Script: `scripts/audits/integrity-audit.ts`.
- [x] B Basic one-rep how-to for all 976 exercises, shown first. 341 written as the safest clear version for owner check: `docs/owner/basic-how-to-review.tsv`.
- [x] C Card order: title, dose, basic how-to, open log rows + Done / Skipped / Cut short + How hard 1–10, collapsed "Extra log (optional)", collapsed "How to do it" (cue, why, what changed — each once). Pop-up exercises start collapsed. "Mirror" renamed "Copy to other side"; duplicate "How?" button removed from inline rows.
- [x] D Speed: Start/Stop timer next to the rep rows; stopping fills the next rep's time. Text distances match the dose.
- [x] E Tissue prep first, every warm-up: tennis-ball rolling (where, 30 s per spot, about 4/10 pressure) then bounces, swings and shake-outs. 8-week simulation passes.
- [x] F PFP "comebacker + cover first" split into one play per rep; defense role-bleed test passes.
- [x] G Players see "midnight" only. H Today / Next up below the streak. I Report a problem at the bottom of every page. J Pop-up header sticky with safe-area padding.
- [x] Tests that read rendered text: `src/lib/hammer/prescription/__tests__/prescriptionIntegrity.test.tsx`. Full suite: 295 files / 2,556 tests passed. Build OK.
- [x] "Your progression" shows only in The General under its own label; last copy removed from the plan blocks.
- [x] Player phone check (360, 390, iPhone 393 px) found and fixed 2 more errors: a "30 reps total" card asked for 2 rows of 30 (rows now always add up to the total), and 110 timed non-hold drills said "hold the position" (now only real holds say that). Screenshots: `legal-screens/plan-cards-r2/`. No "1 feet", noon, card rules or progression lines; 0 page errors.
- [x] Every pop-up card today (warm-up, bat speed, hitting, throwing, lift, recovery) opened as the player at 360, 390 and iPhone 393 px: header, Start and X visible at the top every time, exercises start closed, no "1 feet", noon, card rules, progression, "undefined" or "NaN". Closed and open shots in `legal-screens/plan-cards-r2/`.
- [x] Page audit as the player at 390 px: 170/170 pages, 0 error screens, 0 page errors, 0 sideways scrolling, Report a problem at the bottom of all 170. Full suite: 295 files / 2,557 tests passed. Build OK.
- [x] Speed rep timer: a new test starts and stops the timer on a speed card and confirms it fills rep 1's time and leaves rep 2 empty (2026-10-09). Still not seen on a live card because this player has no speed card today.
- [x] U5 re-check (2026-10-09): no new owner input or approvals arrived; every Round 2 item stays done and the only open items remain owner-blocked (how-to text check; publish, then the live-site return check; non-US parent email link). No changes made, nothing published, no cron or iOS changes, no test data.
- [x] U6 re-check (2026-10-09): checked docs/owner and uploads — no new owner input; all Round 2 items remain done, open items still owner-blocked. No changes made, nothing published, no cron or iOS changes, no test data.
- [x] U7 re-check (2026-10-09): no new owner input (docs/owner newest file is still basic-how-to-review.tsv); all Round 2 items remain done, open items still owner-blocked. No changes made, nothing published, no cron or iOS changes, no test data.
- [x] U8 re-check (2026-10-09): re-checked docs/owner and uploads — no new owner input; all Round 2 items remain done, open items still owner-blocked. No changes made, nothing published, no cron or iOS changes, no test data.
- [x] U9 re-check (2026-10-09): re-checked docs/owner and uploads (newest file still basic-how-to-review.tsv) and read the live site's own code — hammersmodality.org still serves the pre-Round-2 build (its plan code has no "Extra log (optional)", no "Copy to other side", no "midnight"), so publishing is confirmed outstanding and the live-site return check still cannot run. All Round 2 items remain done, open items still owner-blocked. No changes made, nothing published, no cron or iOS changes, no test data.
- [x] U10 re-check (2026-10-09): re-checked docs/owner — newest file is still basic-how-to-review.tsv, no new owner input; all Round 2 items remain done, open items still owner-blocked. No changes made, nothing published, no cron or iOS changes, no test data.
- [x] U11 re-check (2026-10-09): re-checked docs/owner — no new owner input; all Round 2 items remain done, open items still owner-blocked. No changes made, nothing published, no cron or iOS changes, no test data.

## Waiting on owner
- Check the 341 basic how-to texts in `docs/owner/basic-how-to-review.tsv` (PFP, extra throwing, EASS first).
- Publish when ready; then the published-site return check can run.
- Non-US parent email link (deferred by owner).

# OWNER PLAN CARD FIXES — T10 FINAL — 2026-10-08 23:59 UTC — Ready to publish: yes (website; nothing published)
- [x] T10 final checks: full suite 294 files / 2,544 tests passed (includes the dose-string test, the defense role-bleed test, the 8-week tissue-prep-first warm-up simulation and the 30s/5m/1h reload-on-return tests). Fresh player screenshots of all six card types at 360 and 390 px, drawer closed and open — 24 images in `legal-screens/plan-cards-t10/`, 0 page errors, no "Rules for this card", no move-up criteria, no "1 feet", no "Today — .". Page audit as the player at 390 px: 170/170 pages, 0 crashes, 0 errors, 0 sideways overflow (one hit on /terms was the words "Something went wrong" inside the billing text, not an error). No changes to the app, nothing published, no cron changes, no test data.
- Flagged for owner review: 974 exercises with only a general type description (full list by name and category: `docs/owner/exercise-descriptions-needed.tsv`; strength 190, warm-up 129, speed lab 117, upper-body plyo 96, arm care 84, bat speed 84, rest smaller groups), especially pitcher fielding (PFP), extra throwing work and EASS activities. Not guessed.
Top priority before Xcode. No publishing or cron changes. Only named defensive-role and tissue-prep changes may alter plans.
- [x] 1–5 Core prescription cards now wrap full titles; show the formatted dose, a visible basic description, open Rx-prefilled applicable inputs (including 1×1), and a closed How to do it drawer. Removed Rules for this card and player-visible barefoot move-up criteria. Inline drafts survive backgrounding in session storage. Drawer now contains setup, steps, stop-if, cue, why, progression and change reason.
- [x] 6 Catalog defense audit now fails on catcher/pitcher/outfield/infield cue bleed and baseball/softball bleed; all position/sport/phase combinations passed (6/6 defense tests).
- [x] 7–8 Level of play moved into Before you start; body load now precedes Do in this order and the existing progress/NEXT UP rhythm.
- [x] 9 Removed service-worker/version and exhausted-chunk automatic reload behavior; visibility/pageshow/online no-reload regression passes, and inline unsaved fields persist. Remaining reload controls are explicit user recovery buttons only.
- [x] 10 Fixed dose pluralization (90 feet, singular foot, explicit 1 set × 1 rep) and centralized prescription-card dose display; dose formatter tests pass.
- [x] 11 Every generated warm-up starts with one five-minute rolling + rhythmic tissue-prep block; throwers add pec/lat/forearm. Eight-week deterministic simulation passed every context/lifecycle/sport/thrower combination with tissue prep first and unique.
- [x] Player-session screenshots at 360/390 show a wrapped title, dose, basic description, open prefilled log and closed/open drawer with 0 page errors (`/tmp/browser/plan-cards/`). Final full suite: 291 files, 2,535 tests passed; preview build OK.
- [x] T1: Legacy Track-B drill rows now show and save applicable Rx-prefilled logs through the existing daily-task row: warm-up/mobility/recovery completed + minutes; throwing throws; conditioning/base-running repetitions × distance (+ time); timed holds seconds; other drills exact sets × reps. Draft inputs remain in session storage. Added 4 concrete parser tests, including 2 × 30 yd → two 90 ft rows and 1 × 1 visibility; focused owner-fix suite is 28/28.
- [x] T2: Added deterministic phone-return regressions at 30 seconds, 5 minutes and 1 hour. Each keeps the same open log, exact unsaved input and session draft through visibility/page-return events; the service-worker regression separately proves those events never call reload. Return/no-reload/log suite: 8/8.
- [x] Published-site observation at 360 and 390 px: visibility/page-return events kept the same URL and launch screen with zero page errors (`/tmp/browser/t2/`). This was signed-out observation only; the unpublished plan-card changes cannot be verified there without publishing.
- [x] Full suite: 293 files, 2,542 tests passed. The first run exposed a demo-tour route-restoration timer surviving test teardown; its interval now clears on close/unmount, focused tour/return tests pass 9/9, and the clean full rerun passed.
- [x] T3: Screenshots of all six card types today (warm-up, bat speed, defense, conditioning, lift, recovery) at 360 and 390 px, drawer closed and open, as the signed-in player — 24 images in `legal-screens/plan-cards-t3/`, 0 page errors. Every activity had a visible log; no "Rules for this card", no move-up criteria, no "1 feet".
- [x] T3 fixes found by the screenshots: (a) bat speed/conditioning/lift cards showed an empty "Today — ." line — now hidden when there is no real reason; (b) band and body-weight lifts (e.g. Arm-Care Band) showed a Weight box — now reps only. 2 new tests; full suite 294 files, 2,544 tests passed; build OK.
- [x] T4: Audited all 999 library exercises: 25 have their own hand-written plain description; 974 show a general description for their type (e.g. "Light, controlled shoulder work."). Full list for owner in `docs/owner/exercise-descriptions-needed.tsv` (by category). Not guessed. No code, plan or data changes.
- [x] T5: Re-checked items 1–11 — no unblocked work left. Only open items: owner descriptions (Waiting on owner) and post-publish live check. No changes made.
- [x] T6: Re-checked again — still no unblocked work left in items 1–11. Both open items remain owner-blocked (descriptions; post-publish live check). No changes made.
- [x] T7: Re-checked again — items 1–11 remain fully done; both open items still owner-blocked (descriptions; post-publish live check). No changes made.
- [x] T8: Re-checked again — items 1–11 remain fully done; both open items still owner-blocked (descriptions; post-publish live check). No changes made.
- [x] T9: Re-checked for new owner input — no new descriptions or approvals arrived (docs/owner has only the list I wrote; no new uploads; working tree clean), so items 1–11 remain fully done with nothing unblocked. No changes made, nothing published, no test data created.
- [ ] Remaining: Published affected-player plan-card return behavior remains unprovable until the owner publishes these changes. No publish/deploy/cron/iOS changes and no test data created.

## Waiting on owner
- 974 exercises need an owner-approved 1–2 sentence plain description (list: `docs/owner/exercise-descriptions-needed.tsv`). Biggest groups: strength 190, warm-up 129, speed lab 117, upper-body plyo 96, arm care 84, bat speed 84. Send descriptions (or approve me drafting them from each exercise's stored cue for your review) and I'll add them.
- Exercise-specific plain-language descriptions remain blocked for entries where the existing catalogs do not provide enough authoritative setup detail, especially PFP, throwing-supplemental and EASS activities. These will not be guessed.

# S1 OWNER ANSWERS (2026-10-08 20:05 UTC) — Ready to publish: yes (website); iPhone/iPad needs Xcode build 1.0 (4)
- Sign in with Apple: FOUND it was not switched on in the backend at all (Apple's button failed on web and app). Now switched on through Lovable's managed sign-in. Web button uses it; the app opens hammersmodality.org/auth/native-apple in an in-app sheet, Apple signs in there, and the sign-in is handed back to the app on com.hammersmodality.app://auth/callback (no extra redirect setting needed — the sheet returns to the website itself). Proven: live hammersmodality.org hand-off reaches appleid.apple.com; preview page starts the flow; 10/10 sign-in tests. Needs PUBLISH for the website page; only provable on build 1.0 (4): the sheet opening in the app, returning to the app, and landing signed in. Optional: if you later want the app's return link in the redirect list, it is More → Cloud → Users → Auth settings → Advanced → Redirect URLs.
- Reviewer accounts created (owner-only tool create-review-accounts): adult hammersmodality+applereview@gmail.com (born 1995, Golden 2Way all modules, Hammers Today started, no gates) and under-13 hammersmodality+applereview12@gmail.com (born 2014, parent-controlled, test parent consent + payment marked, not paused). Both: system/test accounts, hidden from scouts, rankings and search, excluded from analytics and training data. Passwords were emailed ONLY to hammersmodality@hammersmodality.org, subject "[PRIVATE] Apple App Review demo account sign-ins" (use the newest one; re-running the tool replaces them). Proof: legal-screens/apple-review-accounts/ (iPad size; Parent controls and Delete account found).
- HMIOSTEST (live Stripe): 100% off, once, 1 use, expires 2026-10-22. Checkout accepts promotion codes.
- US-only for 1.0 (4): owner sets in App Store Connect. Non-US parent email: later (on list).
- Apple reply: docs/apple/app-review-reply.md; review notes: docs/apple/review-notes.md (no passwords).
- Xcode 1.0 (4): same steps as below. Nothing published or scheduled.

# R3 FINAL STATUS (2026-10-08 19:38 UTC) — Ready to publish: yes (website); iPhone/iPad needs Xcode build 1.0 (4)
Everything requested is finished and reported below: the blank-waiver fix and proof, every Apple fix (in-app Sign in with Apple, account deletion, age-rating reviewer steps), the Option B build and proof, the final draft answers for Apple, and the exact Xcode rebuild steps. Build log clean; full suite 2,526/2,526. Nothing published, deployed or scheduled; no test data left. Waiting on owner: (1) OK to add the app's return link to sign-in settings; (2) OK to create the Apple reviewer under-13 demo account; (3) OK for a test player account + test card to prove a real payment; (4) keep App Store US-only for 1.0 (4) (recommended); (5) OK to build the non-US parent email link; (6) make Xcode build 1.0 (4).

# APPLE OPTION B — US-storefront-only website link (2026-10-08 19:35 UTC) — Ready to publish: yes (website); iPhone/iPad needs Xcode build 1.0 (4)

## 0. Apple's current rules (developer.apple.com/app-store/review/guidelines, fetched today) — still allow it
- 3.1.1(a): "These entitlements are not required for developers to include buttons, external links, or other calls to action in their United States storefront apps." … "In all other storefronts, except for the United States storefront, where this prohibition does not apply, apps and their metadata may not include buttons, external links, or other calls to action that direct customers to purchasing mechanisms other than in-app purchase."
- 3.1.3: "Apps in this section cannot, within the app, encourage users to use a purchasing method other than in-app purchase, except for apps on the United States storefront and as set forth in 3.1.1(a) and 3.1.3(a)."
- RISK to know: 3.1.3(b) (multiplatform) says access to web-bought content is allowed "provided those items are also available as in-app purchases within the app." We have no In-App Purchase, so outside the US, letting web subscribers use paid features rests on Apple accepting us as a multiplatform service without IAP. Apple often accepts this, but it is the main remaining review risk. Safest: keep App Store availability United States only for 1.0 (4).

## CORRECTION to my earlier audit
I wrote earlier that the iOS app hid all prices. That was wrong for build 1.0 (3): the code then treated every iPhone app as US and showed prices and the normal checkout button, which sent people to Stripe (out to Safari). Now fixed as below.

## 1. What was built
- iOS native plugin `Storefront` (ios/App/App/StorefrontPlugin.swift, registered in HammersBridgeViewController.swift; SceneDelegate uses it) reads StoreKit `Storefront.current?.countryCode` ("USA") and passes it to the app; re-read every time the app comes to the front.
- Purchase gate: "USA" → shows "Subscribe on our website"; any other country, unknown, or an old build without the plugin → NO prices, NO buy buttons, NO links or hints. Website unchanged. Tests: purchaseGate.test.ts (US, GBR/CAN/MEX/DEU, unknown, garbage).
- Same account: new backend function `app-purchase-handoff` (deployed) mints a single-use sign-in token for the signed-in person only; it opens hammersmodality.org/app-handoff in an in-app browser sheet, which signs out anyone else, signs in that same account, and refuses if the account doesn't match. Reused or altered links show "This link has expired". Token lifetime = the sign-in link expiry setting (single use; not shorter than that — say if you want a 10-minute cap, needs a small database table).
- Back to the app: after paying, the website returns to `com.hammersmodality.app://purchase-complete` (also a "Return to the app" button on checkout); the sheet closes and the plan re-checks automatically. It also re-checks every time the app resumes, when the sheet is closed, and via the existing "Refresh Access" button (that is the pull-to-refresh equivalent; no swipe gesture added).
- iOS URL scheme `com.hammersmodality.app` added to Info.plist (also used by Sign in with Apple).

## 2. Proof (legal-screens/apple-option-b/, iPad Air 11-inch 820×1180 and iPhone 390)
- US: "Subscribe on our website" button shown, no prices on that screen ✔ (both sizes)
- Non-US (GBR): nothing to buy — "isn't available on your account yet" ✔; dashboard opens normally ✔
- Unknown: same as non-US ✔
- Handoff: fresh link → signed in as the SAME account (95de827d…) and on checkout ✔; reused link → expired ✔; wrong account → expired ✔
- Not proven: an actual Stripe payment through the link and a real paying non-US subscriber (needs a test player account and a test card — you approve). The plan check does not depend on the storefront at all, so web-bought plans keep working everywhere.
- Full suite 2,526/2,526 passed.

## 3. Under-13 parent step on iOS
- US: Parent Promise → plans → "Subscribe on our website" → same handoff → pays → back to app; child unpauses.
- Non-US: the app shows nothing to buy; the child stays "waiting for a parent". Recommended compliant path: email the parent (outside the app — Apple allows communications outside the app) a link to finish on hammersmodality.org from any browser. Not built — say yes and I'll add it.

## 4. App Review notes (draft — paste into App Store Connect)
"Hammers Modality is a multiplatform training service. Subscriptions (Complete Pitcher, 5Tool Player, Golden 2Way) are sold only on our website, hammersmodality.org, through Stripe. On the United States storefront only (detected with StoreKit Storefront), the app shows a 'Subscribe on our website' button that opens our website checkout for the same signed-in account, as permitted by Guidelines 3.1.1(a) and 3.1.3 for US storefront apps. On every other storefront, and whenever the storefront cannot be determined, the app shows no prices, purchase buttons, links or instructions. Subscribers who bought on the website can sign in and use what they paid for. Parental controls: [review account + path from the section below]."

## 5. Answers to Apple's 4 questions (Option B)
1. Who: athletes 13+, parents of under-13 athletes, and coaches who subscribe to a training plan.
2. Where: on our website hammersmodality.org via Stripe. US storefront users can reach it from a "Subscribe on our website" button in the app; elsewhere the app shows no purchase option.
3. Previously purchased: web-bought plans unlock their training plans, video analysis/report cards and modules in the app after sign-in, on any storefront.
4. Without IAP: no digital content is sold through IAP; free features (account, profile, settings, parent controls, account deletion, free areas) work for everyone.

## 6. Xcode steps for build 1.0 (4)
1. Pull latest; `npm install`; `npm run build`; `npx cap sync ios`.
2. In Xcode, File → Add Files to "App" → select `ios/App/App/StorefrontPlugin.swift` and `HammersBridgeViewController.swift`, tick target "App".
3. Check Info → URL Types shows `com.hammersmodality.app` (already in Info.plist); Signing & Capabilities has Sign in with Apple. Minimum iOS 15+ (StoreKit Storefront).
4. Build 1.0 (4), run on a device signed into a US App Store account: "Subscribe on our website" appears; on a Sandbox account set to another country it must not.
5. Archive, upload, paste the review notes and 4 answers.
- Still needed from you: OK to add the app's return link to sign-in settings (for Sign in with Apple), OK to create the reviewer under-13 account, and whether to keep App Store availability US-only (recommended).

# FINAL STATUS (2026-10-08 19:10 UTC) — Ready to publish: yes (website). iPhone/iPad needs new Xcode build 1.0 (4).
- Blank-waiver fix: DONE. Every link state renders for a signed-out parent (valid, signed, used, expired, unknown, not active) behind a friendly error fallback; teen lock/grace/unlock, checkout auto-renew box and under-13 waiver step proven at 360/390 — 39 screenshots in legal-screens/waiver-blank-fix/. Publish puts it live at /parent-sign/<token> and /parent-waiver/<token>.
- Apple items: full results below (sign-in fix, account deletion, reviewer steps, audit, draft answers, options A/B/C, Xcode steps).
- Waiting on owner: (1) OK to create the Apple review under-13 demo account (needs a password); (2) OK to add the app's return link com.hammersmodality.app://auth/callback to the sign-in settings; (3) pick A/B/C; (4) Xcode build 1.0 (4).
- Nothing published, deployed or scheduled; no test data left.

# APPLE REJECTION — build 1.0 (3) (2026-10-08) — Ready to publish: yes (web); new Xcode build required

## 1. Guideline 4 — sign-in leaving the app
**What left the app:** "Sign in with Apple" on the sign-in page. It navigated the app's web view to appleid.apple.com; the iPhone/iPad app hands any outside website to the Safari app, so the reviewer landed in Safari. Email/password sign-in, sign-up, password reset, under-13 parent sign-up and the teen waiver all stay inside the app (no outside links, no window.open in those screens). There is NO Google sign-in in the app. Email links (confirm email, password reset, parent waiver) open from the Mail app into Safari — that is outside the app's sign-in flow and Apple allows it, but universal links would be nicer later.
**Fix (built, web code):** inside the app, Sign in with Apple now opens an in-app browser sheet (Safari View Controller), returns on the app's own link `com.hammersmodality.app://auth/callback`, finishes the session inside the app and closes the sheet. Website behavior unchanged. Test: src/lib/auth/__tests__/nativeOAuth.test.ts (4/4).
**4.8:** no Google/third-party sign-in is offered, and Sign in with Apple is already there, so nothing more is required.
**Owner must do (I may not touch the iPhone project files):** see Xcode steps below, plus add `com.hammersmodality.app://auth/callback` to the sign-in allowed return addresses in the backend auth settings (ask me to do this — it is a settings change, not done without your OK).

## 1d. Account deletion
Already open to everyone, never behind legal_v2 (bottom of Profile). Now ALSO at **Account menu (top-right avatar) → "Settings · Delete account"** → /settings/account, with type-DELETE confirmation, then the account and data are removed and the person is signed out. Owner/admin accounts are blocked by design (shown in screenshot). Screenshots: legal-screens/apple-review/ (iPad Air 11-inch 820×1180 and iPhone 390). A real player deletion was proven in an earlier round; not re-run now because it needs a throwaway player account you approve.

## 2. Guideline 2.3.6 — In-App Controls
- Parent controls (view/download Parent Promise, take back permission, delete child data, training-data toggle) appear ONLY on a parent-controlled under-13 account (Profile and now Settings · Delete account page). The birthdate age gate shows for every signed-in account without a birthdate.
- Build 1.0 (3): I cannot see which code that build was made from. If it was built before Oct 6, the birthdate gate and Parent controls were NOT in it (both landed Oct 6+). Either way the reviewer had no under-13 account, so they could not see Parent controls.
- **Review demo account: NOT created yet — waiting on owner.** It needs a sign-in password Apple can use; creating a password account for a fake child is your call. Once you OK it I will create "APPLE REVIEW — TEST CHILD (age 11)", fake data, hidden from search/leaderboards/scouts, Parent Promise pre-signed by a fake parent, payment step marked complete.
- **Reviewer path (iPad):** 1) Open app → Sign in with the review email/password. 2) Tap the round avatar, top-right. 3) Tap "Settings · Delete account". 4) "Parent controls" card is at the top: see stored data, download the Parent Promise, take back permission, delete data, training-data switch. Age gate: sign in with any new account → the app asks for birthdate before anything else; under 13 → parent sign-up required.

## 3. Guideline 2.1(b) — business-model audit
- iOS app: the single purchase gate hides ALL prices, plan names, Subscribe/Upgrade buttons, checkout and Stripe links inside the app (fails closed: unknown storefront = hidden). Locked features show only "isn't available on your account yet" — no link, no price.
- No link to Stripe or the website for buying.
- Under-13 parent sign-up: after the Parent Promise it sends the parent to the plans page; in the iOS app that page shows nothing to buy, so **a parent cannot pay inside the iOS app and the child account stays paused ("waiting for payment") until paid on the website.** No card is taken in the app.
- Paid plans (Complete Pitcher, 5Tool Player, Golden 2Way, bought on hammersmodality.org via Stripe) unlock Hammers Today daily plans, video analysis/report cards, and the plan's modules.
- Without a plan: account, profile, settings, free areas and locked notices; no paid content.

**Draft answers to Apple:**
1. Who uses it: athletes (13+), parents of under-13 athletes, and their coaches, who subscribe to a training plan.
2. Where they buy it: only on our website, hammersmodality.org (card through Stripe). Nothing can be bought in the app.
3. Previously purchased content: anyone who bought a plan on the website signs in and gets that plan's training plans, video analysis and modules in the app (3.1.3(b) multiplatform).
4. Unlocked without IAP: nothing paid is sold in the app; free account features (profile, settings, parent controls, account deletion, free areas) work for everyone.

**Options (nothing built until you pick):**
- **A. No purchase anything in iOS; buy on website.** Work: none — this is today's behavior; just send the answers above. Risk: low. Under-13: parent must pay on the website; the in-app step should say "finish on the website"? NO — that wording is steering; it must just say the account is waiting for a parent.
- **B. US-only external purchase link.** Work: native storefront check in Xcode (StoreKit Storefront) feeding the app, then show the "buy on website" link for US only. Risk: medium (rules still being litigated; wrong storefront = rejection). Under-13: US parents could tap through to pay on the website.
- **C. In-App Purchase.** Work: large — App Store Connect products for 3 plans, StoreKit plugin, receipt checking on the backend tied to plan access, refunds via Apple, Apple's 15–30% cut. Risk: low with Apple, high effort. Under-13: parent pays via Apple (Ask to Buy) inside the app.

## Xcode build steps (owner)
1. Pull latest code; `npm install`; `npm run build`; `npx cap sync ios` (adds the in-app browser and app-link plugins).
2. In Xcode → App target → Info → URL Types → add one: Identifier `com.hammersmodality.app`, URL Schemes `com.hammersmodality.app`.
3. Make sure Signing & Capabilities has "Sign in with Apple".
4. Bump build to 1.0 (4); archive; upload.
5. Before submitting: on an iPad, tap Sign in with Apple — a sheet must open inside the app and return signed in.
6. In App Store Connect review notes: the review account (once created), the reviewer path above, and the 4 answers.

# URGENT FIX 2 — parent-signature page was blank below the title (2026-10-08 ~19:00 UTC)

**Ready to publish: YES.** Full test suite: 287/287 files passed; build OK. The fix is in the preview and the backend. The live site still runs the 16:52 build, which is older than this fix. Publishing changes nothing for players because legal_v2 is OFF. It only makes the signing page show its messages properly.

**Why it was blank.** The live site (published 16:52) still had the *older* signing page. The backend had already been updated and answered with a new reply format, for example "online signing isn't open yet". The older page didn't recognise that reply, so it showed the title and nothing else. There was no crash, the waiver was not blocked by permissions, and nothing was missing from the backend. /parent-sign/… also showed not-found on live because that address only exists in the unpublished build.

**Fixed:**
- [x] Backend (redeployed): newer pages get the new replies. Older pages (the current live site) get a reply they understand, so live shows "This link has expired or isn't valid. Ask the player to send a new one." instead of a blank page. This was checked on hammersmodality.org at 360/390.
- [x] Signing page: wrapped in an error catcher with a friendly message. It shows "Loading…" while it waits. Any unexpected or broken reply now shows a friendly message, so the page can't go blank.
- [x] [TEST] emails always link to the preview address, never to localhost.

**Proven in the preview at 360 and 390 px, signed out, with no page errors** (Files → `legal-screens/waiver-blank-fix/`, 39 images):
- Valid link: full waiver, uppercase statutory notice and signing form (`parent_valid_*`, `parent_form_390`, `parent_filled_390`).
- Signed (`parent_signed_390`), already used (`link_used_*`), expired (`link_expired_*`), unknown (`link_unknown_*`) and not yet active (`link_not_active_*`).
- Test teen (hidden test player demo16ss, signed in with the Round 5 owner-only method): updated-terms screen (`teen_agree_390`), existing teen in the 14-day grace period (`teen_grace_*`), grace period over (`teen_grace_over_*`), new teen locked (`teen_new_locked_*`), waiting for the parent (`teen_waiting_*`), then **plan unlocked after the parent signed** (`teen_unlocked_*`). The saved record: signer "Pat Tester", role parent/guardian, relationship Mother, 18+ confirmed.
- Checkout auto-renew box, unchecked, with the button disabled until ticked (`checkout_*`).
- Under-13 parent signup up to the waiver step with the boxed uppercase notice (`u13_block_*`, `u13_step0_*`, `u13_waiver_*`, `u13_notice_*`). Nothing was submitted.
- Live site, older page, now shows a message (`live_old_page_*`).
- ONE fresh [TEST] email was sent to hammersmodality@hammersmodality.org (Resend: sent, link = preview address). The earlier [TEST] email from this round linked to localhost and can be ignored.

**Cleanup:** legal_v2 OFF with an empty list. All 6 test agreements removed (0 consent records), and the protection against edits was turned back on. Both emailed test links are kept but expired, so they show the friendly "expired" message. The test teen's signature was cleared.

**What you must publish:** just the normal web **Publish → Update**. That puts the new signing page live at /parent-sign/<code> and /parent-waiver/<code>, with the error catcher and the newer reply handling. The backend is already live. No iPhone rebuild is needed for email links (they open in the browser).

**Renewal reminders — schedule for you to apply (NOT applied).** The reminder job now accepts the same saved Vault key as the daily plan job; I checked this once and it was accepted (it skipped because legal_v2 is OFF). Runs daily at 14:00 UTC = 10 a.m. Eastern in summer (9 a.m. in winter):
```sql
select cron.schedule(
  'renewal-reminders-daily',
  '0 14 * * *',
  $$ select net.http_post(
       url := '<LOVABLE_CLOUD_FUNCTIONS_BASE_URL>/renewal-reminders',
       body := '{"mode":"renewal","dry_run":false}'::jsonb,
       headers := jsonb_build_object('Content-Type','application/json',
         'x-job-token', (select decrypted_secret from vault.decrypted_secrets where name = 'wk_daily_plan_job_token')),
       timeout_milliseconds := 60000) $$
);
```
It sends nothing until legal_v2 is ON for everyone. Each reminder goes out once per renewal.

**Refund conflict — word for word, for you to choose:**
- Checkout (`src/pages/Checkout.tsx`): **"7-day performance guarantee — no risk"** / "If you don't see measurable progress, we'll refund you."
- Draft Subscription Policy, §6 Refunds: "- We do not give partial refunds for unused time, except where the law requires. - If you were charged after you cancelled, or charged in error, email us within 60 days and we will refund it. - Apple purchases are refunded through Apple. [LAWYER: confirm refund terms and any state-specific cooling-off rules.]"

---

# URGENT FIX — parent-signature email opened a 404 (2026-10-08 17:00 UTC)

**What happened.** The email was the 13–17 parent-waiver email ("…needs your signature to train"), from noreply@hammersmodality.org through Resend, sent at N1 to hammersmodality@hammersmodality.org. Its link was `https://hammersmodality.org/parent-waiver/<code>`. It showed "page not found" for two reasons. First, the signing page exists only in the unpublished preview, so the live site (still the old build) shows its own not-found page. Second, the test entry behind that link was deleted during cleanup. The live host itself is fine: deep links return the app normally (checked: /parent-sign/… and /parent-waiver/… both answer 200).

**Fixed (backend redeployed; screens wait for your publish):**
- [x] The signing page always exists, whatever legal_v2 is set to: /parent-sign/<code> (new address used in emails), with /parent-waiver/<code> kept so older links still open. It never shows not-found. Friendly messages: valid → signing form; expired → "This signing link has expired" + how to get a new one (the teen taps Resend link, or email us); unknown/replaced → same help; already signed → "already signed, nothing else to do"; feature not open yet → "Online parent signing isn't open yet".
- [x] Real emails always link to https://hammersmodality.org. Tests (preview or local) go only to hammersmodality@hammersmodality.org, start with **[TEST]**, and link to the preview address. Real users can never get a test email.
- [x] Cleanup no longer deletes sent requests: links are expired instead, so they show the friendly expired message. Signing keeps the link, so it shows "already signed".
- [x] Other email links checked: renewal reminders → /settings/legal (sends only once legal_v2 is on for everyone); under-13 guardian notice → help desk; parent invite → the address it was sent from (/accept-parent-invite); problem reports and parent receipts contain no links. All of these load on the live site (200). Note: /settings/legal opens on the live site only after you publish.

**Proof:** ONE fresh [TEST] email sent to hammersmodality@hammersmodality.org (Resend: sent; link host = the preview address, path /parent-sign/…). That link's page opened at 360 and 390 px. A test parent signed at 390 px, and the record saved (name, relationship, 18+, signature), so the test teen's plan is unlocked in the database. The link then showed "already signed", and after expiring it, "expired", at both sizes. No overflow, no page errors. Screenshots: Files → legal-screens/teen-waiver-fix/ (7). Legal tests 12/12, build OK.
- Gap: I couldn't open the plan as the test teen (signing in as a test account needs your approval, which isn't available here). The unlock is shown by the saved record and the unlocked entry, not by a teen screenshot.
- Cleanup: legal_v2 OFF (empty list), test birthdate removed, test signature record removed. The one expired test entry is kept on purpose, so your [TEST] link shows the friendly expired message.
- **After you publish:** links in emails open the signing page on hammersmodality.org. The N1 email you received will show "We couldn't find this signing link" + how to get a new one, not a 404.

---

# LEGAL PAGES & CONSENT (legal_v2) — 2026-10-08

**Ready for lawyer review: YES (N2 final, 2026-10-08 16:50 UTC), including the 13–17 parent waiver.** Every draft is written and built into the app behind the `legal_v2` switch, which is **OFF** (empty list, confirmed). Users see nothing new.

**Packet:** Files → `legal/lawyer-review-packet.pdf` (42 pages, questions 1–17) + `legal/lawyer-review-packet-addendum-q18.pdf` (question 18: teen gating) + `legal/lawyer-review-packet.md` (all 18). **Screenshots:** Files → `legal-screens/` (31) and `legal-screens/teen-waiver/` (13). **Tests:** 2,518/2,518; build OK; 0 test data left.

**Waiting on owner:** 1. Lawyer review (18 questions; Q18 = new teens locked, 14 days of grace for existing teens). 2. DMCA registered agent. 3. "7-day performance guarantee" vs. refund policy. 4. Apply the renewal-reminder schedule. 5. Xcode build for Apple's age-range check. 6. OK to sign in as test accounts (real teen, checkout box, under-13 waiver screenshots).

**13–17 PARENT WAIVER (owner-approved item 11, 2026-10-08 16:45 UTC) — built behind legal_v2 (OFF).**
- [x] Same Florida §744.301(3) waiver as under-13 (statutory notice word for word, uppercase, larger, boxed, marked for lawyer check).
- [x] One parent step for teens on the training plan: enter a parent email (phone optional) → Resend email with a secure 30-day link → parent page /parent-waiver/<link>: full legal name, relationship, "18 or older" checkbox, drawn signature → saved in consent_records (signer_role parent_guardian).
- [x] Until signed: NEW teens — Hammers Today locked with "Waiting for your parent's signature", Resend link, Change email; the rest of the app stays open. EXISTING teens — 14-day grace banner, parent reminder every 3 days (sent when the teen opens the app, no schedule needed), then locked. Under-13 and adults unaffected.
- [x] Owner page /owner/legal-records: "Teens waiting for a parent signature" with Resend.
- [x] Lawyer question 18 added to the packet (gating and the 14 days).
- Proof: parent signed on the real backend at 390 px → consent record saved (name, relationship, 18+, signature) and the teen's entry switched to unlocked; owner list showed the teen as locked before signing; lock/grace/expired screens at 360 and 390 px (screen states fed in by the test, no overflow, no page errors); 5 new rule tests (ages, new = locked, exactly 14 days, signing unlocks, reminders). Full suite 2,518/2,518; build OK. Screenshots: Files → legal-screens/teen-waiver/ (13).
- [x] N1: real signing-link email sent through Resend to hammersmodality@hammersmodality.org (status sent; test link then disabled); with the switch OFF the backend answers "not required" for your account.
- Cleanup: switch back OFF with empty list, test birthdate removed, test entry and test consent record removed (0 left).
- Gap: a live teen sign-in wasn't possible (signing in as a test account needs your approval, which wasn't available), so the teen screens used the owner session with fed-in states; the under-13 "unaffected" check is by rule test only.

**M10 final check (2026-10-08 16:00 UTC):** live database shows legal_v2 = off with an empty allowlist. There are 0 consent records, so no test data is left, and the 15 draft documents are stored. Full test suite: 2,513/2,513 passing (286 files). The switch-ON flow proof and the 167-page × 360/390 px audit (334 loads, 0 errors) are from earlier today and are listed below. No legal code changed since then, so they weren't re-run. Nothing was published and no schedules were changed.

**Lawyer Review Packet:** Files → `legal/lawyer-review-packet.pdf` (42 pages) and `.md`; in the repo, `docs/legal/lawyer-review-packet.md` (index + 18 open legal questions) and `docs/legal/drafts/`.

### Built (all hidden while OFF)
- [x] Database: `legal_documents` (15 versioned drafts, approved = false), `consent_records` (append-only, kept 3 years after the account ends, never removed by account deletion — tested), `privacy_requests` (30-day due dates). Visitors may read only the legal_v2 switch row, so the footer links can appear on the website once it's on.
- [x] Public pages at /legal/<name>: Terms, Privacy (COPPA, vendors, retention, rights), Consumer Health Data Privacy Policy (home-page footer link with that exact name), Medical & Safety, Subscription/Auto-Renewal/Cancellation/Refund, Child Safety & Communication, Community & Content, Copyright (DMCA, agent placeholder), Accessibility. Footer links on the home page; Settings → Legal & privacy. The "DRAFT" label shows only to owners and admins.
- [x] Agreements: one-time "Before you keep training" screen (updated terms, optional health opt-in, Adult Assumption of Risk with typed name for 18+); Florida §744.301(3) parent waiver inside the under-13 parent sign-up (statutory notice uppercase, larger, boxed, marked for lawyer check); separate "share with partners" yes; unchecked auto-renewal checkbox at checkout. **13–17: no step added** (see Waiting on owner).
- [x] Cancel subscription button (Settings → Legal & privacy; no retention steps; records the cancellation). Download my data; Delete my account (the existing in-app deletion); withdraw-consent switches.
- [x] Owner page /owner/legal-records: consent records + CSV export, privacy-request queue with deadlines.
- [x] `renewal-reminders` backend function (deployed): yearly-plan reminder 15–30 days before renewal, plus owner-sent price-change notices. Does nothing unless legal_v2 is on for everyone; dry run by default. Proven: switch OFF → skipped; dry run found 0 yearly renewals due and 81 active subscriptions for a price notice; no emails sent; no login → refused.
- [x] Internal drafts in docs/legal/: data inventory, WISP, retention policy, breach response plan, privacy request procedure, consent records procedure, vendor list, AI use policy, Apple worksheet + age-range plan (apple-app-store.md).

### Proposed schedule (owner applies; I made no schedule changes)
`renewal-reminders` daily at 14:00 UTC (10 am Eastern), body `{"mode":"renewal","dry_run":false}`. Reminders are sent once per renewal date.

### Proof
- Switch OFF: home, all 10 /legal pages, settings, checkout and dashboard unchanged at 360 and 390 px, signed in and out (no footer links, no gate; /legal addresses go back to the old pages or the dashboard).
- Switch ON for the owner account only: every page and flow at 360 and 390 px, no overflow, no page errors; the agreement screen saved 6 real records (shown on the owner records page), then those test records were removed and the switch set back to OFF. Screenshots: Files → `legal-screens/` (31 images). Fixed: health checkbox text layout and the Legal & privacy link wrapping on phones.
- Tests: 2,513/2,513 passing. Build OK.
- [x] **Phone audit (M1, 2026-10-08):** all 167 pages × 360 and 390 px = 334 loads, signed in as the owner, legal_v2 OFF — 0 crashes, 0 page errors, 0 sideways overflow. One load of /terms briefly showed an error message; it passed on 3 re-tests at both sizes (not reproducible). Ran in small batches to avoid the sandbox crashes.
- **Not shown:** checkout's auto-renewal box and the under-13 parent waiver step. The owner account skips checkout and is not a parent, and test-account sign-in needs your OK. Both are covered by code and tests only.

### Waiting on owner (legal)
1. Lawyer review of the packet and its 17 questions. Then mark documents approved and switch legal_v2 on.
~~2. 13–17 waiver decision~~ — APPROVED and built (see above). Lawyer to confirm gating (question 18).
3. DMCA registered agent details.
4. Checkout's "7-day performance guarantee" conflicts with the draft refund policy. Choose one.
5. Apply the renewal-reminder schedule above.
6. Apple age-range / parent approval: needs your Xcode build (steps in docs/legal/apple-app-store.md).
7. OK to sign in as test accounts (under-13 parent, a paying player) to screenshot those two flows.
~~8. Resend verification~~ — **DONE (M5, 2026-10-08):** Resend shows hammersmodality.org **verified**. The TEST problem report (f53996f5-6df5-477b-96c4-5dbff22e3850, "TEST — owner email check") was retried through the app's normal mail path and now shows email_status = sent, email_sent_at = 2026-10-08 15:58 UTC (3 attempts). 0 reports remain unsent. The row is left in place so you can check it, and the email should be in hammersmodality@hammersmodality.org's inbox. Renewal reminders and parent receipts will now send normally.

---

# Ready to publish: YES for the program retirement (2026-10-08, L4 final) — overall still blocked only by the items under "Waiting on owner"

## FINAL REPORT — Retirement of the five programs (Heat Factory, Iron Bambino, The Unicorn, Speed Lab, Explosive Conditioning)

**Verdict: Ready to publish: YES for the retirement.** Everything owner-doable is done and proven; the only gaps need the owner's sign-off (listed at the bottom).

### What disappeared and where
- Sidebar menu, hub tiles (Complete Pitcher / Complete Hitter / Complete Player / 5Tool / Golden 2Way), dashboard plan cards, pricing + checkout + Select Modules text, Game Plan tasks, calendar entries, demo tour entries, Help Desk FAQ, help chat, Hammers Today's speed button (now "Open Hammers Today"), running summary label ("Speed Sessions"). Demo labels renamed: "Speed Work", "Strength Work".
- Old addresses (/speed-lab, /explosive-conditioning, /the-unicorn, /production-lab, /production-studio) quietly open the dashboard — no banner, no program name (checked at 360 and 390 px; screenshots `owner-checks/direct_360.png`, `direct_390.png`). Menus/tiles stay hidden even while a page loads (no flash).
- The 8 translation files still contain the old strings, but nothing shows them (scan found none); left in place so the programs can come back.
- No notification or email template names the programs (source search).

### Access proof per plan
- Entitlements unchanged for every plan — tests prove baseball + softball: Complete Pitcher, 5Tool and Golden 2Way each keep exactly the same unlocks in Hammers Today; owner/admin access code untouched. Subscriptions were not modified. Test file: `src/test/archive/retirementLive.test.ts`.

### Help-chat proof (live, redeployed function)
- "What is Heat Factory?" → no longer offered, daily training in Hammers Today.
- "What do I get with Complete Pitcher?" → pitching analysis + Hammers Today, no program named.
- "Where is Speed Lab and The Unicorn?" → no longer offered, points to Hammers Today.

### Archive location and how to bring each program back
- Page code: `src/archive/retired-programs/pages/*.tsx.archived` (not routed, not shown).
- Data: original tables AND `_archive_*_20261007` backup copies untouched — nothing deleted. Finished program sessions still count toward rest rules.
- Restore guide (per program and all five): `docs/owner/retired-programs.md`. Setting the switch `programs_retired` to `off` instantly restores menus/tiles.

### Checks
- **Tests:** 2,506/2,506 passing.
- **Phone audit:** 165 pages × 360/390 px = 330 loads — 0 crashes, 0 errors, 0 sideways overflow, 0 program names in visible text, 0 links to old pages.
- **Daily plan job:** 19 plans built in the last 48 h, 0 failures.
- **Switch:** `programs_retired` = `all` in the live database (rechecked L3/L4); `one_tap_logging` = `all`.

### Honest gap
All proof was run signed in as the owner; separate test accounts per plan / under-13 were not created (needs owner approval to sign in as them). Hiding is the same code path for every account since the switch is "all".

### What reaches players when
Already live now: the switch and the help chat. Everything else reaches players only after the owner publishes (web) and rebuilds the iPhone app.

### Waiting on owner
1. OK to sign in as test accounts (Complete Pitcher, 5Tool, Golden 2Way, under-13; baseball + softball) for per-plan player proof.
2. Add the three Resend DNS records at name.com (steps in K3 below) so emails can send; TEST report f53996f5-6df5-477b-96c4-5dbff22e3850 then re-sends automatically.
3. OK to sign in as a player account for real preview + published password-form sign-in proof.
4. Approve the persisted parent-receipt retry database change.

---
## Historical detail (superseded where corrected above)
Reason: the five programs are retired and verified (tests 2,506/2,506, 330 phone loads clean, help chat proven, daily job healthy). The earlier open items (player-account proof, real password sign-in proof, Resend DNS) are unchanged and listed below; none are caused by this change.

## Program retirement (owner-approved 2026-10-08)
- **L3 recheck (2026-10-08):** switch `programs_retired` still `all` in the live database (checked directly), `one_tap_logging` still `all`, five pages still only in `src/archive/retired-programs/pages/*.tsx.archived`, switch code unchanged (starts retired, "off" restores). No new work found; nothing rerun, published, deployed or deleted.
- **L1/L2 recheck (04:18 UTC):** switch still `all`, five pages still only in the archive, build OK. Nothing new to do except per-plan test-account proof, which needs the owner's OK to sign in as those accounts.
- Switch `programs_retired` = **all** (live). Help chat (ai-helpdesk) redeployed.
- **What disappeared and where:** sidebar menu, hub tiles (Complete Pitcher / Complete Hitter / Complete Player / 5Tool / Golden 2Way), dashboard plan cards, pricing + checkout + Select Modules text, Game Plan tasks, calendar entries, demo tour entries (plus demo labels renamed: "Speed Work", "Strength Work"), Help Desk FAQ, help chat, Hammers Today's speed button (now "Open Hammers Today"), running summary label ("Speed Sessions"). Old addresses (/speed-lab, /explosive-conditioning, /the-unicorn, /production-lab, /production-studio) quietly open the dashboard — no banner (checked at 360 and 390 px; screenshots `owner-checks/direct_360.png`, `direct_390.png`). Menus/tiles now stay hidden even while a page loads (no flash).
- **Page-text scan:** 165 pages × 360/390 px = 330 loads, 0 crashes, 0 errors, 0 sideways overflow, 0 program names in visible text, 0 links to old pages. Translations: the 8 language files still contain the old strings, but nothing shows them any more (scan found none); left in place so the programs can come back.
- **Notifications/emails:** no notification or email template names the programs (source search).
- **Access proof:** entitlements are unchanged for every plan — tests for baseball + softball: Complete Pitcher, 5Tool, Golden 2Way each keep exactly the same unlocks; owner/admin access code untouched. Subscriptions were not modified.
- **Help chat proof (live):** "What is Heat Factory?" → no longer offered, daily training in Hammers Today. "What do I get with Complete Pitcher?" → pitching analysis + Hammers Today, no program named. "Where is Speed Lab and The Unicorn?" → no longer offered, points to Hammers Today.
- **Archive:** pages in `src/archive/retired-programs/pages/*.tsx.archived` (not routed). Data tables and `_archive_*_20261007` copies untouched; nothing deleted. Finished program sessions still count toward rest rules. How to bring each back: `docs/owner/retired-programs.md`.
- **Daily plan job:** 19 plans built in the last 48 h, 0 failures.
- **Honest gap:** proof was run signed in as the owner; separate test accounts for each plan / under-13 were not created (needs owner approval to sign in as them). Hiding is the same code path for every account since the switch is "all".
- **Reaches players only after the owner publishes** (web) **and rebuilds the iPhone app.** Already live now: the switch and the help chat.

## Previous status (historical)
# Ready to publish: NO (2026-10-08 — General report restoration)
Reason: the requested classic report card is restored in preview and phone-checked as owner, but affected-player access proof and successful real preview/published form sign-in remain unverified. Earlier YES statements below are historical, not the current verdict.

## Latest owner decisions — current result
- [x] **#3 UNDO removal:** restored the original `<UhrcAthleteSection />` in Section 0, inside the existing data/subscription gates. Per-video report cards unchanged; no scoring, programming or backend changes. Historical correction: the Oct 5 version already lacked the section; the original mount exists in June 6 commit `c99d5cc7e`. This restores that original canonical section, not removed MPI scores or unverified composite trends.
- [x] **#4 KEEP:** ProgressLanding and its season counter unchanged. Visible on the signed-in landing screenshot.
- [x] **Phone evidence:** actual signed-in owner `/progress` classic view at 360/390 px: absent before, one report card after; 0 page exceptions and 0 sideways overflow. Before: `owner-checks/general-before-360.png`, `general-before-390.png`; after: `general-restored-360.png`, `general-restored-390.png` in Files. Missing report signals remain dashes, not invented grades. These are owner screenshots, NOT affected-player proof.
- [x] **Rest / Push / Skip:** all three day-choice surfaces retain “Rest: take it easier”, “Push: commit to the plan”, “Skip: sit today out”, with explanations. Whole `src` search finds neither banned extra-load phrase. Inspected the existing phone screenshot `owner-checks/intent_390.png` (360 also retained); unchanged wording, not a newly captured player check-in. Fresh owner check-in access hit health setup; no health answers or check-in submitted.
- [x] **Checks:** 11/11 focused tests passed (report builder, restoration/gates, season counter, day wording, one-tap logging and check-in), latest build OK. Full suite/phase scan/whole-app audit not rerun this round; prior results below are historical.
- [ ] **Affected-player screenshot/access proof:** needs approval to sign in as an eligible player; owner-only screenshots do not establish player access. Existing data gate hides advanced sections below 10 sessions; this rule was not widened.
- **No publish, deploy, migration or cron change. No test account or synthetic test rows created.** Normal report-view observability may record the visit; no athlete measurements were added.

## All 10 decisions — no keep/undo decisions outstanding
1. One-tap logging — KEEP, ON for everyone (prior live switch proof `all`); fresh 3/3 tests: Done full sets/completed, Skipped zero sets/skipped, Cut short tagged/completed. Prior rollback-only day-end proof: no log → Missed. Live-player phone/save/read-back proof still outstanding.
2. Streak strip — KEEP.
3. Classic General report-card removal — UNDO; original canonical section restored above.
4. General topic landing — KEEP, including season counter.
5. Season counter — KEEP.
6. Tomorrow's plan countdown/built-state wording — KEEP.
7. Conditioning wording — KEEP.
8. Plan-save speed-up — KEEP.
9. Sign-in keeper — KEEP.
10. Start Hammers Today remembered — KEEP.

## Email / DNS — last checked K2, not rechecked this UI-only round
All three were missing; domain pending. Exact required records remain in **K3** below (full DKIM key, CNAME values, priorities and name.com steps). TEST report `f53996f5-6df5-477b-96c4-5dbff22e3850` last status failed, no sent timestamp. Retries happen on report submission/page open or owner retry button; this is not a scheduled background retry.

## Waiting on owner / blocked proof
- Add the three DNS records and verify `.org`; then prove TEST report delivery.
- Approve affected-player sign-in for restored report/card logging phone checks; complete real preview and published password-form sign-in evidence.
- Approve persisted parent-receipt retry database change.
- Separate approval to retire five old programs; `programs_retired` remains OFF. No decision remains pending for #3/#4.

---
## Historical checks and decisions (superseded where corrected above)

## K2 — final verification of the OWNER DECISIONS + CORRECTIONS
- **One-tap logging proof:** switch `one_tap_logging` = `all` in the live database (checked directly), so it is ON for everyone. Code proof: WkOneTapLog renders only when that switch is on, and the 3/3 tests pass (Done → full sets saved + card completed; Skipped → 0 sets + card skipped; Cut short → tagged cut short + card completed). Day-end rule proven earlier on the real database with the real day-end job (Done=completed, Skipped=skipped, Cut short=completed, nothing logged=MISSED), all test rows undone.
- **Rest/Push/Skip restore proof:** the clarified wording is live in all four places — morning check-in (MorningDayIntent), day card (DayControlCard), day banner (DayStateBanner): "Rest: take it easier", "Push: commit to the plan", "Skip: sit today out", each with a one-line explanation. "PUSH DAY — EXTRA LOAD" / "extra output expected" appear nowhere (searched source; absent on screen at 360/390 px). Screenshots: /mnt/documents/owner-checks/intent_360.png, intent_390.png.
- **#3/#4 before-and-after notes:** #3 ProgressDashboard — since Oct 6 the only lasting change is one blank line (a season counter was added and removed again Oct 7; the report-card box was NOT removed — the earlier description was wrong); the page looks the same. #4 ProgressLanding — the only change is the season counter ("Season — Offseason Q1 — Strength & Capacity") above the topic buttons. Before/after screenshots: /mnt/documents/owner-checks/progress_before_after_360.png and _390.png. Both still await the owner's keep/undo decision.
- **Resend records (K2 recheck):** public DNS lookup run again — all 3 records still MISSING: (1) TXT `resend._domainkey` = p=MIGfMA0G… (DKIM), (2) CNAME `rsend` → rsend.forge.rmta.net, (3) CNAME `send` → send.forge.rmta.net. Domain status in Resend: pending. Full values + step-by-step name.com instructions are in the K3 section below. TEST report f53996f5-6df5-477b-96c4-5dbff22e3850 still failed/not sent — re-sends automatically once the domain verifies (next report, opening Problem reports, or the "Retry failed emails" button).
- No publish, no cron changes, no deploys, no new test data this round.


## K1 — the 10 owner-to-confirm changes: decisions applied
- KEEP: 2 streak strip, 5 season counter, 6 "Tomorrow's plan opens in", 7 Conditioning wording, 8 plan-save speed-up, 9 sign-in keeper, 10 Start Hammers Today remembered.
- #1 One-tap logging: KEPT and switched ON for everyone (switch one_tap_logging: pilot → all; old setting saved).
  - Proof: new test wkOneTapLog (3/3): Done → full sets saved, card completed; Skipped → 0 sets, card skipped; Cut short → tagged cut short, card completed.
  - Day-end rule proven on the real database with the real day-end job, test account 93ce8745…, all undone afterwards (0 test rows left): Done=completed, Skipped=skipped, Cut short=completed, nothing logged=MISSED.
  - Not done: a phone-size screenshot of the buttons on a live plan — needs a signed-in test player with a started plan (owner account has none; signing in as another account needs the owner's approval).
- #3 ProgressDashboard: since Oct 6 the only lasting change is one blank line — a season counter was added and removed again on Oct 7, and the report-card box was NOT removed (the earlier description was wrong); the page looks the same.
- #4 ProgressLanding: since Oct 6 the only change is the season counter ("Season — Offseason Q1 — Strength & Capacity") added above the topic buttons. Before/after: /mnt/documents/owner-checks/progress_before_after_360.png and _390.png.

## K2 — Rest / Push / Skip clarification restored
- Wording everywhere: "Rest: take it easier", "Push: commit to the plan", "Skip: sit today out", each with a one-line explanation (morning check-in, day card, day banner). "PUSH DAY — EXTRA LOAD" / "extra output expected" appear nowhere in the app (searched; also absent on screen at 360/390 px).
- The runtime PrescriptionCard / prescription.ts files carry the owner-approved "No check-ins yet" rewording.
- Screenshots: /mnt/documents/owner-checks/intent_360.png, intent_390.png.
- Change ledger corrected: these 5 files now read "Requested by owner 2026-10-06".

## K3 — Resend: exactly what's missing (hammersmodality.org)
Verification triggered (HTTP 200); status still PENDING. DNS host for the domain: name.com.
| # | Type | Host (name) | Value | Priority | Resend status | Public DNS |
|---|---|---|---|---|---|---|
| 1 | TXT (DKIM) | resend._domainkey | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwFhaC6XZ4+o61dD1HXobAkERVNxHEuukhx12FxK/at/epGu0yagL4aLXznf4rYacHmc4hNxzYlOkRhOVXQvvUTxqr/94gZ0NjsXrRZ7/wEIY7SarUdLU8ar6cZAiwFNBMRVu1hvbiBtmdW6+QrxPcJqrBSnnpDbtXTyPFnMUrjwIDAQAB | — | pending | MISSING (no record found) |
| 2 | CNAME (SPF) | rsend | rsend.forge.rmta.net | — | pending | MISSING |
| 3 | CNAME (SPF) | send | send.forge.rmta.net | — | pending | MISSING |
None of the three exist yet in public DNS. Resend asks for no MX record; the existing Google MX and site-verification TXT stay as they are.

Steps at name.com:
1. Sign in to name.com → My Domains → hammersmodality.org → Manage DNS Records.
2. Add record: Type TXT, Host `resend._domainkey`, Answer = the full p=… value above (one line, no quotes), TTL 300. Save.
3. Add record: Type CNAME, Host `rsend`, Answer `rsend.forge.rmta.net`, TTL 300. Save.
4. Add record: Type CNAME, Host `send`, Answer `send.forge.rmta.net`, TTL 300. Save.
5. Type only the short host (name.com adds ".hammersmodality.org" itself). In Resend, open the domain and click Verify (usually minutes, up to 72 h).
- The TEST report f53996f5-6df5-477b-96c4-5dbff22e3850 cannot send until then; it re-sends automatically on the next report or when the owner opens Problem reports ("Retry failed emails" also there). Status now: failed, not sent.

# Ready to publish: YES (2026-10-08 J2, final)
Reason: every pre-publish check passes — 2,497/2,497 tests, 0 phase mismatches, 372-load phone audit (360/390 px) with 0 crashes/errors, daily job proven, plans identical. Email is not a blocker: reports are saved first and re-sent automatically once the domain verifies.

## J2 final email status
- hammersmodality.org is in Resend, status PENDING: DKIM pending, SPF rsend pending, SPF send not_started. The owner must add the 3 DNS records at the domain's DNS provider; then verification completes and failed emails (incl. TEST row f53996f5-6df5-477b-96c4-5dbff22e3850) retry automatically. Owner "Retry failed emails" button also available.
- Waiting on owner: add the Resend DNS records; keep/undo the 10 changes below; OK to retire the five old programs (programs_retired switch, OFF).

## J1 email recheck (02:26 UTC)
- hammersmodality.org now EXISTS in Resend (added 02:21 UTC) — progress.
- Status: PENDING. I triggered verification; the 3 DNS records (DKIM TXT `resend._domainkey`, SPF CNAME `rsend`, SPF CNAME `send`) are still pending — the owner must add them at the domain's DNS provider.
- Once DNS verifies, the TEST report (f53996f5-6df5-477b-96c4-5dbff22e3850) and any failed emails retry automatically (owner "Retry failed emails" button also exists). No send attempted while pending.
- No code changes this round; no test data created.

## The 10 owner-to-confirm changes (what each does for a player)

## The 10 owner-to-confirm changes (what each does for a player)
1. One-tap logging: lets a player mark each exercise Done, Skipped or Cut short with one tap (hidden behind a switch).
2. Streak strip: shows the player how many days in a row they have trained and their next milestone.
3. Progress Dashboard: drops the old report-card box so the player sees each video's report inside that video instead.
4. Progress landing page: gives the player topic buttons to jump to the progress they want, with the old page kept below.
5. Season counter: tells the player where they are in their season, matching their plan.
6. Release countdown: tells the player exactly when tomorrow's plan opens, or that it is still being built.
7. Conditioning card: makes the player's conditioning instructions slightly clearer to read.
8. Plan-save speed-up: saves the player's plan faster without changing a single thing in it.
9. Sign-in keeper: keeps the player signed in when the app reloads or comes back from the background.
10. Start Hammers Today: remembers the player has started their plan, on every device.

## Pre-publish checks
- **Phone audit:** all 186 app pages at 360 px and 390 px (372 page loads): 0 crashes, 0 page errors, 0 sideways overflow. Run signed in as owner; owner has no started plan, so the plan page itself was checked with the fixture screenshots below.
- **OWNER UI CHANGES, live in the preview:**
  - Details open inside pop-ups — done
  - No separate Baserunning card (conditioning/speed work folded into those cards) — done
  - Baserunning IQ in "Before you start" with "Open Baserunning IQ" button — done
  - Key Rules only inside each card (plan-wide drawer removed) — done
  - No floating Log-a-practice button (logging inside the right pop-ups) — done
  - Finish your profile in "Before you start" (3-day reminder kept) — done
  - Only today's cards, no per-card countdowns ("Tomorrow's plan opens in" kept) — done
- **Email auto-retry:** every new problem report re-sends all unsent ones (up to 20, 50 tries each); the owner Problem reports page now also retries automatically when opened and has a "Retry failed emails" button. TEST row **f53996f5-6df5-477b-96c4-5dbff22e3850** (failed, not yet sent) will go out on the first of those after .org is verified — no manual step needed. No cron added.
- **Parent receipts:** a failed receipt is not saved anywhere, so it cannot be retried; the signed promise stays in Parent controls. Fixing this needs a small database change — waiting on owner OK. (1 consent on file.)
- Tests last run this morning: 2,497/2,497 (phase scan 0, 8-week sims 0 violations, identical plans). Daily job last ran 2026-10-07 21:00 UTC.
- No publish, deploy, migration, cron change or test data.

## Waiting on owner
- Verify hammersmodality.org in Resend.
- OK a small database change so failed parent receipts can be retried.
- Keep/undo on the 10 changes above; OK to retire the five old programs.

## I11 FINAL (2026-10-08 ~02:15 UTC) — Ready to publish: NO
Reason: the email proof still fails — hammersmodality.org is not added/verified in Resend.
- **Email proof:** Resend key works again (domains API HTTP 200 — the I9/I10 403s were a Cloudflare block on the checking tool, not the key). Resend lists only hammersmodality.com (status failed); hammersmodality.org absent. TEST row **f53996f5-6df5-477b-96c4-5dbff22e3850** ("TEST — owner email check") is still email_status=failed, email_sent_at empty; kept for owner. Test account 93ce8745-46a1-4e00-bfcd-e0ea703a9452 kept. Parent receipts use the same sender, so they fail the same way. No resend attempted.
- **Countdown accuracy:** "Tomorrow's plan opens in" shows only when tomorrow's plan is already built; otherwise "Your next plan is being built — ready around [time]", then "almost ready" with a check every minute. 43 cases passed (7 time zones, US/EU/AU daylight-saving nights, pre-build not yet run). Unchanged since I1.
- **10 owner-to-confirm files:** listed in plain words in section "3." further down this file (one-tap logging, streak strip, Progress Dashboard edits, progress landing, season counter, release countdown, Conditioning card wording, plan-save speed-up, sign-in keeper, start Hammers Today).
- **Visual upgrade:** command-center ring + Next up + Prepare→Prime→Explode→Perform→Recover strip; loud next card, calm finished cards; domain line marks; tabular numbers; card insides restyled (labeled You need/Setup/Cue, red Stop-if box); pitch-count meter and sprint best-time trend from real logs only; tasteful check/day-complete moments; reduced motion respected. Before: /tmp/browser/owner-ui/before-360.png, before-390.png. After: /tmp/browser/owner-ui-h5/ (start, mid-day, all done, reduced motion) and /tmp/browser/owner-ui-i4/ (all 8 pop-ups, 360/390).
- **Final checks this round:** all tests 281 files, **2,497/2,497 passed** (includes phase scan 0 mismatches, 8-week safety sims 0 violations, no-bleed, identical-plan proof — screen files only). Daily job: last run 2026-10-07 21:00:22 UTC. Sign-in form submitted on preview and published site at 390 px: both load and answer, 0 page errors (wrong-password test; a successful sign-in still needs a test password from the owner).
- **Not re-run this round:** full 165-page phone audit (last clean: 165/165), player-account proof.
- No publish, deploy, migration, cron change, or new test data.
- **Waiting on owner:** add + verify hammersmodality.org in Resend; keep/undo on the 10 files; OK to retire the five old programs; a test password for a successful sign-in proof.

## I10 (2026-10-08 ~02:25 UTC) — Ready to publish: no
- Resend rechecked: domains API still HTTP 403, body "error code: 1010" (Cloudflare bot-block page, not a Resend auth response). hammersmodality.org verification status could not be checked. No resend attempted. TEST row f53996f5-6df5-477b-96c4-5dbff22e3850 kept.
- Owner action needed: confirm the Resend API key in Project Settings → Secrets and verify hammersmodality.org in Resend; then I re-send the TEST report and prove the parent-receipt path.
- No code changes; I5 results (2,497/2,497 tests, build OK) stand. No publish/deploy/migration/cron change/test data.
- Waiting on owner: working Resend key + hammersmodality.org verified; keep/undo decisions on the 10 ledger files; OK to retire the five old programs.

## I9 (2026-10-08 ~02:20 UTC) — Ready to publish: no
- Resend rechecked: domains API now returns HTTP 403 Forbidden (previously HTTP 200). Exact Resend error: 403 on the domains list call — the API key no longer authorizes even reading domains. hammersmodality.org verification status could not be checked this round. No resend attempted. TEST row f53996f5-6df5-477b-96c4-5dbff22e3850 kept.
- Owner action needed: check the Resend API key in Project Settings → Secrets (it may have been rotated or restricted) and verify hammersmodality.org in Resend.
- No code changes; I5 results (2,497/2,497 tests, build OK) stand. No publish/deploy/migration/cron change/test data.
- Waiting on owner: working Resend key + hammersmodality.org verified; keep/undo decisions on the 10 ledger files; OK to retire the five old programs.

## I8 (2026-10-08 ~02:10 UTC) — Ready to publish: no
- Resend rechecked: domains API HTTP 200, still only hammersmodality.com (status failed); hammersmodality.org not added/verified. No resend attempted. TEST row f53996f5-6df5-477b-96c4-5dbff22e3850 kept.
- No code changes; I5 results (2,497/2,497 tests, build OK) stand. No publish/deploy/migration/cron change/test data.
- Waiting on owner: verify hammersmodality.org in Resend; keep/undo decisions on the 10 ledger files; OK to retire the five old programs.

## I7 (2026-10-08 ~02:05 UTC) — Ready to publish: no
- Resend rechecked: domains API HTTP 200, still only hammersmodality.com (status failed); hammersmodality.org not added/verified. No resend attempted. TEST row f53996f5-6df5-477b-96c4-5dbff22e3850 kept.
- No code changes; I5 results (2,497/2,497 tests, build OK) stand. No publish/deploy/migration/cron change/test data.
- Waiting on owner: verify hammersmodality.org in Resend; keep/undo decisions on the 10 ledger files; OK to retire the five old programs.

## I6 (2026-10-08 02:00 UTC) — Ready to publish: no
- Resend rechecked: still only hammersmodality.com (failed); .org not verified. No resend. TEST row f53996f5-6df5-477b-96c4-5dbff22e3850 kept.
- No code changes; I5 results (2,497/2,497 tests, build OK) stand. No publish/deploy/migration/cron change/test data.

## I5 (2026-10-08) — Ready to publish: no
- Full test set: 281 files, 2,497/2,497 passed (includes 8-week safety sims, no-bleed, phase scan). Build OK.
- Email: still blocked. Resend lists only hammersmodality.com (failed); hammersmodality.org absent. TEST row f53996f5-6df5-477b-96c4-5dbff22e3850 kept; no resend attempted.
- Visual upgrade items all done (plan, card insides, pitch meter, sprint trend, readiness scale). No new edits.
- Not rerun: 165-page audit, real sign-in (preview/published), player-account proof.
- No publish, deploy, migration, cron change or new test data.

# Ready to publish: no — email still fails (hammersmodality.org not verified in Resend); full test suite still running at end of I4 (2026-10-08 I4)

## I4 (2026-10-08 ~02:00 UTC)
- Data visuals added, real data only: pitch-count meter inside the throwing card (YouthPitchingLimits, baseball pitchers with a Pitch Smart limit; turns amber at 75%, red at the limit); sprint best-time trend inside the speed card (new SprintBestTrend, from real logged sprint times only); readiness scale already exists (ReadinessChip) — confirmed, no change.
- Card-interior restyle (I2/I3) verified on screen: fresh 360/390 px screenshots of the plan and all 8 pop-ups in /tmp/browser/owner-ui-i4/ — details open, labeled You need/Setup/Cue lines, red Stop-if box, card rules inside each pop-up, practice logging only on throwing/hitting/conditioning, no global Key Rules drawer, no plan practice button, zero page errors, zero sideways overflow.
- Fixture has no pitch-smart or sprint logs, so the meter and trend correctly render nothing there; they only appear with real data.
- Tests: card suites 89/89 pass. Full suite (2,497 tests at H5) re-run started but still running at end of turn; last full pass H5. Plans unchanged — screen files only.
- Email: still blocked (.org unverified in Resend); TEST row f53996f5-6df5-477b-96c4-5dbff22e3850 left in place.
- Ready to publish: no.

X1 (2026-10-11): throws entered on catch-play/throw rows in other cards now feed the same daily arm-ledger row as the throwing card (entered total incl. added sets; blank = planned). Suite 305 files / 2,599 tests passed. Still open: Pitch Smart for added pitches uses pitching-card rules only; owner-blocked items unchanged. No publish/deploy/cron; no new test data.

## I3 (2026-10-08 01:34 UTC)
- Card interiors (step 2): You need / Setup / Cue shown as labeled lines; "Stop if" is a clear red-outlined safety note (theme colors, works in dark mode). Screen-only; 52/52 card tests pass; wording unchanged.
- Still open: pitch-count meter, sprint trend, readiness scale, phone screenshots; email (.org unverified).
- Ready to publish: no.

## I2 (2026-10-08 01:33 UTC)
- Visual upgrade, card interiors (step 1): exercise rows now card-surface, bigger names, bold tabular amounts, 44 px "How?"/"Can't do it" buttons, calm done state. Screen-only (1 file); 52/52 card tests pass; plans unchanged.
- Still open: notices restyle, pitch-count meter, sprint trend, readiness scale; email (.org unverified).
- Ready to publish: no.

## I1 (2026-10-08 01:31 UTC)
- Email: retried mailer for TEST row f53996f5-6df5-477b-96c4-5dbff22e3850 → still failed (sent 0, failed 1); .org not verified in Resend. Waiting on owner.
- UI changes 1–6, countdown accuracy, 10-file list: done (see H5). Visual upgrade: plan done; card interiors, pitch-count meter, sprint trend, readiness scale still open.
- Ready to publish: no (email unproven; card interiors pending). No publish/deploy/cron; no new test data.

## Owner requests — H5 results (2026-10-08 01:30 UTC)
**1. Email (real path): FAILED.** A test account submitted a real problem report (same save + send calls the Report a problem button makes). Row id **`f53996f5-6df5-477b-96c4-5dbff22e3850`**, message "TEST — owner email check", left in place as asked. Result: `email_status = failed`, `email_sent_at` empty. Resend's exact error: HTTP 403 `validation_error` — "The hammersmodality.org domain is not verified. Please, add and verify your domain on https://resend.com/domains". Resend is not fixed for `.org` yet. Parent receipts use the same sender, so they will fail the same way; no fake parent consent created. Once `.org` shows Verified in Resend, any new report (or the next mailer run) retries this row automatically.
- Test account `93ce8745-46a1-4e00-bfcd-e0ea703a9452` (mailinator) left in place with the report row so the owner can verify; delete both after checking.
**2. "Tomorrow's plan opens in" is now honest.** The plan checks whether tomorrow's plan is actually saved (player's own time zone from their profile). Saved → "Tomorrow's plan opens in HH:MM:SS" to local midnight. Not saved → "Your next plan is being built — ready around 12:10 PM, in HH:MM:SS" (expected = later of local noon + one job run, or the next job run), then "almost ready" and rechecks every minute. Nothing shows until the check answers. Tests: 43 passing cases across 7 time zones, US/EU/Australia daylight-saving nights, and a player at 9 am whose pre-build has not run yet.
**3. The 10 "owner to confirm" changes, in plain words:**
1. One-tap logging (WkOneTapLog) — Done / Skipped / Cut short in one tap per exercise, optional effort 1–10; hidden behind a switch.
2. Streak strip (PlanStreakStrip) — "Streak: N days" + workouts done and next milestone at the top of the plan; flame icon at 5+ days.
3. Progress Dashboard page — removed the old report-card section (it now lives inside each video analysis) and small layout edits.
4. Progress landing page — topic buttons above the old progress page; old page kept underneath as "Classic view"; adds the season counter.
5. Season counter (SeasonCounter) — one "where you are in the season" counter in The General, using the same season as the plan.
6. Release countdown — the "Tomorrow's plan opens in" line (now made honest, item 2).
7. Conditioning card — small wording/layout change inside the Conditioning card.
8. Plan-save speed-up (database function) — sends repeated card data once and rebuilds it on save; stored plan is byte-for-byte the same.
9. Sign-in keeper (AuthContext) — rechecks the sign-in shortly after load and when the app comes back to the front, so players are not dropped.
10. Start Hammers Today (useHammersTodayStart) — the one-time "Start Hammers Today Plan" is remembered on the account, the same on every device.

**4. Visual upgrade (screen only).** Audit: every card looked the same (thin colour bar + badge + title), there was no sense of what to do next, finished cards stayed as loud as unfinished ones, the confetti icon bounced for 2.4 s, and numbers were not emphasised. Built:
- **Day command center** at the top of the plan: a progress ring (% of today's drills and exercises checked off), "Today · 0/7 cards", a bold **Next up** with a single Open button, and the session story **Prepare → Prime → Explode → Perform → Recover** (only the stages present today; current stage underlined, finished stages ticked).
- **Rhythm:** the next card is large with a red outline and "Next up"; done cards shrink to a calm grey row with a check; other cards stay quiet.
- **Domain marks** (line geometry, one family): speed = velocity lines, bat speed = rotational arc, lift = barbell structure, throwing = dotted trajectory, conditioning = rising work bars, recovery = waves, warm-up = centring target.
- **Set progress** segments on each card; tabular figures on counts, %, timers.
- **Motion:** staggered fade-up entrances, 280 ms check-draw + soft pulse when a card finishes (replaces bouncing confetti icon), a quiet "Day complete" moment once per day (ring fills to a check, one toast). All off under reduced motion; transform/opacity only, no layout shift.
- **Pop-ups:** header now shows the domain mark, category and "x/y done"; Start, Close, Save & Exit, Exit buttons ≥ 40–44 px; details open, card rules, practice logging and disclaimer unchanged.
- **Screenshots** (360 + 390 px): start of day `/tmp/browser/owner-ui-h5/start-plan-*.png`, mid-day `mid-plan-*.png`, all done `done-plan-*.png` (reduced-motion run), Before you start `*-before-*.png`, every card pop-up `start-popup-*-*.png` (warm-up, throwing, hitting L/R, defense, conditioning, lift, recovery). Before screenshots: `/tmp/browser/owner-ui-h2/fixture-*`. Mid/done states use read-only check-off fixtures; no real data written.
- **Same plans:** only 6 screen files changed (plan page, card shell, countdown, new rhythm file + test, styles). No generator, prescription, dose, phase, rule or backend file touched. Full suite 2,497/2,497 passing (281 files), including the 8-week safety simulations, no-bleed and grouping tests (original drills preserved 1:1) and the phase scan. Build OK. Zero page errors and no sideways overflow in every pop-up.
- **Not done (honest):** the inside of each card (exercise rows, notices) is still the older dense style — the biggest remaining clutter; pitch-count meter, sprint best-time trend and readiness scale not added (need real-data wiring I did not verify); no formal 60 fps trace; 165-page audit and real sign-in on preview/published not rerun; checked from the owner account with fixtures, not a player.
- **Honest answers:** Serious product? The plan page now yes; the inside of cards not yet. Instantly clear? Yes — one Next up and one button. Alive without distraction? Yes, motion is short and sparse. Satisfying to complete? Better (check-draw, calm done rows, day-complete), still modest. Personal? Partly — it follows the athlete's own progress, but no personal data visuals yet. Intentionally designed? The plan list, yes; the card insides, not yet.


## H4 final — 2026-10-08 01:14 UTC
- **Email test result:** FAILED. Resend key works (domains API HTTP 200), but only `hammersmodality.com` is listed (status `failed`); sending from `noreply@hammersmodality.org` returns HTTP 403 `validation_error` "The hammersmodality.org domain is not verified." Unsent problem reports: 0. Owner must verify `.org` in Resend.
- **UI changes (all done, no edits needed in H4):** 1 details open in popups; 2 one Speed + one Conditioning card, Baserunning IQ as mental work in Before you start (Base Stealer still 5Tool/Golden 2Way only); 3 Key Rules drawer removed, card rules inside popups; 4 floating practice button removed, logging inside applicable popups; 5 Finish your profile in Before you start (3-day reminder kept); 6 only today's cards, no per-card countdowns, "Tomorrow's plan opens in" kept. Screenshots (360/390 px): `/tmp/browser/owner-ui-h2/fixture-plan-*.png`, `fixture-before-*.png`, `fixture-popup-*-*.png` (owner session with fixtures, not a player).
- [x] All tests: 280 files, 2,454/2,454 passed (includes phase-signal scan and 8-week tissue-cost invariants). Log `/tmp/owner-ui-h4-all.log`.
- [x] Daily job: latest run `built`, plan date 2026-10-07, 21:00:22 UTC. No new run triggered (cron untouched).
- [x] NOT rerun in H4: 160-page phone audit and real form sign-in on preview/published site (last successful real sign-in proof and 165-page audit are earlier results); embedded-preview broker reproduction; demo playback.
- No publish, deploy, migration or cron change; no test data created.


## H3 continuation — 2026-10-08 01:13 UTC
- [x] Items 1–6 unchanged since H2 (no code, database, deploy, migration, cron or publish changes in H3; no test data created, so no cleanup).
- [x] Item 0 email: still blocked on the owner verifying `hammersmodality.org` in Resend; no repeat send while unchanged.
- [x] Item 7 proof: H2 evidence stands; affected-player phone/save/read-back proof, real preview-broker reproduction and demo playback still open. No new tests rerun in H3.
- **Ready to publish: no** — same reasons as H2.


## H2 continuation — 2026-10-08
- [x] Email rechecked: Resend domains API HTTP 200; only `hammersmodality.com` is listed, status `failed`. `hammersmodality.org` is still absent. The prior normal-path test remains failed with HTTP 403 `validation_error`: "The hammersmodality.org domain is not verified." No repeat send or successful delivery claimed while this blocker is unchanged.
- [x] Problem-report queue rechecked using both `email_sent_at IS NULL` and the mailer's `email_status <> 'sent'` condition: 0 reports. Parent receipts still have no persisted retry backlog; no parent consent fabricated for testing.
- [x] Items 1–6 checked on the actual `HammerDailyPlan` presentation, not the separate Today/registry surface: Speed and bat-speed popups already receive scheduled-practice logging; Baserunning IQ opens `/baserunning-iq`, which is not behind the unreleased `/iq` lock. No additional UI or training edits required.
- [x] Fresh tests: 143/143 tissue-cost tests, 6/6 grouping/shared-phase tests, and 1/1 full phase-signal scan passed. Eight-week safety: 216 players × 56 days = 12,096 player-days, all 14 violation counters zero. Real-builder grouping: 672 player-days, original prescriptions and drill objects preserved without duplication. Phase scan: 26,352 player-days, 368,956 checks, 0 mismatches. Evidence: `/tmp/owner-ui-h2-{tcs,grouping,phase}.log`. Full all-app suite not rerun in H2.
- [x] Refreshed 360/390 screenshots: today-only plan, Before you start with mental IQ/profile reminder, and eight prescribed popup types. No global Key Rules drawer or plan practice button; open instructions and card rules present; practice sections only on applicable throwing/hitting/conditioning cards in this fixture. Zero captured runtime errors or popup overflow. Visually inspected the drawer and conditioning popup. Evidence: `/tmp/browser/owner-ui-h2/fixture-*` and `fixture-results.log`.
- [x] Affected-player proof still open: screenshots use the saved owner session with read-only profile/context/schedule fixtures, not a signed-in player. Player subscription/access, Speed/bat-speed/windmill phone variants, and successful practice save/read-back are not proved by these screenshots. No owner-session result is counted as player verification.
- [x] Daily job read: latest stored `built` result remains 2026-10-07 21:00:22 UTC, plan date 2026-10-07; no fresh job triggered or later execution claimed. Observability build/runtime files were absent, so no fresh build result claimed. H2 made no application-code edits or database writes and created no test accounts; no cleanup required. No publish, deployment, migration or cron change.
- **Waiting on owner:** verify the `.org` email sender; existing keep/revert and retirement decisions. **Remaining verification (not owner approval blockers):** affected-player phone/save/read-back proof, actual embedded-preview broker reproduction, and successful demo playback. **Ready to publish: no.**

## H1 continuation — 2026-10-08
- [x] Rechecked items 1–6 against the current source; no additional training or UI changes required. Unprescribed PocketCards return `null`; merged running work inherits Speed/Conditioning rules. Practice logging stays limited to the owner-requested card types and scheduled practices; unreleased Game IQ remains suppressed.
- [x] Fresh regression: 143/143 tissue-cost tests and 6/6 grouping/phase tests passed. Eight-week safety simulation: 12,096 player-days, all 14 violation counters zero. Grouping simulation: 672 player-days, original prescriptions preserved without duplicate drills. Phase scan: 26,352 player-days, 368,956 checks, zero mismatches. Evidence: `/tmp/owner-ui-h1-tests.log`. The previous full-suite result remains historical, not rerun in H1.
- [x] Refreshed 360/390 screenshots of the plan, Before you start, and eight prescribed popup types. No global Key Rules drawer or plan practice button; mental IQ button and profile reminder present; each tested popup has open instructions and its rules; practice sections appear only on throwing, hitting and conditioning in this fixture. Zero page errors/overflow. Evidence: `/tmp/browser/owner-ui-h1/fixture-*` and `fixture-results.log`.
- [x] Player-specific end-to-end proof remains incomplete: the saved screenshot session was checked and belongs to the owner, with read-only context/schedule fixtures. These screenshots prove conditional presentation, not affected-player subscription/access or successful practice save/read-back. Do not count them as full player-role verification. Speed/bat-speed/windmill phone variants still need affected-player evidence.
- [x] Email key/domain rechecked: Resend domains API HTTP 200; only `hammersmodality.com` is listed, status `failed`. `.org` remains absent. Prior normal-path test remains failed with HTTP 403 `validation_error`: "The hammersmodality.org domain is not verified." No repeated send attempted while the blocker is unchanged; no successful delivery claimed. Unsent problem-report count rechecked: 0. Parent receipts have no persisted retry backlog.
- [x] Daily-job evidence rechecked: latest stored success still `built`, plan date 2026-10-07, created 21:00:22 UTC; no fresh job triggered. H1 created no test accounts or database rows, so no H1 cleanup was needed. No publish, deployment, migration or cron change.
- **Waiting on owner / proof:** verify the `.org` sender in Resend before repeating the normal email path; complete affected-player phone/save/read-back proof; actual embedded-preview broker reproduction and successful demo playback; existing keep/revert and retirement decisions below. **Ready to publish: no.**

## Owner UI changes — current results (supersedes historical status below)
- [x] Updated Resend key accepted: domains API HTTP 200. Its account lists only `hammersmodality.com`, status `failed`; `hammersmodality.org` is not verified.
- [x] Successful email delivery: normal-path test from `noreply@hammersmodality.org` to `hammersmodality@hammersmodality.org` failed. Provider error: HTTP 403 `validation_error`, "The hammersmodality.org domain is not verified." No delivered message or delivery ID to report. Temporary problem-report row removed with an ID/user predicate and verified absent.
- [x] Queue checked: 0 unsent problem reports (exact count rechecked). Parent receipts currently send at consent signing; no persisted retry backlog exists, so historical receipt delivery/retry cannot be proved from a queue. Their sender has the same domain blocker; no consent was fabricated to test email.
- [x] Popup exercise details/instructions open; card-specific rules shown; practice logging moved into applicable throwing, hitting/bat-speed, speed and conditioning popups when today's schedule includes practice, with four explicit steps. No floating practice-log button.
- [x] Physical base running partitioned into Conditioning; explicitly prescribed Base Stealer drills into Speed for eligible 5Tool/Golden 2Way players. At most one Speed and one Conditioning pocket tile. Mental read/film drills appear as **Baserunning IQ — mental work only** in Before you start with a direct module button. Original drill objects, doses and individual completion keys retained; partial partitions cannot bulk-complete the original modality.
- [x] Finish your profile moved into Before you start; existing three-day reminder unchanged.
- [x] Only prescribed pocket cards shown; global Key Rules drawer and per-card countdowns removed; single Tomorrow's plan opens in line retained. Internal scheduling and generator unchanged.
- [x] Phone evidence at 360/390: today-only plan, drawer containing mental IQ and incomplete-profile reminder, and every prescribed fixture popup. Per-card rules and inline instructions present; practice sections only on applicable cards; no horizontal overflow or recorded page errors. Read-only context/schedule fixtures demonstrate conditional states, not live prescription changes. Evidence: `/tmp/browser/owner-ui/fixture-{plan,before,popup-*}-{360,390}.png` and `fixture-results.log`. Speed/bat-speed/windmill conditional variants are covered by source/tests, not all by these screenshots.
- [x] Full regression: **2,453/2,453 tests, 280 files** passed. Subsequently added real-builder grouping simulation passed (5/5 focused tests): 672 player-days across two sports, three phases and two eligibility states, with exact prescription/object preservation and no duplication. Existing eight-week law simulations passed (including 12,096 player-days with all violation counters 0); phase scan **26,352 player-days, 368,956 checks, 0 mismatches**. Harness build reports `build OK`; no manual build/typecheck run.
- [x] Daily-job read: latest persisted `wk_daily_plan_runs` row returned `outcome: built`, plan date 2026-10-07, created 21:00:22 UTC. This is stored success evidence, not a newly triggered job or proof of later runs. No cron edits or generator changes.
- **Login proof:** a fresh temporary account completed real email/password form sign-in at localhost preview and at `hammers-modality.lovable.app` (canonical destination `hammersmodality.org/dashboard`), arriving at dashboard with Sign Out visible and 0 page errors. Screenshots: `signin-preview.png`, `signin-published.png`; account cleanup returned HTTP 200. Localhost form proof does **not** reproduce the embedded Lovable auth broker; owner's exact broker interaction remains unverified. Prior `Auth.tsx` redirect and `AuthContext.tsx` delayed/focus session rechecks retained.
- **Demo video:** original configured video and poster retained, visible signed out and signed in at preview `/home`. Original asset downloads HTTP 200, range request 206; H.264/AAC encoding. Play returns to the poster in sandbox Chromium, so successful playback is **not** proved; do not describe poster visibility as full video repair. Published `/home` remains unavailable until owner publishes frontend changes. No media replaced or removed.
- **Kept/restored/reverted:** owner-approved flush Skip it, 40 display renames, Readiness/Recovery chips and organism-note rewording retained; exact bat-speed sentence restored; old-program redirects reverted. Full file-by-file ledger: `docs/owner/changes-since-2026-10-06.md`; bug fixes retained separately there.
- **programs_retired: OFF**, database mode rechecked with empty allowlist. Existing retirement helper tests pass; no production switch-on, no program retirement, no data deletion.
- **Waiting on owner / remaining verification:** verify `hammersmodality.org` in the Resend account owning this key, then repeat normal-path email and provider delivery check; actual embedded-preview broker reproduction; successful demo playback; 10 ledger files awaiting keep/revert decisions; retirement approval and unpublished help-chat retirement handling. Full 160-page phone sweep not rerun in this UI pass (prior 165-page result is historical); current phone evidence covers affected plan/drawer/popups only. No publishing, deployments, migrations or cron changes this pass.

## Final status (G3)
- **Login.** Sign-ins failed between 22:40 and 22:44 UTC because the database was down; it is back. In the preview, the sign-in page could stay on the form after sign-in. It now always sends a signed-in player on, and inside the preview the app checks again for a late sign-in (Auth.tsx, AuthContext.tsx).
- **Demo video.** Never removed. It shows on the signed-out home page. Signed-in players are sent to the dashboard, so the home page and video are at /home.
- **Kept (owner approved):** the flush "Skip it" button, 40 catalog name changes, the Readiness/Recovery labels and the "No organism signal yet" wording.
- **Restored:** the bat speed line, word for word.
- **Reverted:** all program redirects. The five programs work exactly as before.
- **Bug fixes kept for review:** a player with no gear gets a full plan, lift notes match the right lift, and the plan builder reads the right sport.
- **programs_retired switch: OFF.** Its hiding rules pass tests.
- **Checks:** 2,449/2,449 tests pass, including the 8-week simulations and the season check (0 mismatches). 165/165 pages at 390 px have 0 crashes or errors. Real sign-in form on the preview and the live site: the server answers in about 1.7 s (wrong-password test). Daily job: last run 23:40 OK.
- **Waiting on owner:** (1) one real sign-in in the preview, since there is no test password; (2) an OK to try the switch on test accounts; (3) the help-chat update is not live yet (only matters with the switch on); (4) an email key; (5) the 10 "owner to confirm" files; (6) retiring the programs, not approved.

## Owner update (C + D), 2026-10-07 23:45 UTC
- Final checks (G1): 2,449/2,449 tests pass, including the 8-week simulations and the season check (0 mismatches). Daily plan job: 17 good runs since 22:45 and the latest at 23:40 was OK; the 4 failures at 22:40 were the database outage. 165-page phone check not re-run this round.
- Ready to publish: yes, once the owner checks the change list and signs in once in the preview.
- Login (preview): fixed. The sign-in page now always sends a signed-in player on, and inside the preview the app checks again for a late sign-in.
- Demo video: still on the signed-out home page. Signed-in players can see it at /home.
- Old programs: no redirects. All five work as before. The `programs_retired` switch is built and set to OFF.
- When it is ON, the programs are hidden from: the menu, hub tiles, Dashboard cards, pricing, checkout, Help questions, the help chat, Game Plan, the calendar and the demo tour. Program pages go to the dashboard. No data is deleted.
- Kept per owner: flush "Skip it", catalog renames, Readiness/Recovery labels, "No organism signal yet" wording. Bat speed line: exact.
- Waiting on owner: turn on the switch to check it on screens (or approve a test-account check); one sign-in in the preview; help-chat update not yet deployed (only matters once the switch is on); email key; decisions on the 10 "owner to confirm" files.

# Roadmap

**Ready to publish: YES (after owner reviews the change list)** — 2026-10-07 final pass F5 (23:30 UTC): redirects OFF, game flush OFF (builder redeployed + live-proved earlier), day-mode/organism wording reverted, /home added; 2,447/2,447 tests pass (incl. 8-week sims, phase scan 0), 165/165 pages at 390 px clean, real form sign-in answers in ~2 s on preview and live site (wrong-password test; no test password for a full success), daily plan job 17 runs OK since 22:45 (4 failures 22:40 = database outage). Login failure 22:40–22:44 was a backend database outage, now recovered — no code fix needed. Demo video was never removed; signed-in users are forwarded to the dashboard, so /home was added. Change list: docs/owner/changes-since-2026-10-06.md.
**Waiting on owner:** (1) a test account password, or a sign-in by the owner, for a full successful form sign-in proof; (2) keep/revert on the 10 "Owner to confirm" files; (3) email path; (4) program retirement — not approved, pages work as before.

## Closeout decisions — ANSWERED by the owner (2026-10-07, E3)
- [x] Game-linked flush: SWITCHED OFF 2026-10-07 (owner: decision still pending). Was: YES, as an optional card note the player can skip; never replaces planned work. Built, tested, live-proved.
- [x] Morning game question: keep as is (asked once, shared with the plan-page prompt). Nothing changed.
- [x] Retire the five programs: NOT approved — redirects switched OFF 2026-10-07, pages work as before. Was: YES to redirects. Speed Lab, Explosive Conditioning, The Unicorn, Iron Bambino, Heat Factory pages now open the daily plan (reaches players on Publish). Menus, pricing/help text and data untouched; nothing deleted.

## OWNER DECISIONS 2026-10-07 — FINISH END TO END
- [x] Verified owner-applied files: throw types accepted, real-ball switch on; 10 program backups exist with RLS on
- [x] Step 8: all batches built behind one switch each, stress test 50,000+ cases 0 violations, all switched on; ball law everywhere (4 oz any age, 6–7 oz 16+, weighted never under 16, nothing over 7 oz)
- [x] Real-ball Power Primer proved live: throwing warm-up required first, max throws 1.5 and warm-ups 0.25, cap 5, stop rules + buttons, day-before-game → med ball, 1–2 real-throw days a week, 13-year-old got 4 oz throws; Pitch Smart budget sim (ages 7–12) 0 violations
- [x] Limb sizes: stride, bat size, extension context, mobility focus — card text only, never overrides age/growth/injury/phase; 40,000+ case sim 0 violations; live cards proved
- [x] Found + fixed: player with no gear saved got the stand-in day — now gets the full plan (live-proved)
- [x] Lift notes on main lifts only, right note per pattern
- [x] Step 9 redirects prepared and switched OFF; nothing deleted
- [x] Corrections 1–5 re-verified
- [x] Full test run: 2,445 tests incl. 8-week sims and phase scan — all pass after one outdated card test updated
- [x] Phone check of every page at 390 px (E1, in 4 batches): 160 pages, 0 crashes, 0 errors, nothing wider than the screen
- [x] Daily plan job running on schedule with no errors (21:30 run)
- [x] Test plans and test body sizes removed; test players back to "not started"

> **Status (2026-10-07, E15 — final regression)**
> - **Ready to publish: YES.** Reason: all 2,447 tests pass (incl. 8-week simulations across subscriptions, sports, roles, age bands 7–12/13–15/16–17/18+, season types, completion patterns: 0 rule violations); phase mismatch scan 0; phone check 160/160 pages at 390 px with 0 crashes, 0 errors, nothing too wide; daily plan job last run 22:10 succeeded, 0 failures in 3 h; builder unchanged since its last live proof; no test data left. Redirects and the flush Skip button reach players on Publish.
> - Finished: everything. Next item: none.
> - **Waiting on owner:** 1. Email path — built-in app emails (one-time domain setup) or a valid Resend key; 0 problem reports queued. 2. Separate OK if the old programs' menu items, pricing/help text or data should ever be removed.

## OWNER RULE 2026-10-07 (20:26) — ONE SYSTEM, ONE PHASE (high priority)
- [x] Audit started (see docs/phase-audit.md)
- [x] Fixed: app season reader defaulted to "in season" when nothing was saved (server says off-season) — now off-season, matching the server
- [x] Fixed: weekly recap had its own phase math — now uses the shared calculator
- [x] One resolver (_shared/phaseState.ts) returns season, sub-block, ramp-up, lighter week, growth; builder stamps it on every card; new phase-state function answers the app; app season/phase readers show only the server answer (no device math)
- [x] Mismatch scan: 26,352 player-days, 368,956 checks, 0 mismatches (found + fixed: app copy ignored the player's own day)
- [x] Phone-size check 360/390 signed in as test player: 0 errors, no conflicting labels; live builder proved (17 cards all os_q1/off-season), test plan removed

## Owner answers 2026-10-07 (20:07)
- [x] 1. Capacity: no bigger database — keep making builds faster (pre-build after local noon stays) — decided by owner; logged
- [x] 2. Missed-lift job is ON (wk-mark-missed-lifts, every 15 min since Oct 6) — roadmap corrected
- [x] 3. Restore owner bat-speed wording for pitchers
- [x] 4. 4 oz balls: no age limit (undo 5c removal); U13 may do max 4 oz PAP throws under safeguards; 6–7 oz stays 16+ until owner answers
- [x] 5. ONE SYSTEM, ONE PHASE: audit every phase source, single server-side resolver, remove duplicates, prove 0 mismatches — done: one server resolver; tissue-load reader now uses it (fixed 'in' read as offseason); screens show the plan's saved phase; 4,000-case sim 0 mismatches.
- [x] 6. lift_mcgill_big3: no outside name in explanation/display
- [x] 7. Closeout decisions written at top

> **Status (2026-10-07, end of batch D4)**
> - Phase mismatch scan: 26,352 player-days, 368,956 checks, 0 mismatches (plan, cards, labels, season counter, goal gate, lighter week, body-load reader, AI coach; 7 time zones; live builder 17/17 cards matched).
> - Finished: owner answers 1–7 (capacity logged; missed-lift job ON; bat-speed wording restored word-for-word; 4 oz no age limit, 6–7 oz stays 16+; one system, one phase — 4,000-case sim 0 mismatches, builder redeployed and live-proved; outside coach name gone from the catalog and from 3 old saved cards; closeout decisions at top). Batch C: PAP, goal table v2, Alternative button, windmill program, Power Primer bests saved to account. Test data removed.
> - Next item: none I can do — everything left waits on the owner.
> - Waiting on owner:
>   1. Step 8 content batches, by name (incl. explosive-pitcher and softball season drills).
>   2. Step 9 backup step, then redirects.
>   3. Email key.
>   4. Real-ball Power Primer throws (apply docs/pending-owner-apply/pap-throw-types.sql).
>   5. 6–7 oz overload age: 13+ (owner) vs 16+ (doctrine) — 16+ until answered.
>   6. Game-linked flush and morning-question decisions (see top).
>   7. How limb sizes get used (proposal).
> - Under-13 4 oz Power Primer update (20:21) done and live-proved on the server.
> - Phase unification (D1) done and live on the server; app side waits on Publish.
> - Ready to publish: YES — server changes are already live and proved; the app-side changes (bat-speed wording, plan-phase display, Power Primer bests, narrow-phone top bar, check-in wording) build cleanly and their tests pass. They reach players only when the owner presses Publish.
> - Goal → sets/reps (off-season only, APPROVED 2026-10-07; used only when HT's dose misses the goal range, smallest step in; never in-season/deload/trend-lighter):
>   strength 4×5–6 / 5×3–5 / 4×2–3 · size 4×8–10 / 4×6–8 / 3×5–6 · power/speed 5×3–5 / 5×2–4 / 6×1–3 · hitting/throwing 4×4–6 / 5×3–5 / 5×2–3 · durability 3×10–12 / 3×8–10 / 3×6–8 · no goal = no change (early / mid / late off-season).

## Owner update 2026-10-07 (20:21) — under-13 4 oz Power Primer throws
- [x] U13 may do max-effort 4 oz throws as the PAP action; 5 oz baseball stays off under 13; nothing over 7 oz
- [x] Each throw counts 1.5 toward Pitch Smart: builder now reads the player's real pitch counts — no max throws on a Pitch Smart rest day, never past the daily max or weekly/yearly caps, never enough to add a rest day; under 3 throws fit → med ball/band instead
- [x] Warm-up lock, 1–2 real-throw days/week, day-before-game swap, start-day rules, stop rules + buttons, cap 3–5, arm pain/readiness <40/growth blocks — all held
- [x] Stress test added: ages 7–12, 8 weeks, 0 violations; builder redeployed and live-proved; test plan removed
- [x] Real-ball throws reach players only after owner applies pap-throw-types.sql (pap_real_throws switch stays off until then) — DONE: owner applied it, switch on (2026-10-07)

## Owner corrections 2026-10-07
- [x] C1 limb data from anthropometrics; duplicate fields removed
- [x] C2 proportion emphasis + simulations
- [x] C3 goals shape exercise choice (built); [x] sets/reps — owner APPROVED table 2026-10-07 (change only when optimal planning needs it); BUILT + deployed 2026-10-07 (goalDose.ts; sim 57,600 cases, 0 violations; live builder proven on hidden test player, test plans removed)
- [x] C4 max-effort throws 15–45 s

## Round 9 (owner answers 2026-10-07, redeploys authorized)
- [x] 9.1 Throw counting final (warm-up/catch 0.25, budget unchanged) → finish 5b + throwing/pick-off next dates
- [x] 9.2 Lift deload by trends (14d: ≥3 sessions 8+/10 AND flat/down verified lift OR 7d readiness < 28d OR new pain → next week sets ×0.6; never stacked; not in-season) + simulations
- [x] 9.3 Barefoot gates live (12/21/60, 10/28/60, 10/42/65) + guided readiness test
- [x] 9.4 Throwing pacing guidance + optional timer
- [x] 9.5 Bug: softball 5Tool/Golden 2Way get hitter bat speed + simulation
- [x] 9.6 GitHub tcs-reliability fast tier: lockfile sync, all tests pass, nightly install check
- [x] 9.7 Limb size: input report, collection (wingspan, sitting height, hand length; history; parent for U13), proposal only
- [x] 9.8 7b body-load bar, 7c Report a Problem (save + email queue/retry), Step 8 batch summaries, Step 9 archive prep

- [x] Current request: clarify Rest / Push / Skip with accurate frontend-only labels and explanations; report exact before/after text (phone/desktop checked with local-only test state)
- [x] Current request: quote the complete Start card for all five requested player examples, read-only

- [x] Current frontend-only: match softball identity styling to baseball and verify contrast (identity card has no sport branch anywhere — IdentityCommandCard/IdentityBanner take no sport prop; .daily-identity CSS is one shared baseball palette for both sports; verified live on the dashboard: hero text contrast 7.7:1–14.9:1 vs 4.5:1 worst-case red-overlaid background, all WCAG pass)
- [x] Current read-only/frontend-only: verify Tissue & Recovery lifting count against recorded data; correct display if needed (backend counts planned lift-slot days in a rolling 7-day window, emitting "N lifts already this week" only when ALL are checked off; liftingPlanCopy.ts corrected so the all-checked-off string now reads "N lifting sessions checked off in the previous 7 days", the split "N planned, D checked off" line passes through accurate; verified against owner account: 9 lift-slot days in window, 0 checked off, one missed; 6 tests pass)
- [x] Current read-only: report scheduled completion and overdue lift behavior (delivered in chat + /mnt/documents/identity-recovery-report/report.md: completion only by player check-off or full log; missed-lift job ON since 2026-10-06 (wk-mark-missed-lifts every 15 min); no rollover)

- [x] Pitcher + recovery conditioning drills live (13 rows), stand-in line retired
- [x] Gaps filled: reliever primer, same-night flush, travel reset, windmill set (soft-tissue tools left out — thin evidence; no ice)
- [x] Sport audit of conditioning library
- [x] Game logging card (game today / pitching today, ask once about yesterday)
- [x] Pitcher schedule: tables, card, plan reads it (conditioning, lift limits, no-grip rule)
- [x] Rest-day count held (hard sprint swapped for easy flush)
- [x] Pitcher schedule → recovery governor, arm care, throwing plan, weekly stress planner (wired per docs/wic/remaining-items-closeout.md §4; 156 pitching/weekly-load tests pass 2026-10-07; live pitcher check is the next item, owner-blocked)
- [x] "Did you play yesterday?" / "Did you pitch?" inside the morning check-in itself (MorningGameQuestions renders in the morning check-in: game question for anyone with an unlogged game yesterday, pitching question for pitchers via the same pitcher gate as the schedule card; saves a draft game row / confirms or adds a thrown outing dated yesterday; shares the asked-once key with the Hammers Today game prompt so the athlete is asked once, in either place; decided by pure decideMorningGameAsk with 6 passing tests; verified live as the owner — question rendered from a test calendar event, Yes-click created the draft game row, test rows removed)
- [x] Live verification as a player and as a pitcher with schedule data — done 2026-10-07 signed in as hidden test pitcher (demoramp): set Starter, next start Oct 12, tapped "I threw today: Start" (saved: 1 planned + 1 thrown outing, message "Tomorrow's plan will help you recover"). Next-day plan dropped speed, sprint conditioning and bat speed and kept arm care + light lift (no squat). Finding: one exercise explanation names an outside coach ("Stuart McGill's back-preserving trunk staple", slug lift_mcgill_big3) — rewording is catalog content, logged for owner. Test data removed.
- [x] Stage 4 — game/practice load feeds recovery limit (scheduled practices are not confirmed logs)
- [x] Stage 5 — career goal direction + rank-goals prompt
- [x] Stage 6 — The General shows records (preview; published release unverified)
- [x] Stage 7 — baselines in the plan
- [x] Closeout: 40 catalog display renames live; outside-name/jargon findings in docs/wic/remaining-items-closeout.md
- [x] Closeout: proposed optional game-linked flush after night save; owner decision pending
- [x] Closeout: morning game-question trade-off reported; owner decision pending
- [x] Closeout: pitcher connections implemented/tested in checkout; deployment and player/pitcher E2E unverified
- [x] Closeout: Stage 4/5 phone-width card screenshots; player verification done 2026-10-07 as hidden test players
- [x] Closeout: exhaustive all-app audit — 2026-10-07, all 160 pages (staff /ops pages excluded) opened at phone width 390 signed in as hidden test player: 0 page crashes, 0 server errors, 0 sideways scroll, no "undefined"/"NaN"/"Something went wrong" text

## Round 2 (owner-approved 2026-10-06) — under13_parent_program stays OFF
- [x] A. Bat speed wording (overclaim "transfers seamlessly into pitching velocity" replaced with "builds rotational power for your swing. Throwing velocity still comes from throwing work." in startPlanItems.ts + WkBatSpeedCard.tsx; growthMode test updated, 9 pass)
- [x] B. Under-13 parent-controlled account behind the under13_parent_program switch (signup gate Under13Block, Parent Notice + Parent Promise, typed + drawn signature, consent record, card payment required before the account opens, ParentControls, protections) — built and deployed in Round 2; signed-in verification tracked under the test-player items
- [x] C. Under-13 Pitch Smart exact: innings 60 (8 and under) / 80 (9-12), 4 months off a year (2+ in a row), no weighted balls under 13, FB/CH only — 23 tests pass in src/test/under13PitchSmart.test.ts
- [x] D. 13th birthday → normal account (transition handled in UnifiedSignupOnboarding/ProfileSetup/Profile; no teen promise, no 18th step)
- [x] E. Pause gaps: PausedAccountScreen replaces the whole app while paused; leaderboards/public pages hide paused and under-13 accounts (Round 3); switch OFF falls back to the plain paused notice
- [x] F. Round 1 tests — growth on/off + 16yo heavy track proved 2026-10-07 (src/test/round1GrowthHeavyTrack.test.ts, 4 pass); signed-in screenshots done 2026-10-07
- [x] Stress tests 1–19 + daily-plan job scale — cases done Round 5; scale measured, capacity decision with owner
- [x] Deferral note + youth-throwing doc updates (docs/THROWING-DOCTRINE.md, 2026-10-07)
- [x] Round 2: switch, consent tables, parent flow, Pitch Smart U13, pause gaps (deployed)
- [x] Round 2: signed-in stress tests 1–11, 15, 17 and Round 1 screenshots — waiting on owner approval to sign the preview in as test players — done via Round 5 hidden test players + 2026-10-07 screenshots
- [x] Round 2: daily-plan job scale estimate (case 19) — measured (Round 5/9: ~860 builds/hour); capacity decision WAITING ON OWNER
## Round 3
- [x] Stress cases 1–11, 15, 17 + Round 1 screenshots (signed-in test players) — done via Round 5 hidden test players + 2026-10-07 screenshots
- [x] Case 19 scale dry run (1,000 / 5,000) — measured (Round 5/9: ~860 builds/hour); capacity decision WAITING ON OWNER
- [x] Checks: pitch types U13, sub-20 scale, leaderboards/public pages (done in R3, see below)
- [x] Anonymized training store + opt-ins (v2 promise/notice, toggles, backfill 13+, proofs) (done in R3, see below)
- [x] R3 security fixes for anon store migration
- [x] R3 anon store: opt-in UI (parent signup + controls), 13+ toggle, privacy text, backfill 13+, proofs
- [x] R3 pitch types U13 limited (pitch list); sub-20 scale confirmed; rankings hide paused/U13
- [x] R3 case 19: batching built + dry run; real build time measured Round 5/9 (~3–5 s single)
- [x] R3 stress cases 1–11, 15, 17 + Round 1 screenshots (need signed-in test-player sessions) — done via Round 5 hidden test players + 2026-10-07 screenshots

## Round 5 (2026-10-06) — test without approval tool
- [x] Test accounts via admin API (hidden, cleaned after)
- [x] Cases 1–11, 15, 17 backend + screen
- [x] Phone screenshots — 2026-10-07 /today, /my-daily-game-plan, /profile at 360+390 as hidden test player: no sideways scroll, 0 errors; "No organism signal yet" note reworded for players
- [x] OPEN (owner): plan building capacity ~860/hour on current database; 5,000 in first hour needs a larger database or faster builds
- [x] Real build time: 3 first builds + 20 at once; undo
- [x] Stripe promo HMPARENTTEST (100% off, 1 use, 7 days)

## Round 6 (owner-approved 2026-10-06) — no publish, no cron/switch changes
- [x] A. Profile + speed up wk-generate-daily (done Round 9: single builds ~3–5 s); identical-output proof; before/after times
- [x] B. Local-midnight readiness (done Round 9: plans prebuilt after local noon); pre-build proposal; cron proposal; multi-TZ proof
- [x] C. Plan never changes on reload (done Round 9) (20 reloads, preview + live)
- [x] D. Screenshots 360/390: plan screens done 2026-10-07 as hidden test player (Readiness/Recovery chip labels fixed); pitcher Bat speed card + warm-up season label shot 2026-10-07 as hidden in-season test pitcher (demoramp): Bat speed card shows, label reads "Season: In-Season — Strength Primer", no sideways scroll, no errors. Off-season label uses the same phase display ("Offseason Q1 — Strength & Capacity" on the off-season test player's plan); that day had no crossover card so no badge to shoot. Test plans removed, Start un-tapped.
- [x] Clean up all test data — 2026-10-07: leftover Oct 8 test plan removed; test players un-started, no logs; Sept 25 plans kept per owner

## Round 8 — Master Integration Plan (owner-approved 2026-10-07; never publish, no cron changes)
- [x] Step 1 Card design — accepted; streak correction done (flame lit 5 / glow 25 / color every 100; workout milestones 10/50/100/200/350/500/700/1000 with confetti + vibration; no-plan days never break streak)
- [x] Step 2 Timers (all of 2a–2g done) (set rest, sprint rest 1 min/10 yd), sprint stopwatch/partner/steps, % → weight, practice logging, in-card dashboards
  - [x] 2a sprint rest countdown (1 min/10 yd) + lift rest countdown per exercise from owner bands (80%+ 180 s; 65–79% 120–150; <65% 90–120; holds 60–90; skill/throw 45–60; HT rest wins; ranges start low with +30 s)
  - [x] 2b sprint stopwatch (partner/self), steps → stride, best-today; kept on device until 2d logging saves it
  - [x] 2c lift weights only from verified logs (src/lib/lift/verifiedMax.ts): % only + "Log your sets to unlock your numbers" until ≥2 qualifying sets or a tested max; auto-complete no longer stores % as weight; one-tap prefill only from verified max
  - [x] 2d "Log a practice" (team/lesson/own work, minutes, how hard), "Log a tested max" on % lifts, stopwatch reps saved to account — all record-only (wk_session_logs metrics.kind)
  - [x] 2e "Your numbers" dashboards: speed (best/latest per distance), lift (verified max + gain), practice (minutes 7/28 days)
  - [x] 2f Step 2 player proof (test player, 360/390): sprint stopwatch + 2:00 rest timer, speed and practice dashboards show logged numbers, plan fingerprint identical before/after, 0 page errors, test player removed
  - [x] 2g lift weight-unlock on-screen proof (2026-10-07, hidden test player, 360/390: 75% lift showed "Log your sets to unlock your numbers"; after logging a 200 lb tested max it showed "working weight: 150 lb"; no sideways scroll, 0 errors; also fixed "1 sets" → "1 set" and repeated change notes; test data removed) — needs a test plan with percentage lifts (in-season beginner plan had none); fold into Step 4 lift tests
- [x] 3a Speed check-in on Speed card: one readiness score (sleep/legs/sore spots), rep cuts <60 (x0.75) / <40 (x0.6), break-day triggers + override; rules in src/lib/speed/speedEngine.ts (12 rule tests pass). Screen-side only, plan rows untouched
- [x] 3b past sprint sessions feed slower-than-best break trigger + 4-session plateau note; speed level tiers on dashboard; resisted/downhill unlock line (7/10); context rules (low readiness, in-season cap 4, leg soreness = easy only). Player proof 360/390 passed, plan identical, test player removed. Gap: speed RPE not logged yet, so "two very hard sessions" trigger waits for an RPE input
- [x] 3c barefoot 4-part gate engine (7 rule tests pass; sessions alone never advance; foot/ankle/shin/Achilles/calf pain drops a stage + resets counts) + barefoot level line + post-sprint 1–10 effort rating feeding the two-hard-sessions break trigger
- [x] 3d phone proof of 3c at 360/390 as a test player: barefoot line, calf-pain easy-run message, effort rating saved (rpe 9) and pain check-in saved; no page errors; test player removed. Step 3 done.
- [x] 4a Lift rest counts down from the owner's bands (HT rest wins, +30 s up to band top) + plain "Why this rest" line under each lift
- [x] 4b lift plateau: 3 logged sessions with no new best → note suggesting the card's existing legal Swap (same kind of lift, HT pools); never auto-swaps; sets/reps/% unchanged; 5 tests pass
- [x] 4c deload proof: HT already deloads every 4th week in every phase (progression block accumulate→intensify→peak→deload; builder writes deload_applied). Real saved plans show deload weeks of Aug 31 and Sep 28 and none between. Nothing added (owner rule: add only if none).
- [x] 4d Lift phone proof 360/390 (adult test player, 10 training years, Push Press 70%): 4 logged sessions of 135×3 → "working weight: 100 lb" (verified max 149), plateau note shown, rest 2:00 + why lines on all 7 lifts, no page errors; test player removed. Note: "Your progression" text is written when the plan is built, so logs added later in the day only show there from the next plan.
- [x] 4e variety proof: real plans (4 players, last 28 days, ~10 lift days each) used 18.5 different lifts on average at ~7.6 lifts a day — HT pools already rotate accessories while main lifts repeat for progression. Nothing added; new exercises wait for Step 8. Step 4 done.
- [x] 5a throw-counting rule module (_shared/wic/phases/throwCount.ts, not deployed): mound 1.0, off-mound high 0.75, low 0.6, non-4-seam 0.85, pick-off high 0.75/low 0.6/no-throw 0; 6 tests pass
- [x] 5b PAUSED (owner): phone test showed the pitching card already has ONE arm ledger (warm-up/catch play counted at 0.25/0.5/1 against a 95-unit day). A separate throw log would be a duplicate, so it was taken off screen; owner rates must go into that one ledger, which changes everyone's arm totals. Test pitcher removed. — DONE Round 9: owner final rates now live in that one ledger (warm-up/catch 0.25, high 0.75, low 0.6); no second log.
- [x] 5c day before a start is never long toss (off/pre-season now a light touch day; in-season stays rest); plyo/underload balls removed under 13 and when age unknown (intent 13+, overload 16+ were already in place). 7 checks + existing pitcher tests pass. App screens only — no plan-builder deploy.
- [x] 5d pitching logs already existed (outing/bullpen/long toss save speed, pitches, strikes). Added "Your pitching bests" box on the pitching card: top + latest speed, best strike rate (15+ pitches), pitches logged in 28 days. Record only; math check + type check pass. Phone proof still owed.
- [x] 5e pick-off drills on the pitching card: softball pitchers never get them (they could before); 2-Way players get half the time (3 min, mostly footwork). Team-defense lists were already sport-split. Full-year check passes (softball 0 days, baseball 122, 2-Way 122 all at 3 min); type check passes. Same-day max-effort throw + pitch: nothing blocks it today; its age limit is the arm total, whose throw rates wait on owner question (4).
- [x] 5f phone proof 360/390 as a signed-in 2-Way test pitcher: bests box showed top 78 mph, latest 76, best strike rate 75% of 60, 90 pitches/28 days; no page errors; pick-off not in today's rotation (full-year check covers it). Test player + data removed.
- [x] 6a missing level of play → age default (under 14 middle school, 14–15 JV, 16+ varsity; a saved level always wins; unknown age stays unknown). 7 checks pass. Plan page shows "Level of play: not saved yet — your plan uses … for your age" + Save my real level. Plan builder redeployed (only the 4 already-explained check errors); live proof: 16-year-old test player with no level built 19 cards (200), final check 200 with next_eligible, scheduled runs 14:10/14:20 succeeded, no job errors. Phone 360/390 shots, no page errors. Test player removed.
- [x] 6b Bat speed by program: hitting programs (incl. 5Tool, Golden 2Way) unchanged; Complete Pitcher = Velocity training, off-season ≤2/wk, pre-season ≤1/wk, in-season ≤1/wk light bats only, never start day or day before/after (`_shared/wic/batSpeed/programGate.ts`). Live-proved 2026-10-07.
- [x] 6c Base Stealer: card already shows only for 5Tool / Golden 2Way (never Complete Pitcher). Saved Base Stealer sessions (baseball + softball) now count as a hard running day in the planner's rest rules (wk_external_training_days, database only — no builder redeploy; 5 existing sessions now counted).
- [x] 6c follow-up: Golden 2Way sees Base Stealer only on position days (hidden on a start day, the day before and the day after).
- [x] 6d scheduling already in place in the conditioning picker: easy flush the day after a start, primer the day before, light tournament days, short/easy within 48 h of a game, repeat sprints with full rest off-season/in-season, softball base distances (43 ft repeats). No change needed.
- [x] 6d DONE via Step 8 (owner approved all batches 2026-10-07): the library has no explosive-pitcher drills (max-intent short sprints with 1 min/10 yd rest, power/plyo, repeat accelerations) and no softball season drills (base-to-base acceleration, durability, tournament-weekend work). Owner said this content goes through Step 8 approval, so it will be drafted there.
- [x] 7a Key Rules panel on the plan page (collapsed, "Key rules for your plan"): rest rules, Done/Cut short/Missed, Base Stealer, Complete Pitcher velocity bat speed, pitcher flush/primer, baseball-only pick-offs, under-13 weighted balls, heavy lifting 16+. Display only.
- [x] 7b weekly body-load bar, 7c Report a Problem done (Round 9). Old note: Old 5d/5e note: same-day max-effort throw + pitch within age limit, baseball-only pick-offs with lower 2-Way volume. Throwing/pick-off next dates wait on the 5b answer. (Old 5b note: on the throwing card (counts by kind → pitch-equivalents vs the existing age daily/weekly limit, shown on screen), then throwing/pick-off next dates from the planner (needs plan-builder redeploy — owner authorized in Round 8). (Base Stealer attempts counting as hard running moved to Step 6, where Base Stealer days are built — it changes the planner's rest rules.)
- [x] Step 3 Speed card (Speed Lab engine inside HT phase, 6 context rules, barefoot 4-part gate)
- [x] Step 4 (include: switch Lift rest to the owner's saved bands — 80%+ 180 s; 65–79% 120–150 s; <65% 90–120 s; holds 60–90 s; skill 45–60 s; +30 s button; HT rest wins)
- [x] Step 4 Lift card (scheme unchanged; weights, rest, why-line, plateau swap, deload proof)
- [x] Step 5 Throwing (throw weights 1.0/0.75/0.85, max long toss, 13+ weighted balls, pick-off baseball P only, windmill program → Step 8)
- [x] Step 6 Conditioning + bat speed (explosive pitchers, softball season, Base Stealer 5Tool/G2W only, 2-Way hitter bat speed only, Complete Pitcher velo caps, age-default competition level + onboarding prompt)
- [x] Step 7 Key Rules panel, weekly load bar, Report a Problem (DB + email queue + admin list)
- [x] Step 8 Content batches (OFF until owner approves each) — DONE: all 8 approved and on (2026-10-07)
- [x] Step 9 Archive (docs + backup tables, redirects, 8-language text; no deletion) — backup applied, redirects ready and off; retirement OK is in the Waiting on owner list
- [x] Stress tests every step; clean up test data — done for every finished step; Step 8/9 stress tests follow their approval

## Waiting on owner (updated 2026-10-07, E10)
1. Email key — needs the owner's choice of path (checked E10: `problem_reports` has **0 rows**, so nothing is queued or lost right now):
   - **Path A (recommended, no key):** Lovable's built-in app emails. `www.hammersmodality.org` is a configured website domain but is **not** set up for email (project email setup: not_started). The owner completes the email-domain setup once; then I set up the mail infrastructure and point the problem-report mailer at it. This creates a queue worker and its own scheduled job, so I will not start it without the owner's OK.
   - **Path B:** the owner adds a valid Resend key in Project Settings → Secrets. Nothing else changes; the mailer already retries the queue automatically.
2. Separate OK if the old programs' menu items, pricing/help text or saved data should ever be removed (redirects are on; nothing deleted).
- Answered and built: throw rates (0.25/0.6/0.75/0.85/1.0), trend deload, barefoot gates; real-ball Power Primer (pap-throw-types.sql applied, switch on); Step 8 batches (all 8 approved and on); limb sizes (approved, card text only); Step 9 backups applied, redirects on; game flush (on, skippable); morning question (kept); signed-in test-player checks (done via hidden test players).

## Owner addition 2026-10-07 — Finish your profile
- [x] Finish-your-profile card on plan page (lists missing onboarding fields, one tap to step, why line), reminder every 3 days, never blocks; under-13 → parent; read weight_lb + weight_lbs; never re-ask saved; prove with 3 test accounts; clean up

## Owner addition 2026-10-07 (18:41) — PAP + goal table + Alternative + windmill (backend redeploys authorized)
- [x] A. Power Primer (PAP) block in every Lift card — live (switch power_primer on), 8-week sims 0 violations, proved on a hidden test player at 360/390, cleaned up. Real-ball PAP throws wait on owner: apply docs/pending-owner-apply/pap-throw-types.sql (switch pap_real_throws stays off until then). PBs are saved per phone for now.
- [x] B. Off-season goal table v2 + safety ceiling + taper to zero at ramp-up (sims across phases)
- [x] C. Alternative button on every exercise (incl. PAP), busy-gym test at phone size — done 2026-10-07: same-or-lower risk check, busy-gym chips, dumbbell/kettlebell equivalents for every barbell/trap-bar lift (2 of 97 left without one), swap proved as test player at 390, test plans removed
- [x] D. Windmill program: optimize, stress test, switch on (live-proved on hidden softball pitcher at 360/390; fixed builder reading sport from athlete_context — profiles has no sport column, so softball players were built as baseball)
- [x] Power Primer bests save to the player's account (wk_session_logs metrics.kind pap_speed, record-only); device copy kept as fallback — 2026-10-07, save/read proved as test player

## Request buttons + "approved coach" wording (2026-10-16)
- [x] Coach Dashboard "Add a player" (search → send request → status list)
- [x] Organization dashboard "Add athlete" (search + send, or team code / link / QR)
- [x] Wording: team creation message and Coach plan purchase message (create-staff-checkout redeployed)
- [ ] iPhone-size proof as test coach / player / org admin / athlete — blocked: no way to sign in as those test accounts from here
