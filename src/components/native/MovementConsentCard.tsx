import { useCallback, useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { ScanLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIos, loadNativeFlags } from "@/lib/native/nativeFlags";
import { MOVEMENT_CONSENT_TEXT, MOVEMENT_CONSENT_VERSION, movementConsentLabel, sha256HexOfText, type MovementConsentStatus } from "@/lib/legal/movementConsent";

interface StatusRow { on: boolean; status: MovementConsentStatus; minor: boolean; deletion_pending: boolean }
const rpc = supabase.rpc as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }>;

/**
 * Movement-data consent (Release 0, movement_consent_v1). iPhone app only, switch on, and only once
 * the lawyer-approved words exist. Under 18: a parent must say yes before anything is measured.
 * The player can turn it off and ask for their camera-measurement history to be deleted.
 */
export function MovementConsentCard({ userId }: { userId: string }) {
  const [s, setS] = useState<StatusRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isNativeIos()) return;
    const flags = await loadNativeFlags(userId);
    if (!flags.movement_consent_v1) return;
    const { data } = await rpc("movement_consent_status");
    if (data) setS(data as StatusRow);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  if (!s?.on || !MOVEMENT_CONSENT_TEXT) return null;

  const run = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true); setNote(null);
    const { error } = await fn();
    setBusy(false);
    setNote(error ? "That didn't save. Try again." : ok);
    await load();
  };
  const agree = () => run(async () => {
    let build: string | null = null;
    try { const i = await App.getInfo(); build = `${i.version} (${i.build})`; } catch { /* unknown build stays empty */ }
    return rpc("movement_consent_agree", { _version: MOVEMENT_CONSENT_VERSION, _text_sha256: await sha256HexOfText(MOVEMENT_CONSENT_TEXT!), _platform: "ios", _app_build: build });
  }, s.minor ? "Saved. We asked your parent to say yes." : "Saved.");

  return (
    <Card className="p-4 space-y-3" aria-label="Camera measurements">
      <div className="flex items-center gap-2">
        <ScanLine className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="font-semibold">Camera measurements</h2>
      </div>
      <p className="whitespace-pre-line text-sm text-muted-foreground">{MOVEMENT_CONSENT_TEXT}</p>
      <p className="text-sm font-medium">{movementConsentLabel(s.status)}</p>
      <div className="flex flex-wrap gap-2">
        {(s.status === "none" || s.status === "revoked" || s.status === "declined") && (
          <Button onClick={() => void agree()} disabled={busy}>I agree</Button>
        )}
        {(s.status === "active" || s.status === "pending_parent") && (
          <Button variant="outline" onClick={() => void run(() => rpc("movement_consent_revoke"), "Turned off.")} disabled={busy}>Turn off</Button>
        )}
        {!s.deletion_pending ? (
          <Button variant="outline" onClick={() => void run(() => rpc("request_measurement_deletion"), "Request sent. We'll delete your camera measurements.")} disabled={busy}>
            Delete my camera measurements
          </Button>
        ) : <p className="text-sm text-muted-foreground">Deletion requested.</p>}
      </div>
      {note && <p className="text-sm" role="status">{note}</p>}
    </Card>
  );
}
