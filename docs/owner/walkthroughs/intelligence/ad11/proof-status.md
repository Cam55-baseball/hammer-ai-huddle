# AD11 — Performance areas: no report-card hint for players
- Found: AD10's "Grade: on your report card" / "See report card" hinted at the unreleased Report Card (owner/admin-only switch). Players now see only labeled count + last analysis date and "See analysis"; owner/admin keep the grade line and report card link.
- Tests: 2 files / 7 tests PASS (incl. player no-hint, owner/admin line, read-failure notice).
- Phone (390×844, Safari-agent Chromium) as TEST college player, 2 fresh visits: video reads 200, no analyses so the areas list stays hidden (honest empty), 0 page errors, no sideways scroll. Populated list not phone-proven.
- No data inserted/deleted; Coach plan untouched; no publish/redeploy/migration/cron/iOS.
