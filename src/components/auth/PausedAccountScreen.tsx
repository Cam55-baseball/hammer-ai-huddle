import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { branding } from "@/branding";
import { useOptionalAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { callParentConsent, type ConsentStatus } from "@/lib/parent/parentConsent";
import { ParentConsentFlow, ParentPaymentStep } from "@/components/parent/ParentConsentFlow";

/**
 * Shown instead of the whole app while an account is paused.
 * Switch under13_parent_program OFF → the plain paused notice (today's behavior).
 * Switch ON → "Parent signature required" → signature → card payment → unlocked.
 */
export function PausedAccountScreen() {
  const auth = useOptionalAuth() as any;
  const qc = useQueryClient();
  const uid = auth?.user?.id as string | undefined;
  const status = useQuery({
    queryKey: ["parent-consent-status", uid],
    enabled: !!uid,
    queryFn: () => callParentConsent<ConsentStatus>("status"),
    retry: 1,
  });
  const signOut = async () => {
    if (typeof auth?.signOut === "function") await auth.signOut();
    else await supabase.auth.signOut({ scope: "local" });
  };
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["parent-consent-status", uid] });
    qc.invalidateQueries({ queryKey: ["account-gate", uid] });
  };

  const s = status.data;
  if (s?.enabled) {
    const c = s.consent && !s.consent.withdrawn_at ? s.consent : null;
    if (!c) return <ParentConsentFlow mode="sign" accountEmail={auth?.user?.email} onSigned={refresh} />;
    if (!c.payment_confirmed_at) return <ParentPaymentStep childName={c.child_display_name} onUnlocked={refresh} />;
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))]">
      <div className="w-full max-w-sm space-y-6 text-center">
        <img src={branding.logo} alt={branding.appName} className="mx-auto h-12 w-12 object-contain" />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <PauseCircle className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold leading-tight">This account is paused</h1>
        <p className="text-base leading-7 text-muted-foreground">
          A parent or guardian must set up and manage this account. Until then, no training plans are made, nothing new is collected, and the account is hidden from everyone else.
        </p>
        <p className="text-sm text-muted-foreground">Nothing has been deleted.</p>
        <Button variant="outline" className="h-12 w-full" onClick={signOut}>Sign out</Button>
      </div>
    </main>
  );
}
