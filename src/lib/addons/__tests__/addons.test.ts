import { describe, it, expect, vi } from "vitest";
import { earlyRecapEligibility, currentBlock, isUnder18, purchaseGate, payerAllowed, EARLY_RECAP } from "../../../../supabase/functions/_shared/addons/rules";
import { validateAppleTransaction, recordPurchaseOnce, decodeJwsPayload, type PurchaseStore, type PurchaseRow, type AppleTransaction } from "../../../../supabase/functions/_shared/addons/apple";
import { openSlots, validatePicks, DEFAULT_LESSON_HOURS, dayKey } from "../../../../supabase/functions/_shared/addons/slots";
import { confirmSessions, approveReschedule, inviteList, type CalendarClient, type SessionRow } from "../../../../supabase/functions/_shared/addons/booking";

const DAY = 86400000;
const anchor = new Date("2026-09-01T12:00:00Z");
const at = (days: number) => new Date(anchor.getTime() + days * DAY);

describe("Early recap: one per block, after 14 days (owner Nov 6)", () => {
  it("is closed before 14 days of the current block, with days left", () => {
    const r = earlyRecapEligibility({ hasActivePlan: true, anchor, now: at(10), boughtBlockStarts: [] });
    expect(r.ok).toBe(false);
    { const x = r as any; expect(x.reason).toBe("too_early"); expect(x.daysLeft).toBe(4); }
  });
  it("opens on day 14", () => {
    expect(earlyRecapEligibility({ hasActivePlan: true, anchor, now: at(14), boughtBlockStarts: [] }).ok).toBe(true);
  });
  it("is closed once this block's recap was bought", () => {
    const b = currentBlock(anchor, at(20)).startDate;
    const r = earlyRecapEligibility({ hasActivePlan: true, anchor, now: at(20), boughtBlockStarts: [b] });
    expect(r.ok).toBe(false);
    expect((r as any).reason).toBe("already_bought");
  });
  it("a new block counts its own 14 days and allows one more", () => {
    const first = currentBlock(anchor, at(20)).startDate;
    expect(earlyRecapEligibility({ hasActivePlan: true, anchor, now: at(42 + 5), boughtBlockStarts: [first] }).ok).toBe(false);
    expect(earlyRecapEligibility({ hasActivePlan: true, anchor, now: at(42 + 14), boughtBlockStarts: [first] }).ok).toBe(true);
  });
  it("needs an active plan", () => {
    const r = earlyRecapEligibility({ hasActivePlan: false, anchor, now: at(30), boughtBlockStarts: [] });
    expect(r.ok).toBe(false);
  });
  it("blocks are 42 days, matching the regular recap", () => {
    expect(EARLY_RECAP.blockDays).toBe(42);
    expect(currentBlock(anchor, at(43)).index).toBe(1);
  });
});

describe("Under-18 parent rule", () => {
  const now = new Date("2026-11-06T00:00:00Z");
  it("age", () => {
    expect(isUnder18("2009-11-07", now)).toBe(true);
    expect(isUnder18("2008-11-06", now)).toBe(false);
    expect(isUnder18(null, now)).toBe(true);
  });
  it("under 18 with a linked parent asks the parent; without one is blocked; adults buy", () => {
    expect(purchaseGate({ under18: true, hasLinkedParent: true })).toBe("ask_parent");
    expect(purchaseGate({ under18: true, hasLinkedParent: false })).toBe("blocked_no_parent");
    expect(purchaseGate({ under18: false, hasLinkedParent: false })).toBe("buy");
  });
  it("only the linked parent may pay for a minor; the minor may not pay", () => {
    expect(payerAllowed({ payerId: "kid", athleteId: "kid", athleteUnder18: true, payerIsLinkedParent: false })).toBe(false);
    expect(payerAllowed({ payerId: "mom", athleteId: "kid", athleteUnder18: true, payerIsLinkedParent: true })).toBe(true);
    expect(payerAllowed({ payerId: "stranger", athleteId: "kid", athleteUnder18: true, payerIsLinkedParent: false })).toBe(false);
    expect(payerAllowed({ payerId: "adult", athleteId: "adult", athleteUnder18: false, payerIsLinkedParent: false })).toBe(true);
    expect(payerAllowed({ payerId: "other", athleteId: "adult", athleteUnder18: false, payerIsLinkedParent: false })).toBe(false);
  });
  it("parents are copied on every lesson invite only for minors", () => {
    expect(inviteList("kid@x.com", ["Mom@x.com"], true)).toEqual(["kid@x.com", "mom@x.com"]);
    expect(inviteList("adult@x.com", ["mom@x.com"], false)).toEqual(["adult@x.com"]);
  });
});

