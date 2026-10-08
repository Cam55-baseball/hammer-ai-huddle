/** legal_v2 — 13–17 parent waiver (client side). All writes go through `teen-parent-waiver`. */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";

export interface TeenWaiverState {
  required: boolean; signed?: boolean; locked?: boolean; kind?: "new" | "existing";
  grace_until?: string | null; days_left?: number; parent_email?: string | null; last_sent_at?: string | null;
  email?: { status: string; detail?: string };
}

export async function callTeenWaiver<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("teen-parent-waiver", { body: { action, origin: window.location.origin, ...body } });
  if (error) {
    let code = "failed";
    try { code = (await (error as any).context?.json?.())?.error ?? code; } catch { /* no body */ }
    const e = new Error(code); (e as any).code = code; throw e;
  }
  return data as T;
}

export const TEEN_WAIVER_ERRORS: Record<string, string> = {
  bad_email: "Enter your parent or guardian's email (not your own).",
  wait_a_minute: "We just sent it. Wait a minute before sending again.",
  name_missing: "Type your full legal name (first and last).",
  relationship_missing: "Choose how you're related to the player.",
  not_adult: "You must confirm you're 18 or older.",
  signature_missing: "Please sign in the box.",
  invalid_link: "This link has expired or isn't valid. Ask the player to send a new one.",
  already_signed: "This waiver is already signed. Thank you!",
  failed: "Something went wrong. Try again.",
};

/** Teen's waiver state. Fails open (not required) on errors so nobody is locked out by a network problem. */
export function useTeenWaiver() {
  const { user, loading } = useOptionalAuth() as any;
  const [state, setState] = useState<TeenWaiverState | null>(null);
  const load = useCallback(async () => {
    if (!user?.id) { setState({ required: false }); return; }
    try { setState(await callTeenWaiver<TeenWaiverState>("status")); } catch { setState({ required: false }); }
  }, [user?.id]);
  useEffect(() => { if (!loading) void load(); }, [loading, load]);
  return { state, reload: load, setState };
}
