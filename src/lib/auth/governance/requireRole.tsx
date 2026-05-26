/**
 * Wave 2 — Role-gated route/component wrapper.
 *
 * Reads roles from the existing user_roles table via the has_role RPC.
 * Server-side enforcement remains canonical (RLS); this is a UI guard.
 */
import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { can, type AppRole, type Capability } from "./roleMatrix";

interface Props {
  capability: Capability;
  children: ReactNode;
  /** Where to redirect on denial. */
  fallback?: string;
}

export function RequireCapability({ capability, children, fallback = "/" }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        if (!cancelled) setAllowed(false);
        return;
      }
      const { data: rows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (rows ?? []).map((r) => (r as { role: AppRole }).role);
      const ok = roles.some((r) => can(r, capability));
      if (!cancelled) setAllowed(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, [capability]);

  if (allowed === null) return null;
  if (!allowed) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
