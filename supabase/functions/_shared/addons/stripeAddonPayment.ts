// Database wiring for the one Stripe add-on save step (stripeAddonCore.ts). Service role, scoped to
// the payment's own player and payer.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { deliverEarlyRecap, notify, openLessonBooking, ownerIds, purchaseStore, type RecapGenerator } from "./server.ts";
import type { AddonPaymentDeps } from "./stripeAddonCore.ts";

export function addonPaymentDeps(db: SupabaseClient, generator: RecapGenerator | null = null): AddonPaymentDeps {
  return {
    store: purchaseStore(db),
    openLessonBooking: (p) => openLessonBooking(db, p as any),
    async markParentRequestPaid(athleteId, parentId, product) {
      await db.from("addon_parent_requests").update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("athlete_user_id", athleteId).eq("parent_user_id", parentId).eq("product", product).eq("status", "pending");
    },
    notify: (ids, title, body, link) => notify(db, ids, title, body, link),
    async alertOwnersOnce(title, body, link) {
      const owners = await ownerIds(db);
      const { data } = await db.from("addon_notices").select("id").eq("body", body).limit(1);
      if (data?.length) return;
      await notify(db, owners, title, body, link);
    },
    deliverRecap: generator ? (p) => deliverEarlyRecap(db, p as any, generator) : null,
  };
}
