/**
 * One refresh mechanism for the athlete context envelope.
 *
 * Any successful write that changes a spine variable (equipment, positions,
 * ...) must call `announceAthleteContextChanged()`. `useHammerAthleteContext`
 * listens for this event and invalidates the cached envelope so the daily plan
 * rebuilds from fresh data instead of serving a stale card.
 *
 * The event name is unchanged from the original equipment-only implementation
 * so existing listeners keep working — this module simply makes it shared.
 */
export const ATHLETE_CONTEXT_CHANGED_EVENT = "hammer:equipment-context-changed";

export function announceAthleteContextChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ATHLETE_CONTEXT_CHANGED_EVENT));
  }
}
