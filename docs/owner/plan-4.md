OWNER-APPROVED PLAN 4: INITIAL ASSESSMENT, RATINGS, DISCIPLINE VIEW, AND THE COACH AND ORGANIZATION PLANS. First, save this message word for word to docs/owner/plan-4.md and always build from it. Build it AFTER the current Plan v3.1 items (Phase 9 scout tools, 10 The General, 11 sponsorship). APPROVED; build without waiting for plan approval. Owner-authorized, including migrations, backend redeploys, and creating live Stripe products and prices through the API. Same rules: no publish, no cron changes, no iOS project changes, never deploy with unexplained errors, never fabricate, prove everything end to end, clean up test data, tick off roadmap.md.

A. RATINGS (used everywhere)
- Every rated result uses the owner's 20–80 scale: baseball against MLB, softball against AUSL. Below 20, use the DECIMAL scale with one decimal (e.g. 12.4) so developing players see progress. Make sure the decimals are stored and shown end to end.
- Bands by sport, never by age: Sub Par = below 40; Acceptable = 40, 45, 50, 55 and 60, plus anything from 40 to 60 inclusive; Elite = above 60.
- "DO YOU AGREE?": every rating shown to a coach gets Agree / Disagree buttons and an optional note. It never changes the rating automatically. Add an owner dashboard of agreement rates by test, metric, sport and position, so the owner can see where the system needs correcting.
- PERCENTILES later, once enough players exist (for example 50+ per sport and position): by sport and position, plus by age labeled "for fun".

B. INITIAL ASSESSMENT (one time, essentials only)
- Steps 1 → 2 → 3, IN ORDER:
  1. onboarding profile
  2. last season's stats (optional and skippable, labeled player-reported)
  3. movement and safety screen: hip and shoulder rotation, ankle, single-leg balance, plus a pain check. Pain flags adjust the plan under the existing rules.
- After 1–3, steps 4, 5 and 6 in ANY order the player chooses:
  4. the S2 test in Tex Vision
  5. ONE of each analysis INCLUDED in the player's subscription (only those)
  6. the first 6-week test: reuse the existing one, with no duplicate tests
