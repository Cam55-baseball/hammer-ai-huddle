# Regression report — IN PROGRESS (not complete; "Ready to publish" is still NO)

Started 2026-10-13. Sections marked NOT YET RUN have not been checked.

## Oct 17 owner fixes — verified Oct 18

### YY2 follow-up
- Parent Account settings lists active, unrevoked linked children and opens existing scouting controls. Verified as parent, not owner; phone screenshots saved. Metrics saved, reloaded and restored; visibility stayed OFF. All original consent choice fields matched final read-back; audit retained.
- Optional connected-service consent remains separate and child-session scoped; still unproven.
- Agreement feedback now stores the same nearest-five grade displayed to coaches; tests verify 63→65 and 18.44→18.4. Real votes blocked by test coach's inactive plan; no access/billing bypass.
- Train next retains Today button for signed-in reports without suggestions; no suggestions invented. Populated History proof remains open: demo player has zero practices/reports.
- Full suite: **367 files / 2,941 tests passed**. Preview build OK. No YY2 redeploy, publish, cron, iOS, migration or Stripe writes. No new accounts; parent test choices restored.

### YY1 follow-up (04:48–05:07 UTC)
- Fixed no-report exits in resolution/FPS/duration preflight, request failures, manual retry frame/request failures and delayed hourly retry; Not measured reports retain a working retry button.
- Rejected authorized clips now save missingness reports instead of leaving videos unfinished. Account-pause requests write rejected audit only after ownership validation. Unauthorized requests still return denied, never access the clip.
- Explicit retry wrapper disables hidden provider fallback so each returned provider attempt reaches usage logging; diagnostics failures no longer stop retries.
- **Redeployed only analyze-video**, successful deployment and subsequent real player upload verified. Saved throwing report at 04:58:44 UTC, audit outcome ok, known estimated AI cost $0.013968. Tested unreadable frames at 05:01:47 UTC: report_status not_measured, saved true, rejected audit; no AI invocation for this rejected input.
- Database evidence disproves a current total logging stoppage: video_analysis_runs has requested_at (not created_at), latest runs now recorded; ai_usage_log was 7 analyze-video attempts before this test, then 8. Early preflight rejects and upload-only/pose work do not invoke AI; therefore counts are not expected to match. Historical missing runs' exact cause remains unproven.
- Phone preflight reports proven for all three baseball types. Softball test personas require legal acceptance; no bypass performed. Available clips still insufficient for required 12-run appropriate-motion proof.
- Health setup bug fixed: saveProfile returned failure without throwing, so the dialog incorrectly closed. Failed saves now retain inputs and show a clear message; successful setup saves once, reload stays closed, Edit Health Profile opens and saves. Original test profile restored.
- Exact throwing clip backed up and cleaned through existing deletion function; read-back count zero. Audit/cost rows retained; no new test accounts.
- Targeted tests 17/17 passed; latest preview build OK. Full suite was not rerun after YY1 (prior 2,937 pass stands as historical evidence).

