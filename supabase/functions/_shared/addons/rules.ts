// Owner-approved Nov 6 add-on rules. Pure: shared by edge functions and app tests.

export const EARLY_RECAP = {
  product: "early_recap" as const,
  priceCents: 10000,
  stripePriceId: "price_1UYvr6Gc5QIzbAH6Iz0qCvzl",
  appleProductId: "com.hammersmodality.app.early_recap_6wk",
  minDays: 14,
  blockDays: 42,
};

export const ONLINE_LESSONS = {
  product: "online_lessons" as const,
  priceCents: 2000000,
  stripePriceId: "price_1UYvr6Gc5QIzbAH6to4iebWW",
  lessonCount: 4,
};

export type AddonProduct = "early_recap" | "online_lessons";
const DAY = 86400000;

export function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The 42-day block the athlete is in, counted from the same anchor the recap countdown uses. */
export function currentBlock(anchor: Date, now: Date) {
  const days = Math.max(0, Math.floor((now.getTime() - anchor.getTime()) / DAY));
  const index = Math.floor(days / EARLY_RECAP.blockDays);
  const start = new Date(anchor.getTime() + index * EARLY_RECAP.blockDays * DAY);
  return { index, start, startDate: dateOnly(start), dayInBlock: days % EARLY_RECAP.blockDays };
}

export type RecapEligibility =
  | { ok: true; blockStart: string }
  | { ok: false; reason: "no_plan" | "too_early" | "already_bought" | "no_start"; blockStart?: string; daysLeft?: number; message: string };

export function earlyRecapEligibility(input: {
  hasActivePlan: boolean;
  anchor: Date | null;
  now: Date;
  boughtBlockStarts: string[];
}): RecapEligibility {
  if (!input.hasActivePlan) return { ok: false, reason: "no_plan", message: "Needs an active plan." };
  if (!input.anchor) return { ok: false, reason: "no_start", message: "Start your plan first." };
  const b = currentBlock(input.anchor, input.now);
  if (input.boughtBlockStarts.includes(b.startDate)) {
    return { ok: false, reason: "already_bought", blockStart: b.startDate, message: "You already got this block's early recap." };
  }
  if (b.dayInBlock < EARLY_RECAP.minDays) {
    const daysLeft = EARLY_RECAP.minDays - b.dayInBlock;
    return {
      ok: false, reason: "too_early", blockStart: b.startDate, daysLeft,
      message: `Opens after 2 weeks of this block — ${daysLeft} day${daysLeft === 1 ? "" : "s"} to go.`,
    };
  }
  return { ok: true, blockStart: b.startDate };
}

export function isUnder18(dob: string | null | undefined, now: Date): boolean {
  if (!dob) return true; // unknown birthday: treat as a minor (safest)
  const d = new Date(dob + "T00:00:00Z");
  if (isNaN(d.getTime())) return true;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age < 18;
}

export type PurchaseGate = "buy" | "ask_parent" | "blocked_no_parent";

/** Under 18: the linked parent approves and pays. No linked parent: blocked. */
export function purchaseGate(input: { under18: boolean; hasLinkedParent: boolean }): PurchaseGate {
  if (!input.under18) return "buy";
  return input.hasLinkedParent ? "ask_parent" : "blocked_no_parent";
}

/** Server check that the payer may pay for this athlete. */
export function payerAllowed(input: { payerId: string; athleteId: string; athleteUnder18: boolean; payerIsLinkedParent: boolean }): boolean {
  if (input.athleteUnder18) return input.payerIsLinkedParent && input.payerId !== input.athleteId;
  return input.payerId === input.athleteId;
}
