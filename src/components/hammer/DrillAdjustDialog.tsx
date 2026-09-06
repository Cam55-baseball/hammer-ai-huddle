/**
 * "I can't do this one" — per-drill swap control.
 *
 * The athlete picks a same-purpose alternative (or says none of them work),
 * and chooses whether it's just today or every day from now on. The choice is
 * recorded so future plans stop prescribing the drill they can't do.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { detectRequiredGear, drillKey, suggestAlternatives } from "@/lib/hammer/prescription/drillSwap";
import type { PlanAdjustment } from "@/lib/hammer/prescription/drillSwap";
import { useFamilyAlternatives } from "@/hooks/useFaultLedger";
import { familyForSlug } from "@/lib/wic/faultLedger/families";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modality: string;
  drill: { name: string; slug?: string; dosage: string; equipmentNote?: string; setup?: string };
  onSave: (adj: PlanAdjustment) => Promise<void>;
}

export function DrillAdjustDialog({ open, onOpenChange, modality, drill, onSave }: Props) {
  const gear = useMemo(() => detectRequiredGear(drill), [drill]);
  const family = useMemo(() => (drill.slug ? familyForSlug(drill.slug) : null), [drill.slug]);
  // Same-problem ladder first: if this movement belongs to a fault family, the
  // swap must still fix the same thing. Gear-free options lead.
  const { data: ladder = [] } = useFamilyAlternatives(drill.slug, gear ? 1 : 2);

  const alternatives = useMemo(() => {
    const fromFamily = ladder.map((a) => ({
      name: a.name,
      dosage: drill.dosage,
      why: family ? `Same job: ${family.label.toLowerCase()}.` : "Same job.",
      equipmentNote: a.equipment.length ? a.equipment.join(", ") : undefined,
    }));
    const generic = suggestAlternatives(drill).filter(
      (g) => !fromFamily.some((f) => f.name === g.name),
    );
    return [...fromFamily, ...generic];
  }, [ladder, family, drill]);

  const [choice, setChoice] = useState<string>("__skip__");
  const [scope, setScope] = useState<"today" | "always">("today");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Alternatives arrive asynchronously; preselect the least gear-dependent one
  // as soon as we have it, without stomping a choice the athlete already made.
  useEffect(() => {
    if (choice === "__skip__" && alternatives.length > 0) setChoice(alternatives[0].name);
  }, [alternatives, choice]);




  const submit = async () => {
    setSaving(true);
    setErr(null);
    const alt = alternatives.find((a) => a.name === choice) ?? null;
    try {
      await onSave({
        modality,
        action: alt ? "swap" : "unavailable",
        scope,
        original_key: drillKey(modality, drill),
        original_name: drill.name,
        replacement_name: alt?.name ?? null,
        replacement_dosage: alt?.dosage ?? null,
        reason: gear ? `no ${gear}` : null,
      });
      toast.success(
        alt
          ? `Swapped to ${alt.name}${scope === "always" ? " from now on" : " for today"}`
          : `Left out${scope === "always" ? " from now on" : " for today"}`,
      );
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong saving that change.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Can't do "{drill.name}"?</DialogTitle>
          <DialogDescription className="text-xs">
            {gear
              ? `This one needs ${gear}. Pick something that does the same job.`
              : "Pick something that does the same job, or leave it out."}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={choice} onValueChange={setChoice} className="space-y-2">
          {alternatives.map((a) => (
            <label
              key={a.name}
              className="flex items-start gap-2 rounded-md border border-border/60 p-2 text-xs cursor-pointer hover:bg-accent/40"
            >
              <RadioGroupItem value={a.name} className="mt-0.5" />
              <span>
                <span className="font-medium">{a.name}</span>
                <span className="block text-muted-foreground">{a.dosage} · {a.why}</span>
                {a.equipmentNote && (
                  <span className="block text-muted-foreground">You'd need: {a.equipmentNote}</span>
                )}
              </span>
            </label>
          ))}
          <label className="flex items-start gap-2 rounded-md border border-border/60 p-2 text-xs cursor-pointer hover:bg-accent/40">
            <RadioGroupItem value="__skip__" className="mt-0.5" />
            <span>
              <span className="font-medium">None of these — leave it out</span>
              <span className="block text-muted-foreground">
                The rest of the plan stays. I'll note that this one wasn't possible.
              </span>
            </span>
          </label>
        </RadioGroup>

        <div className="space-y-2">
          <Label className="text-xs">How long should this stick?</Label>
          <RadioGroup
            value={scope}
            onValueChange={(v) => setScope(v as "today" | "always")}
            className="flex gap-4"
          >
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <RadioGroupItem value="today" /> Just today
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <RadioGroupItem value="always" /> Every day from now on
            </label>
          </RadioGroup>
        </div>

        {err && <p className="text-xs text-destructive">{err}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Update my plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
