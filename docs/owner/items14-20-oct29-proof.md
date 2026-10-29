# Items 14 and 20 — October 29, 2026, 12:32 UTC run

## Item 14 — built and TEST-fixture-rendered

- `projectArmHistory` retains every explicitly sport-scoped dated compatible velocity measurement by recorded position, catcher pop time and coach/scout arm grade.
- Each observation carries its original record ID, date, source, position, metric, unit and raw value. Velocity, pop time and human grades are independent series; no nearby-date or cross-source pairing and no combined historical arm score.
- Missing/invalid dates, unknown sport or position, missing measurements, invalid human grades and conflicting duplicate identities are excluded, never guessed. Identical join duplicates contribute once.
- `projectMasterySources.recordedArmEvidence` preserves the series without changing the current health-gated arm judge. General pillar and saved throwing-goal graphs show all matching series separately; weekly means remain within a single metric/position/source.
- Unit regression checks assert multiple actual dates, throwing positions, both pop dates, coach/scout values, invalid/unrelated records and conflicting duplicates. 32 tests across armHistory/masteryProjection/pillarTrends passed before final additional regressions.
- Real retained onboarding TEST authenticated at `/progress`: actual hosted throwing/catching/human-grade arrays are empty. No hosted measurements were fabricated.
- Browser-only **explicit TEST fixtures** exercised the existing self-gated General Performance tab at 390×844 and 1280×1800. Four series rendered with dot counts 2/2/2/1; full recorded dates displayed; Weeks retained four separate series; zero page errors and no page overflow. This is TEST-data render proof, not populated hosted-history acceptance.
- Screenshots inspected: `/tmp/browser/items14-20/arm-390-1.png`, `/tmp/browser/items14-20/arm-1280-0.png`. Logs: `render-arm.log`, `arm-tests.log`.
- Final targeted regressions: 48 tests / 8 files passed, including General gating, saved goal mapping and existing philosophy Confirm refusal/receipt behavior. Repeat phone/desktop renders passed; automatic preview build OK at 12:38:50 UTC.

## Item 20 — OPEN

Exact shared-schema/consumer and TEST-isolation blockers documented in `philosophy-item20-applied-proof.md`. No unsupported adapter, shared production edit, unsafe TEST bypass, false receipt or live downstream proof was claimed.

## Standing rules

Only Items14/20 examined/changed. No publishing, deployment, migration application, cron, iOS, athlete-data cleanup or safety-rule change. Earlier pending Item13 work untouched.