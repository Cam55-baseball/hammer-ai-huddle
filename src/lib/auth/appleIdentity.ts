/**
 * Apple Sign In helpers.
 *
 * Two Apple-specific realities are encoded here:
 *
 * 1. Apple returns the user's full name ONLY on the very first authorization.
 *    Every later sign-in carries no name at all. So the first callback is the
 *    single chance to capture it — after that it is gone forever and the user
 *    has to type it themselves.
 * 2. "Hide My Email" returns a permanent `@privaterelay.appleid.com` address.
 *    It is a real, valid, deliverable address for that user. Nothing in the
 *    app may reject it, warn about it, or branch on it. The helper below
 *    exists only so we can *describe* it honestly where a user asks why their
 *    email looks unusual — never to gate behaviour.
 */

import type { User } from "@supabase/supabase-js";

export const APPLE_PRIVATE_RELAY_DOMAIN = "privaterelay.appleid.com";

/** Purely informational. Never use this to block, warn, or degrade anything. */
export function isApplePrivateRelayEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${APPLE_PRIVATE_RELAY_DOMAIN}`);
}

/** The auth provider that actually created this identity. */
export function getAuthProvider(user: User | null | undefined): string {
  if (!user) return "unknown";
  const fromMeta = (user.app_metadata as { provider?: string } | undefined)?.provider;
  if (fromMeta) return fromMeta;
  const identity = user.identities?.[0]?.provider;
  return identity ?? "email";
}

/**
 * Best-effort name extraction across providers.
 *
 * Apple may deliver the name as `name: { firstName, lastName }`, as
 * `full_name`, or as separate given/family fields depending on the flow.
 * Google uses `full_name` / `name`. Email signup writes `full_name` directly.
 * Returns null when no name was supplied — the caller must then ask the user
 * rather than writing a blank profile.
 */
export function extractFullNameFromUser(user: User | null | undefined): string | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const direct = ["full_name", "name", "preferred_username"]
    .map((key) => meta[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (direct) return direct.trim();

  const nameObject = meta.name as { firstName?: string; lastName?: string } | undefined;
  const first =
    (typeof meta.given_name === "string" ? meta.given_name : undefined) ??
    (typeof meta.first_name === "string" ? meta.first_name : undefined) ??
    nameObject?.firstName;
  const last =
    (typeof meta.family_name === "string" ? meta.family_name : undefined) ??
    (typeof meta.last_name === "string" ? meta.last_name : undefined) ??
    nameObject?.lastName;

  const joined = [first, last].filter((part) => typeof part === "string" && part.trim()).join(" ").trim();
  return joined.length > 0 ? joined : null;
}

/**
 * Turns a raw provider/network failure into something a human can act on.
 * The most likely failure before the Apple credentials are entered in the
 * auth settings is "provider is not enabled" — that must read as a clear
 * sentence, not a raw error dump.
 */
export function describeOAuthError(provider: "apple" | "google", raw: unknown): string {
  const label = provider === "apple" ? "Sign in with Apple" : "Sign in with Google";
  const message =
    raw instanceof Error ? raw.message : typeof raw === "string" ? raw : "";
  const lowered = message.toLowerCase();

  if (
    lowered.includes("not enabled") ||
    lowered.includes("unsupported provider") ||
    lowered.includes("provider is not supported") ||
    lowered.includes("validation_failed")
  ) {
    return `${label} isn't switched on for this app yet. Please use email and password for now — we're finishing the setup.`;
  }
  if (lowered.includes("network") || lowered.includes("fetch")) {
    return `We couldn't reach ${label}. Check your connection and try again.`;
  }
  if (lowered.includes("popup") || lowered.includes("cancel")) {
    return `${label} was closed before it finished. Try again when you're ready.`;
  }
  return `${label} didn't work just now. Please try again, or sign in with your email and password.`;
}
