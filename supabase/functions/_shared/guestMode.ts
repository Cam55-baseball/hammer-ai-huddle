// Plan 4 GUEST MODE — rules shared by analyze-guest and its tests.
// Nothing about the guest is ever saved: no name, no video, no frames, no result.
// Only the coach's own usage row (model, tokens, cost) is logged, for the hourly fair-use limit.

export const GUEST_SPORTS = ["baseball", "softball"] as const;
export const GUEST_MODULES = ["hitting", "pitching", "throwing"] as const;
export const GUEST_MAX_FRAMES = 8;

export interface GuestRequest {
  sport?: unknown; module?: unknown; frames?: unknown;
  under13?: unknown; parentPermissionConfirmed?: unknown;
}

/** Returns a plain error message, or null when the request may run. */
export function guestRequestError(b: GuestRequest): string | null {
  if (!GUEST_SPORTS.includes(b.sport as any)) return "Pick baseball or softball.";
  if (!GUEST_MODULES.includes(b.module as any)) return "Pick hitting, pitching or throwing.";
  if (!Array.isArray(b.frames) || b.frames.length < 3) return "The video was too short to read. Try a clip of 2 seconds or more.";
  if (b.frames.length > GUEST_MAX_FRAMES) return "Too many pictures were sent.";
  if (!b.frames.every((f) => typeof f === "string" && f.startsWith("data:image/") && f.length < 1_500_000)) return "The video pictures could not be read.";
  if (b.under13 === true && b.parentPermissionConfirmed !== true) return "For a player under 13, confirm that a parent gave permission first.";
  if (b.under13 !== true && b.under13 !== false) return "Say whether the player is under 13.";
  return null;
}

/** Strips the AI output down to what is shown in the session. */
export function guestResultFrom(args: any) {
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 5) : []);
  const score = Number(args?.score);
  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null,
    strengths: list(args?.strengths),
    fixes: list(args?.fixes),
    drills: list(args?.drills),
  };
}
