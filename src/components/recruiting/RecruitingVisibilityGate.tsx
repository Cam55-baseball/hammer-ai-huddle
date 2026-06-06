/**
 * RR-9 / RR-10 — Single chokepoint for all recruiting surface rendering.
 *
 * Fail-closed: renders `fallback` (default: null) and emits a
 * `relational.exposure.gate_blocked` event unless ALL of the following
 * hold for the target athlete:
 *
 *   1. `athlete_recruiting_consent.visibility_enabled = true`
 *   2. NOT (is_minor AND !parent_authorized)        (RR-10 minor protection)
 *   3. The reading viewer is an authenticated coach/recruiter/scout OR
 *      the athlete themselves.
 *
 * The server enforces the same rule via RLS + `resolve_recruiting_visibility`;
 * this client gate eliminates the UI render path entirely so no stale
 * state, cache, query-string, role-switch, or direct-link path can leak.
 */
import { ReactNode, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRecruitingConsent } from "@/hooks/useRecruitingConsent";
import { emitExposureGateBlocked } from "@/lib/asb/topics/exposure";

interface Props {
  athleteId: string;
  children: ReactNode;
  /** Optional fallback for the blocked state. Defaults to null (fail-closed). */
  fallback?: ReactNode;
}

export function RecruitingVisibilityGate({ athleteId, children, fallback = null }: Props) {
  const { user } = useAuth();
  const { consent, isLoading } = useRecruitingConsent(athleteId);
  const lastReasonRef = useRef<string | null>(null);

  const allowed = !!consent?.resolved_visibility;

  useEffect(() => {
    if (isLoading || !consent) return;
    if (allowed) {
      lastReasonRef.current = null;
      return;
    }
    let reason: Parameters<typeof emitExposureGateBlocked>[0]["reason"];
    if (!user?.id) reason = "unauthenticated";
    else if (!consent.visibility_enabled) reason = "visibility_disabled";
    else if (consent.is_minor && !consent.parent_authorized)
      reason = "minor_without_parent_authorization";
    else reason = "consent_missing";

    if (lastReasonRef.current !== reason) {
      lastReasonRef.current = reason;
      void emitExposureGateBlocked({
        athleteId,
        viewerId: user?.id ?? null,
        reason,
      });
    }
  }, [allowed, athleteId, consent, isLoading, user?.id]);

  if (isLoading) return null;
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
