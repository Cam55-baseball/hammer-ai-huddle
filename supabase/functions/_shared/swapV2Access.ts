import type { FeatureSwitchRow } from "./wic/flags/featureSwitches.ts";

/** OFF is the public release state; active staff and named pilots are exceptions. */
export function swapV2Allowed(row: FeatureSwitchRow | null | undefined, userId: string | null, activeStaff = false): boolean {
  if (!row || !userId) return false;
  return activeStaff || (row.allowlist ?? []).includes(userId) || row.mode === "all";
}