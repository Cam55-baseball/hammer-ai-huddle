## Post-Approval Verification (re-issued)

Only you can click **Approve** on the pending migration in the review panel — I cannot do it for you. Once you approve:

1. Re-query `information_schema.role_table_grants` for `wk_prescriptions`, `wk_session_logs`, `wk_recovery_acks`, `wk_cns_ledger`, `wk_periodization_blocks` and confirm `authenticated` + `service_role` grants are present.
2. Curl `wk-generate-daily` with the injected session to confirm the edge function reads/writes cleanly.
3. Report the final verdict: **100% complete** or list any remaining gap.

No code changes — verification only.