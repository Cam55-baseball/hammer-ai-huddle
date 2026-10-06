import { ShieldCheck } from "lucide-react";
import { branding } from "@/branding";
import { UNDER_13_MESSAGE } from "@/lib/auth/under13Lock";

/** Full screen shown after an under-13 birthdate. No form, no way around it. */
export function Under13Block() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))]">
      <div className="w-full max-w-sm space-y-6 text-center">
        <img src={branding.logo} alt={branding.appName} className="mx-auto h-12 w-12 object-contain" />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold leading-tight">A parent or guardian is needed</h1>
        <p className="text-base leading-7 text-muted-foreground">{UNDER_13_MESSAGE}</p>
        <p className="text-xs text-muted-foreground">Nothing you entered was saved.</p>
      </div>
    </main>
  );
}
