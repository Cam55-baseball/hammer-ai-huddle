/**
 * RR-9 / RR-10 — granular recruiting consent (v1.1).
 * Pure mirror of public.resolve_recruiting_scope. Fail-closed.
 */
export type ConsentScope = "profile" | "metrics" | "video" | "health" | "academics" | "contact";
export const CONSENT_SCOPES: ConsentScope[] = ["profile", "metrics", "video", "health", "academics", "contact"];
export const SCOPE_LABEL: Record<ConsentScope, string> = {
  profile: "Profile",
  metrics: "Metrics",
  video: "Video",
  health: "Health",
  academics: "Academics",
  contact: "Contact",
};

export interface GranularConsent {
  visibility_enabled: boolean;
  parent_authorized: boolean;
  guardian_consented_at: string | null;
  is_minor: boolean;
  share_profile: boolean;
  share_metrics: boolean;
  share_video: boolean;
  share_health?: boolean;
  share_academics?: boolean;
  allow_contact: boolean;
  /** Under 13: staff never contact the player; contact goes to the parent only. */
  is_under_13?: boolean;
}

const COL: Record<ConsentScope, keyof GranularConsent> = {
  profile: "share_profile",
  metrics: "share_metrics",
  video: "share_video",
  health: "share_health",
  academics: "share_academics",
  contact: "allow_contact",
};
export const scopeColumn = (s: ConsentScope) => COL[s] as ScopeColumn;
export type ScopeColumn = "share_profile" | "share_metrics" | "share_video" | "share_health" | "share_academics" | "allow_contact";

export function guardianCleared(c: GranularConsent | null): boolean {
  if (!c) return false;
  return !c.is_minor || (c.parent_authorized && !!c.guardian_consented_at);
}

export function scopeVisible(c: GranularConsent | null, s: ConsentScope): boolean {
  if (!c || !c.visibility_enabled || !guardianCleared(c)) return false;
  if (s === "contact" && c.is_under_13) return false;
  return Boolean(c[COL[s]]);
}

/** One plain line: who can see what, right now. */
export function statusLine(c: GranularConsent | null): string {
  if (!c || !c.visibility_enabled) return "Right now, no scout or coach can see anything.";
  if (!guardianCleared(c))
    return "Right now, no scout or coach can see anything — a parent or guardian has to say yes first.";
  const on = CONSENT_SCOPES.filter((s) => scopeVisible(c, s)).map((s) => SCOPE_LABEL[s].toLowerCase());
  if (on.length === 0) return "Right now, no scout or coach can see anything — every item is turned off.";
  const list = on.length === 1 ? on[0] : `${on.slice(0, -1).join(", ")} and ${on[on.length - 1]}`;
  return `Right now, scouts and coaches can see your ${list}.`;
}
