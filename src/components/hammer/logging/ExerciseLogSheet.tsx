import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { resolveTemplate } from "./logTemplates";
import { RoundGrid, type Round } from "./RoundGrid";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import {
  fetchAiReadback,
  useLatestExerciseLog,
  usePreviousMovementLog,
  useSaveExerciseLog,
} from "@/hooks/useExerciseLog";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  rx: WkRx;
  dosageText: string;
}

const BAR_FEEL = ["crisp", "heavy", "off"] as const;
const ARM_FEEL = ["fresh", "normal", "sore"] as const;

function toNum(v: string): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function ExerciseLogSheet({ open, onOpenChange, rx, dosageText }: Props) {
  const template = useMemo(() => pickTemplate(rx), [rx]);
  const { data: latest } = useLatestExerciseLog(rx.id, rx.movement_slug);
  const { data: previous } = usePreviousMovementLog(rx.movement_slug, rx.id);
  const save = useSaveExerciseLog();

  const initialRoundsCount = rx.sets && rx.sets > 0 ? rx.sets : template.defaultRounds;

  const [rounds, setRounds] = useState<Round[]>([]);
  const [rpe, setRpe] = useState<number>(6);
  const [barFeel, setBarFeel] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [readback, setReadback] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Hydrate defaults every time the sheet opens.
  useEffect(() => {
    if (!open) return;
    const prevRounds: Round[] | null = (latest as any)?.metrics?.rounds ?? (previous as any)?.metrics?.rounds ?? null;
    if (prevRounds && Array.isArray(prevRounds) && prevRounds.length) {
      // Coerce to string map for inputs.
      setRounds(
        prevRounds.map((r) => {
          const out: Round = {};
          for (const [k, v] of Object.entries(r)) out[k] = v == null ? "" : String(v);
          return out;
        }),
      );
    } else {
      const seed: Round = {};
      for (const f of template.fields) {
        const v = f.prefillFromRx?.(rx);
        seed[f.key] = v == null ? "" : String(v);
      }
      setRounds(Array.from({ length: initialRoundsCount }, () => ({ ...seed })));
    }
    setRpe((latest as any)?.rpe ?? 6);
    setBarFeel((latest as any)?.bar_feel ?? null);
    setNotes((latest as any)?.notes ?? "");
    setReadback((latest as any)?.ai_readback ?? null);
    setSavedAt(null);
  }, [open, latest, previous, rx, template, initialRoundsCount]);

  const prevSummary = useMemo(() => {
    const p: any = previous;
    if (!p) return null;
    const w = p.load_used ? `${p.load_used} lb` : null;
    const s = p.sets_completed ? `${p.sets_completed} sets` : null;
    const r = p.reps_completed?.length ? `${p.reps_completed.join("·")} reps` : null;
    const parts = [w, s, r, p.rpe ? `RPE ${p.rpe}` : null].filter(Boolean);
    return parts.length ? `Last: ${parts.join(" • ")}` : null;
  }, [previous]);

  const roundsToPayload = () =>
    rounds.map((r) => {
      const out: Record<string, number | null> = {};
      for (const f of template.fields) out[f.key] = toNum(r[f.key] ?? "");
      return out;
    });

  const handleAsk = async () => {
    setAsking(true);
    const rb = await fetchAiReadback({
      movementName: rx.movement_name,
      dosageText,
      rounds: roundsToPayload(),
      rpe,
      notes: notes.trim() || null,
    });
    setAsking(false);
    if (rb) setReadback(rb);
    else toast.message("Hammer read-back unavailable — save still works.");
  };

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        prescription_id: rx.id,
        plan_date: rx.plan_date,
        movement_slug: rx.movement_slug,
        rounds: roundsToPayload(),
        rpe,
        bar_feel: barFeel,
        notes: notes.trim() || null,
        ai_readback: readback,
      });
      setSavedAt(new Date().toISOString());
      toast.success("Saved to your log");
      // Fire-and-forget read-back if the athlete didn't ask.
      if (!readback && notes.trim()) {
        fetchAiReadback({
          movementName: rx.movement_name,
          dosageText,
          rounds: roundsToPayload(),
          rpe,
          notes: notes.trim(),
        }).then((rb) => rb && setReadback(rb));
      }
      setTimeout(() => onOpenChange(false), 350);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">{rx.movement_name}</SheetTitle>
          <SheetDescription className="text-xs">
            {dosageText}
            {prevSummary && <span className="block mt-0.5 text-[11px] opacity-80">{prevSummary}</span>}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {template.intro && <p className="text-[11px] text-muted-foreground">{template.intro}</p>}

          <RoundGrid fields={template.fields} rounds={rounds} onChange={setRounds} />

          {template.meta.rpe && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">RPE</Label>
                <Badge variant="secondary">{rpe} / 10</Badge>
              </div>
              <Slider value={[rpe]} min={1} max={10} step={1} onValueChange={(v) => setRpe(v[0])} className="mt-2" />
            </div>
          )}

          {(template.meta.barFeel || template.meta.armFeel) && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {template.meta.armFeel ? "Arm feel" : "Bar feel"}
              </Label>
              <div className="mt-2 flex gap-1.5">
                {(template.meta.armFeel ? ARM_FEEL : BAR_FEEL).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setBarFeel(barFeel === f ? null : f)}
                    className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                      barFeel === f ? "border-primary bg-primary text-primary-foreground" : "bg-muted/30 hover:bg-accent"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" /> Notes for Hammer
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAsk}
                disabled={asking || !notes.trim()}
                className="h-6 gap-1 text-[11px]"
              >
                {asking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Ask Hammer
              </Button>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Anything Hammer should know?"
              rows={3}
              className="mt-2 text-sm"
            />
            {readback && (
              <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-2 text-[12px] leading-snug">
                <div className="flex items-center gap-1 text-primary font-medium text-[10px] uppercase tracking-wide mb-0.5">
                  <Sparkles className="h-3 w-3" /> Hammer read-back
                </div>
                {readback}
              </div>
            )}
          </div>

          {savedAt ? (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Saved.
            </div>
          ) : (
            <Button onClick={handleSave} disabled={save.isPending} className="w-full gap-2" size="lg">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {save.isPending ? "Saving…" : latest ? "Update log" : "Save log"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
