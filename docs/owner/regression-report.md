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
