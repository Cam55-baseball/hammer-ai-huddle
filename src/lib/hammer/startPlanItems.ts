/**
 * What the Start card lists: the card types the planner builds, filtered to
 * the ones this player can receive. Sourced from the canonical card registry
 * (plus the pitching card, which the planner adds only for pitchers) — never
 * a hand-written menu.
 */
import { CARD_REGISTRY, type CardType } from "@/lib/wic/cardRegistry";

export interface StartPlanItem {
  key: string;
  title: string;
  detail: string;
}

const PLAIN: Partial<Record<CardType, { title: string; detail: string }>> = {
  warmup: { title: "Warm-up", detail: "Get your body ready before anything hard." },
  speed: { title: "Speed", detail: "Short, fast sprints to get quicker." },
  bat_speed: { title: "Bat speed", detail: "Swings built to add speed to your bat." },
  lift: { title: "Lift", detail: "Strength work, spaced with real rest days." },
  conditioning: { title: "Conditioning", detail: "Fitness work matched to your season." },
  cross_sport: { title: "Athletic movement", detail: "Moves from other sports that build athleticism." },
  recovery: { title: "Recovery", detail: "Mobility and tissue work so you bounce back." },
  nutrition: { title: "Nutrition", detail: "What to eat and drink today." },
  mental: { title: "Mental", detail: "A short focus or confidence task." },
};

const ORDER = [...CARD_REGISTRY].sort((a, b) => a.displayOrder - b.displayOrder).map((c) => c.cardType);

export function startPlanItems(positions: readonly string[]): StartPlanItem[] {
  const items: StartPlanItem[] = [];
  for (const t of ORDER) {
    const p = PLAIN[t];
    if (p) items.push({ key: t, ...p });
  }
  const pitcher = positions.some((x) => /^(p|rhp|lhp|sp|rp)$|pitch/i.test(x));
  if (pitcher) {
    items.splice(1, 0, {
      key: "pitching",
      title: "Pitching & arm care",
      detail: "Throwing and arm care built around when you pitch.",
    });
  }
  return items;
}
