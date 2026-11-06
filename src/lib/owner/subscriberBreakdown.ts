import { TIER_DISPLAY_NAMES } from "@/constants/tiers";
import { heldPlans } from "../../../supabase/functions/_shared/programAccess";
type PlayerPlan = { user_id: string; tier: string | null; subscribed_modules: string[] | null };
type StaffPlan = { user_id: string; plan: string; included_seats: number; extra_seats: number };
export function subscriberBreakdown(players: PlayerPlan[], staff: StaffPlan[], sponsorships: { player_id: string; tier: string }[]) {
  const counts = new Map<string, number>();
  const add = (label: string) => counts.set(label, (counts.get(label) ?? 0) + 1);
  // Owner Nov 6 r5: each player's plans come from the shared activePlans judge (stored keys), never
  // one saved tier copied onto every sport. Sponsorship rows are also counted below, as before.
  const playerPlans = new Map<string, number>();
  for (const row of players) {
    if (!row.tier || !TIER_DISPLAY_NAMES[row.tier]) continue; // no current plan saved
    const held = heldPlans(row.subscribed_modules ?? [], "baseball");
    playerPlans.set(row.user_id, held.length);
    for (const { sport, plan } of held) add(`${sport.charAt(0).toUpperCase() + sport.slice(1)} - ${TIER_DISPLAY_NAMES[plan]}`);
  }
  for (const row of staff) if (row.plan === "coach" || row.plan === "organization") add(row.plan === "coach" ? "Hammers Coach" : `Hammers Organization (${row.included_seats + row.extra_seats} coach seats)`);
  for (const row of sponsorships) if (TIER_DISPLAY_NAMES[row.tier]) add(`Sponsorship - ${TIER_DISPLAY_NAMES[row.tier]}`);
  const total = new Set([...players.filter((p) => (playerPlans.get(p.user_id) ?? 0) > 0).map((p) => p.user_id), ...staff.map((s) => s.user_id), ...sponsorships.map((s) => s.player_id)]).size;
  return { totalActiveSubscribers: total, moduleBreakdown: [...counts].map(([module, count]) => ({ module, rawModule: module, count, percentage: total ? count / total * 100 : 0 })) };
}