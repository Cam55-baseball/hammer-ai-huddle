# AD5 — Saved-advice read and failure handling

- Actual affected TEST college player, two fresh Chromium contexts, 390×844, touch/mobile Safari user agent: advice queries return 200; zero saved rows; no page exceptions or sideways scrolling. This is phone-size emulation, not physical iPhone/Safari certification.
- Existing live column privileges allow safe advice labels and follow-through fields, not baseline/recheck scores. Explicit safe read returns 200; intentional locked-score diagnostic returns 403. Existing RLS and self-only policies preserved; no migration or source fix necessary.
- Browser-only intercepted 503 proves Today displays “We couldn't load your saved advice. Please try again later.” Readiness remains visible. The interception does not change live data or services.
- Learning-loop/nightly-recheck tests: 2 files, 4 PASS. Latest preview build: OK.
- No test rows inserted or deleted; no persisted session in proof files. Coach subscription untouched. No publish, deployment, migration, cron or iOS changes.
- Scope: empty advice access and visible failure handling only. Populated advice and saving follow-through are still unproven. Remaining B no-data gaps and cohort/role proofs precede C–F.

Artifacts: `growth-1.png`, `growth-2.png`, `failure-notice.png`, `results.json`, `proof.log`, `tests.log`.