- Baserunning IQ and Game IQ are NOT part of it. Program-specific extras wait for camera tracking.
- Show an "Initial assessment" checklist card in "Before you start" (and on the plan) until it's done.
- Results become the baseline in The General, the Coach and Org views, and the Scout views (only what's shared), and they feed plans, roadmaps and the bands.
- ON THE SPOT: a connected coach or org admin can run the assessment with the player in person. Results save to the PLAYER's profile, labeled "coach-verified" with the name and date. A connection is required. For under-13, the parent runs the account, so they must be present and consent.
- Every test follows the existing safety rules (warm-up gates, age, growth, pain, readiness).

C. DISCIPLINE AND ATTENDANCE (Coach and Org views)
For each player:
- daily completion (prescribed vs done) and streaks
- missed days
- what they skip, by card type and exercise category
- logging consistency
- 7, 28 and 90-day trends
- POSITIVE and NEGATIVE CORRELATIONS between adherence and outcomes (tests, analysis scores, game stats), with evidence labels, counts and time windows. Never claim cause; say "Not enough data" when true.
Also a team-level summary.

D. COACH PLAN ($300/month) and ORGANIZATION PLAN ($1,000/month, 5 coach seats included, EXTRA SEAT $150/month)
- STRIPE: create live products and monthly prices through the API: "Hammers Coach" $300, "Hammers Organization" $1,000 (includes 5 coach seats), "Extra Coach Seat" $150 (per seat, quantity-based).
  - Wire the web checkout, the customer portal, webhooks and entitlements. The iOS app follows the US-only "Subscribe on our website" rule.
  - Add the plans to EVERY pricing and plan screen: the pricing page, upgrade screens, role choice at sign-up for coach and organization, the help chat, and all 8 translations.
  - Report the product and price IDs.
- INCLUDED (coach, and every org seat): all analyses for both sports, Tex Vision, Delaycam, pitch tipping, Royal timing, Baserunning IQ, Pick-off Trainer, and Game IQ when released; the calendar with messages to chosen teams or players; testing and testing day; the on-the-spot initial assessment; the combine when ready; the Coach Dashboard and the Development and Discipline views for connected players; sending workouts; a weekly running coach summary (trends across their players, the most common issues, what to learn to help them), evidence-labeled. No personal plans or athlete reports for coach accounts.
- ORG EXTRAS: the facility dashboard, comparisons, growth-vs-game trends, teams, staff seats (5 included, extras billed), sponsorship billing, org-wide summaries.
- RESULTS: tools used with a connected player save to that player's profile, labeled coach-entered or coach-verified.
- GUEST MODE: for players without an account. NOTHING is saved; results show only in the session, with an "Invite to Hammers to save this" option. For under-13 guests, the coach must confirm parent permission (lawyer-approved). Nothing is kept or used for AI training.
- UNLIMITED analyses (no monthly allowance). FAIR USE:
  - an hourly speed limit of about 30 analyses per account, server-side, with a friendly message
  - draft a fair-use clause for the Terms (one person per coach account, no sharing or reselling) and mark it for lawyer review; don't mark it approved
- HELD OUT: game and practice logging BY coaches stays OFF until there's a foolproof, elite, professional way to tag the right player, or to log one player at a time. Write a design proposal for the owner in docs/owner/coach-logging-proposal.md; don't build it.
- COST TRACKING: log the AI model, tokens and estimated cost for every analysis, and give the owner a cost-per-analysis and per-plan view, so pricing can be checked with real data.

E. PROOF before "ready":
- test accounts: a player under each program and sport, a connected coach, an org with seats, and a guest session
- order rules (1→2→3 locked; 4–6 any order)
- only the subscribed analyses requested
- decimals below 20 shown
- band edges (39.9 Sub Par, 40 and 60 Acceptable, 60.1 Elite)
- "Do you agree?" saved, and the owner dashboard
- coach on-the-spot results landing on the player's profile
- under-13 consent
- discipline correlations with "not enough data"
- Stripe test checkouts with the HMIOSTEST-style 100% code (create a new one-time code if needed), and entitlements switching on and off
- extra seats billed
- the hourly limit
- guest mode saving nothing
- phone screenshots, the full suite, no regressions
When EVERYTHING (v3.1 and Plan 4) is proven, write docs/owner/publish-checklist.md: a plain step-by-step human verification checklist for the owner, with what he should see on each screen. Then report "Ready to publish: yes".

---

## OWNER UPDATES TO PLAN 4 (2026-10-12 22:36 UTC, saved word for word)

1. GRADES GO BY 5s. On the 20–80 scale, grades are ONLY 20, 25, 30 … 75, 80 (round to the nearest 5). The DECIMAL scale is the owner's own scale, used ONLY below 20 (one decimal, e.g. 12.4).
   - Bands: Sub Par = below 40 (decimals, 20, 25, 30, 35); Acceptable = 40, 45, 50, 55, 60; Elite = 65, 70, 75, 80.
   - Fix anywhere the app shows non-5 grades at 20 or above.
   - Edge tests: 19.9 → Sub Par (decimal), 35 → Sub Par, 40 → Acceptable, 60 → Acceptable, 65 → Elite.
2. CHECK-INS VISIBLE TO COACHES AND ORGANIZATIONS. A player's check-ins (morning and night check-ins, readiness, sleep, soreness, pain, energy, notes) appear in the Coach View, the Development and Discipline views and the org dashboard for connected coaches and organizations.
   - ALWAYS visible: whether check-ins were completed, and when (attendance and discipline).
   - The CONTENTS (readiness, sleep, soreness, pain and other health-type answers) are health data under the approved Consumer Health Data Policy. They show when the player (18+) or parent (minors) has the health-sharing switch ON, and that's already part of the up-front consent at sign-up.
   - If it's off, show "Shared only with health consent" and an easy prompt for the player or parent to turn it on.
   - Prove it both ways with test accounts.
