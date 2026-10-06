import { useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { branding } from "@/branding";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { lockSignupDevice, yearsOldFromDob } from "@/lib/auth/under13Lock";

/** Required once for accounts with no birthdate. Can't be skipped or changed later. */
export function BirthdateRequiredScreen({ onSaved }: { onSaved: () => void }) {
  const { user } = useOptionalAuth();
  const [dob, setDob] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(dob) && dob <= new Date().toISOString().slice(0, 10) && (yearsOldFromDob(dob) ?? -1) <= 120;

  const save = async () => {
    if (!user?.id || !valid) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.from("profiles").update({ date_of_birth: dob } as never).eq("id", user.id);
    setSaving(false);
    if (e) { setError("We couldn't save that. Check your connection and try again."); setConfirming(false); return; }
    if ((yearsOldFromDob(dob) ?? 99) < 13) lockSignupDevice();
    onSaved();
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))]">
      <div className="w-full max-w-sm space-y-6">
        <img src={branding.logo} alt={branding.appName} className="mx-auto h-12 w-12 object-contain" />
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <CalendarDays className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold leading-tight">When were you born?</h1>
          <p className="text-sm leading-6 text-muted-foreground">We need your date of birth to keep building your plan.</p>
        </div>
        {!confirming ? (
          <div className="space-y-3">
            <Label htmlFor="required-dob">Date of birth</Label>
            <Input id="required-dob" type="date" className="h-12 text-base" max={new Date().toISOString().slice(0, 10)} value={dob} onChange={(e) => setDob(e.target.value)} />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="h-12 w-full text-base" disabled={!valid} onClick={() => setConfirming(true)}>Continue</Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <p className="text-sm">Date of birth: <span className="font-semibold">{dob}</span></p>
            <p className="text-xs leading-5 text-muted-foreground">Check it carefully. You won't be able to change it yourself later.</p>
            <Button className="h-12 w-full text-base" disabled={saving} onClick={save}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save date of birth"}
            </Button>
            <Button variant="ghost" className="h-11 w-full" disabled={saving} onClick={() => setConfirming(false)}>Back</Button>
          </div>
        )}
      </div>
    </main>
  );
}
