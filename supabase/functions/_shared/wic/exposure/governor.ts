/**
 * Step 14 B — the Spike Governor (TI-2, §5.3).
 *
 * Pure and deterministic. Compares today's planned Hammers work in each
 * channel against Recent Max (RM28) and trims Hammers' own rows — never team
 * practice — until the day sits inside the envelope. The card always ships:
 * the last resort is dropping a row, never failing.
 *
 * TL-11 reduce never remove the card. TL-12 every adjustment says why.
 */

import {
  type Channel,
  CHANNEL_LABEL,
  CHANNEL_UNIT,
  GOVERNOR_VERSION,
  type GovAlternative,
  type GovItem,
  LOWEST_TIER,
  type Rm28,
  TIER_ORDER,
  type Trim,
} from "./types.ts";

export const BUILD_RATIO = 1.10;
export const MAINTAIN_RATIO = 1.00;

export type BlockId = "B1" | "B2" | "B3" | "B4" | "B5" | null;

export interface GovernorContext {
  block: BlockId;
  inSeason: boolean;
  growthMode: boolean;
  /** Channels that had a build day yesterday — no two in a row (§5.3). */
  buildYesterday?: Channel[];
  /** Pitch Smart required rest day: no prescribed pitching or high-intent throwing. */
  pitchSmartRestDay?: boolean;
}

/** §5.3 — the ratio that applies to a channel today. */
export function ratioFor(channel: Channel, ctx: GovernorContext): number {
  if (ctx.inSeason || ctx.growthMode || ctx.block === "B5") return MAINTAIN_RATIO;
  if (ctx.block === "B3") {
    return channel === "THROW" || channel === "SWING" ? BUILD_RATIO : MAINTAIN_RATIO;
  }
  if (ctx.block === "B1" || ctx.block === "B2" || ctx.block === "B4") return BUILD_RATIO;
  return MAINTAIN_RATIO;
}

const amount = (i: { sets: number; amountPerSet: number }) => i.sets * i.amountPerSet;

const round1 = (n: number) => Math.round(n * 10) / 10;

function capSentence(channel: Channel, cap: number, rm: number): string {
  const unit = CHANNEL_UNIT[channel];
  const label = CHANNEL_LABEL[channel];
  const recent = `your biggest ${label.toLowerCase()} day in the last 4 weeks was ${round1(rm)} ${unit}.`;
  if (cap < 1) return `${label} is on hold today — ${recent}`;
  return `${label} capped at ${Math.floor(cap)} ${unit} today — ${recent}`;
}

function coldStartSentence(channel: Channel): string {
  return `${CHANNEL_LABEL[channel]} restart easy — nothing logged in the last 4 weeks, so today starts at the lightest legal version.`;
}

export interface GovernorResult {
  version: string;
  items: GovItem[];
  trims: Trim[];
  reasons: string[];
  /** channel → { planned, cap, rm28, ratio, coldStart, finalTotal } */
  diagnostics: Record<string, Record<string, unknown>>;
}

/**
 * Runs after dose resolution and the wave re-clamp, before validation.
 * `items` are Hammers' own prescribed rows; `teamLoad` is sport work already
 * on today's calendar and is counted but never trimmed.
 */
