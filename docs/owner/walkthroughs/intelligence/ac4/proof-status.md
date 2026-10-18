# AC4 — linked-parent optional service sharing

**Result: PASS for A3 / Oct 17 #8. Overall Ready to publish: no.**

## Affected-role phone proof
- Signed in as the kept TEST parent, not owner; existing active parent-child link used.
- Actual `/parent/athletes/:athleteId/recruiting` page, headless Chromium at 390×844.
- Initial switch off; tapped Optional sharing with connected services; authenticated save returned 200/true.
- Closed that browser context. A new context with no page/query cache opened the same actual page: switch on, authenticated read RPC returned optional sharing true and health allowed false.
- Inspected the fresh-context screenshot: readable label and separate-health/scout explanation; scout/profile/metrics/video/health/academics switches remain off. No horizontal overflow or browser page errors.
- Turned optional sharing back off through the same screen.

Screenshots: `linked-parent-off.png`, `linked-parent-on.png`, `fresh-parent-readback.png`.

## TEST setup, scope integrity and cleanup
The existing kept TEST child had no Parent Promise and was age 13. Its original records were privately snapshotted; age temporarily set to 12, then a clearly marked fake TEST Parent Promise was signed through the app's own `callParentConsent("sign", …)` entry function as the parent-run TEST child account. TEST names were used for parent, typed signature and child. Training opt-in remained false. No real person's agreement was signed; no payment or unlock was attempted.

Parent proof then used the separate linked TEST parent's session, not the child session. Before/after comparisons of the full consent and recruiting records confirmed only the optional-sharing timestamp differed after returning off. Health, recruiting, academics, contact, training opt-in, visibility and family link were unchanged.

Exact cleanup after private snapshots:
- Removed one new TEST Parent Promise and its exact signature object (missing-object readback confirmed).
- Removed two new TEST height seed records added by the existing TEST-session helper, not original measurements.
- Restored the child's birthday, parent-controlled flag, paused reason and original subscription expiry.
- All nine monitored TEST tables match baseline except automatic update timestamps; the original existing family link remains intact.

No new accounts, fabricated engine measurements, new app code, publishing, migrations, redeploys, cron or iOS changes.

## Checks and limits
- Consent regression suite: 3 files / 16 tests pass (`consentStatus`, `consentPhase2`, `teenWaiverRules`).
- Latest hosted preview run succeeded and was in sync at verification.
- This proves phone-sized Chromium behavior, not physical iPhone Safari behavior.
- Remaining owner-ordered work: A4, B–F, plus original HEVC/iPhone Safari/timing certification. No overall completion claim.