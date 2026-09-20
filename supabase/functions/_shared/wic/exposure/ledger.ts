/**
 * Step 14 A — the Exposure Ledger (TI-1, §5.1 / §5.2).
 *
 * Pure. Turns raw training history into one number per channel and tier per
 * day, and computes Recent Max (RM28): the biggest SINGLE-DAY total in each
 * channel and tier over the 28 days before today. Channels are never added
 * together.
 */

import {
  type Channel,
  CHANNELS,
  type ExposureDay,
  type ExposureEntry,
  EXPOSURE_VERSION,
  type Rm28,
} from "./types.ts";
import type { RawShadowData } from "../schedule/tissueCost/shadow/adapter.ts";

export const RM28_WINDOW_DAYS = 28;

/** Catalog facts the ledger needs about a movement. */
export interface CatalogFact {
  slug: string;
  exposure_channel: string | null;
  plyo_tier: number | null;
  contacts_per_rep: number | null;
  category: string | null;
  intensity_class: string | null;
  default_total_reps?: number | null;
  default_distance_feet?: number | null;
  substitution_family?: string | null;
}

export type CatalogMap = Record<string, CatalogFact>;

/** Maps a catalog row onto a ledger channel + tier. Unknown → not governed. */
export function classify(fact: CatalogFact | undefined | null):
  | { channel: Channel; tier: string }
  | null {
  if (!fact) return null;
  const ch = (fact.exposure_channel ?? "").toLowerCase();
  const cat = (fact.category ?? "").toLowerCase();
  if (cat === "bat_speed") return { channel: "SWING", tier: "high" };
  if (ch === "lifting") {
    const heavy = (fact.intensity_class ?? "").toLowerCase();
    return {
      channel: "LIFT",
      tier: heavy === "max_effort" || heavy === "heavy" || heavy === "high" ? "main" : "other",
    };
  }
  if (ch === "ub_plyo") {
    const t = fact.plyo_tier ?? 1;
    return { channel: "UB_PLYO", tier: `U${Math.min(3, Math.max(1, t))}` };
  }
  if (ch === "elastic" || ch === "shock") {
    const t = fact.plyo_tier ?? 2;
    return { channel: "JUMP", tier: `T${Math.min(3, Math.max(1, t))}` };
  }
  if (ch === "sprint") {
    const resisted = /sled|tow|hill|resisted|band/.test(fact.slug);
    return { channel: "SPRINT", tier: resisted ? "resisted" : "max_velocity" };
  }
  if (ch === "throwing") {
    const cat2 = (fact.category ?? "").toLowerCase();
    if (cat2 === "arm_care") return { channel: "THROW", tier: "low" };
    return { channel: "THROW", tier: "high" };
  }
  return null; // low_load and anything unmapped carries no spike risk
}

/** Exposure produced by one set of a movement, in that channel's unit. */
export function amountPerSet(
  fact: CatalogFact,
  channel: Channel,
  reps: number | null,
  distanceFeet: number | null,
): number {
  const r = reps && reps > 0 ? reps : 1;
  switch (channel) {
    case "LIFT":
      return 1; // hard sets
    case "JUMP":
    case "UB_PLYO":
      return r * (fact.contacts_per_rep ?? 1);
    case "SPRINT":
      return Math.round(((distanceFeet ?? fact.default_distance_feet ?? 0) / 3) * r);
    case "THROW":
    case "SWING":
      return r;
    default:
      return 0;
  }
}

const addEntry = (into: ExposureEntry[], e: ExposureEntry) => {
  if (!(e.amount > 0)) return;
  const hit = into.find((x) => x.channel === e.channel && x.tier === e.tier && x.source === e.source);
  if (hit) hit.amount += e.amount;
  else into.push({ ...e });
};

const SPORT_INTENSITY: Record<string, number> = {
  light: 0.5,
  moderate: 1,
  medium: 1,
  hard: 1.5,
  heavy: 1.5,
  showcase: 1.5,
};