- Full suite final run: **365 files, 2,937 tests passed**. Initial run had six failures in old test setup/source-string matching; corrected and full suite rerun passed. Preview build OK.
- Phone checks (390 × 844): owner menu Settings, Drill CMS, Drill Builder, Subscribers, agreements, analysis costs and History calendar; no horizontal overflow. Screenshots: `walkthroughs/oct17-fixes/`.
- Removed duplicate owner menu links; Subscribers now groups only current player tiers, Coach, Organization with seats and sponsorships.
- Drill Builder: analysis/skill/warm-up/defense drill catalog; CMS: traditional library with positions, tags and pending review. Hitting/pitching/throwing overlap; no merge performed.
- Analysis changes: empty-MIME phone exports accepted; pose timeout continues to coaching; authenticated pose calls; retry then alternate model; missingness report returned when analysis fails; unsaved reports say so; missingness report never suggests fabricated drills. Unknown AI usage/cost logs use -1 because columns reject null; screen labels unknown costs.
- Real upload proof: one source clip was blocked during browser decode; transcoded WebM of the same source produced a saved report despite pose timeout. It shows a glove throw, not a swing; it **does not prove hitting measurements**. Before/after tested clip: 0/1 → 1/1 readable reports, NOT a general success rate. Required 12 suitable real clips still unproven.
- Single test upload backed up and deleted via existing delete-library-session; read-back found zero matching videos. Audit/cost records retained. No new accounts deleted because the existing demo account was reused.
- Optional assessment: explicit Completed save unlocks client Start; optional checklist entries remain open; already-started accounts are not relocked. Server enforcement SQL staged at `docs/pending-owner-apply/initial-assessment-start-gate.sql`, not applied. End-to-end new-player Start remains unproven.
- Parent sharing text omits PitchLab and links existing scouting permission controls. Physio waits for profile loading before auto-opening; existing Edit Health Profile retained. Actual parent saves and completed-profile redo remain unproven.
- History now loads saved composites, offers calendar date pickers, searches recaps, opens the selected frozen report, and links Train next to Today; Standards Board moved to The General. Populated player-flow proof remains open.
- No publish, cron, iOS, migration or Stripe writes. No manual backend redeploy was performed in this verification pass; automatic function rollout status was not separately verified.

**Ready to publish: NO** — see current blockers at the top of roadmap.md.

## 1. Stripe — before and after (owner guardrail 2026-10-13)

Read-only snapshots taken by an owner-only reader (no writes to Stripe).
"Before" = 2026-10-13 02:3x UTC, after the 3 staff products/prices (created 2026-10-12) and before the test checkout.

| Item | Before | After | Added | Removed | Changed |
|---|---|---|---|---|---|
| Products | 13 | 13 | 0 | 0 | 0 |
| Prices | 13 | 13 | 0 | 0 | 0 |
| Coupons | 16 | 16 | 0 | 0 | 1 — expected, see below |
| Promotion codes | 46 | 46 | 0 | 0 | 1 — expected, see below |
| Webhook endpoints | 1 (we_1SPPSuGc5QIzbAH6BgUag31y, enabled, 6 events) | 1, same | 0 | 0 | 0 |
| Active subscriptions | 81 | 81 | — | — | count by price identical |

Expected changes: the owner's one-time 100% test code HMIOSTEST (coupon VUjERhPK, promotion code promo_1UONLgGc5QIzbAH64m39TOCp) was used once for the test below, so Stripe marked it used up. Nothing about it was edited.

Active player subscriptions by price (unchanged before → after):
price_1SLm0qGc5QIzbAH60wry3lSb 36 · price_1SKpoEGc5QIzbAH6FlPRhazY 15 · price_1SLm1cGc5QIzbAH69slwwgsU 9 · price_1SPBvTGc5QIzbAH6hkuqTPOp 6 · price_1SPBwcGc5QIzbAH6XUKF9dNy 5 · price_1SPBxRGc5QIzbAH6IJfEzqqr 4 · price_1T3jzKGc5QIzbAH6deZ4Eyit 3 · price_1T3jzxGc5QIzbAH6XoqPgC1b 3

No Stripe fee features were turned on (automatic tax stayed off on the test subscription). No tax, portal or webhook-endpoint setting was touched.

### Every Stripe object created
- Products: prod_VQjeb6G4nQbIfZ (Hammers Coach), prod_VQjea2xzqwAqvj (Hammers Organization), prod_VQje6yyL8w42rs (Extra Coach Seat) — 2026-10-12
- Prices: price_1UPsB6Gc5QIzbAH6k6wtj6NI ($300/mo), price_1UPsB7Gc5QIzbAH6Q42AlTdT ($1,000/mo), price_1UPsB8Gc5QIzbAH6l4p2C4oU ($150/mo) — 2026-10-12
- Customer: cus_VQn4WtAcEJjcAB — Demo Org (TEST ACCOUNT)
- Subscription: sub_1UPvW8Gc5QIzbAH6DTmBIh7w — test Organization plan + 2 extra seats; invoice 8T8R8XMS-0001: $1,000 + 2 × $150 = $1,300, 100% off, $0 paid; then canceled.

