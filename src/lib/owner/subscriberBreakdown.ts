import { TIER_DISPLAY_NAMES } from "@/constants/tiers";
type PlayerPlan = { user_id: string; tier: string | null; subscribed_modules: string[] | null };
type StaffPlan = { user_id: string; plan: string; included_seats: number; extra_seats: number };
export function subscriberBreakdown(players: PlayerPlan[], staff: StaffPlan[], sponsorships: { player_id: string; tier: string }[]) {
  const counts = new Map<string, number>();
  const add = (label: string) => counts.set(label, (counts.get(label) ?? 0) + 1);
  for (const row of players) {
    if (!row.tier || !TIER_DISPLAY_NAMES[row.tier]) continue;
    for (const sport of new Set((row.subscribed_modules ?? []).map((m) => m.split("_")[0]).filter((s) => s === "baseball" || s === "softball"))) add(`${sport.charAt(0).toUpperCase() + sport.slice(1)} - ${TIER_DISPLAY_NAMES[row.tier]}`);
  }
  for (const row of staff) if (row.plan === "coach" || row.plan === "organization") add(row.plan === "coach" ? "Hammers Coach" : `Hammers Organization (${row.included_seats + row.extra_seats} coach seats)`);
  for (const row of sponsorships) if (TIER_DISPLAY_NAMES[row.tier]) add(`Sponsorship - ${TIER_DISPLAY_NAMES[row.tier]}`);
  const total = new Set([...players.filter((p) => !!p.tier && !!TIER_DISPLAY_NAMES[p.tier]).map((p) => p.user_id), ...staff.map((s) => s.user_id), ...sponsorships.map((s) => s.player_id)]).size;
  return { totalActiveSubscribers: total, moduleBreakdown: [...counts].map(([module, count]) => ({ module, rawModule: module, count, percentage: total ? count / total * 100 : 0 })) };
}