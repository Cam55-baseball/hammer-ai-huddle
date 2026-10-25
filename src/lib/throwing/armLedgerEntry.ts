/**
 * Step 30 E — throwing and catching rep entry inside the plan.
 *
 * ONE arm ledger per athlete. The canonical adapter lives in
 * supabase/functions/_shared/wic/phases/armLedgerEntry.ts so the app and the
 * edge functions share one source; this file only re-exports it.
 */
export * from "../../../supabase/functions/_shared/wic/phases/armLedgerEntry";
