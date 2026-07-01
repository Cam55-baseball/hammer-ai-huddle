// _shared/wic/cardRegistry.ts — Phase 3 canonical card registry (server mirror).
// SHAPE PARITY REQUIRED with src/lib/wic/cardRegistry.ts.
// Do not diverge — this is the constitutional authority for card orchestration.

export type CardType =
  | "readiness"
  | "warmup"
  | "speed"
  | "bat_speed"
  | "lift"
  | "practice_or_game"
  | "conditioning"
  | "cross_sport"
  | "recovery"
  | "nutrition"
  | "mental";

export type DayKind = "game" | "practice" | "both" | "neither";

export interface CardRegistryContext {
  dayKind: DayKind;
  seasonPhase: string;
  hasLift: boolean;
  hasSpeed: boolean;
  hasBatSpeed: boolean;
  hasConditioning: boolean;
  hasCrossSport: boolean;
}

export interface CardRegistryEntry {
  cardType: CardType;
  displayOrder: number;
  responsibility: string;
  slots: readonly string[];
  enabledWhen: (ctx: CardRegistryContext) => boolean;
}

export const CARD_REGISTRY: readonly CardRegistryEntry[] = [
  { cardType: "readiness",        displayOrder: 1,  responsibility: "Daily readiness summary",    slots: [],                          enabledWhen: () => true },
  { cardType: "warmup",           displayOrder: 2,  responsibility: "Movement preparation only",  slots: ["warmup"],                  enabledWhen: () => true },
  { cardType: "speed",            displayOrder: 3,  responsibility: "Running speed only",         slots: ["speed"],                   enabledWhen: (c) => c.hasSpeed },
  { cardType: "bat_speed",        displayOrder: 4,  responsibility: "Rotational velocity only",   slots: ["bat_speed"],               enabledWhen: (c) => c.hasBatSpeed },
  { cardType: "lift",             displayOrder: 5,  responsibility: "Strength and power only",    slots: ["lift", "supplemental"],    enabledWhen: (c) => c.hasLift },
  { cardType: "practice_or_game", displayOrder: 6,  responsibility: "Practice / game awareness",  slots: [],                          enabledWhen: (c) => c.dayKind !== "neither" },
  { cardType: "conditioning",     displayOrder: 7,  responsibility: "Conditioning only",          slots: ["conditioning"],            enabledWhen: (c) => c.hasConditioning },
  { cardType: "cross_sport",      displayOrder: 8,  responsibility: "Athletic transfer only",     slots: ["cross_sport"],             enabledWhen: (c) => c.hasCrossSport },
  { cardType: "recovery",         displayOrder: 9,  responsibility: "Recovery only",              slots: [],                          enabledWhen: () => true },
  { cardType: "nutrition",        displayOrder: 10, responsibility: "Nutrition only",             slots: [],                          enabledWhen: () => true },
  { cardType: "mental",           displayOrder: 11, responsibility: "Mental training only",       slots: [],                          enabledWhen: () => true },
];

export function enabledCards(ctx: CardRegistryContext): readonly CardRegistryEntry[] {
  return CARD_REGISTRY.filter((c) => c.enabledWhen(ctx));
}

export function displayOrderForSlot(slot: string): number {
  const card = CARD_REGISTRY.find((c) => c.slots.includes(slot));
  return card?.displayOrder ?? Number.MAX_SAFE_INTEGER;
}

export function seasonDisplayLabel(phase: string): string {
  switch (phase) {
    case "os_q1": return "Offseason Quarter 1";
    case "os_q2": return "Offseason Quarter 2";
    case "os_q3": return "Offseason Quarter 3";
    case "os_q4": return "Late Offseason";
    case "in_season": return "In Season";
    case "post_season": return "Transition";
    default: return phase;
  }
}
