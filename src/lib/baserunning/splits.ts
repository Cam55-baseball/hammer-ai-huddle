/**
 * Baserunning split catalog.
 *
 * Mirrors the naming conventions already established in the combine catalog
 * (`src/lib/combine/events.ts`) — shared event names mean shared meaning.
 *
 * FOUNDATION ONLY. Not wired to any live surface.
 */

export const BASERUNNING_SPLIT_EVENTS = [
  "home_to_first",
  "ten_yard_split",
  "thirty_yard_dash",
  "sixty_yard_dash",
  "lead_distance_primary",
  "lead_distance_secondary",
] as const;

export type BaserunningSplitEvent = (typeof BASERUNNING_SPLIT_EVENTS)[number];

export function isBaserunningSplitEvent(v: string): v is BaserunningSplitEvent {
  return (BASERUNNING_SPLIT_EVENTS as readonly string[]).includes(v);
}

/** Events measured in seconds; the lead-distance events are measured in feet. */
export const BASERUNNING_TIMED_EVENTS: readonly BaserunningSplitEvent[] = [
  "home_to_first",
  "ten_yard_split",
  "thirty_yard_dash",
  "sixty_yard_dash",
];

export function defaultUnitFor(event: BaserunningSplitEvent): "sec" | "ft" {
  return BASERUNNING_TIMED_EVENTS.includes(event) ? "sec" : "ft";
}

/** Only home-to-first is handedness-anchored in `scale_reference`. */
export function requiresBatterHand(event: BaserunningSplitEvent): boolean {
  return event === "home_to_first";
}

export type BaserunningSource = "video_detected" | "manual_entry";
