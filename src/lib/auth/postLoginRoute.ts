/**
 * Post-login routing authority.
 *
 * ROOT CAUSE THIS EXISTS TO PREVENT:
 * The login handler used to `await` several database reads (user_roles,
 * asb_events, scout_context / coach_context) *between* a successful
 * `signInWithPassword()` and the `navigate()` call, with no timeout and with a
 * `catch` block that only handled ZodError. When the backend was slow or
 * returning 503/timeouts, those reads hung or threw, navigation never ran, the
 * error was swallowed, and the user sat on the login screen with nothing
 * happening — while actually being signed in.
 *
 * Rule enforced here: authentication success ALWAYS produces a destination.
 * The gate reads may only *refine* that destination, never block it.
 */

export interface PostLoginGate {
  /** Safe same-origin relative path from ?redirect= / router state, if any. */
  redirectTarget?: string | null;
  roles?: string[];
  /** True when the athlete has at least one canonical asb_events row. */
  hasFirstEvent?: boolean;
  /** True when the scout/coach role-context row is filled in. */
  hasStaffContext?: boolean;
  /** True when the gate reads failed or timed out — degrade, never block. */
  degraded?: boolean;
}

/** Destination used whenever the gate could not be resolved. */
export const POST_LOGIN_FALLBACK_ROUTE = "/dashboard";

/** Accepts only same-origin relative paths. */
export function isSafeRelativePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("://")
  );
}

/**
 * Resolve a login destination. Pure, total, and never throws — every input
 * combination (including a fully degraded gate) yields a real route.
 */
export function resolvePostLoginRoute(gate: PostLoginGate): string {
  if (isSafeRelativePath(gate.redirectTarget)) return gate.redirectTarget;

  // Gate reads failed: the user is authenticated, so send them somewhere real.
  if (gate.degraded) return POST_LOGIN_FALLBACK_ROUTE;

  const roles = gate.roles ?? [];
  const isScout = roles.includes("scout");
  const isCoach = roles.includes("coach");

  if (isScout || isCoach) {
    if (!gate.hasStaffContext) {
      return isScout ? "/onboarding/scout" : "/onboarding/coach";
    }
    return isScout ? "/scout-dashboard" : POST_LOGIN_FALLBACK_ROUTE;
  }

  // Athlete with no canonical event and no role → onboarding.
  if (!gate.hasFirstEvent && roles.length === 0) return "/onboarding/athlete";

  return POST_LOGIN_FALLBACK_ROUTE;
}

/**
 * Bound a promise so a hung backend can never stall the login redirect.
 * Resolves with `fallback` on timeout or rejection — it never throws.
 */
export async function withLoginTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  ms = 6000,
): Promise<{ value: T; degraded: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ value: T; degraded: boolean }>((resolve) => {
    timer = setTimeout(() => resolve({ value: fallback, degraded: true }), ms);
  });
  try {
    return await Promise.race([
      promise.then((value) => ({ value, degraded: false })),
      timeout,
    ]);
  } catch {
    return { value: fallback, degraded: true };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
