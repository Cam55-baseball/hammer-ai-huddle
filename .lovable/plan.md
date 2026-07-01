## Close the wk_* GRANT gap and re-verify E2E

### Steps
1. Submit a migration that grants the required privileges on the five `wk_*` tables:
   - `authenticated`: `SELECT, INSERT, UPDATE, DELETE` on `wk_prescriptions`, `wk_session_logs`, `wk_recovery_acks`, `wk_cns_ledger`; `SELECT` on `wk_periodization_blocks`.
   - `service_role`: `ALL` on all five tables.
2. After you approve the migration, re-query `information_schema.role_table_grants` to confirm grants are present.
3. Smoke-test `wk-generate-daily` with the injected session to confirm read/write works end-to-end.
4. Report the final 100% verdict.