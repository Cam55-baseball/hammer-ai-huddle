import { chooseNoFieldMix, type NoFieldInputs } from "./noFieldMix.ts";

type Row = Record<string, any>;
export type SpeedFacts = Omit<NoFieldInputs, "goal" | "totalReps">;
export interface SpeedRowChoice { slug: string; name: string; reason: string; totalReps: number; distanceFeet: number; restSeconds: number; note: string }

/** Single-row sprint (Speed card / lift-card sprint) with no open field → one mix item, same intent and reps. */
export function speedRowSwap(source: Row, rx: Row, missing: readonly string[], facts: SpeedFacts): SpeedRowChoice | null {
  if (!missing.includes("open_field")) return null;
  const intent = rx.intent_tag ?? source.speed_category;
  const goal = intent === "acceleration" ? "acceleration" : intent === "top_speed" || intent === "max_velocity" ? "max_velocity" : null;
  if (!goal || source.category !== "speed_lab") return null;
  const totalReps = Number(rx.total_reps ?? rx.reps ?? rx.sets);
  const usable = { ...facts, hill: facts.hill && !missing.includes("hill"), sled: facts.sled && !missing.includes("sled"), band: facts.band && !missing.includes("bands") };
  const mix = chooseNoFieldMix({ ...usable, goal, totalReps });
  const item = mix.items[mix.items.length - 1];
  if (!item) return null;
  const minutes = item.restSeconds / 60;
  return { slug: item.slug, name: item.name, reason: mix.because, totalReps, distanceFeet: item.distanceYards * 3, restSeconds: item.restSeconds,
    note: `${totalReps} × ${item.distanceYards} yd · rest ${minutes} min between reps` };
}
