import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { resolveTemplateForRx, templateHasSide } from "./logTemplates";
import { RoundGrid, type Round } from "./RoundGrid";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import { useUnilateralMovements } from "@/hooks/useUnilateralMovements";
import { deriveSideMetrics } from "@/lib/hammer/logging/metricNormalizer";
import {
  fetchAiReadback,
  useLatestExerciseLog,
  usePreviousMovementLog,
  useSaveExerciseLog,
} from "@/hooks/useExerciseLog";
import { useStandards, useRecordAward } from "@/hooks/useStandards";
import { standardsForSlug } from "@/lib/hammer/standards/evaluate";
import { buildBestIndex, evaluateStandard, newlyEarned } from "@/lib/hammer/standards/evaluate";
import { TIER_LABEL } from "@/lib/hammer/standards/catalog";
import { StandardTargetLine } from "@/components/hammer/standards/StandardTargetLine";
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
  const { slugs: unilateralSlugs } = useUnilateralMovements();
  const { template, unilateral } = useMemo(
    () => resolveTemplateForRx(rx, unilateralSlugs),
    [rx, unilateralSlugs],
  );
  const hasSide = templateHasSide(template);
  const { data: latest } = useLatestExerciseLog(rx.id, rx.movement_slug);
  const { data: previous } = usePreviousMovementLog(rx.movement_slug, rx.id);
  const save = useSaveExerciseLog();

  // Weight-room standards this movement can contribute to. Display + award
  // detection only — never an input to the prescribed dose.
  const { progress: allProgress, measures, index: bestIndex } = useStandards();
  const recordAward = useRecordAward();
  const standardRows = useMemo(() => {
    const defs = standardsForSlug(rx.movement_slug);
    if (!defs.length) return [];
    return allProgress.filter((p) => defs.some((d) => d.id === p.standard.id));
  }, [allProgress, rx.movement_slug]);

  // Unilateral work is prescribed "per side" — so the sheet seeds twice the
  // rounds, pre-tagged L/R/L/R, and the athlete only fills the numbers.
  const prescribedSets = rx.sets && rx.sets > 0 ? rx.sets : template.defaultRounds;
  const initialRoundsCount = hasSide ? prescribedSets * 2 : prescribedSets;

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
        prevRounds.map((r, i) => {
          const out: Round = {};
          for (const [k, v] of Object.entries(r)) out[k] = v == null ? "" : String(v);
          // Older logs predate side capture — seed the alternation rather than
          // leaving the selector blank, but never invent a value we then hide.
          if (hasSide && out.side !== "L" && out.side !== "R") out.side = i % 2 === 0 ? "L" : "R";
          return out;
        }),
      );
    } else {
      const seed: Round = {};
      for (const f of template.fields) {
        if (f.kind === "side") continue;
        const v = f.prefillFromRx?.(rx);
        seed[f.key] = v == null ? "" : String(v);
      }
      setRounds(
        Array.from({ length: initialRoundsCount }, (_, i) =>
          hasSide ? { ...seed, side: i % 2 === 0 ? "L" : "R" } : { ...seed },
        ),
      );
    }
    setRpe((latest as any)?.rpe ?? 6);
    setBarFeel((latest as any)?.bar_feel ?? null);
    setNotes((latest as any)?.notes ?? "");
    setReadback((latest as any)?.ai_readback ?? null);
    setSavedAt(null);
  }, [open, latest, previous, rx, template, initialRoundsCount, hasSide]);

  const prevSummary = useMemo(() => {
    const p: any = previous;
    if (!p) return null;
    const w = p.load_used ? `${p.load_used} lb` : null;
    const s = p.sets_completed ? `${p.sets_completed} sets` : null;
    const r = p.reps_completed?.length ? `${p.reps_completed.join("·")} reps` : null;
    // Carry last session's limb balance forward — the athlete sees the gap
    // before the first round, not after. Only a stored delta is shown; a
    // session without enough per-side rounds stays silent rather than guess.
    const prevDelta = (p?.metrics?.per_side?.deltas ?? [])[0];
    const bal = prevDelta
      ? `${prevDelta.weaker === "L" ? "left" : "right"} ${prevDelta.diffPct}% behind`
      : null;
    const parts = [w, s, r, p.rpe ? `RPE ${p.rpe}` : null, bal].filter(Boolean);
    return parts.length ? `Last: ${parts.join(" • ")}` : null;
  }, [previous]);


  const roundsToPayload = () =>
    rounds.map((r) => {
      const out: Record<string, number | string | null> = {};
      for (const f of template.fields) {
        const raw = r[f.key] ?? "";
        if (f.kind === "side") out[f.key] = raw || null;
        else out[f.key] = toNum(raw);
      }
      return out;
    });

  /** A round only counts as filled when it carries at least one number. */
  const filledRounds = () =>
    rounds.filter((r) =>
      template.fields.some((f) => f.kind !== "side" && toNum(r[f.key] ?? "") != null),
    );

  const missingSideCount = hasSide
    ? filledRounds().filter((r) => r.side !== "L" && r.side !== "R").length
    : 0;

  const sideSummary = useMemo(() => {
    if (!hasSide) return null;
    return deriveSideMetrics(template.id, roundsToPayload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSide, rounds, template]);


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
    if (missingSideCount > 0) {
      toast.error(
        `Tag left or right on ${missingSideCount} round${missingSideCount === 1 ? "" : "s"} — side tracking keeps your L/R comparison honest.`,
      );
      return;
    }
    try {
      await save.mutateAsync({
        prescription_id: rx.id,

        plan_date: rx.plan_date,
        movement_slug: rx.movement_slug,
        rounds: roundsToPayload(),
        rpe: template.meta.rpe ? rpe : null,
        bar_feel: template.meta.barFeel || template.meta.armFeel ? barFeel : null,
        notes: notes.trim() || null,
        ai_readback: readback,
        template_id: template.id,
        field_schema: template.fields.map((f) => ({ key: f.key, label: f.label, unit: f.unit, kind: f.kind })),
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

          {unilateral && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] leading-snug">
              <span className="font-medium">One side at a time.</span> Every round is
              tagged L or R so Hammer can track each limb on its own. Log side one,
              then tap <span className="font-medium">Mirror</span> to copy it across.
            </div>
          )}

          <RoundGrid
            fields={template.fields}
            rounds={rounds}
            onChange={setRounds}
            highlightMissingSide={hasSide}
          />

          {sideSummary && (sideSummary.L || sideSummary.R) && (
            <div className="rounded-lg border bg-muted/30 p-2.5 text-[11px]">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground uppercase tracking-wide text-[10px]">This session</span>
                <span>L · {sideSummary.L?.rounds ?? 0} round{(sideSummary.L?.rounds ?? 0) === 1 ? "" : "s"}</span>
                <span>R · {sideSummary.R?.rounds ?? 0} round{(sideSummary.R?.rounds ?? 0) === 1 ? "" : "s"}</span>
              </div>
              {sideSummary.deltas.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {sideSummary.deltas.map((d) => (
                    <li key={d.key}>
                      {d.label}: L {d.left}{d.unit} · R {d.right}{d.unit}
                      {d.diffPct > 0 && (
                        <span className="text-muted-foreground">
                          {" "}— {d.weaker} side {d.diffPct}% behind
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}


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
