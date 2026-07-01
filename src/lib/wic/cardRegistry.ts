// src/lib/wic/cardRegistry.ts — Phase 3 canonical card registry (client mirror).
// Shape-parity with supabase/functions/_shared/wic/cardRegistry.ts.
//
// SINGLE SOURCE OF TRUTH for the Hammers Today daily flow.
// Cards may not declare their own ordering, metadata, or responsibility.
// Every renderer iterates this registry to decide what to show and when.
//
// Phase 3 is STRUCTURAL only — no exercise, dosage, periodization, or
// programming decisions are encoded here.

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
  trainingObjective: string;
  estimatedDurationMin?: number;
  intensity?: "low" | "moderate" | "high" | "variable";
  recoveryDemand?: "low" | "moderate" | "high";
  requiredEquipment?: string[];
  location?: "any" | "field" | "gym" | "home";
  substitutionAvailable: boolean;
  /** Which prescription slot(s) this card owns. Empty = not sourced from wk_prescriptions. */
  slots: readonly string[];
  /** Predicate — is this card visible for the given context? */
  enabledWhen: (ctx: CardRegistryContext) => boolean;
  /** Empty context-message field keys — populated in later phases only. */
  contextMessageFields: readonly ["focus", "why_today", "recovery_reminder", "equipment_note"];
}

const MESSAGE_FIELDS = ["focus", "why_today", "recovery_reminder", "equipment_note"] as const;

// Canonical ordering. Do not reorder without a constitutional phase change.
export const CARD_REGISTRY: readonly CardRegistryEntry[] = [
  {
    cardType: "readiness",
    displayOrder: 1,
    responsibility: "Daily readiness summary",
    trainingObjective: "State the athlete's readiness so every downstream card is interpreted correctly.",
    estimatedDurationMin: 1,
    intensity: "low",
    recoveryDemand: "low",
    location: "any",
    substitutionAvailable: false,
    slots: [],
    enabledWhen: () => true,
    contextMessageFields: MESSAGE_FIELDS,
  },
  {
    cardType: "warmup",
    displayOrder: 2,
    responsibility: "Movement preparation only",
    trainingObjective: "Prepare tissues, joints, and CNS. No training stimulus.",
    estimatedDurationMin: 8,
    intensity: "low",
    recoveryDemand: "low",
    location: "any",
    substitutionAvailable: true,
    slots: ["warmup"],
    enabledWhen: () => true,
    contextMessageFields: MESSAGE_FIELDS,
  },
  {
    cardType: "speed",
    displayOrder: 3,
    responsibility: "Running speed only",
    trainingObjective: "Neural running-speed exposure while CNS is fresh.",
    estimatedDurationMin: 15,
    intensity: "high",
    recoveryDemand: "moderate",
    location: "field",
    substitutionAvailable: true,
    slots: ["speed"],
    enabledWhen: (c) => c.hasSpeed,
    contextMessageFields: MESSAGE_FIELDS,
  },
  {
    cardType: "bat_speed",
    displayOrder: 4,
    responsibility: "Rotational velocity only",
    trainingObjective: "Rotational velocity work while CNS is fresh.",
    estimatedDurationMin: 12,
    intensity: "high",
    recoveryDemand: "moderate",
    location: "field",
    substitutionAvailable: true,
    slots: ["bat_speed"],
    enabledWhen: (c) => c.hasBatSpeed,
    contextMessageFields: MESSAGE_FIELDS,
  },
  {
    cardType: "lift",
    displayOrder: 5,
    responsibility: "Strength and power only",
    trainingObjective: "Full-body strength / power aligned with season phase.",
    estimatedDurationMin: 45,
    intensity: "high",
    recoveryDemand: "high",
    location: "gym",
    substitutionAvailable: true,
    slots: ["lift", "supplemental"],
    enabledWhen: (c) => c.hasLift,
    contextMessageFields: MESSAGE_FIELDS,
  },
  {
    cardType: "practice_or_game",
    displayOrder: 6,
    responsibility: "Practice / game awareness",
    trainingObjective: "Anchor the training day around today's on-field commitment.",
    estimatedDurationMin: undefined,
    intensity: "variable",
    recoveryDemand: "variable" as any,
    location: "field",
    substitutionAvailable: false,
    slots: [],
    enabledWhen: (c) => c.dayKind !== "neither",
    contextMessageFields: MESSAGE_FIELDS,
  },
  {
    cardType: "conditioning",
    displayOrder: 7,
    responsibility: "Conditioning only",
    trainingObjective: "Energy-system work matched to season and demand.",
    estimatedDurationMin: 18,
    intensity: "moderate",
    recoveryDemand: "moderate",
    location: "field",
    substitutionAvailable: true,
    slots: ["conditioning"],
    enabledWhen: (c) => c.hasConditioning,
    contextMessageFields: MESSAGE_FIELDS,
  },
  {
    cardType: "cross_sport",
    displayOrder: 8,
    responsibility: "Athletic transfer only",
    trainingObjective: "Cross-sport athletic exposure without competing with primary work.",
    estimatedDurationMin: 20,
    intensity: "moderate",
    recoveryDemand: "moderate",
    location: "any",
    substitutionAvailable: true,
    slots: ["cross_sport"],
    enabledWhen: (c) => c.hasCrossSport,
    contextMessageFields: MESSAGE_FIELDS,
  },
  {
    cardType: "recovery",
    displayOrder: 9,
    responsibility: "Recovery only",
    trainingObjective: "Restore parasympathetic tone and tissue quality.",
    estimatedDurationMin: 10,
    intensity: "low",
    recoveryDemand: "low",
    location: "any",
    substitutionAvailable: true,
    slots: [],
    enabledWhen: () => true,
    contextMessageFields: MESSAGE_FIELDS,
  },
  {
    cardType: "nutrition",
    displayOrder: 10,
    responsibility: "Nutrition only",
    trainingObjective: "Fuel the day's training load.",
    intensity: "low",
    recoveryDemand: "low",
    location: "any",
    substitutionAvailable: false,
    slots: [],
    enabledWhen: () => true,
    contextMessageFields: MESSAGE_FIELDS,
  },
  {
    cardType: "mental",
    displayOrder: 11,
    responsibility: "Mental training only",
    trainingObjective: "Attention, arousal, and identity work.",
    intensity: "low",
    recoveryDemand: "low",
    location: "any",
    substitutionAvailable: false,
    slots: [],
    enabledWhen: () => true,
    contextMessageFields: MESSAGE_FIELDS,
  },
];

export function enabledCards(ctx: CardRegistryContext): readonly CardRegistryEntry[] {
  return CARD_REGISTRY.filter((c) => c.enabledWhen(ctx));
}

export function getCard(cardType: CardType): CardRegistryEntry | undefined {
  return CARD_REGISTRY.find((c) => c.cardType === cardType);
}

/** Slot → owning card_type. Enforces single-responsibility: no slot may map to two cards. */
export function slotToCardType(slot: string): CardType | null {
  const owners = CARD_REGISTRY.filter((c) => c.slots.includes(slot));
  return owners[0]?.cardType ?? null;
}

/** Canonical display-order for a slot (via its owning card). */
export function displayOrderForSlot(slot: string): number {
  const card = CARD_REGISTRY.find((c) => c.slots.includes(slot));
  return card?.displayOrder ?? Number.MAX_SAFE_INTEGER;
}
