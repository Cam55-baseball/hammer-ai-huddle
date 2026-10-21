/** Universal previews may narrow the pool, never invent missing workload facts.
 * No summed/composite workload score: each catalog channel must be no higher.
 * This does not certify the athlete's ledger, schedule or current readiness.
 */
export interface SwapWorkloadFacts {
  cns_cost?: number | null;
  volume_cost?: number | null;
  contacts_per_rep?: number | null;
}
const channels = ["cns_cost", "volume_cost", "contacts_per_rep"] as const;
export function sameOrLowerSwapWorkload(source: SwapWorkloadFacts, target: SwapWorkloadFacts): boolean {
  return channels.every(channel => {
    const before = source[channel], after = target[channel];
    return typeof before === "number" && Number.isFinite(before) && before >= 0 &&
      typeof after === "number" && Number.isFinite(after) && after >= 0 && after <= before;
  });
}