import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const KEY = (uid: string) => `hm.notifPrimerAsked.${uid}`;

/** True only the first time, and only where the browser can still show the system prompt. */
export function shouldAskNotifications(uid: string): boolean {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission !== "default") return false;
    return localStorage.getItem(KEY(uid)) == null;
  } catch {
    return false;
  }
}

/** One-line reason, then the system prompt. Asked once; declining changes nothing in the app. */
export function NotificationPrimer({ uid, open, onDone }: { uid: string; open: boolean; onDone: () => void }) {
  const finish = (answer: string) => {
    try { localStorage.setItem(KEY(uid), `${answer}:${new Date().toISOString()}`); } catch { /* ignore */ }
    onDone();
  };
  const allow = async () => {
    let result = "error";
    try { result = await Notification.requestPermission(); } catch { /* ignore */ }
    finish(result);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish("dismissed"); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Stay in the loop</DialogTitle>
          <DialogDescription>
            Get your daily plan, coach messages, and analysis updates.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button size="lg" className="w-full" onClick={allow}>Allow notifications</Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => finish("not_now")}>Not now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
