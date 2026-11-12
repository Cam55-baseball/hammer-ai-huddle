import { useCallback, useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Button } from "@/components/ui/button";
import { openIphoneSettings, phonePushState, turnOnPhonePush, type PhonePushState } from "@/lib/native/pushPermission";

/**
 * Owner Nov 12 (build 13 fix 3): Notifications settings → "Phone notifications". iPhone app only,
 * only while native_push_v1 is on for the person; renders nothing on the website.
 */
export function PhoneNotificationsControl({ userId }: { userId: string }) {
  const [state, setState] = useState<PhonePushState | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => setState(await phonePushState(userId)), [userId]);
  useEffect(() => {
    void refresh();
    let handle: { remove: () => void } | null = null;
    // Coming back from iPhone Settings shows the new state.
    void App.addListener("resume", () => { void refresh(); }).then((h) => { handle = h; }).catch(() => {});
    return () => { handle?.remove(); };
  }, [refresh]);
  if (!state || state === "off") return null;
  const turnOn = async () => { setBusy(true); try { setState(await turnOnPhonePush(userId)); } finally { setBusy(false); } };
  return (
    <section aria-label="Phone notifications" className="mb-5 rounded-lg border border-border bg-card p-4 space-y-2" data-phone-push={state}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Phone notifications</h2>
        <span className="text-sm text-foreground">{state === "on" ? "On" : "Off"}</span>
      </div>
      {state === "on" && <p className="text-sm text-foreground">This iPhone gets your Hammers notifications.</p>}
      {state === "not_asked" && <>
        <p className="text-sm text-foreground">Get your daily plan, coach messages and analysis updates on this iPhone.</p>
        <Button className="w-full min-h-11" onClick={turnOn} disabled={busy}>{busy ? "…" : "Turn on"}</Button>
      </>}
      {state === "declined" && <>
        <p className="text-sm text-foreground">
          Notifications are turned off for Hammers in iPhone Settings. To turn them on, open iPhone Settings, tap
          Notifications, and turn on Allow Notifications.
        </p>
        <Button className="w-full min-h-11" variant="outline" onClick={openIphoneSettings}>Open iPhone Settings</Button>
      </>}
    </section>
  );
}
