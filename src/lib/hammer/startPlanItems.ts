/**
 * What the Start card lists: the card types the planner builds, filtered to
 * the ones this player can receive (sport, position, pitcher / position /
 * 2-Way, age). Sourced from the canonical card registry (plus the pitching
 * card, which the planner adds only for pitchers) — never a hand-written menu.
 */
import { CARD_REGISTRY, type CardType } from "@/lib/wic/cardRegistry";

export interface StartPlanItem {
  key: string;
  title: string;
  detail: string;
}

export interface StartPlanPlayer {
  positions: readonly string[];
  sport?: string | null;
  age?: number | null;
}

export type PlayerRole = "pitcher" | "position" | "two_way";

const isPitcherPos = (x: string) => /^(p|rhp|lhp|sp|rp)$|pitch/i.test(x.trim());

export function playerRole(positions: readonly string[]): PlayerRole {
  const p = positions.some(isPitcherPos);
  const other = positions.some((x) => x.trim() && !isPitcherPos(x));
  return p && other ? "two_way" : p ? "pitcher" : "position";
}

export function startPlanItems(input: readonly string[] | StartPlanPlayer): StartPlanItem[] {
  const player: StartPlanPlayer = Array.isArray(input) ? { positions: input as readonly string[] } : (input as StartPlanPlayer);
  const softball = String(player.sport ?? "").toLowerCase() === "softball";
  const youth = player.age != null && player.age < 18;
  const role = playerRole(player.positions);
  const PLAIN: Partial<Record<CardType, { title: string; detail: string }>> = {
    warmup: { title: "Warm-up", detail: "Get your body ready before anything hard." },
    speed: { title: "Speed", detail: softball ? "Short, fast sprints for the 60-foot base path." : "Short, fast sprints to get quicker on the bases." },
    bat_speed: { title: "Bat speed", detail: "Swings built to add speed to your bat." },
    lift: { title: "Lift", detail: youth ? "Strength work built for a growing body, with real rest days." : "Strength work, spaced with real rest days." },
    conditioning: { title: "Conditioning", detail: "Base-running fitness matched to your season." },
    cross_sport: { title: "Athletic movement", detail: "Moves from other sports that build athleticism." },
    recovery: { title: "Recovery", detail: "Mobility and tissue work so you bounce back." },
    nutrition: { title: "Nutrition", detail: "What to eat and drink today." },
    mental: { title: "Mental", detail: "A short focus or confidence task." },
  };
  const order = [...CARD_REGISTRY].sort((a, b) => a.displayOrder - b.displayOrder).map((c) => c.cardType);
  const items: StartPlanItem[] = [];
  for (const t of order) {
    const p = PLAIN[t];
    if (p) items.push({ key: t, ...p });
  }
  if (role !== "position") {
    items.splice(1, 0, {
      key: "pitching",
      title: softball ? "Pitching & arm care" : "Pitching & arm care",
      detail: role === "two_way"
        ? "Throwing and arm care built around when you pitch, alongside your hitting work."
        : "Throwing and arm care built around when you pitch.",
    });
  }
  return items;
}
