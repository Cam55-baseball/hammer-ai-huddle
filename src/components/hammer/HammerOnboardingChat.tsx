/**
 * HammerOnboardingChat — conversational knowledge-gap acquisition surface.
 *
 * Role-aware. New input kinds: text / number / select / multiselect /
 * segmented / lifting_history / anthropometrics / injury.
 *
 * Surfaces errors via toast — never silently advances. Completion card on
 * the final gap.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useHammerOnboardingDirector } from "@/hooks/useHammerOnboardingDirector";
import { getHammerIdentity } from "@/lib/hammer/identity";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { CompetitionLevelPicker } from "@/components/shared/CompetitionLevelPicker";
import type { KnowledgeGap, GapOption } from "@/lib/hammer/onboarding/knowledgeGaps";

const INJURY_REGIONS = [
  "shoulder", "elbow", "ucl", "wrist", "back", "lumbar", "hip",
  "knee", "hamstring", "ankle", "oblique", "groin", "other",
];

export function HammerOnboardingChat() {
  const identity = getHammerIdentity();
  const dir = useHammerOnboardingDirector();
  const [busy, setBusy] = useState(false);

  if (dir.isLoading) return null;

  if (!dir.currentGap) {
    if (dir.totalGaps === 0) return null;
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{identity.voiceLabel} · setup complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">You're set. I have what I need to coach you. Open today's plan whenever you're ready.</p>
          <p className="text-[10px] text-muted-foreground">
            {dir.totalGaps} / {dir.totalGaps} reviewed ({dir.audience})
          </p>
          <div className="flex justify-start">
            <Button
              variant="ghost"
              size="icon"
              onClick={dir.goBack}
              disabled={!dir.canGoBack}
              aria-label="Back to previous question"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gap = dir.currentGap;
  const value = dir.answers[gap.id] ?? "";

  const isEmpty = (v: unknown): boolean => {
    if (v == null) return true;
    if (typeof v === "string") return v.trim() === "";
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === "object") return Object.keys(v as object).length === 0;
    return false;
  };

  // Injury gap accepts the explicit "100% healthy" choice as a valid empty.
  const canSubmit = (() => {
    if (gap.inputKind === "injury") {
      const d = value as { status?: string } | string;
      return typeof d === "object" && d?.status === "healthy" ? true : !isEmpty(value);
    }
    if (gap.inputKind === "anthropometrics") {
      // Allow submitting with any provided field; "skip" handles fully empty.
      return !isEmpty(value);
    }
    if (gap.inputKind === "lifting_history") {
      const d = value as { total_years?: unknown };
      return d != null && typeof d === "object" && d.total_years != null && d.total_years !== "";
    }
    if (gap.inputKind === "competition_level") {
      // Composite value — require at least a tier to be picked.
      if (value && typeof value === "object") {
        const d = value as { level?: string };
        return typeof d.level === "string" && d.level.trim() !== "";
      }
      return typeof value === "string" && value.trim() !== "";
    }
    return !isEmpty(value);
  })();
  const canAdvance = canSubmit || gap.skippable !== false;

  const advance = async () => {
    if (!canAdvance || busy) return;
    setBusy(true);
    try {
      if (canSubmit) {
        let normalized: unknown = value;
        if (gap.inputKind === "number") normalized = Number(value);
        if (gap.inputKind === "text" && typeof value === "string") normalized = value.trim();
        await dir.resolve(gap.id, normalized);
      } else {
        dir.skip(gap.id);
      }
      dir.goForward();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't save your answer";
      toast.error(`${msg}. Try again.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{identity.voiceLabel} · {dir.audience} onboarding</span>
          <span className="text-[10px] text-muted-foreground">
            {dir.currentIndex + 1} / {dir.totalGaps}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{gap.question}</p>
        {gap.helper && <p className="text-xs text-muted-foreground">{gap.helper}</p>}

        <GapInput gap={gap} value={value} onChange={(next) => dir.setAnswer(gap.id, next)} onSubmit={() => void advance()} />

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={dir.goBack}
            disabled={busy || !dir.canGoBack}
            aria-label="Back to previous question"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={() => void advance()}
            disabled={busy || !canAdvance}
            aria-label="Save and go to next question"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface GapInputProps {
  gap: KnowledgeGap;
  value: unknown;
  onChange: (v: unknown) => void;
  onSubmit: () => void;
}

function GapInput({ gap, value, onChange, onSubmit }: GapInputProps) {
  const { sport } = useSportTheme();

  if (gap.inputKind === "competition_level") {
    const composite =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as { level?: string })
        : { level: typeof value === "string" ? value : "" };
    return (
      <CompetitionLevelPicker
        sport={sport}
        value={composite as { level: string }}
        onChange={onChange}
        mode="full"
      />
    );
  }

  if (gap.inputKind === "select" && gap.options) {
    return (
      <Select value={typeof value === "string" ? value : ""} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
        <SelectContent className="max-h-[60vh]">
          {gap.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (gap.inputKind === "segmented" && gap.options) {
    const v = typeof value === "string" ? value : "";
    return (
      <div className="flex flex-wrap gap-2">
        {gap.options.map((o) => (
          <Button
            key={o.value}
            type="button"
            size="sm"
            variant={v === o.value ? "default" : "outline"}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    );
  }

  if (gap.inputKind === "multiselect" && gap.options) {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (val: string) => {
      onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);
    };
    return (
      <div className="flex flex-wrap gap-2">
        {gap.options.map((o: GapOption) => {
          const on = selected.includes(o.value);
          return (
            <Button
              key={o.value}
              type="button"
              size="sm"
              variant={on ? "default" : "outline"}
              onClick={() => toggle(o.value)}
            >
              {o.label}
            </Button>
          );
        })}
      </div>
    );
  }

  if (gap.inputKind === "lifting_history") {
    const v = (typeof value === "object" && value !== null ? value : {}) as {
      total_years?: number | string;
      consistent_last_12mo?: "yes" | "no";
      interruption_months?: number | string;
      interruption_reason?: string;
    };
    const set = (patch: Partial<typeof v>) => onChange({ ...v, ...patch });
    return (
      <div className="space-y-2">
        <div>
          <Label className="text-xs">Total years lifting</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={v.total_years ?? ""}
            onChange={(e) => set({ total_years: e.target.value === "" ? "" : Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Consistent in the last 12 months?</Label>
          <div className="flex gap-2 mt-1">
            {(["yes", "no"] as const).map((opt) => (
              <Button
                key={opt}
                type="button"
                size="sm"
                variant={v.consistent_last_12mo === opt ? "default" : "outline"}
                onClick={() => set({ consistent_last_12mo: opt })}
              >
                {opt === "yes" ? "Yes" : "No"}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Months off (if any)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={v.interruption_months ?? ""}
            onChange={(e) => set({ interruption_months: e.target.value === "" ? "" : Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Reason for layoff (optional)</Label>
          <Input
            value={v.interruption_reason ?? ""}
            onChange={(e) => set({ interruption_reason: e.target.value })}
            placeholder="e.g. broken leg, school season"
          />
        </div>
      </div>
    );
  }

  if (gap.inputKind === "anthropometrics") {
    const v = (typeof value === "object" && value !== null ? value : {}) as {
      height_in?: number | string;
      weight_lbs?: number | string;
      wingspan_in?: number | string;
      leg_length_in?: number | string;
      forearm_in?: number | string;
      femur_in?: number | string;
      tibia_in?: number | string;
      torso_in?: number | string;
      arm_total_in?: number | string;
    };
    const set = (patch: Partial<typeof v>) => onChange({ ...v, ...patch });
    const FIELDS: Array<{ k: keyof typeof v; label: string; hint?: string }> = [
      { k: "height_in", label: "Height (in)" },
      { k: "weight_lbs", label: "Weight (lbs)" },
      { k: "wingspan_in", label: "Wingspan (in)", hint: "Arms wide, fingertip to fingertip." },
      { k: "leg_length_in", label: "Leg length (in)", hint: "Floor to top of hip bone." },
      { k: "femur_in", label: "Femur (in)", hint: "Hip joint to knee joint, sitting." },
      { k: "tibia_in", label: "Tibia (in)", hint: "Knee joint to floor, sitting." },
      { k: "torso_in", label: "Torso (in)", hint: "Top of hip bone to top of shoulder." },
      { k: "forearm_in", label: "Forearm (in)", hint: "Inside elbow crease to wrist crease." },
      { k: "arm_total_in", label: "Total arm (in)", hint: "Shoulder joint to wrist crease." },
    ];
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map((f) => (
            <div key={String(f.k)}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.25"
                value={(v as Record<string, unknown>)[f.k as string] as string | number | undefined ?? ""}
                onChange={(e) =>
                  set({ [f.k]: e.target.value === "" ? "" : Number(e.target.value) } as Partial<typeof v>)
                }
              />
              {f.hint && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{f.hint}</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          The more limb measurements you give me, the more I can tailor squat vs. lunge vs. press selection
          to your lever profile. Skip any you don't know.
        </p>
      </div>
    );
  }


  if (gap.inputKind === "injury") {
    const v = (typeof value === "object" && value !== null ? value : {}) as {
      status?: "healthy" | "managing" | "sidelined";
      regions?: string[];
      severity?: string;
      note?: string;
    };
    const set = (patch: Partial<typeof v>) => onChange({ ...v, ...patch });
    const toggleRegion = (r: string) => {
      const cur = v.regions ?? [];
      set({ regions: cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r] });
    };
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["healthy", "managing", "sidelined"] as const).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={v.status === s ? "default" : "outline"}
              onClick={() => set({ status: s })}
            >
              {s === "healthy" ? "100% healthy" : s === "managing" ? "Managing something" : "Sidelined"}
            </Button>
          ))}
        </div>

        {v.status && v.status !== "healthy" && (
          <>
            <div>
              <Label className="text-xs">Region(s)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {INJURY_REGIONS.map((r) => {
                  const on = (v.regions ?? []).includes(r);
                  return (
                    <Button
                      key={r}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() => toggleRegion(r)}
                    >
                      {r}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs">Severity</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {["niggle", "managing", "restricted", "sidelined"].map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={v.severity === s ? "default" : "outline"}
                    onClick={() => set({ severity: s })}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Anything else? (optional)</Label>
              <Textarea
                rows={2}
                value={v.note ?? ""}
                onChange={(e) => set({ note: e.target.value })}
                placeholder="Free-text — when it started, what aggravates it…"
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // Default: text or number input.
  return (
    <Input
      type={gap.inputKind === "number" ? "number" : "text"}
      inputMode={gap.inputKind === "number" ? "numeric" : "text"}
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      onChange={(e) => onChange(gap.inputKind === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
      placeholder="Type your answer"
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit();
      }}
    />
  );
}
