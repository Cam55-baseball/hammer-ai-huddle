import { memoize } from "./types";

export interface PerceptionState {
  rpe: number | null;
  mood: string | null;
  source: string | null;
}
const PREFIXES = ["perception."];

export const buildPerceptionState = memoize<PerceptionState>((rows) => {
  let rpe: number | null = null;
  let mood: string | null = null;
  let source: string | null = null;
  for (const r of rows) {
    const p = r.payload as { rpe?: number; mood?: string } | undefined;
    if (!p) continue;
    if (typeof p.rpe === "number") rpe = p.rpe;
    if (typeof p.mood === "string") mood = p.mood;
    source = r.event_id;
  }
  return { rpe, mood, source };
});

export function perceptionState(rows: Parameters<typeof buildPerceptionState>[0], scope: Parameters<typeof buildPerceptionState>[1]) {
  return buildPerceptionState(rows, scope, PREFIXES);
}
