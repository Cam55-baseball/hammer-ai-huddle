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

/**
 * Owner Nov 2 item 3: one obvious "Change rest day" control on the season card.
 * Tap a day → Only this week / Indefinitely → same save + server week rebuild.
 */
export function ChangeRestDayButton({ days }: { days: { date: string; label: string; isRest: boolean }[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = getTodayDate();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<{ date: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!user) return null;
  const choices = days.filter((d) => d.date >= today && !d.isRest);

  async function pick(scope: "week" | "indefinite") {
    if (!user || !target) return;
    setBusy(true);
    try {
      const r = await chooseRestDay({ userId: user.id, today, target: target.date, scope, source: "calendar" });
      if (r.ok === false) { setMsg({ ok: false, text: r.reason }); return; }
      setMsg({ ok: true, text: "Saved. Rebuilding your week…" });
      const rebuilt = await announceChange(qc, user.id, `Rest day moved to ${target.label}`, today);
      await qc.invalidateQueries({ queryKey: ["composed-plan-week"] });
      setMsg({ ok: true, text: rebuilt?.ok === false ? `Saved. ${rebuilt.message}` : scope === "week" ? `${target.label} is your rest day this week. Your week was rebuilt.` : `${target.label} is your rest day from now on. Your week was rebuilt.` });
      setOpen(false); setTarget(null);
    } catch { setMsg({ ok: false, text: "Your rest day wasn't saved. Try again." }); }
    finally { setBusy(false); }
  }

  return <>
    <Button type="button" size="sm" variant="outline" className="h-8 px-2 text-[11px] shrink-0" onClick={() => { setMsg(null); setTarget(null); setOpen(true); }}>Change rest day</Button>
    {msg && !open && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-[11px] text-muted-foreground" : "text-[11px] text-destructive"}>{msg.text}</p>}
    <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target ? `Make ${target.label} your rest day?` : "Change rest day"}</DialogTitle>
          <DialogDescription>{target ? "Your old rest day becomes a training day. This day becomes easy recovery plus your Mind item." : "Tap the day you want to rest."}</DialogDescription>
        </DialogHeader>
        {!target ? <div className="grid grid-cols-2 gap-2">
          {choices.length === 0 && <p className="col-span-2 text-sm text-muted-foreground">No other days left this week to move your rest day to.</p>}
          {choices.map((d) => <Button key={d.date} variant="outline" onClick={() => setTarget(d)}>{d.label}</Button>)}
        </div> : <div className="grid gap-2">
          <Button disabled={busy} onClick={() => void pick("week")}>Only this week</Button>
          <Button disabled={busy} variant="outline" onClick={() => void pick("indefinite")}>Indefinitely</Button>
          <Button disabled={busy} variant="ghost" onClick={() => setTarget(null)}>Back</Button>
          {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>{msg.text}</p>}
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
