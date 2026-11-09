/**
 * Release A3: the two calls the Today cards make on Mark done / auto-mark and on un-mark.
 * Fire-and-forget and SILENT (no toast, no UI). On the website this returns at once and never
 * downloads the Apple Health code.
 */
import { isNativeIos } from "./nativeFlags";

export interface CardRef {
  userId: string | null | undefined;
  planDate: string;
  /** Type-map kind ("lifts", "recovery", "hitting", "warmup", …). */
  kind: string;
  sport: string | null | undefined;
  card: { type: "wk" | "block"; modality: string; side?: "L" | "R" | null; keys: readonly string[] };
}

export function saveCardToHealth(ref: CardRef): Promise<unknown> | void {
  if (!ref.userId || !isNativeIos()) return;
  return import("./healthWorkouts").then((m) => m.writeCardWorkout({
    userId: ref.userId, planDate: ref.planDate, kind: ref.kind, sport: ref.sport,
    cardKey: m.cardKeyFor(ref.card.type, ref.card.modality, ref.card.side ?? null, ref.card.keys), keys: ref.card.keys,
  })).catch(() => undefined);
}

export function removeCardFromHealth(ref: Omit<CardRef, "kind" | "sport">): Promise<unknown> | void {
  if (!ref.userId || !isNativeIos()) return;
  return import("./healthWorkouts").then((m) => m.removeCardWorkout({
    userId: ref.userId, planDate: ref.planDate,
    cardKey: m.cardKeyFor(ref.card.type, ref.card.modality, ref.card.side ?? null, ref.card.keys),
  })).catch(() => undefined);
}
