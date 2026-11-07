import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { earlyRecapEligibility, payerAllowed, type AddonProduct } from "./rules.ts";
import { athleteFacts, boughtBlocks, hasActivePlan, recapAnchor } from "./server.ts";

/** Who may pay, for whom, and (recap) whether this block is open. Same checks before and after payment. */
export async function checkBuy(db: SupabaseClient, payerId: string, athleteId: string, product: AddonProduct, now = new Date()) {
  const facts = await athleteFacts(db, athleteId, now);
  const ok = payerAllowed({ payerId, athleteId, athleteUnder18: facts.under18, payerIsLinkedParent: facts.parentIds.includes(payerId) });
  if (!ok) {
    return { ok: false as const, error: facts.under18 ? (facts.parentIds.length ? "parent_must_pay" : "invite_parent_first") : "only_the_player_can_buy" };
  }
  if (product === "early_recap") {
    const e = earlyRecapEligibility({
      hasActivePlan: await hasActivePlan(db, athleteId),
      anchor: await recapAnchor(db, athleteId),
      now,
      boughtBlockStarts: await boughtBlocks(db, athleteId),
    });
    if (!e.ok) return { ok: false as const, error: e.reason, message: e.message };
    return { ok: true as const, blockStart: e.blockStart, facts };
  }
  return { ok: true as const, blockStart: null, facts };
}