const user = "8b1f9c1e-1111-4222-8333-444455556666";
const goodTx: AppleTransaction = {
  transactionId: "2000001", bundleId: "org.hammersmodality.app", productId: EARLY_RECAP.appleProductId,
  type: "Consumable", appAccountToken: user,
};
const expected = { bundleId: "org.hammersmodality.app", userId: user, transactionId: "2000001" };

function memoryStore(): PurchaseStore & { rows: (PurchaseRow & { id: string })[] } {
  const rows: (PurchaseRow & { id: string })[] = [];
  return {
    rows,
    async findByExternalId(id) { return rows.find((r) => r.external_id === id) ?? null; },
    async insert(row) {
      if (rows.some((r) => r.external_id === row.external_id)) return { error: "duplicate_external" };
      if (row.product === "early_recap" && rows.some((r) => r.product === "early_recap" && r.user_id === row.user_id && r.block_start === row.block_start)) return { error: "duplicate_block" };
      const r = { ...row, id: `p${rows.length + 1}` }; rows.push(r); return { row: r };
    },
  };
}
const row = (ext: string, block = "2026-09-01"): PurchaseRow => ({ user_id: user, payer_user_id: user, product: "early_recap", channel: "apple", external_id: ext, amount_cents: 10000, block_start: block });

