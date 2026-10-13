// v3.1 Phase 11 — organization sponsorship of a player's plan (owner decisions 2026-10-13).
// Price = the player's regular monthly plan price. The org is the Stripe customer; each sponsored
// player is its own Stripe subscription (metadata.sponsorship_id) so invoices name the player.
export const SPONSOR_PRICES: Record<string, Record<string, string>> = {
  pitcher: { baseball: "price_1SKpoEGc5QIzbAH6FlPRhazY", softball: "price_1SPBwcGc5QIzbAH6XUKF9dNy" },
  "5tool": { baseball: "price_1T3jzKGc5QIzbAH6deZ4Eyit", softball: "price_1T3jxwGc5QIzbAH65j6KlJzQ" },
  golden2way: { baseball: "price_1T3jzxGc5QIzbAH6XoqPgC1b", softball: "price_1T3jycGc5QIzbAH62T36Iigg" },
};
export const GRACE_DAYS = 14;
export const SPONSOR_MARK = "sponsor:";

export interface SponsorshipRow {
  id: string; status: string; sport: string; tier: string;
  paid_through?: string | null; grace_until?: string | null; current_period_end?: string | null;
}

/** Does this sponsorship give the player access right now? */
export function sponsorshipGivesAccess(s: SponsorshipRow, now = Date.now()): boolean {
  const until = (v?: string | null) => !!v && new Date(v).getTime() > now;
  switch (s.status) {
    case "active":
    case "scheduled": return true;            // scheduled = player's own paid period still running, org billing starts at its end
    case "paused": return until(s.paid_through); // access through the period already paid
    case "canceled": return until(s.grace_until); // 14-day grace
    default: return false;
  }
}

export function graceUntil(from = Date.now()) {
  return new Date(from + GRACE_DAYS * 86400_000).toISOString();
}

/** Maps a Stripe subscription event onto the sponsorship's status fields. */
export function sponsorshipFromStripe(sub: any, prev: { status: string; grace_until?: string | null }) {
  const end = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end;
  const periodEnd = end ? new Date(end * 1000).toISOString() : null;
  if (sub.status === "canceled") {
    return { status: "canceled", current_period_end: periodEnd, grace_until: prev.grace_until ?? graceUntil() };
  }
  if (sub.pause_collection) return { status: "paused", current_period_end: periodEnd, paid_through: periodEnd };
  if (sub.status === "trialing") return { status: "scheduled", current_period_end: periodEnd };
  if (sub.status === "active" || sub.status === "past_due") return { status: "active", current_period_end: periodEnd, paid_through: null };
  return { status: prev.status, current_period_end: periodEnd };
}

/** Recomputes the sponsored module on the player's access row. Never touches the player's own paid entries. */
export async function refreshSponsoredAccess(admin: any, playerId: string) {
  const { data: rows } = await admin.from("org_sponsorships").select("*").eq("player_id", playerId);
  const wanted = new Map<string, any>();
  for (const s of rows ?? []) if (sponsorshipGivesAccess(s)) wanted.set(`${s.sport}_${s.tier}`, s);

  const { data: cur } = await admin.from("subscriptions").select("subscribed_modules, module_subscription_mapping").eq("user_id", playerId).maybeSingle();
  const modules: string[] = Array.isArray(cur?.subscribed_modules) ? [...cur.subscribed_modules] : [];
  const mapping: Record<string, any> = { ...(cur?.module_subscription_mapping ?? {}) };
  let changed = false;
  for (const k of Object.keys(mapping)) {
    const sid = String(mapping[k]?.subscription_id ?? "");
    if (sid.startsWith(SPONSOR_MARK) && !wanted.has(k)) {
      delete mapping[k]; const i = modules.indexOf(k); if (i >= 0) modules.splice(i, 1); changed = true;
    }
  }
  for (const [k, s] of wanted) {
    const own = String(mapping[k]?.subscription_id ?? "").startsWith("sub_");
    if (!own) {
      mapping[k] = { subscription_id: SPONSOR_MARK + s.id, status: s.status, current_period_end: s.current_period_end ?? null, sponsored: true };
      changed = true;
    }
    if (!modules.includes(k)) { modules.push(k); changed = true; }
  }
  if (!changed) return modules;
  const row: Record<string, unknown> = { user_id: playerId, subscribed_modules: modules, module_subscription_mapping: mapping, status: modules.length ? "active" : "inactive" };
  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) console.warn("[sponsorship] access write failed", error.message);
  return modules;
}

export async function notifyPlayer(admin: any, playerId: string, fromUserId: string, body: string) {
  try { await admin.from("coach_messages").insert({ athlete_id: playerId, coach_id: fromUserId, body, parent_copied: true }); }
  catch (e) { console.warn("[sponsorship] notify failed", e instanceof Error ? e.message : e); }
}
