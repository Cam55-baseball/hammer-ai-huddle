// Owner-approved Nov 12 (build 13 fix 2): ONE save-once step for Stripe add-on payments, used by both
// the app's confirming call (verify-addon-payment) and Stripe itself (stripe-webhook). Whichever
// arrives first saves the purchase; the other finds it by its Stripe payment id and only continues
// delivery (lesson booking, recap), which is itself idempotent. Pure: no network, no database client.
import { recordPurchaseOnce, type PurchaseRow, type PurchaseStore } from "./apple.ts";
import type { AddonProduct } from "./rules.ts";

export interface StripeAddonIntent {
  id: string;
  status: string;
  amount?: number | null;
  amount_received?: number | null;
  metadata?: Record<string, string> | null;
}

export interface AddonPaymentFacts {
  product: AddonProduct;
  /** The player the add-on is for. */
  athleteId: string;
  /** Who paid: the player, or the linked parent for under-18 purchases. */
  payerId: string;
  blockStart: string | null;
}

/** Reads our own metadata (written by create-addon-checkout / create-lesson-payment-sheet). */
export function addonFactsFromIntent(pi: StripeAddonIntent): AddonPaymentFacts | null | "bad_metadata" {
  const md = pi?.metadata ?? {};
  if (!md.addon_product) return null; // not an add-on payment (plans, builds, …)
  const product = md.addon_product as AddonProduct;
  if (!["early_recap", "online_lessons"].includes(product) || !md.athlete_id || !md.payer_id) return "bad_metadata";
  return { product, athleteId: md.athlete_id, payerId: md.payer_id, blockStart: md.block_start || null };
}

type Purchase = PurchaseRow & { id: string; delivery_status?: string; delivery_attempts?: number; created_at?: string };

export interface AddonPaymentDeps {
  store: PurchaseStore;
  openLessonBooking(purchase: Purchase): Promise<string | null>;
  markParentRequestPaid(athleteId: string, parentId: string, product: AddonProduct): Promise<void>;
  notify(userIds: string[], title: string, body: string, link: string): Promise<void>;
  /** Owner notice that is written once, however many times the same payment arrives. */
  alertOwnersOnce(title: string, body: string, link: string): Promise<void>;
  /** Only when the player's own session is available (the app's call). Stripe's call leaves delivery to the next visit. */
  deliverRecap?: ((purchase: Purchase) => Promise<unknown>) | null;
}

export type AddonPaymentResult =
  | { status: "not_addon" }
  | { status: "bad_metadata" }
  | { status: "not_paid" }
  | { status: "already_bought"; product: AddonProduct }
  | { status: "saved"; first: boolean; product: AddonProduct; purchase: Purchase; bookingId: string | null; facts: AddonPaymentFacts };

/** Saves a paid add-on exactly once and continues delivery. Unpaid / cancelled payments save nothing. */
export async function recordStripeAddonPayment(pi: StripeAddonIntent, deps: AddonPaymentDeps): Promise<AddonPaymentResult> {
  const facts = addonFactsFromIntent(pi);
  if (facts === null) return { status: "not_addon" };
  if (facts === "bad_metadata") return { status: "bad_metadata" };
  if (pi.status !== "succeeded") return { status: "not_paid" };

  const rec = await recordPurchaseOnce(deps.store, {
    user_id: facts.athleteId, payer_user_id: facts.payerId, product: facts.product, channel: "stripe",
    external_id: `stripe:${pi.id}`, amount_cents: (pi.amount_received ?? pi.amount ?? 0) as number, block_start: facts.blockStart,
  });
  if (rec.status === "block_already_bought") {
    await deps.alertOwnersOnce("Early recap paid twice for one block", `Payment ${pi.id} needs owner review.`, "/owner");
    return { status: "already_bought", product: facts.product };
  }
  const purchase = rec.purchase as Purchase;
  const first = rec.status === "granted";

  if (facts.athleteId !== facts.payerId) await deps.markParentRequestPaid(facts.athleteId, facts.payerId, facts.product);

  let bookingId: string | null = null;
  if (facts.product === "online_lessons") {
    bookingId = await deps.openLessonBooking(purchase);
  } else if (facts.athleteId === facts.payerId) {
    if (deps.deliverRecap) await deps.deliverRecap(purchase);
  } else if (first) {
    await deps.notify([facts.athleteId], "Early recap paid", "Your parent bought your Early 6-Week Recap. Open the app to see it.", "/dashboard");
  }
  return { status: "saved", first, product: facts.product, purchase, bookingId, facts };
}
