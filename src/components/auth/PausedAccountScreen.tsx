import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { branding } from "@/branding";
import { useOptionalAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/** Shown instead of the whole app while an account is paused (under 13). */
export function PausedAccountScreen() {
  const auth = useOptionalAuth() as any;
  const signOut = async () => {
    if (typeof auth?.signOut === "function") await auth.signOut();
    else await supabase.auth.signOut({ scope: "local" });
  };
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
