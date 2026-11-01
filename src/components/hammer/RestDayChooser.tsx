import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { announceChange } from "@/hooks/useScheduleTimeline";
import { chooseRestDay } from "@/lib/hammer/restDayChoice";
import { getTodayDate } from "@/utils/dateUtils";

/** Owner Nov 1 B1: "Make this my rest day" on a calendar day → Only for this week / Indefinitely. */
export function RestDayChooser({ date, label }: { date: string; label: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const today = getTodayDate();
  if (!user || date < today) return null;

  async function pick(scope: "week" | "indefinite") {
    if (!user) return;
    setBusy(true);
    try {
      const r = await chooseRestDay({ userId: user.id, today, target: date, scope, source: "calendar" });
      if (r.ok === false) { setMsg({ ok: false, text: r.reason }); return; }
      const rebuilt = await announceChange(qc, user.id, `Rest day moved to ${label}`, today);
      setMsg({ ok: true, text: rebuilt?.ok === false ? `Saved. ${rebuilt.message}` : scope === "week" ? `${label} is your rest day this week. Your week was rebuilt.` : `${label} is your rest day from the week of ${r.weekStart} on. Your week was rebuilt.` });
      setOpen(false);
    } catch { setMsg({ ok: false, text: "Your rest day wasn't saved. Try again." }); }
    finally { setBusy(false); }
  }

  return <div className="mt-2 space-y-1">
    <Button type="button" size="sm" variant="outline" className="h-9 w-full text-xs" onClick={() => { setMsg(null); setOpen(true); }}>Make this my rest day</Button>
    {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-[11px] text-muted-foreground" : "text-[11px] text-destructive"}>{msg.text}</p>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make {label} your rest day?</DialogTitle>
          <DialogDescription>Your old rest day becomes a training day. This day becomes easy recovery plus your Mind item.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button disabled={busy} onClick={() => void pick("week")}>Only for this week</Button>
          <Button disabled={busy} variant="outline" onClick={() => void pick("indefinite")}>Indefinitely</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