export function runGovernor(input: {
  items: GovItem[];
  teamLoad?: Array<{ channel: Channel; amount: number }>;
  rm28: Rm28;
  ctx: GovernorContext;
  alternatives?: GovAlternative[];
}): GovernorResult {
  const items = input.items.map((i) => ({ ...i }));
  const trims: Trim[] = [];
  const reasons: string[] = [];
  const diagnostics: Record<string, Record<string, unknown>> = {};
  const alternatives = input.alternatives ?? [];

  // Pitch Smart first — a required rest day blocks prescribed pitching and
  // high-intent throwing outright. Nothing may reopen it.
  if (input.ctx.pitchSmartRestDay) {
    for (let idx = items.length - 1; idx >= 0; idx--) {
      const it = items[idx];
      if (it.channel !== "THROW" || it.tier !== "high") continue;
      trims.push({
        slug: it.slug,
        channel: "THROW",
        action: "blocked",
        from: { slug: it.slug, tier: it.tier, sets: it.sets, amount: amount(it) },
        to: null,
        reason: "Throwing is on hold today — your pitch count needs the rest days first.",
      });
      items.splice(idx, 1);
    }
    if (trims.length > 0) reasons.push(trims[trims.length - 1].reason);
  }

  const channels = [...new Set(items.map((i) => i.channel))].sort();

  for (const channel of channels) {
    const rm = input.rm28.byChannel[channel] ?? 0;
    const teamToday = (input.teamLoad ?? [])
      .filter((t) => t.channel === channel)
      .reduce((s, t) => s + t.amount, 0);
    let ratio = ratioFor(channel, input.ctx);
    const noBackToBack = (input.ctx.buildYesterday ?? []).includes(channel);
    if (noBackToBack) ratio = MAINTAIN_RATIO;

    const coldStart = !(rm > 0);
    const plannedBefore = items
      .filter((i) => i.channel === channel)
      .reduce((s, i) => s + amount(i), 0) + teamToday;

    if (coldStart) {
      // §5.3 cold start — floor sets at the lowest legal tier, and today's
      // session becomes the new RM28 for this channel.
      let changed = false;
      for (let idx = items.length - 1; idx >= 0; idx--) {
        const it = items[idx];
        if (it.channel !== channel) continue;
        const before = { slug: it.slug, tier: it.tier, sets: it.sets, amount: amount(it) };
        const lowest = LOWEST_TIER[channel];
        if (it.tier !== lowest) {
          const alt = pickAlternative(alternatives, it, channel, lowest);
          if (alt) {
            items[idx] = { ...alt, sets: alt.floorSets, isTeamLoad: false } as GovItem;
            changed = true;
            trims.push({
              slug: it.slug,
              channel,
              action: "tier_step_down",
              from: before,
              to: { slug: alt.slug, tier: alt.tier, sets: alt.floorSets, amount: alt.floorSets * alt.amountPerSet },
              reason: coldStartSentence(channel),
            });
            continue;
          }
        }
        if (it.sets > it.floorSets) {
          it.sets = it.floorSets;
          changed = true;
          trims.push({
            slug: it.slug,
            channel,
            action: "sets_removed",
            from: before,
            to: { slug: it.slug, tier: it.tier, sets: it.sets, amount: amount(it) },
            reason: coldStartSentence(channel),
          });
        }
      }
      if (changed) reasons.push(coldStartSentence(channel));
      diagnostics[channel] = {
        rm28: 0,
        ratio,
        cap: null,
        cold_start: true,
        planned_before: plannedBefore,
        planned_after: items.filter((i) => i.channel === channel).reduce((s, i) => s + amount(i), 0) + teamToday,
        no_back_to_back: noBackToBack,
      };
      continue;
    }

    const cap = ratio * rm;
    let planned = plannedBefore;
    let trimmedThisChannel = false;

    // Order: heaviest tier first, then biggest row, then slug — deterministic.
    const order = (i: GovItem) => {
      const t = TIER_ORDER[channel].indexOf(i.tier);
      return t < 0 ? 99 : t;
    };
    const sortRows = () =>
      items
        .map((it, idx) => ({ it, idx }))
        .filter((x) => x.it.channel === channel && !x.it.isTeamLoad)
        .sort((a, b) =>
          order(a.it) - order(b.it) ||
          amount(b.it) - amount(a.it) ||
          a.it.slug.localeCompare(b.it.slug)
        );

    // 1) Remove sets toward the envelope floor.
    for (const { it } of sortRows()) {
      while (planned > cap && it.sets > it.floorSets) {
        const before = { slug: it.slug, tier: it.tier, sets: it.sets, amount: amount(it) };
        it.sets -= 1;
        planned -= it.amountPerSet;
        trimmedThisChannel = true;
        trims.push({
          slug: it.slug,
          channel,
          action: "sets_removed",
          from: before,
          to: { slug: it.slug, tier: it.tier, sets: it.sets, amount: amount(it) },
          reason: capSentence(channel, cap, rm),
        });
      }
      if (planned <= cap) break;
    }

    // 2) Still over — step down one tier inside the same substitution family.
    if (planned > cap) {
      for (const { it, idx } of sortRows()) {
        if (planned <= cap) break;
        const tiers = TIER_ORDER[channel];
        const pos = tiers.indexOf(it.tier);
        if (pos < 0 || pos >= tiers.length - 1) continue;
        // One step down; if that tier has no sibling in the family, keep
        // stepping lighter rather than leaving the spike in place.
        let alt: GovAlternative | null = null;
        for (let t = pos + 1; t < tiers.length && !alt; t++) {
          alt = pickAlternative(alternatives, it, channel, tiers[t]);
        }
        if (!alt) continue;
        const before = { slug: it.slug, tier: it.tier, sets: it.sets, amount: amount(it) };
        const sets = Math.max(alt.floorSets, Math.min(it.sets, it.sets));
        const replaced: GovItem = { ...alt, sets, isTeamLoad: false };
        planned = planned - before.amount + amount(replaced);
        items[idx] = replaced;
        trimmedThisChannel = true;
        trims.push({
          slug: it.slug,
          channel,
          action: "tier_step_down",
          from: before,
          to: { slug: replaced.slug, tier: replaced.tier, sets: replaced.sets, amount: amount(replaced) },
          reason: capSentence(channel, cap, rm),
        });
      }
    }

    // 3) Still over — drop the row. The Safe Plan ladder keeps the card.
    if (planned > cap) {
      for (const { it } of sortRows().reverse()) {
        if (planned <= cap) break;
        const idx = items.indexOf(it);
        if (idx < 0) continue;
        const before = { slug: it.slug, tier: it.tier, sets: it.sets, amount: amount(it) };
        items.splice(idx, 1);
        planned -= before.amount;
        trimmedThisChannel = true;
        trims.push({
          slug: it.slug,
          channel,
          action: "row_dropped",
          from: before,
          to: null,
          reason: capSentence(channel, cap, rm),
        });
      }
    }

    if (trimmedThisChannel) reasons.push(capSentence(channel, cap, rm));
    diagnostics[channel] = {
      rm28: rm,
      ratio,
      cap,
      cold_start: false,
      planned_before: plannedBefore,
      planned_after: planned,
      team_load: teamToday,
      no_back_to_back: noBackToBack,
    };
  }

  return {
    version: GOVERNOR_VERSION,
    items,
    trims,
    reasons: [...new Set(reasons)],
    diagnostics,
  };
}

function pickAlternative(
  alternatives: GovAlternative[],
  from: GovItem,
  channel: Channel,
  tier: string,
): GovAlternative | null {
  const pool = alternatives
    .filter((a) =>
      a.channel === channel &&
      a.tier === tier &&
      a.substitutionFamily != null &&
      a.substitutionFamily === from.substitutionFamily
    )
    .sort((a, b) => a.amountPerSet - b.amountPerSet || a.slug.localeCompare(b.slug));
  return pool[0] ?? null;
}
