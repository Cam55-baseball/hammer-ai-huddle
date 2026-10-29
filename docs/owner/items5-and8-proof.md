# October 29 — items 5 and 8 only

## Item 5 — complete in preview
- Shared Terms overlay previously rendered nested markdown links as full-page anchors. Nested legal links now open another overlay; same-URL history makes Back dismiss reading, not sign-up.
- Real `/signup/organization`, Chromium 390×844: name, email, birthday and agreement retained after Close and browser Back. Terms → Medical & Safety → Back → Terms; Terms → Child Safety → Close → Terms; closing Terms restores the same filled step. No page errors.
- Screenshots: `/tmp/browser/items58/terms-before.png`, `terms-overlay.png`, `subterm-overlay.png`, `terms-close.png`, `terms-back.png`. Document width was corrected after initial clipping was observed; final subterm screenshot inspected.
- Approved legal text/versions unchanged. Reading does not automatically accept the sign-up checkbox.

## Item 8 — automatic approval live; limits below
- Before: 7 organizations, 4 approved, 3 unapproved. Exact seven IDs read before updating; after: 7 approved, 0 awaiting. After new TEST registration: 8 total, 8 approved, 0 awaiting.
- Applied 0147: existing organization trigger forces automatic activation on insert/edit; rename/contact changes cannot reopen a queue. Ordinary authenticated organization owners still cannot transfer ownership or change solo status. `verified` now means activation, not verified identity/email/test measurements. Contact save is optional. Owner review and official-email-code UI removed; scout approval unchanged.
- Applied 0148: exact-email coach invitation wraps existing `send_connection_request('org_coach',…)`, with server org-admin and active coach-role checks. No second membership writer. The Members screen previously had no coach invitation control.
- New TEST admin registered through actual 390×844 sign-up, accepted TEST-only legal agreements, registered `TEST — Organization Items 5 and 8 Oct29`; immediate readback `verified=true`, status verified, email_verified_at null. No owner/admin role.
- New TEST organization received a real Stripe Organization subscription using one-redemption 100%-off coupon: invoice due/paid/total all $0. Existing `sync-staff-plan` activated the purchased-plan entitlement. Purchase gate was NOT bypassed. Subscription was set not to renew and canceled after proof; existing democoach subscription unchanged.
- Phone dashboard → Add athlete → Testing → Players/Sponsor players → Invite → Members all open, no organization approval wait, no page errors. Adult TEST goal-picker athlete joined via real generated invite code; membership readback active. TEST coach invited through Members and accepted through real Requests; readback active coach member.
- Screenshots: `/tmp/browser/items58/new-org-dashboard.png`, `new-org-add-athlete.png`, `new-org-testing.png`, `new-org-sponsor.png`, `player-joined.png`, `coach-invited.png`, `coach-accepted.png`, `coach-members-readback.png`.
- **Not a full populated testing/sponsorship proof:** testing roster excludes system accounts by the existing canonical TEST filter, deliberately unchanged. Sponsor choices did not populate for this TEST member even after waiting; accepted membership was confirmed, but no sponsorship or testing result was fabricated. Scheduling/results/payment end-to-end remain unverified, not claimed complete.

## Checks and boundaries
- Final affected suite: 15 files / 96 tests passed, including authenticated live organization activation/edit/ownership regression. `/tmp/items58-complete-tests.log`.
- Preview automatic build clean at 02:45:54 UTC (latest checked before final close).
- Only items 5 and 8 changed. No publish, cron or iOS changes. Migrations are live; frontend remains preview-only. Existing consent, assignment, subscription, scout approval and TEST exclusion rules retained.
- TEST org/admin retained marked TEST/system for reproducible proof; no unscoped cleanup or destructive changes.