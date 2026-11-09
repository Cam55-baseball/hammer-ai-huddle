import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { isNativeIos } from "@/lib/native/nativeFlags";

type Loaded = {
  read: "unavailable" | "no_consent" | "ready" | "connected";
  write: "unavailable" | "no_consent" | "ready";
  writeOn: boolean;
  readNote: string | null;
  writeNote: string | null;
};

/**
 * Settings → Apple Health (owner Nov 9). iPhone app only; the website renders nothing and never
 * loads the Apple Health code. Two switches the player can change any time:
 *   "Read my sleep and heart data"            (healthkit_read_v1, Release A read sync)
 *   "Save my Hammers workouts to Apple Health" (healthkit_write_v1, Release A3)
 * Turning one on asks Apple the first time; off stops that action at once. Problems show as one
 * quiet line under the switch only — never on Today or the cards.
 */
export function AppleHealthSettings({ userId }: { userId: string }) {
  const [s, setS] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState<"read" | "write" | null>(null);

  const load = async () => {
    const [sync, wk] = await Promise.all([import("@/lib/native/healthSync"), import("@/lib/native/healthWorkouts")]);
    const [read, write] = await Promise.all([sync.healthEligibility(userId), wk.healthWriteEligibility(userId)]);
    let writeOn = write === "ready" ? await wk.healthWriteSwitchOn(userId) : false;
    let writeNote = wk.healthNote(userId, "write");
    if (writeOn && (await wk.healthWriteStatus()) === "denied") writeNote = wk.PERMISSION_OFF_NOTE;
    if (write !== "ready") writeOn = false;
    return { read, write, writeOn, readNote: wk.healthNote(userId, "read"), writeNote };
  };

  useEffect(() => {
    if (!isNativeIos()) return;
    let alive = true;
    void load().then((v) => { if (alive) setS(v); }).catch(() => undefined);
    return () => { alive = false; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s || (s.read === "unavailable" && s.write === "unavailable")) return null;
  const noConsent = s.read === "no_consent" || s.write === "no_consent";

  const toggleRead = async (on: boolean) => {
    setBusy("read");
    const m = await import("@/lib/native/healthSync");
    let readNote: string | null = null;
    if (on) { const r = await m.connectAppleHealth(userId); if (!r.ok) readNote = r.error ?? "Couldn't connect Apple Health."; }
    else await m.disableAppleHealthRead(userId);
    const next = await load();
    setS({ ...next, readNote: readNote ?? next.readNote });
    setBusy(null);
  };

  const toggleWrite = async (on: boolean) => {
    setBusy("write");
    const m = await import("@/lib/native/healthWorkouts");
    let note: string | null = null;
    if (on) note = (await m.turnOnHealthWrite(userId)).note;
    else await m.turnOffHealthWrite(userId);
    const next = await load();
    setS({ ...next, writeNote: note ?? next.writeNote });
    setBusy(null);
  };

  return (
    <section aria-label="Apple Health" className="space-y-4 border-b border-border pb-6" data-testid="apple-health-settings">
      <h2 className="text-lg font-semibold flex items-center gap-2"><HeartPulse className="h-5 w-5" aria-hidden />Apple Health</h2>
      {noConsent && (
        <p className="text-sm">
          To use Apple Health, first turn on <span className="font-medium">Health information</span> in{" "}
          <Link to="/settings/legal" className="underline">Legal &amp; privacy</Link>.
        </p>
      )}
      {s.read !== "unavailable" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="hk-read" className="text-sm">Read my sleep and heart data</Label>
            <Switch id="hk-read" checked={s.read === "connected"} disabled={s.read === "no_consent" || busy !== null} onCheckedChange={(v) => void toggleRead(v)} />
          </div>
          {s.readNote && <p role="status" className="text-xs text-muted-foreground">{s.readNote}</p>}
        </div>
      )}
      {s.write !== "unavailable" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="hk-write" className="text-sm">Save my Hammers workouts to Apple Health</Label>
            <Switch id="hk-write" checked={s.writeOn} disabled={s.write === "no_consent" || busy !== null} onCheckedChange={(v) => void toggleWrite(v)} />
          </div>
          {s.writeNote && <p role="status" className="text-xs text-muted-foreground">{s.writeNote}</p>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">To remove access completely: iPhone Settings → Health → Data Access &amp; Devices → Hammers.</p>
    </section>
  );
}
