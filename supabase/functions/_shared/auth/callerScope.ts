// Owner Nov 12 (security batch 1): who may start hie-analyze, save-streak and compute-hammer-state.
// - The scheduled-job credential (`x-job-token`, matched against the SHA-256 of the Vault
//   `wk_daily_plan_job_token`; same digest wk-daily-plan-job and tcs-shadow-run check) or the
//   service-role key as Bearer = a trusted server caller.
// - Anyone else must be a signed-in player, and only for their own id.
// Pure (Web Crypto only) so the app's tests run it. The credential is never logged or echoed.

export const JOB_TOKEN_SHA256 = "92a0d7f956decec62aeaf2c309a150a936afda73572d8755f9b3999fc91325c9";

async function sha256Hex(v: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameHex(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The Bearer value of the Authorization header, or "" when there is none. */
export function bearerOf(headers: Headers): string {
  const auth = headers.get("Authorization") ?? headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

/** True only for the service-role key sent as Bearer. */
export async function isServiceRoleBearer(headers: Headers, serviceRoleKey: string | undefined): Promise<boolean> {
  const bearer = bearerOf(headers);
  if (!bearer || !serviceRoleKey) return false;
  return sameHex(await sha256Hex(bearer), await sha256Hex(serviceRoleKey));
}

/** True for the scheduled-job credential or the service-role key. */
export async function jobCallerAllowed(
  headers: Headers,
  serviceRoleKey: string | undefined,
  tokenDigest: string = JOB_TOKEN_SHA256,
): Promise<boolean> {
  const token = headers.get("x-job-token");
  if (token && sameHex(await sha256Hex(token), tokenDigest)) return true;
  return isServiceRoleBearer(headers, serviceRoleKey);
}

export type ScopeDecision =
  | { ok: true; userId: string | null }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Trusted callers may name any player or none (all players). A signed-in player may
 * name only themself; no id or another id is refused. No signed-in player → 401.
 */
export function ownOrTrusted(input: { trusted: boolean; signedInUserId: string | null; requestedUserId: string | null }): ScopeDecision {
  if (input.trusted) return { ok: true, userId: input.requestedUserId };
  if (!input.signedInUserId) return { ok: false, status: 401, error: "Unauthorized" };
  if (!input.requestedUserId || input.requestedUserId !== input.signedInUserId) {
    return { ok: false, status: 403, error: "Only your own account" };
  }
  return { ok: true, userId: input.signedInUserId };
}

/** save-streak: the player's id comes from the signed-in token; a body id counts only for the service-role key. */
export function streakUserId(input: { serviceRole: boolean; signedInUserId: string | null; bodyUserId: unknown }): ScopeDecision {
  if (input.serviceRole) {
    const id = typeof input.bodyUserId === "string" && /^[0-9a-f-]{36}$/i.test(input.bodyUserId) ? input.bodyUserId : null;
    return id ? { ok: true, userId: id } : { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!input.signedInUserId) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true, userId: input.signedInUserId };
}
