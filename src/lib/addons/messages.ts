// Owner-approved Nov 12 (build 13 fix 1/2): plain words for add-on purchase outcomes. No product ids,
// no raw error codes. "Nothing was charged" is said only when that is true: a failure after the
// payment itself went through says so honestly instead.
import type { AddonProduct } from "../../../supabase/functions/_shared/addons/rules";

export const RECAP_CANCELLED = "Purchase cancelled — nothing was charged.";
export const LESSONS_CANCELLED = "Payment cancelled — nothing was charged.";
export const PAID_NOT_SAVED =
  "Your payment went through, but we couldn't finish saving it yet. It will show here shortly — you won't be charged again.";

export function cancelledLine(product: AddonProduct): string {
  return product === "online_lessons" ? LESSONS_CANCELLED : RECAP_CANCELLED;
}

const BY_CODE: Record<string, string> = {
  payment_failed: "Your payment didn't go through. Nothing was charged.",
  apple_pending: "Your purchase is waiting for approval. Nothing has been charged yet.",
  parent_must_pay: "Your parent needs to approve and pay for this. Nothing was charged.",
  invite_parent_first: "Players under 18 need a linked parent to buy. Invite a parent first. Nothing was charged.",
  only_the_player_can_buy: "Only the player can buy this for their own account. Nothing was charged.",
  too_early: "The early recap isn't open yet. Nothing was charged.",
  already_bought: "You already got this block's early recap. Nothing was charged.",
  no_plan: "This needs an active plan. Nothing was charged.",
  no_start: "Start your plan first. Nothing was charged.",
  not_paid: "This payment hasn't gone through, so nothing has been charged.",
};

export const GENERIC_FAILURE = "That didn't go through. Nothing was charged. Please try again in a moment.";

/** One plain line for a failed purchase. */
export function failureLine(err: unknown): string {
  const e = err as { code?: string; afterPayment?: boolean } | null;
  if (e?.afterPayment && e.code !== "not_paid") return PAID_NOT_SAVED;
  if (e?.code && BY_CODE[e.code]) return BY_CODE[e.code];
  return GENERIC_FAILURE;
}

/** "Opens Nov 25" in the player's own time zone. */
export function opensLabel(opensAtIso: string | null | undefined, timeZone?: string): string | null {
  if (!opensAtIso) return null;
  const d = new Date(opensAtIso);
  if (isNaN(d.getTime())) return null;
  return `Opens ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(timeZone ? { timeZone } : {}) })}`;
}
