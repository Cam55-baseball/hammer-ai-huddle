import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";

type State = "hidden" | "no_consent" | "ready" | "connected";

/**
 * "Connect Apple Health" (owner Nov 8, healthkit_read_v1). Shows only in the iPhone app with
 * the switch on. Apple's read-only permission sheet opens only when this button is tapped.
 * People without health-data consent see how to turn it on, never Apple's sheet.
 */
export function AppleHealthConnectCard({ userId }: { userId: string }) {
  const [state, setState] = useState<State>("hidden");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let native = false;
    try { native = Capacitor.isNativePlatform(); } catch { native = false; }
    if (!native) return;
    void import("@/lib/native/healthSync").then(async (m) => {
      const e = await m.healthEligibility(userId);
      if (alive) setState(e === "unavailable" ? "hidden" : e);
    });
    return () => { alive = false; };
  }, [userId]);

  if (state === "hidden") return null;

  const connect = async () => {
    setBusy(true); setNote(null);
    const m = await import("@/lib/native/healthSync");
    const r = await m.connectAppleHealth(userId);
    setBusy(false);
    if (r.ok) { setState("connected"); setNote(`Connected. ${r.rows ?? 0} Apple Health readings saved from the last 30 days.`); }
    else setNote(r.error ?? "Couldn't connect Apple Health.");
  };

  return (
    <Card className="p-6 mb-6" data-testid="apple-health-card">
      <h3 className="text-xl font-bold mb-1 flex items-center gap-2"><HeartPulse className="h-5 w-5" aria-hidden />Apple Health</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Hammers can read your sleep, resting heart rate and heart-rate variability from Apple Health. It never writes to Apple Health.
      </p>
      {state === "no_consent" && (
        <p className="text-sm">
          To connect, first turn on <span className="font-medium">Health information</span> in{" "}
          <Link to="/settings/legal" className="underline">Legal &amp; privacy</Link>.
        </p>
      )}
      {state === "ready" && <Button onClick={connect} disabled={busy}>{busy ? "Connecting…" : "Connect Apple Health"}</Button>}
      {state === "connected" && (
        <div className="space-y-2">
          <p className="text-sm">Connected. New readings sync when you open the app. To stop, turn Hammers off in the Health app (Sharing → Apps).</p>
          <Button variant="outline" onClick={connect} disabled={busy}>{busy ? "Syncing…" : "Sync now"}</Button>
        </div>
      )}
      {note && <p role="status" className="mt-3 text-sm text-muted-foreground">{note}</p>}
    </Card>
  );
}
