/**
 * EquipmentStep — the first place we have ever actually asked an athlete what
 * gear they have.
 *
 * Constitutional note: this is an ANSWER, not an assumption. Skipping the step
 * leaves the answer unknown, and unknown is handled honestly downstream (the
 * plan prefers gear-free work and says so). Choosing "just bodyweight for now"
 * is a real declared answer and is stored as such.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { writePersistentEquipment } from "@/lib/hammer/context/equipment";

interface Props {
  onContinue: () => void;
  onBack: () => void;
}

/** Tokens match `wk_movement_catalog.equipment_requirements`. */
const GROUPS: { title: string; items: { token: string; label: string }[] }[] = [
  {
    title: "Weight room",
    items: [
      { token: "barbell", label: "Barbell" },
      { token: "plates", label: "Weight plates" },
      { token: "squat_rack", label: "Squat rack" },
      { token: "bench", label: "Bench" },
      { token: "dumbbell", label: "Dumbbells" },
      { token: "kettlebell", label: "Kettlebells" },
      { token: "trap_bar", label: "Trap bar" },
      { token: "cable_stack", label: "Cable machine" },
      { token: "landmine", label: "Landmine" },
      { token: "box", label: "Box or step" },
    ],
  },
  {
    title: "Portable gear",
    items: [
      { token: "bands", label: "Resistance bands" },
      { token: "mini_band", label: "Mini bands" },
      { token: "jband", label: "J-Bands" },
      { token: "med_ball", label: "Medicine ball" },
      { token: "plyo_ball", label: "Plyo balls" },
      { token: "ladder", label: "Agility ladder" },
      { token: "hurdles", label: "Mini hurdles" },
      { token: "foam_roller", label: "Foam roller" },
      { token: "lacrosse_ball", label: "Lacrosse / massage ball" },
      { token: "rebounder", label: "Rebounder net" },
    ],
  },
  {
    title: "Baseball / softball",
    items: [
      { token: "gamer_bat", label: "Your game bat" },
      { token: "overload_bat", label: "Heavy (overload) bat" },
      { token: "underload_bat", label: "Light (underload) bat" },
      { token: "tee", label: "Hitting tee" },
      { token: "ball", label: "Balls" },
      { token: "net", label: "Net or cage" },
      { token: "wall", label: "A solid wall you can throw into" },
      { token: "field", label: "A field" },
      { token: "open_space", label: "Open running space" },
    ],
  },
];

type SaveError = { plain: string; technical?: string };

/** Plain-language cause for a save failure — never a generic "try again". */
function plainSaveError(err: Error & { code?: string; details?: string }): string {
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  if (code === "42501" || msg.includes("row-level security") || msg.includes("permission")) {
    return "Your account isn't allowed to save this equipment list. That usually means your sign-in expired — sign out and back in, then try again.";
  }
  if (code === "28000" || msg.includes("not authenticated") || msg.includes("jwt")) {
    return "Your sign-in expired before the save went through. Sign back in and your selections will still be here.";
  }
  if (code === "23514" || msg.includes("violates check constraint")) {
    return "The app sent an equipment list the database wouldn't accept. Nothing was saved — this is a bug on our side, not something you can fix by retrying.";
  }
  if (code === "42P10" || msg.includes("on conflict")) {
    return "The app couldn't match your existing equipment entry, so nothing was saved. This is a bug on our side — retrying won't help.";
  }
  if (code === "PGRST202" || msg.includes("could not find the function")) {
    return "The equipment save isn't available on the server yet. Nothing was saved — retrying won't help until it's deployed.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "We couldn't reach the server, so nothing was saved. Check your connection and try again.";
  }
  return `The server refused to save your equipment: ${err.message}`;
}

function technicalDetail(err: Error & { code?: string; details?: string }): string {
  return [err.code ? `code ${err.code}` : null, err.message, err.details]
    .filter(Boolean)
    .join(" — ");
}

export function EquipmentStep({ onContinue, onBack }: Props) {
  const { user } = useAuth();
  const { isOwner } = useOwnerAccess();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);


  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("athlete_equipment_context")
        .select("equipment")
        .eq("user_id", user.id)
        .eq("scope", "persistent")
        .maybeSingle();
      if (cancelled) return;
      if (error) setLoadError(`We couldn't load your saved equipment: ${error.message}`);

      const eq = (data as { equipment?: string[] } | null)?.equipment ?? [];
      setSelected(new Set(eq));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const count = selected.size;
  const bodyweightOnly = useMemo(
    () => count === 1 && selected.has("bodyweight"),
    [count, selected],
  );

  const toggle = (token: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      next.delete("bodyweight");
      return next;
    });
  };

  const save = async (tokens: string[]) => {
    if (!user?.id) {
      setSaveError({
        plain: "You're signed out, so there's nothing to save this to. Sign back in and try again.",
      });
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await writePersistentEquipment(user.id, tokens, null, "onboarding_self_report");
      toast.success("Equipment saved. Your plans will use it from the next one.");
      onContinue();
    } catch (e) {
      const err = e as Error & { code?: string; details?: string };
      console.error("[EquipmentStep] save failed", err);
      setSaveError({ plain: plainSaveError(err), technical: technicalDetail(err) });
    } finally {
      setSaving(false);
    }
  };


  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">What can you train with?</h2>
        <p className="text-sm text-muted-foreground">
          Tap everything you can get to most days. You can change this whenever your
          setup changes, and you can skip it — we just won't guess.
        </p>
      </div>

      {loadError && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-100">
          {loadError}
        </div>
      )}

      {saveError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p className="font-semibold text-destructive">Your equipment wasn't saved</p>
              <p className="text-foreground/80">{saveError.plain}</p>
              {isOwner && saveError.technical && (
                <p className="font-mono text-xs text-muted-foreground">{saveError.technical}</p>
              )}
            </div>
          </div>
        </div>
      )}


      {!loaded ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {GROUPS.map((g) => (
              <div key={g.title} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.title}
                </p>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((it) => {
                    const on = selected.has(it.token);
                    return (
                      <button
                        key={it.token}
                        type="button"
                        onClick={() => toggle(it.token)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          on
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border bg-muted/30 hover:bg-muted/60"
                        }`}
                        aria-pressed={on}
                      >
                        {it.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 p-3">
            <Badge variant="secondary">{bodyweightOnly ? "Bodyweight only" : `${count} selected`}</Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => save(["bodyweight"])}
            >
              Just bodyweight for now
            </Button>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onContinue} disabled={saving}>
                Skip for now
              </Button>
              <Button onClick={() => save([...selected])} disabled={saving || count === 0}>
                {saving ? "Saving…" : "Save and continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
