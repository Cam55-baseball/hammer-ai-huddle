/**
 * Shared authorization guards for edge functions.
 *
 * These helpers assume a service-role Supabase client so they can read
 * `user_roles` / `subscriptions` regardless of the caller's RLS scope.
 * They never widen access on their own — each caller still decides what
 * to do with the answer.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type GuardRole = "owner" | "admin" | "coach" | "scout" | "player" | "recruiter";

/** True when the user holds the given role with an active status. */
export async function hasActiveRole(
  supabase: SupabaseClient,
  userId: string,
  role: GuardRole,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[authGuards] role lookup failed", { userId, role, error });
    return false;
  }
  return !!data;
}

/** True when the user holds at least one of the given roles. */
export async function hasAnyActiveRole(
  supabase: SupabaseClient,
  userId: string,
  roles: GuardRole[],
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", roles);

  if (error) {
    console.error("[authGuards] multi-role lookup failed", { userId, roles, error });
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * True when the user has a subscription row in an active state.
 * `current_period_end` is honored when present — an active row whose period
 * has already lapsed does not count.
 */
export async function hasActiveSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[authGuards] subscription lookup failed", { userId, error });
    return false;
  }
  if (!data) return false;

  if (data.current_period_end) {
    const endsAt = new Date(data.current_period_end).getTime();
    if (Number.isFinite(endsAt) && endsAt < Date.now()) return false;
  }
  return true;
}

/** Standard 403 body used by the guarded functions. */
export function forbidden(message: string, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
