# AB7 — at-bat missing-fact integrity

Ready to publish: NO.

## Verified
- Signed-in kept teen player, 390 × 844: create synthetic game through UI; blank quick inning disables outcomes; enter inning 2 and save Single.
- Existing server provenance trigger assigns Player-entered. No client source spoofing added.
- Quick-save DB defaults initially supplied RBI/LOB/pinch-hit without evidence. Both quick/full inserts now normalize all optional facts explicitly to null through the same payload helper.
- Full form: blank inning/result disables save; inning 3 + Walk records all untouched optional facts null.
- Inning 4 + Fly out: explicitly entered zero counts/outs/RBI/LOB and No pinch-hit survive fresh navigation/reload.
- Expanding an at-bat with no pitches no longer changes unknown/manual count to 0–0.
- Player-entered badges visible on all three saved at-bats after reload; no horizontal overflow or page errors. Screenshot: atbat-reload.png.
- Exact synthetic game and three at-bats removed; zero-row read-back confirmed. Initial navigation retry and default-diagnosis fixtures also cleaned.
- Full suite: 383 files / 3,002 tests passed. Regression coverage includes optional nulls, explicit zeros/No, required inning bounds/result, and empty-pitch count preservation.

## Still open
- Parent-run legal/signature acceptance is genuine consent, never simulated or bypassed.
- Both coach modes require a working paid test subscription; earlier Stripe rejection remains unresolved, no payment access bypassed.
- Genuine hitter with 10+ games and pitcher with 5+ reports are absent in kept cohorts; synthetic events are proof fixtures, not population evidence.
- Step 5 complete role/cohort proof remains open; steps 6–8 follow in order.

## Change scope
Preview frontend and local tests only. No migration, function deployment, Stripe write, publishing, cron change or iOS edit.
