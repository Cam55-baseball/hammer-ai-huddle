import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

const KEY = (uid: string) => `hm.notifPrimerAsked.${uid}`;

/** True only the first time, and only where the browser can still show the system prompt. */
export function shouldAskNotifications(uid: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY(uid)) == null;
  } catch {
    return false;
  }
}

/** One-line reason, then the system prompt. Asked once; declining changes nothing in the app. */
export function NotificationPrimer({ uid, open, onDone }: { uid: string; open: boolean; onDone: () => void }) {
  const canPrompt = Capacitor.isNativePlatform() || (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default");
  const finish = (answer: string) => {
    try { localStorage.setItem(KEY(uid), `${answer}:${new Date().toISOString()}`); } catch { /* ignore */ }
    onDone();
  };
  const allow = async () => {
    let result = "error";
    try {
      if (Capacitor.isNativePlatform()) {
        result = (await PushNotifications.requestPermissions()).receive;
        if (result === "granted") await PushNotifications.register();
      } else if ("Notification" in window && Notification.permission === "default") {
        result = await Notification.requestPermission();
      } else if ("Notification" in window) {
        result = Notification.permission;
      } else {
        result = "unsupported";
      }
    } catch { /* permission errors never block the app */ }
    finish(result);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish("dismissed"); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Stay in the loop</DialogTitle>
          <DialogDescription>
            {canPrompt ? "Get your daily plan, coach messages, and analysis updates." : "Notifications aren't available here. You can still use everything in the app."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {canPrompt && <Button size="lg" className="w-full" onClick={allow}>Allow notifications</Button>}
          <Button size="lg" variant="ghost" className="w-full" onClick={() => finish("not_now")}>Not now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
