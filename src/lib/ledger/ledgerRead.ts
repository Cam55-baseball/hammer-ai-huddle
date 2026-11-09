/**
 * Release 0b: the app's ledger read path (switch ledger_unify_v1). Same shared judge as the edge functions
 * (supabase/functions/_shared/ledger/ledgerRead.ts); the switch answer is cached for 10 minutes per person.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  ledgerUnifyOn, viaLedger, viaLedgerOne, type LedgerDb, type LedgerReadTable,
} from "../../../supabase/functions/_shared/ledger/ledgerRead";

const db = supabase as unknown as LedgerDb;
let cache: { userId: string; at: number; on: boolean } | null = null;

export async function loadLedgerUnify(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  if (cache && cache.userId === userId && Date.now() - cache.at < 10 * 60_000) return cache.on;
  const on = await ledgerUnifyOn(db, userId);
  cache = { userId, at: Date.now(), on };
  return on;
}

/** Rows of the signed-in person's own reader, through the ledger when their switch is on. */
export async function readViaLedger<T>(table: LedgerReadTable, rows: T[], userId: string | null | undefined): Promise<T[]> {
  if (!rows.length) return rows;
  return viaLedger(db, table, rows, await loadLedgerUnify(userId));
}

export async function readOneViaLedger<T>(table: LedgerReadTable, row: T | null, userId: string | null | undefined): Promise<T | null> {
  if (!row) return row;
  return viaLedgerOne(db, table, row, await loadLedgerUnify(userId));
}

export function clearLedgerUnify() { cache = null; }
