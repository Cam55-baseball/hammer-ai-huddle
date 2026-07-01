## Post-Approval Verification

Once you approve the pending GRANT migration in the migration panel:

1. Re-query `information_schema.role_table_grants` for `wk_prescriptions`, `wk_session_logs`, `wk_recovery_acks`, `wk_cns_ledger`, `wk_periodization_blocks` — confirm `authenticated` and `service_role` grants are present.
2. Curl `wk-generate-daily` edge function with the injected session to confirm it can now read/write.
3. Report final verdict: **100% complete** or list any remaining gap.

No code changes — verification only.