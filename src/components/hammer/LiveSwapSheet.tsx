import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import { swapGearList } from "../../../supabase/functions/_shared/planSwap/commonGear";

type Choice = { slug: string; name: string; reason: string };

async function callSwap(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("plan-swap", { body });
  if (error || data?.error) {
    let reason = typeof data?.error === "string" ? data.error : "Swap couldn't finish. Nothing was saved.";
    if (error && (error as any).context instanceof Response) {
      const r = await (error as any).context.clone().json().catch(() => null);
      if (typeof r?.error === "string") reason = r.error;
    }
    throw new Error(reason);
  }
  return data;
}

/** Simple Swap: what's missing → 1–3 safe choices → one save. */
export function LiveSwapSheet({ rx, open, onOpenChange, block }: {
  rx: Pick<WkRx, "id" | "plan_date" | "movement_name">; open: boolean; onOpenChange: (open: boolean) => void;
  block?: { modality: string; index: number; sport: "baseball" | "softball" };
}) {
  const qc = useQueryClient();
  const [gear, setGear] = useState<string[] | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [scope, setScope] = useState<"today" | "always">("today");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const ids = { prescriptionId: rx.id, planDate: rx.plan_date, ...(block ? { block } : {}) };

  useEffect(() => {
    if (!open) return;
    setGear(null); setMissing([]); setNote(""); setChoices(null); setErr(null); setDone(null); setScope("today");
    setGear(swapGearList([]));
    callSwap({ action: "options", ...ids, missing: [] }).then(d => setGear(swapGearList(d.gear ?? []))).catch(e => setErr(e.message));
  }, [open, rx.id]);

  const find = async () => {
    setBusy(true); setErr(null);
    try { const d = await callSwap({ action: "options", ...ids, missing, note: note || undefined });
      setMissing(d.missing ?? missing); setChoices(d.choices ?? []); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const pick = async (c: Choice) => {
    setBusy(true); setErr(null);
    try { const d = await callSwap({ action: "swap", ...ids, missing, note: note || undefined, toSlug: c.slug, scope });
      setDone(`${d.reason}${d.memorySaved ? " · We'll remember this is missing." : ""}`);
      qc.invalidateQueries(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const label = (g: string) => ({ dumbbell: "Dumbbells", pitching_machine: "Machine", open_field: "Field space", baseballs: "Ball type: baseball", softballs: "Ball type: softball" }[g] ?? g.replace(/_/g, " "));

  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
    <SheetHeader><SheetTitle>Swap {rx.movement_name}</SheetTitle></SheetHeader>
    <div className="space-y-4 py-4">
      {done ? <><p role="status" className="text-sm">Swapped. {done}</p>
        <Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button></> :
      gear === null && !err ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking this exercise…</p> :
      <>
        {gear && <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What's missing today?</legend>
          {gear.map(g => <label key={g} className="flex items-center gap-2 text-sm">
            <Checkbox checked={missing.includes(g)} onCheckedChange={v => setMissing(m => v ? [...m, g] : m.filter(x => x !== g))} />{label(g)}
          </label>)}
          <Input aria-label="Anything else missing?" placeholder="Anything else missing?" value={note} maxLength={300} onChange={e => setNote(e.target.value)} />
        </fieldset>}
        {choices === null ? <Button className="w-full" disabled={busy || !gear} onClick={find}>Find a swap</Button> :
          choices.length === 0 ? <p className="text-sm">No safe swap found for this one; skip it today.</p> :
          <div className="space-y-2">
            <p className="text-sm font-medium">Is this missing just today, or always?</p>
            <div className="flex gap-2">
              <Button size="sm" variant={scope === "today" ? "default" : "outline"} onClick={() => setScope("today")}>Just today</Button>
              <Button size="sm" variant={scope === "always" ? "default" : "outline"} onClick={() => setScope("always")}>Always</Button>
            </div>
            {choices.map(c => <Button key={c.slug} variant="outline" className="h-auto w-full justify-start whitespace-normal text-left" disabled={busy} onClick={() => pick(c)}>{c.reason}</Button>)}
          </div>}
      </>}
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
    </div>
  </SheetContent></Sheet>;
}
