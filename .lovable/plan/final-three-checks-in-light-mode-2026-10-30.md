# Final three checks in light mode

1. Verify the TEST player's saved Power Primer ratings after refresh; correct restoration only if the check fails.
2. Reproduce the softball structural refusal offline using the same player's inputs, correct the builder without weakening validation, then verify the real switch saves seven valid softball dates.
3. Compare every owner-visible account's payment and training/onboarding status with canonical records, fix any mismatch, and capture the owner screen.

## Verification and limits
- One browser session at a time, with a database load check before each proof.
- Focused mocked tests only; no live suites or sub-agents.
- Use the existing named authorization only for backward-compatible `wk-generate-daily` updates if needed. No publishing, cron or iOS changes.
- Retain one screenshot per item and report four lines; remaining functional gaps prevent a yes verdict.

## Technical approach
Use canonical `wk_session_logs` for ratings, the shared bundled daily builder and unchanged sanity judge for softball, and owner-scoped profile/subscription reads for account statuses. No new save path or permission changes.