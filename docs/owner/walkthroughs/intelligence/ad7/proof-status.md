# AD7 — Empty-history percentage honesty

Result: PASS in preview, 2026-10-18 20:11 UTC. Ready to publish: no.

- Affected TEST college player, two fresh signed-in visits to /progress → Growth at 390×844.
- Completion Rate, Weekly Avg and vs Average display Not enough data when records cannot establish the value. Completion Rate and vs Average show no percentage. Undefined change has no directional arrow.
- Screenshots visually inspected: Completion-Rate-1.png and vs-Average-2.png. Both visits had zero page exceptions and no horizontal overflow.
- Phone viewport + mobile Safari user agent in Chromium. Not physical iPhone or WebKit certification; not a genuinely new signup or populated cohort proof.
- Focused tests: recordedPercentages, ForecastPreview and howSure — 3 files, 12 tests PASS. Percentages cover absent/zero denominators, absent today, genuine recorded zero, signed/equal comparisons and invalid numeric input.
- Latest preview diagnostic: build OK at 20:10:05 UTC.
- Shared LoadDashboard covers Growth and WorkloadPanel. WorkloadPanel was not independently browser-certified in this run.
- No TEST data inserted or deleted. Owner authorization session restored only to obtain the affected TEST player's session; no credentials saved in evidence. Coach subscription untouched and retained active.
- No publish, function redeploy, migration, cron or iOS changes. Changes remain preview-only.

Next: remaining B honesty gaps and five-cohort/parent/coach proofs, then C–F. Populated percentages are unit-tested here, not end-to-end populated-data certified.