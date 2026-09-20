/**
 * PROPOSED Tissue Cost Scheduler config v1.1 — adds upper-body plyometric
 * costs (UBP §4). This does NOT modify `tcs_config_v1`; v1 stays frozen and
 * every v1 golden keeps its expected output. Nothing imports this into the
 * live engine — adoption happens with a version bump and a full golden re-run.
 */

import { TCS_CONFIG } from "../schedule/tissueCost/config.ts";
import type { UbTier } from "./families.ts";

export const TCS_CONFIG_V11_VERSION = "tcs_config_v1.1";

/** §4 — cost per 10 contacts. E3 (Hammers method), tunable. */
export const UB_PLYO_COST_PER_10_CONTACTS: Record<UbTier, { nerve: number; muscle: number; connective: number; arm: number }> = {
  U1: { nerve: 1, muscle: 0, connective: 0, arm: 1 },
  U2: { nerve: 2, muscle: 0, connective: 0, arm: 3 },
  U3: { nerve: 5, muscle: 0, connective: 0, arm: 5 },
};

export function ubPlyoCost(tier: UbTier, contacts: number) {
  const per10 = UB_PLYO_COST_PER_10_CONTACTS[tier];
  const k = Math.max(0, contacts) / 10;
  return {
    nerve: per10.nerve * k,
    muscle: per10.muscle * k,
    connective: per10.connective * k,
    arm: per10.arm * k,
  };
}

/** v1 plus the new UB_PLYO cost rows. Proposal only. */
export const TCS_CONFIG_V11 = Object.freeze({
  ...TCS_CONFIG,
  version: TCS_CONFIG_V11_VERSION,
  costs: Object.freeze({
    ...TCS_CONFIG.costs,
    ub_plyo_u1_per_10: UB_PLYO_COST_PER_10_CONTACTS.U1,
    ub_plyo_u2_per_10: UB_PLYO_COST_PER_10_CONTACTS.U2,
    ub_plyo_u3_per_10: UB_PLYO_COST_PER_10_CONTACTS.U3,
  }),
});
