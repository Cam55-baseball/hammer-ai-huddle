# Restore backend access and close out the open checks

Nothing needs "reconnecting" — this project's database and login system are built in, so there is no outside account to link. What is missing is the project's internal backend credential in the working environment, which is why the safety guard and audit scripts keep exiting with "key missing".

## What I'll do

1. Re-bind the project's backend credentials so scripts can read the database directly.
2. Confirm the backend is healthy.
3. Re-run the four checks and report their exact counts:
   - governance audit
   - in-season eccentric safety guard (with the Aug 12 row on the allowlist)
   - measurement-unit check
   - domain-integrity check
4. Re-run the still-open Stage 1 evidence now that access exists:
   - the generation matrix
   - the dose comparison (must come back empty)
   - a real phone-width screenshot of the Safe Session view

## What I will not touch

No exercise is switched on, no dose changes, and no rename is applied — the Appendix D rename conflict still needs your decision before anything moves.

If any check comes back non-zero, I stop and report it rather than working around it.

## Technical notes

- Uses the Supabase secret re-bind to restore `SUPABASE_URL` / service-role binding in the sandbox env; no keys are rotated or invalidated.
- Scripts: `scripts/audits/lift-governance-audit.ts`, `scripts/check-no-inseason-eccentric.ts`, `scripts/check-dosage-units.ts`, `scripts/check-domain-integrity.ts`.
- Screenshot via Playwright at phone width, Safe Session route only.
