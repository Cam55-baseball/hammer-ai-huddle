import { recordedSwapDose } from "./sameDoseSwap.ts";
import { canonicalJson, requireSwapSavedContext, type SwapSavedContext } from "./swapSnapshot.ts";

/** A no-write precondition, never permission to prescribe or save. */
export function requireMatchedSwapVisit(expected: unknown, fresh: unknown, actor: string, id: string, date: string): void {
  if (!expected || !fresh || typeof expected !== "object" || typeof fresh !== "object") {
    throw new Error("Reload your plan before using Swap. Nothing was saved.");
  }
  const row = fresh as Record<string, unknown>;
  if (row.user_id !== actor || row.id !== id || row.plan_date !== date ||
      !["planned", "pending"].includes(String(row.status)) ||
      typeof row.updated_at !== "string" || !Number.isFinite(Date.parse(row.updated_at))) {
    throw new Error("Reload your plan before using Swap. Nothing was saved.");
  }
  recordedSwapDose(expected); recordedSwapDose(fresh);
  requireSwapSavedContext(expected as SwapSavedContext);
  requireSwapSavedContext(fresh as SwapSavedContext);
  // Include instructions, original receipt, every payload field and null/absence,
  // not just updated_at: another writer may not have advanced that timestamp.
  if (canonicalJson(expected) !== canonicalJson(fresh)) {
    throw new Error("Your exercise changed. Reload your plan before using Swap. Nothing was saved.");
  }
}

/** Pin the complete catalog used in this conversation; no cached metadata authority. */
export async function swapCatalogFingerprint(source: unknown, family: readonly unknown[]): Promise<string> {
  const rows = family.map(canonicalJson).sort();
  const text = canonicalJson({ source, family: rows });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}