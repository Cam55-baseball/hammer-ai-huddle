// Plan 4 D — live Stripe prices for the Coach and Organization plans (created 2026-10-12).
export const STAFF_PRICES = {
  coach: "price_1UPsB6Gc5QIzbAH6k6wtj6NI",        // Hammers Coach, $300/month
  organization: "price_1UPsB7Gc5QIzbAH6Q42AlTdT", // Hammers Organization, $1,000/month, 5 seats included
  extraSeat: "price_1UPsB8Gc5QIzbAH6l4p2C4oU",    // Extra Coach Seat, $150/month per seat
} as const;
export const ORG_INCLUDED_SEATS = 5;
export const MAX_EXTRA_SEATS = 100;

/** Reads a Stripe subscription's items into a staff plan, or null if it holds no staff price. */
export function staffPlanFromItems(items: Array<{ price: { id: string }; quantity?: number | null }>) {
  const org = items.find((i) => i.price.id === STAFF_PRICES.organization);
  const coach = items.find((i) => i.price.id === STAFF_PRICES.coach);
  const seats = items.find((i) => i.price.id === STAFF_PRICES.extraSeat);
  if (org) return { plan: "organization" as const, included_seats: ORG_INCLUDED_SEATS, extra_seats: seats?.quantity ?? 0 };
  if (coach) return { plan: "coach" as const, included_seats: 0, extra_seats: 0 };
  return null;
}
