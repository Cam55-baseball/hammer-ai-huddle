// Apple in-app purchase checks for the Early 6-Week Recap. Pure validation + idempotent recording.
import { EARLY_RECAP } from "./rules.ts";

export interface AppleTransaction {
  transactionId: string;
  originalTransactionId?: string;
  bundleId: string;
  productId: string;
  type: string;
  appAccountToken?: string;
  revocationDate?: number;
  purchaseDate?: number;
  price?: number;
  currency?: string;
  environment?: string;
}

export function decodeJwsPayload<T = unknown>(jws: string): T {
  const part = jws.split(".")[1];
  if (!part) throw new Error("bad_signed_transaction");
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
  return JSON.parse(atob(b64)) as T;
}

export type AppleCheck = { ok: true } | { ok: false; reason: string };

export function validateAppleTransaction(t: AppleTransaction, expected: { bundleId: string; userId: string; transactionId: string }): AppleCheck {
  if (!t || t.transactionId !== expected.transactionId) return { ok: false, reason: "transaction_mismatch" };
  if (t.bundleId !== expected.bundleId) return { ok: false, reason: "wrong_app" };
  if (t.productId !== EARLY_RECAP.appleProductId) return { ok: false, reason: "wrong_product" };
  if (t.type !== "Consumable") return { ok: false, reason: "wrong_type" };
  if (t.revocationDate) return { ok: false, reason: "refunded" };
  if (!t.appAccountToken || t.appAccountToken.toLowerCase() !== expected.userId.toLowerCase()) {
    return { ok: false, reason: "not_this_account" };
  }
  return { ok: true };
}

export interface PurchaseRow {
  id?: string;
  user_id: string;
  payer_user_id: string;
  product: "early_recap" | "online_lessons";
  channel: "apple" | "stripe";
  external_id: string;
  amount_cents: number;
  block_start: string | null;
}

export interface PurchaseStore {
  findByExternalId(externalId: string): Promise<(PurchaseRow & { id: string }) | null>;
  /** Returns the row, or an error code: 'duplicate_external' | 'duplicate_block'. */
  insert(row: PurchaseRow): Promise<{ row?: PurchaseRow & { id: string }; error?: "duplicate_external" | "duplicate_block" | string }>;
}

/** Idempotent: the same transaction can never grant twice. */
export async function recordPurchaseOnce(store: PurchaseStore, row: PurchaseRow) {
  const existing = await store.findByExternalId(row.external_id);
  if (existing) return { status: "already_recorded" as const, purchase: existing };
  const res = await store.insert(row);
  if (res.row) return { status: "granted" as const, purchase: res.row };
  if (res.error === "duplicate_external") {
    const again = await store.findByExternalId(row.external_id);
    return { status: "already_recorded" as const, purchase: again! };
  }
  if (res.error === "duplicate_block") return { status: "block_already_bought" as const };
  throw new Error(res.error ?? "insert_failed");
}