/**
 * §5.1 — a day-by-day ledger from the same raw inputs the scheduler reads.
 * Completed work counts; a prescription with no log still counts as done
 * unless it was marked skipped (Step 11 rule).
 */
export function buildLedger(raw: RawShadowData, catalog: CatalogMap): ExposureDay[] {
  const byDate = new Map<string, ExposureEntry[]>();
  const day = (d: string) => {
    let e = byDate.get(d);
    if (!e) { e = []; byDate.set(d, e); }
    return e;
  };

  const skipped = new Set<string>();
  for (const p of raw.prescriptions ?? []) {
    if ((p.status ?? "").toLowerCase() === "skipped") {
      skipped.add(`${p.plan_date}|${p.movement_slug ?? ""}`);
    }
  }
  const logged = new Map<string, number>();
  for (const l of raw.sessionLogs ?? []) {
    logged.set(`${l.plan_date}|${l.movement_slug ?? ""}`, Number(l.sets_completed ?? 0));
  }

  for (const p of raw.prescriptions ?? []) {
    if (p.plan_date > raw.today) continue;
    const key = `${p.plan_date}|${p.movement_slug ?? ""}`;
    if (skipped.has(key)) continue;
    const fact = catalog[p.movement_slug ?? ""];
    const cls = classify(fact);
    if (!cls || !fact) continue;
    const sets = logged.has(key) ? (logged.get(key) as number) : Number(p.sets ?? 0);
    if (!(sets > 0)) continue;
    const per = amountPerSet(fact, cls.channel, null, null);
    addEntry(day(p.plan_date), {
      channel: cls.channel,
      tier: cls.tier,
      amount: sets * (per || 1),
      source: "prescribed",
    });
  }

  // Throwing reps logged directly (high intent when a velocity metric exists).
  for (const t of raw.throwingReps ?? []) {
    const d = String(t.created_at ?? "").slice(0, 10);
    if (!d || d > raw.today) continue;
    const metric = (t.metric ?? "").toLowerCase();
    const tier = metric.includes("velo") || metric.includes("intent") ? "high" : "moderate";
    addEntry(day(d), { channel: "THROW", tier, amount: 1, source: "throwing_log" });
  }

  // Sprint work logged in speed sessions — yards at high effort.
  for (const s of raw.speedSessions ?? []) {
    const d = String(s.session_date ?? "").slice(0, 10);
    if (!d || d > raw.today) continue;
    let yards = 0;
    const dist = s.distances as unknown;
    if (Array.isArray(dist)) {
      for (const item of dist) {
        const y = Number((item as Record<string, unknown>)?.yards ?? (item as Record<string, unknown>)?.distance ?? 0);
        const reps = Number((item as Record<string, unknown>)?.reps ?? 1);
        if (y > 0) yards += y * (reps > 0 ? reps : 1);
      }
    }
    addEntry(day(d), { channel: "SPRINT", tier: "max_velocity", amount: yards, source: "speed_session" });
  }

  // Sport load — practice minutes × intensity, games, catcher innings.
  for (const pr of raw.practices ?? []) {
    const d = String(pr.scheduled_date ?? "").slice(0, 10);
    if (!d || d > raw.today) continue;
    if ((pr.status ?? "").toLowerCase() === "cancelled") continue;
    const mins = Number(pr.duration_minutes ?? 0);
    const mult = SPORT_INTENSITY[(pr.intensity ?? "moderate").toLowerCase()] ?? 1;
    addEntry(day(d), { channel: "SPORT", tier: "practice", amount: mins * mult, source: "practice" });
  }
  for (const g of raw.games ?? []) {
    const d = String(g.game_date ?? "").slice(0, 10);
    if (!d || d > raw.today) continue;
    if (g.deleted_at || g.ignored_for_training) continue;
    addEntry(day(d), {
      channel: "SPORT",
      tier: "game",
      amount: g.is_doubleheader ? 2 : 1,
      source: "game",
    });
    const positions = (g.my_positions ?? []).map((p) => String(p).toUpperCase());
    if (positions.includes("C")) {
      addEntry(day(d), {
        channel: "SPORT",
        tier: "catcher_innings",
        amount: (g.is_doubleheader ? 2 : 1) * 7,
        source: "catcher",
      });
    }
  }

  return [...byDate.entries()]
    .map(([date, entries]) => ({
      date,
      entries: entries.sort((a, b) =>
        a.channel === b.channel
          ? a.tier === b.tier ? a.source.localeCompare(b.source) : a.tier.localeCompare(b.tier)
          : a.channel.localeCompare(b.channel)
      ),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const dayTotal = (d: ExposureDay, channel: Channel, tier?: string) =>
  d.entries
    .filter((e) => e.channel === channel && (tier == null || e.tier === tier))
    .reduce((s, e) => s + e.amount, 0);

/** §5.2 — the biggest single-day total per channel and tier, last 28 days. */
export function computeRm28(days: ExposureDay[], today: string, windowDays = RM28_WINDOW_DAYS): Rm28 {
  const start = isoAdd(today, -windowDays);
  const window = days.filter((d) => d.date >= start && d.date < today);
  const byChannel: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  const onDate: Record<string, string | null> = {};
  for (const ch of CHANNELS) {
    byChannel[ch] = 0;
    onDate[ch] = null;
    for (const d of window) {
      const t = dayTotal(d, ch);
      if (t > byChannel[ch]) { byChannel[ch] = t; onDate[ch] = d.date; }
      for (const e of d.entries.filter((x) => x.channel === ch)) {
        const key = `${ch}:${e.tier}`;
        const tierTotal = dayTotal(d, ch, e.tier);
        if (tierTotal > (byTier[key] ?? 0)) byTier[key] = tierTotal;
      }
    }
  }
  return { byChannel, byTier, onDate, daysObserved: window.length };
}

/** True when the given day set a new channel high — a "build day" (§5.3). */
export function wasBuildDay(days: ExposureDay[], date: string, channel: Channel): boolean {
  const theDay = days.find((d) => d.date === date);
  if (!theDay) return false;
  const total = dayTotal(theDay, channel);
  if (!(total > 0)) return false;
  const prior = computeRm28(days, date);
  // A cold-start day is not a build day: the floor rule governs it instead.
  if (!(prior.byChannel[channel] > 0)) return false;
  return total > prior.byChannel[channel];
}

/** Rows for wk_exposure_daily — channel roll-up plus each tier. */
export function ledgerRows(userId: string, d: ExposureDay) {
  const rows: Array<Record<string, unknown>> = [];
  for (const ch of CHANNELS) {
    const entries = d.entries.filter((e) => e.channel === ch);
    if (entries.length === 0) continue;
    const sources: Record<string, number> = {};
    for (const e of entries) sources[e.source] = (sources[e.source] ?? 0) + e.amount;
    rows.push({
      user_id: userId,
      date: d.date,
      channel: ch,
      tier: "all",
      total: entries.reduce((s, e) => s + e.amount, 0),
      sources,
      version: EXPOSURE_VERSION,
    });
    const tiers = [...new Set(entries.map((e) => e.tier))].sort();
    for (const tier of tiers) {
      const te = entries.filter((e) => e.tier === tier);
      const ts: Record<string, number> = {};
      for (const e of te) ts[e.source] = (ts[e.source] ?? 0) + e.amount;
      rows.push({
        user_id: userId,
        date: d.date,
        channel: ch,
        tier,
        total: te.reduce((s, e) => s + e.amount, 0),
        sources: ts,
        version: EXPOSURE_VERSION,
      });
    }
  }
  return rows;
}

/** Date maths without a Date object's timezone surprises. */
export function isoAdd(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