## 2. Staff plan entitlements — PASS
Test org (Demo Org): subscription active → app plan = Organization, status active, 5 included + 2 extra seats, renewal date set. Canceled in Stripe → app status = canceled. Both changes came through Stripe's automatic updates, within about 10 seconds.

## 3. Still NOT YET RUN
- Sponsorship: 6 flows with test subscriptions
- Phone proofs as the affected test accounts (B2 checklist, C2 Discipline, check-ins both ways, coach on-the-spot + under-13 parent, guest mode, both logging options + wrong-player block, staff checkout page with the fair-use box)
- Existing player checkout, renewal, cancel, customer portal
- 8-week plan simulations vs the live builder; Hammers Today, logging, autosave, Power Primer, warm-up order, legal screens, under-13/teen consent
- Data intact counts; daily plan job, missed marking, renewal reminders
- Full test suite + phone page audit

## MM1 regression round — 2026-10-13
- Full test suite: 2,892/2,893 on first run. The one failure was the old Terms re-acceptance test, which still expected players to re-accept Terms v2. That contradicts the owner rule (v2 adds only the coach/org fair-use section, so players do not re-accept). Test updated: documents without a cap still ask again, and Terms v2 does not ask players again. Legal tests 41/41 PASS.
- Existing data intact (read-only counts): 204 profiles, 191 active subscriptions, 69 consent records.
- Daily plan job: builds every day 2026-10-07 → 2026-10-12. On 2026-10-11, 8 builds failed with "oppositeLowerPool is not defined". The code now imports it (wk-generate-daily line 375), and all builds on 2026-10-12 succeeded. Not redeployed by me.
- STILL NOT DONE: 6 sponsorship test checkouts and new one-time 100% codes (owner OK needed), phone proofs signed in as each test account, 8-week plan simulations vs the live builder, checks on missed marking and renewal reminders, publish-checklist.md.
- MM3 renewal reminders: the job is in place, the legal_v2 switch is ON for everyone, and non-staff callers are refused (403). Dry run by default. No run logs in the recent window, which fits: it only acts on yearly plans renewing in 15–30 days. A staff dry run still needs a signed-in owner or test session (blocked, see MM2).
- MM3 missed marking: not yet proven. It needs a signed-in player test account (blocked, see MM2).
- MM4 player plans (8-week simulation, scripts/audits/blueprint-sim.ts, 720 combos covering ages 13/14/16/19, pitcher/position/two-way, baseball/softball, 6 season phases, training years and goals). Normal weeks: 0 rule breaks, 0 bad load steps (535 steps). With games 2 days after lift days: 0 rule breaks, and freshness blocks the in-season extra set as it should. Since 2026-10-11 the only change to the plan builder is your approved robustness slot (Option B, 2026-10-12). Plan 4 changed nothing in player plans. PASS. One limit: the simulation models picks and set counts; the live builder also reacts to readiness, outings and swaps.
- MM5 full test suite after the Terms test update: 2,894/2,894 PASS.
- MM7 test password (owner OK 2026-10-13): set again on the 12 test-only accounts (only accounts marked as test accounts). Kept private, not written anywhere. The one-time tool was deleted, both from the backend and from the code.
- MM7 phone check (390 px), signed in as each test account: Demo HS Shortstop (dashboard, Games), Demo 13U (shows "Parent signature required", correct for under 13), Demo Coach (coach dashboard, Guest analysis, Lineup mode), Demo Org (Organization dashboard, Coach & Org plans), Demo Parent (dashboard). Every page opens and fits the screen with 0 page errors. A small "We've updated our Privacy Policy" notice can be closed and says no action is needed. PASS.
- STILL OPEN: 6 sponsorship test checkouts (owner OK'd new one-time 100% codes), missed marking, staff dry run of renewal reminders, publish-checklist.md.
- MM8 sponsorship, live Stripe (owner OK'd one-time 100% codes). Created: coupon nogFab2p (100%, once, up to 6 uses); code HMSPTEST1 (promo_1UPwu1Gc5QIzbAH6NCRcMyaD, now used); test customer cus_VQoctcg7bzwVOU (Demo Organization). My tools couldn't delete the customer. Its only subscription is canceled and was billed $0.
  1. Sponsor (test org → test shortstop, 5Tool baseball): PASS. The invoice was $300 → $0 paid and named "Baseball 5Tool Player". The app marked the sponsorship active within ~20 s and gave the player 5Tool access.
  2. Pause: PASS. The player keeps access through the paid date (2026-11-13).
  3. Resume: PASS. Back to active.
  4. Cancel: PASS. The player keeps access for 14 days (grace to 2026-10-27).
  5. A player trying to change the sponsorship: refused (403). PASS.
  NOTE: Stripe's checkout page rejected the code as "invalid" (seen in a phone-size browser in both EUR and USD). The same code worked when attached to the subscription directly, so step 1 was run through Stripe directly. The app side (Stripe update → access) is proven. The checkout page's code box is NOT proven. Cause not yet known; the code was valid and unused at the time.
  NOT YET: sponsoring a player who already pays (their own plan ends, then org billing starts). Needs a test player with a paid plan, which would use one more one-time code.
  Cleanup: the test sponsorship row was removed, the player's access is back to before (hitting + throwing only), and the test player was removed from the test org (0 players).
- MM9 missed marking: PASS. Added a throwaway past-dated "scheduled" workout on the test shortstop, ran the training-block job, and it flipped exactly that 1 workout to "missed" (missedMarked: 1, nothing else touched). Test workout and block deleted; counts back to 0.
- MM9 renewal reminders staff practice run: PASS. Ran as the owner in practice mode (dry run): accepted the staff caller, legal_v2 switch is on, 0 yearly plans renew in the 15–30 day window right now, and nothing was sent. Non-staff refusal (403) was already proven in MM3.

## OO1 — 2026-10-13 (owner answers: yes to all four)

**Stripe guardrail:** before/after snapshots taken. Products 13→13, prices 13→13, webhook 1→1, active subscriptions 81→81 (same per price). No existing coupon or code changed. Added only: coupons jhr3Kgxy, zHf8t0a5, 0iFnOWHK, ADlWH6Ul; 5 promotion codes (promo_1UPxDJGc5QIzbAH66RZeYqZ3, promo_1UPxFZGc5QIzbAH6A6PxW8Rt, promo_1UPxFaGc5QIzbAH6UBRCQRgd, promo_1UPxFbGc5QIzbAH6RGnZ80O0, promo_1UPxFvGc5QIzbAH6GeZTCaCg); test customer cus_VQotOmXkvpZeMW (test shortstop); 2 test subscriptions (both canceled); 2 unpaid diagnostic checkout sessions (expire on their own in 24 h). Code values are not written here.

**"Invalid" code on the checkout page — cause found.** The old code's settings were fine (100% off, once, no product limit, no first-time-customer limit, no expiry; it was simply used up afterwards). A brand-new code AND an existing customer code that real buyers have redeemed 5 times were both rejected as "invalid" in my automated browser, on plain sessions with and without currency conversion. So Stripe refuses codes typed by an automated browser; the codes and app settings are not the problem. Proof on the real page is the owner's real-card test (below).

**Sponsoring a player who already pays: PASS.** Test shortstop got Complete Pitcher via the API with a one-time 100%-off code, no card (invoice $0, paid). App turned it on. The test org then sponsored him: the app saved "starts after own plan" (Nov 13), marked his own plan to end at the end of the paid period (Nov 13), and the org's Stripe subscription has its first bill on Nov 13 with no invoice now — no double charge. Both subscriptions canceled immediately; sponsorship row removed; player removed from the org again; his access back to hitting + throwing.

**Owner checkouts prepared.** 3 one-time 100%-off codes, each limited to its product (Complete Pitcher; Hammers Coach; Hammers Organization + Extra Coach Seat), expire in 7 days. Sent privately to the owner's email (subject "[PRIVATE] Hammers test checkouts") with the preview link and 3 test logins. Waiting for the owner to finish.

**Test password:** new password on the same 12 test-only accounts (system accounts only; real and App Review accounts untouched). One-time tool deployed, used, deleted from backend and code. Kept only in the private work area.

**Phone (390 px) flow checks:**
- Coach entry, one-player option: wrong player blocked ("Wrong player"), right player saved. PASS.
- Coach entry, lineup option: wrong jersey blocked ("jersey 9 is not this player"), right jersey saved. PASS.
- Player sees both entries on Games with "Yes, that's right / Something's wrong", source and date labels, page fits the phone, no errors. PASS.
- Coach lineup page opens with the lineup. PASS.
- Test entries, lineup and coach–player connection removed afterwards.
- Not yet run: under-13 parent flow, check-ins with/without health consent, guest mode on the phone, on-the-spot assessment, Discipline view.

## OO2 — 2026-10-13: check-ins + Discipline on a phone
- Check-ins with and without health sharing: PASS (adult test player). Sharing off → coach sees only that a morning check-in was done and when, no answers. Health sharing on → coach sees the answers (readiness 4, 8 hours slept). Test check-in deleted, sharing set back to off, coach–player connection ended.
- Discipline view: coach's player page (390 px) shows the Discipline tab, page fits, no errors; player's Vault shows Check-in, Discipline and Readiness. PASS (page level).
- Still to run on a phone: under-13 parent steps end to end, guest mode end to end, on-the-spot assessment.

## OO3 — 2026-10-13: parent signature flow + on-the-spot assessment + guest mode on a phone
- Teen parent-signature flow (13–17): PASS end to end. As the 13-year-old test player, requested the parent link; opened it on a 390 px screen; the parent filled name, relationship, "18 or older" and drew a signature; after signing, "Your player's training plan is now open." Player side shows signed, unlocked; reusing the link says already signed. The signed record is a legal record and stays.
- Under-13 signup/parent-consent path: the switch for it is OFF, so that path is closed; running it end to end needs the owner to name that switch change.
- On-the-spot assessment: PASS. Player sees "Coach-verified" with coach name and date; a player can't record one for himself; under-13 without the parent present refused ("Under 13: the parent must be present and agree"), with the parent present it saved and the parent's agreement time was recorded; under-13 can't answer a coach's request alone. 13+ needs no parent. (The 13U test account is 13; its birthday was briefly set to 11 for the under-13 checks, then put back.)
- Guest mode (390 px, as test coach): PASS. Under-13 without the parent-permission box: Analyze stays disabled; with the box ticked it runs. A full analysis ran on a throwaway clip: result shows only on that screen, headed "Guest result — not saved", every value labeled ("Form score (0–100)"). The guest function writes only the coach's own usage/cost row — no player, no video, no measurements are saved. The AI honestly reported the clip was a test pattern instead of inventing a reading.
- Cleanup: test checks deleted, test coach–player connections ended, waiver test used the owner's +demoparent address. The coach's one usage row stays by design (cost tracking).
- All phone checks from the earlier list are now done.

## VV2 — 2026-10-16: owner's test purchases, side menu, wrap-up
**Stripe before/after (only new items):**
- Before: 2 active $0 Organization subscriptions bought this week with the 100% test code — Hammers Organization $1,000 + 1 Extra Coach Seat $150, total charged $0 each. One from the "Hammer Org" account (Oct 15, org "Hammers Org"), one from the "H M" account (Oct 16, org "HM"). Both showed as active in the app (Organization, 5 + 1 seats).
- After: both cancelled immediately (Oct 16). Nothing renews or charges. No products, prices or codes were changed.
- Not found in Stripe: a new player purchase (democollege, Complete Pitcher), a new coach purchase (democoach, Hammers Coach), any demoorg purchase, or an under-13 parent sign-up (no new under-13 account exists). Nothing to cancel or flag for those.
**Side menu:** "Organization dashboard" (org admins and staff) and "Coach Dashboard" (coaches) now sit right under Dashboard. Phone proof: Org dashboard → Dashboard → menu → Organization dashboard → back on the Org dashboard (screenshots in walkthroughs/side-menu/). Coach path not shown — no coach session available here.
