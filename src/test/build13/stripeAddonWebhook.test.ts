// Owner Nov 12 (build 13 fix 2): add-on payments are saved from Stripe itself with the SAME save-once
// step the app's confirming call uses: exactly one purchase whichever arrives first; nothing unpaid.
import { describe, it, expect } from "vitest";
import { recordStripeAddonPayment, type AddonPaymentDeps, type StripeAddonIntent } from "../../../supabase/functions/_shared/addons/stripeAddonCore";
import type { PurchaseRow, PurchaseStore } from "../../../supabase/functions/_shared/addons/apple";

function world() {
  const rows: (PurchaseRow & { id: string })[] = [];
  const bookings = new Set<string>();
  const notices: { ids: string[]; title: string }[] = [];
  const parentPaid: string[] = [];
  const delivered: string[] = [];
  const store: PurchaseStore = {
    async findByExternalId(x) { return rows.find((r) => r.external_id === x) ?? null; },
    async insert(row) {
      if (rows.some((r) => r.external_id === row.external_id)) return { error: "duplicate_external" };
      if (row.product === "early_recap" && rows.some((r) => r.product === "early_recap" && r.user_id === row.user_id && r.block_start === row.block_start)) return { error: "duplicate_block" };
      const r = { ...row, id: `p${rows.length + 1}` }; rows.push(r); return { row: r };
    },
  };
  const deps = (app: boolean): AddonPaymentDeps => ({
    store,
    async openLessonBooking(p) { if (!bookings.has(p.id)) { bookings.add(p.id); notices.push({ ids: [p.user_id], title: "Pick your 4 lesson times" }); } return `b-${p.id}`; },
    async markParentRequestPaid(a, parent) { parentPaid.push(`${a}<-${parent}`); },
    async notify(ids, title) { notices.push({ ids, title }); },
    async alertOwnersOnce() {},
    deliverRecap: app ? async (p) => { delivered.push(p.id); } : null,
  });
  return { rows, bookings, notices, parentPaid, delivered, deps };
}

const lessons = (over: Partial<StripeAddonIntent> = {}): StripeAddonIntent => ({
  id: "pi_L1", status: "succeeded", amount: 2000000, amount_received: 2000000,
  metadata: { addon_product: "online_lessons", athlete_id: "A", payer_id: "A" }, ...over,
});
const recap = (over: Partial<StripeAddonIntent> = {}): StripeAddonIntent => ({
  id: "pi_R1", status: "succeeded", amount: 10000, amount_received: 10000,
  metadata: { addon_product: "early_recap", athlete_id: "A", payer_id: "A", block_start: "2026-11-11" }, ...over,
});

describe("Stripe add-on payments are saved once", () => {
  it("paid, and the app's confirming call never arrives: Stripe's call still saves one purchase and opens the booking", async () => {
    const w = world();
    const r = await recordStripeAddonPayment(lessons(), w.deps(false));
    expect(r.status).toBe("saved");
    expect(w.rows).toHaveLength(1);
    expect(w.rows[0]).toMatchObject({ external_id: "stripe:pi_L1", channel: "stripe", product: "online_lessons", user_id: "A", payer_user_id: "A", amount_cents: 2000000 });
    expect(w.bookings.size).toBe(1);
  });
  it("both arrive (either order): one purchase, one booking, one notice", async () => {
    for (const order of [[false, true], [true, false]]) {
      const w = world();
      const a = await recordStripeAddonPayment(lessons(), w.deps(order[0]));
      const b = await recordStripeAddonPayment(lessons(), w.deps(order[1]));
      expect(w.rows).toHaveLength(1);
      expect(w.bookings.size).toBe(1);
      expect(w.notices.filter((n) => n.title === "Pick your 4 lesson times")).toHaveLength(1);
      expect([a.status, b.status]).toEqual(["saved", "saved"]);
      expect([(a as any).first, (b as any).first]).toEqual([true, false]);
    }
  });
  it("both arrive at the same moment: still one purchase", async () => {
    const w = world();
    await Promise.all([recordStripeAddonPayment(recap(), w.deps(false)), recordStripeAddonPayment(recap(), w.deps(true))]);
    expect(w.rows).toHaveLength(1);
  });
  it("an unpaid, processing or cancelled payment saves nothing", async () => {
    for (const status of ["requires_payment_method", "processing", "canceled", "requires_action"]) {
      const w = world();
      const r = await recordStripeAddonPayment(lessons({ status }), w.deps(false));
      expect(r.status).toBe("not_paid");
      expect(w.rows).toHaveLength(0);
      expect(w.bookings.size).toBe(0);
    }
  });
  it("payments that aren't add-ons (plans, builds) are left alone", async () => {
    const w = world();
    expect((await recordStripeAddonPayment({ id: "pi_x", status: "succeeded", metadata: {} }, w.deps(false))).status).toBe("not_addon");
    expect(w.rows).toHaveLength(0);
  });
  it("under 18: the purchase belongs to the player and records the paying parent; the request is marked paid", async () => {
    const w = world();
    await recordStripeAddonPayment(recap({ metadata: { addon_product: "early_recap", athlete_id: "KID", payer_id: "PARENT", block_start: "2026-11-11" } }), w.deps(false));
    expect(w.rows[0]).toMatchObject({ user_id: "KID", payer_user_id: "PARENT", block_start: "2026-11-11" });
    expect(w.parentPaid).toEqual(["KID<-PARENT"]);
    expect(w.notices).toEqual([{ ids: ["KID"], title: "Early recap paid" }]);
    await recordStripeAddonPayment(recap({ metadata: { addon_product: "early_recap", athlete_id: "KID", payer_id: "PARENT", block_start: "2026-11-11" } }), w.deps(false));
    expect(w.notices).toHaveLength(1); // the player is told once
  });
  it("a self-bought recap is delivered by the app's call (player's session); Stripe's call leaves it for the next visit", async () => {
    const w = world();
    await recordStripeAddonPayment(recap(), w.deps(false));
    expect(w.delivered).toEqual([]);
    await recordStripeAddonPayment(recap(), w.deps(true));
    expect(w.delivered).toEqual(["p1"]);
  });
});
