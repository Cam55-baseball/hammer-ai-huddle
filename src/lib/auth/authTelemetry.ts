/**
 * Lightweight client-side telemetry for auth/session transitions during
 * sensitive flows (e.g. Import-schedule paste). Logs to console with a stable
 * tag and surfaces visible toasts for adverse transitions.
 */
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isProtectedEditingActive, noteProtectedEditing } from "@/lib/auth/protectedEditing";

const TAG = "[paste-import]";

export interface PasteImportPhasePayload {
  phase: string;
  detail?: Record<string, unknown>;
}

export async function logPasteImportPhase(payload: PasteImportPhasePayload): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session ?? null;
    // eslint-disable-next-line no-console
    console.info(TAG, payload.phase, {
      ...payload.detail,
      hasSession: !!session,
      userId: session?.user?.id ?? null,
      expiresAt: session?.expires_at ?? null,
      protectedActive: isProtectedEditingActive(),
      ts: new Date().toISOString(),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(TAG, payload.phase, "telemetry-error", e);
  }
}

/**
 * Subscribe to Supabase auth events for the lifetime of a sensitive flow.
 * Adverse transitions surface a visible toast and re-arm the protected
 * editing window so the global eviction guard cannot kick the user.
 */
export function watchAuthDuringPasteImport(): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    // eslint-disable-next-line no-console
    console.info(TAG, "auth-event", { event, hasSession: !!session });
    if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
      noteProtectedEditing(60_000);
      toast.error("Sign-in blip during import — your text is safe. Keep going.", {
        duration: 6000,
      });
    }
    if (event === "TOKEN_REFRESHED" && session) {
      toast.success("Sign-in refreshed.", { duration: 2500 });
    }
  });
  return () => data.subscription.unsubscribe();
}