describe("Apple purchase verification", () => {
  it("valid transaction passes", () => expect(validateAppleTransaction(goodTx, expected)).toEqual({ ok: true }));
  it("invalid: wrong app, product, type, account, refunded, mismatched id", () => {
    expect(validateAppleTransaction({ ...goodTx, bundleId: "x" }, expected).ok).toBe(false);
    expect(validateAppleTransaction({ ...goodTx, productId: "x" }, expected).ok).toBe(false);
    expect(validateAppleTransaction({ ...goodTx, type: "Auto-Renewable Subscription" }, expected).ok).toBe(false);
    expect(validateAppleTransaction({ ...goodTx, appAccountToken: "someone-else" }, expected).ok).toBe(false);
    expect(validateAppleTransaction({ ...goodTx, revocationDate: 1 }, expected).ok).toBe(false);
    expect(validateAppleTransaction(goodTx, { ...expected, transactionId: "999" }).ok).toBe(false);
  });
  it("decodes Apple's signed payload", () => {
    const b64 = btoa(JSON.stringify(goodTx)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    expect(decodeJwsPayload<AppleTransaction>(`h.${b64}.s`).transactionId).toBe("2000001");
  });
  it("duplicate: the same transaction never grants twice", async () => {
    const s = memoryStore();
    expect((await recordPurchaseOnce(s, row("apple:2000001"))).status).toBe("granted");
    expect((await recordPurchaseOnce(s, row("apple:2000001"))).status).toBe("already_recorded");
    expect(s.rows).toHaveLength(1);
  });
  it("a second payment for the same block is refused by the one-per-block rule", async () => {
    const s = memoryStore();
    await recordPurchaseOnce(s, row("apple:1"));
    expect((await recordPurchaseOnce(s, row("stripe:pi_2"))).status).toBe("block_already_bought");
  });
});

describe("Recap delivery keeps the entitlement and never charges twice", () => {
  it("failure is recorded and a later retry delivers once", async () => {
    // mirrors deliverEarlyRecap's contract with an injected generator
    const gen = vi.fn().mockResolvedValueOnce({ ok: false, error: "boom" }).mockResolvedValueOnce({ ok: true, recapId: "r1" });
    const purchase = { status: "pending", attempts: 0 };
    const deliver = async () => {
      if (purchase.status === "delivered") return;
      const r = await gen({ periodStart: "2026-09-01", periodEnd: "2026-09-20" });
      if (r.ok) purchase.status = "delivered"; else { purchase.status = "failed"; purchase.attempts++; }
    };
    await deliver(); expect(purchase).toEqual({ status: "failed", attempts: 1 });
    await deliver(); expect(purchase.status).toBe("delivered");
    await deliver(); expect(gen).toHaveBeenCalledTimes(2);
    expect(gen).toHaveBeenCalledWith({ periodStart: "2026-09-01", periodEnd: "2026-09-20" });
  });
});

describe("Lesson hours and picks", () => {
  const now = new Date("2026-11-09T14:00:00Z"); // Monday 9:00 ET
  it("defaults: Mon–Fri 9–5 Eastern, 48h notice, 8 weeks, 1-hour lessons", () => {
    expect(DEFAULT_LESSON_HOURS).toMatchObject({ time_zone: "America/New_York", weekdays: [1, 2, 3, 4, 5], start_minute: 540, end_minute: 1020, min_notice_hours: 48, max_weeks_ahead: 8, lesson_minutes: 60 });
  });
  const slots = openSlots(DEFAULT_LESSON_HOURS, now, [{ start: "2026-11-11T15:00:00Z", end: "2026-11-11T16:00:00Z" }]);
  it("respects notice, hours, weekdays and busy time", () => {
    expect(slots[0].start).toBe("2026-11-11T14:00:00.000Z"); // Wed 9:00 ET (48h later)
    expect(slots.some((s) => s.start === "2026-11-11T15:00:00.000Z")).toBe(false); // busy
    expect(slots.every((s) => { const d = new Date(s.start).toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" }); return !["Sat", "Sun"].includes(d); })).toBe(true);
    const last = new Date(slots[slots.length - 1].start).getTime();
    expect(last).toBeLessThanOrEqual(now.getTime() + 8 * 7 * DAY);
    expect(slots.filter((s) => dayKey(s.start, "America/New_York") === "2026-11-12")).toHaveLength(8);
  });
  it("needs exactly 4 open times on 4 different days", () => {
    const byDay = new Map<string, string>();
    for (const s of slots) if (!byDay.has(dayKey(s.start, "America/New_York"))) byDay.set(dayKey(s.start, "America/New_York"), s.start);
    const four = [...byDay.values()].slice(0, 4);
    expect(validatePicks(four, slots, DEFAULT_LESSON_HOURS)).toEqual({ ok: true });
    const sameDay = slots.filter((s) => dayKey(s.start, "America/New_York") === "2026-11-12").slice(0, 2).map((s) => s.start);
    expect(validatePicks([...sameDay, four[2], four[3]], slots, DEFAULT_LESSON_HOURS).ok).toBe(false);
    expect(validatePicks(four.slice(0, 3), slots, DEFAULT_LESSON_HOURS).ok).toBe(false);
    expect(validatePicks([four[0], four[1], four[2], "2026-11-11T15:00:00Z"], slots, DEFAULT_LESSON_HOURS).ok).toBe(false);
  });
});

describe("Payment → booking request → owner confirm → 4 calendar events (Google mocked)", () => {
  const mkCal = () => {
    let n = 0;
    const cal: CalendarClient = {
      freeBusy: vi.fn(async () => []),
      createEvent: vi.fn(async () => { n++; return { id: `ev${n}`, meetUrl: `https://meet.google.com/abc-${n}` }; }),
      moveEvent: vi.fn(async () => {}),
    };
    return cal;
  };
  const sessions: SessionRow[] = [1, 2, 3, 4].map((i) => ({
    id: `s${i}`, lesson_number: i, start_at: `2026-11-1${i}T14:00:00.000Z`, end_at: `2026-11-1${i}T15:00:00.000Z`,
    status: "requested", requested_start_at: null, google_event_id: null, meet_url: null,
  }));
  it("creates 4 Meet events inviting the player and parent, idempotently", async () => {
    const cal = mkCal();
    const attendees = inviteList("kid@x.com", ["mom@x.com"], true);
    const done = await confirmSessions(cal, sessions, { bookingId: "b1", playerName: "Kid", attendees });
    expect(cal.createEvent).toHaveBeenCalledTimes(4);
    expect((cal.createEvent as any).mock.calls[0][0]).toMatchObject({ attendees: ["kid@x.com", "mom@x.com"], requestId: "b1-1" });
    expect(done.every((s) => s.status === "confirmed" && s.meet_url)).toBe(true);
    await confirmSessions(cal, done, { bookingId: "b1", playerName: "Kid", attendees });
    expect(cal.createEvent).toHaveBeenCalledTimes(4); // second confirm creates nothing new
  });
  it("owner-approved reschedule moves the event", async () => {
    const cal = mkCal();
    const s: SessionRow = { ...sessions[0], status: "reschedule_requested", requested_start_at: "2026-11-20T14:00:00Z", google_event_id: "ev1" };
    const moved = await approveReschedule(cal, s, 60);
    expect(cal.moveEvent).toHaveBeenCalledWith("ev1", "2026-11-20T14:00:00.000Z", "2026-11-20T15:00:00.000Z");
    expect(moved.status).toBe("confirmed");
    await expect(approveReschedule(cal, sessions[0], 60)).rejects.toThrow();
  });
});
