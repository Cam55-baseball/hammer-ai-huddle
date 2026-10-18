# Retained TEST Coach plan — October 18, 2026

## PASS: direct Stripe subscription and phone access
- Owner: Camryn Williams, explicit October 18 19:28 UTC authorization.
- Existing TEST democoach customer reused; no existing Stripe objects edited or deleted.
- Added one 100%-off, one-use, once-duration Coach-product coupon and one direct subscription using the existing $300/month Coach price.
- Subscription: `sub_1URzmWGc5QIzbAH6jYDB20g3`. Coupon: `hcscaiHz`. Initial invoice amount due, paid and remaining all 0; no payment method/card.
- Normal signed webhook updated `staff_plans` to Coach / active; no entitlement bypass or direct plan-table writes.
- Signed in as the affected TEST coach via the existing owner-only TEST session function; opened `/coach/team-report` at 390×844 in Chromium.
- Actual page displays Team game report, date picker and honest Need more data empty state; purchase gate absent. No page errors or horizontal overflow.
- Screenshot: `coach-plan-active.png`.

## Scope and cleanup
This is paid-access proof, not populated team-report proof. No games, analyses, connections or consents created. Existing TEST session helper refreshes unchanged TEST profile/role defaults; no real account modified.

Keep this subscription ACTIVE across runs until every coach proof is finished: populated team report, both logging modes, Development/Discipline and Coach Console items. Cancel only at final cleanup. Initial discount is one-time: next period starts November 18, 2026 at 19:30 UTC; cancel before renewal to prevent the normal $300 invoice. No automatic cancellation was set because owner explicitly requires continuing access.

HEVC generated fixture, mobile Safari-user-agent proof, measurement timing impact and floating Back overlap checks remain the next ordered sub-steps. A Safari user agent is emulation, not physical iPhone proof.

No publish, backend deployment, migration, cron or iOS changes.