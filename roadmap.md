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
       url := 'https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/renewal-reminders',
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
- Ready to publish: no. No publish/deploy/cron; no new test data.

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
- [ ] NOT rerun in H4: 160-page phone audit and real form sign-in on preview/published site (last successful real sign-in proof and 165-page audit are earlier results); embedded-preview broker reproduction; demo playback.
- No publish, deploy, migration or cron change; no test data created.


## H3 continuation — 2026-10-08 01:13 UTC
- [x] Items 1–6 unchanged since H2 (no code, database, deploy, migration, cron or publish changes in H3; no test data created, so no cleanup).
- [ ] Item 0 email: still blocked on the owner verifying `hammersmodality.org` in Resend; no repeat send while unchanged.
- [ ] Item 7 proof: H2 evidence stands; affected-player phone/save/read-back proof, real preview-broker reproduction and demo playback still open. No new tests rerun in H3.
- **Ready to publish: no** — same reasons as H2.


## H2 continuation — 2026-10-08
- [x] Email rechecked: Resend domains API HTTP 200; only `hammersmodality.com` is listed, status `failed`. `hammersmodality.org` is still absent. The prior normal-path test remains failed with HTTP 403 `validation_error`: "The hammersmodality.org domain is not verified." No repeat send or successful delivery claimed while this blocker is unchanged.
- [x] Problem-report queue rechecked using both `email_sent_at IS NULL` and the mailer's `email_status <> 'sent'` condition: 0 reports. Parent receipts still have no persisted retry backlog; no parent consent fabricated for testing.
- [x] Items 1–6 checked on the actual `HammerDailyPlan` presentation, not the separate Today/registry surface: Speed and bat-speed popups already receive scheduled-practice logging; Baserunning IQ opens `/baserunning-iq`, which is not behind the unreleased `/iq` lock. No additional UI or training edits required.
- [x] Fresh tests: 143/143 tissue-cost tests, 6/6 grouping/shared-phase tests, and 1/1 full phase-signal scan passed. Eight-week safety: 216 players × 56 days = 12,096 player-days, all 14 violation counters zero. Real-builder grouping: 672 player-days, original prescriptions and drill objects preserved without duplication. Phase scan: 26,352 player-days, 368,956 checks, 0 mismatches. Evidence: `/tmp/owner-ui-h2-{tcs,grouping,phase}.log`. Full all-app suite not rerun in H2.
- [x] Refreshed 360/390 screenshots: today-only plan, Before you start with mental IQ/profile reminder, and eight prescribed popup types. No global Key Rules drawer or plan practice button; open instructions and card rules present; practice sections only on applicable throwing/hitting/conditioning cards in this fixture. Zero captured runtime errors or popup overflow. Visually inspected the drawer and conditioning popup. Evidence: `/tmp/browser/owner-ui-h2/fixture-*` and `fixture-results.log`.
- [ ] Affected-player proof still open: screenshots use the saved owner session with read-only profile/context/schedule fixtures, not a signed-in player. Player subscription/access, Speed/bat-speed/windmill phone variants, and successful practice save/read-back are not proved by these screenshots. No owner-session result is counted as player verification.
- [x] Daily job read: latest stored `built` result remains 2026-10-07 21:00:22 UTC, plan date 2026-10-07; no fresh job triggered or later execution claimed. Observability build/runtime files were absent, so no fresh build result claimed. H2 made no application-code edits or database writes and created no test accounts; no cleanup required. No publish, deployment, migration or cron change.
- **Waiting on owner:** verify the `.org` email sender; existing keep/revert and retirement decisions. **Remaining verification (not owner approval blockers):** affected-player phone/save/read-back proof, actual embedded-preview broker reproduction, and successful demo playback. **Ready to publish: no.**

## H1 continuation — 2026-10-08
- [x] Rechecked items 1–6 against the current source; no additional training or UI changes required. Unprescribed PocketCards return `null`; merged running work inherits Speed/Conditioning rules. Practice logging stays limited to the owner-requested card types and scheduled practices; unreleased Game IQ remains suppressed.
- [x] Fresh regression: 143/143 tissue-cost tests and 6/6 grouping/phase tests passed. Eight-week safety simulation: 12,096 player-days, all 14 violation counters zero. Grouping simulation: 672 player-days, original prescriptions preserved without duplicate drills. Phase scan: 26,352 player-days, 368,956 checks, zero mismatches. Evidence: `/tmp/owner-ui-h1-tests.log`. The previous full-suite result remains historical, not rerun in H1.
- [x] Refreshed 360/390 screenshots of the plan, Before you start, and eight prescribed popup types. No global Key Rules drawer or plan practice button; mental IQ button and profile reminder present; each tested popup has open instructions and its rules; practice sections appear only on throwing, hitting and conditioning in this fixture. Zero page errors/overflow. Evidence: `/tmp/browser/owner-ui-h1/fixture-*` and `fixture-results.log`.
- [ ] Player-specific end-to-end proof remains incomplete: the saved screenshot session was checked and belongs to the owner, with read-only context/schedule fixtures. These screenshots prove conditional presentation, not affected-player subscription/access or successful practice save/read-back. Do not count them as full player-role verification. Speed/bat-speed/windmill phone variants still need affected-player evidence.
- [x] Email key/domain rechecked: Resend domains API HTTP 200; only `hammersmodality.com` is listed, status `failed`. `.org` remains absent. Prior normal-path test remains failed with HTTP 403 `validation_error`: "The hammersmodality.org domain is not verified." No repeated send attempted while the blocker is unchanged; no successful delivery claimed. Unsent problem-report count rechecked: 0. Parent receipts have no persisted retry backlog.
- [x] Daily-job evidence rechecked: latest stored success still `built`, plan date 2026-10-07, created 21:00:22 UTC; no fresh job triggered. H1 created no test accounts or database rows, so no H1 cleanup was needed. No publish, deployment, migration or cron change.
- **Waiting on owner / proof:** verify the `.org` sender in Resend before repeating the normal email path; complete affected-player phone/save/read-back proof; actual embedded-preview broker reproduction and successful demo playback; existing keep/revert and retirement decisions below. **Ready to publish: no.**

## Owner UI changes — current results (supersedes historical status below)
- [x] Updated Resend key accepted: domains API HTTP 200. Its account lists only `hammersmodality.com`, status `failed`; `hammersmodality.org` is not verified.
- [ ] Successful email delivery: normal-path test from `noreply@hammersmodality.org` to `hammersmodality@hammersmodality.org` failed. Provider error: HTTP 403 `validation_error`, "The hammersmodality.org domain is not verified." No delivered message or delivery ID to report. Temporary problem-report row removed with an ID/user predicate and verified absent.
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
- [ ] Game-linked flush: SWITCHED OFF 2026-10-07 (owner: decision still pending). Was: YES, as an optional card note the player can skip; never replaces planned work. Built, tested, live-proved.
- [x] Morning game question: keep as is (asked once, shared with the plan-page prompt). Nothing changed.
- [ ] Retire the five programs: NOT approved — redirects switched OFF 2026-10-07, pages work as before. Was: YES to redirects. Speed Lab, Explosive Conditioning, The Unicorn, Iron Bambino, Heat Factory pages now open the daily plan (reaches players on Publish). Menus, pricing/help text and data untouched; nothing deleted.

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
