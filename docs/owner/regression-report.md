# Regression report — IN PROGRESS (not complete; "Ready to publish" is still NO)

Started 2026-10-13. Sections marked NOT YET RUN have not been checked.

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
