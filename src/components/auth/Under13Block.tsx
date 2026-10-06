import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { branding } from "@/branding";
import { Button } from "@/components/ui/button";
import { UNDER_13_MESSAGE } from "@/lib/auth/under13Lock";
import { callParentConsent, type ConsentStatus } from "@/lib/parent/parentConsent";
import { ParentConsentFlow } from "@/components/parent/ParentConsentFlow";

/**
 * Full screen shown after an under-13 birthdate. Nothing typed is kept.
 * Switch under13_parent_program ON → offers the parent path (not trapped by the device lock).
 */
export function Under13Block() {
  const [enabled, setEnabled] = useState(false);
  const [parent, setParent] = useState(false);
  useEffect(() => {
    callParentConsent<ConsentStatus>("status").then((s) => setEnabled(!!s.enabled)).catch(() => setEnabled(false));
  }, []);
  if (parent) return <ParentConsentFlow mode="signup" />;
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))]">
      <div className="w-full max-w-sm space-y-6 text-center">
        <img src={branding.logo} alt={branding.appName} className="mx-auto h-12 w-12 object-contain" />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold leading-tight">{enabled ? "A parent or guardian must finish this signup." : "A parent or guardian is needed"}</h1>
        <p className="text-base leading-7 text-muted-foreground">{UNDER_13_MESSAGE}</p>
        {enabled && <Button className="h-12 w-full text-base" onClick={() => setParent(true)}>I'm the parent or guardian</Button>}
        <p className="text-xs text-muted-foreground">Nothing you entered was saved.</p>
      </div>
    </main>
  );
}
