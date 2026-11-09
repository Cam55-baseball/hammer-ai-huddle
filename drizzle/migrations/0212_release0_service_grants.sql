-- Release 0: the ledger-save function (server role) logs final failures for the owner's System checks card.
GRANT INSERT ON public.plan_check_failures TO service_role;
GRANT EXECUTE ON FUNCTION public.ledger_log_failure(jsonb, text, text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.ledger_backfill_athlete(uuid) TO service_role;