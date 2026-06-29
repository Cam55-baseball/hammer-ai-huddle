/**
 * CategoryGoalsStep — Discipline-aware ranked sub-goal wizard.
 *
 * Flow:
 *   1) Discipline selector — auto-prefilled from profile (sport_primary,
 *      sport_secondary, position_primary). User can toggle additional panes:
 *      Position vs Pitcher per sport, and optionally a second sport for
 *      cross-sport two-way athletes (rare baseball+softball case).
 *   2) Per pane, one card per category (Speed / Power / Throwing or Pitching /
 *      Hitting / Fielding). Each card shows mechanism-level sub-goal chips.
 *      Tap = primary, second tap = secondary, third = deselect. Max 2 per
 *      category, with a visible 70 / 30 weight badge.
 *   3) Save writes V2 payload to `athlete_context.category_goals` and clears
 *      the draft slot. Resume via `draftStore` if user exits mid-flow.
 *
 * Constitutional:
 *  - No fabrication. Skipped categories are saved as empty arrays.
 *  - Softball pitcher pane NEVER shows `hold_runners`.
 *  - Pitcher pane never shows position-player Throwing; position never sees
 *    Pitching.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, X, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  CATEGORY_LABELS,
  normalizeCategoryGoalsV2,
  type CategoryGoalsPayloadV2,
  type DisciplineGoals,
  type SubGoalPick,
  type GoalRank,
  type GoalSide,
} from "@/lib/hammer/goals/categoryGoals";
import { useSideContext, type Discipline as SideDiscipline } from "@/contexts/SideContext";
import {
  CATEGORIES_FOR,
  subGoalsFor,
  type Sport,
  type Discipline,
  type CategoryKey,
} from "@/lib/hammer/goals/subGoalCatalog";
import {
  readDraftSlot,
  writeDraftSlot,
  clearDraftSlot,
} from "@/lib/onboarding/draftStore";
import { SaveAndExitBar } from "@/components/common/SaveAndExitBar";

interface Props {
  readonly onContinue: () => void;
  readonly onBack?: () => void;
  /** Hide the inner save bar (e.g. when used inside a Profile dialog). */
  readonly embedded?: boolean;
}

interface PaneId {
  sport: Sport;
  discipline: Discipline;
}

const paneKey = (p: PaneId): string => `${p.sport}:${p.discipline}`;
const PANE_LABELS: Record<Sport, string> = { baseball: "Baseball", softball: "Softball" };
const DISCIPLINE_LABELS: Record<Discipline, string> = {
  position: "Position player",
  pitcher: "Pitcher",
};

const RANK_BADGE: Record<GoalRank, { label: string; tone: string }> = {
  primary: { label: "Primary · 70%", tone: "bg-primary text-primary-foreground" },
  secondary: { label: "Secondary · 30%", tone: "bg-secondary text-secondary-foreground" },
};

interface DraftShape {
  panes: PaneId[];
  picks: Record<string, DisciplineGoals>;
}

export function CategoryGoalsStep({ onContinue, onBack, embedded }: Props) {
  const { user } = useAuth();
  const { isSwitchHitter, isAmbidextrousThrower } = useSideContext();
  const [panes, setPanes] = useState<PaneId[]>([]);
  const [picksByPane, setPicksByPane] = useState<Record<string, DisciplineGoals>>({});
  const [activePane, setActivePane] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Which Side discipline applies to a given goal category, if any.
   *  Returns null when the category is bilaterally neutral (Speed, Fielding)
   *  or when the athlete doesn't have switch/ambi flag for the relevant side. */
  const sideDisciplineFor = useCallback(
    (cat: CategoryKey): SideDiscipline | null => {
      if (cat === "hitting" || cat === "power") return isSwitchHitter ? "hit" : null;
      if (cat === "throwing" || cat === "pitching") return isAmbidextrousThrower ? "throw" : null;
      return null;
    },
    [isSwitchHitter, isAmbidextrousThrower],
  );

  // ── Hydrate from existing V2 row OR draft slot ────────────────────────────
  useEffect(() => {
    if (!user?.id || loaded) return;
    (async () => {
      try {
        const [{ data: ctxRow }, { data: profile }, draft] = await Promise.all([
          supabase
            .from("athlete_context")
            .select("category_goals")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("sport_primary, sport_secondary, position_primary")
            .eq("id", user.id)
            .maybeSingle(),
          readDraftSlot<DraftShape>(user.id, "category-goals-wizard"),
        ]);

        const existingV2 = normalizeCategoryGoalsV2(
          (ctxRow as { category_goals?: unknown } | null)?.category_goals,
        );

        // Priority: in-progress draft > saved V2 row > profile-inferred default.
        let initialPanes: PaneId[] = [];
        let initialPicks: Record<string, DisciplineGoals> = {};

        if (draft?.panes?.length) {
          initialPanes = draft.panes;
          initialPicks = draft.picks ?? {};
        } else if (existingV2) {
          if (existingV2.baseball?.position) {
            initialPanes.push({ sport: "baseball", discipline: "position" });
            initialPicks[paneKey({ sport: "baseball", discipline: "position" })] = existingV2.baseball.position;
          }
          if (existingV2.baseball?.pitcher) {
            initialPanes.push({ sport: "baseball", discipline: "pitcher" });
            initialPicks[paneKey({ sport: "baseball", discipline: "pitcher" })] = existingV2.baseball.pitcher;
          }
          if (existingV2.softball?.position) {
            initialPanes.push({ sport: "softball", discipline: "position" });
            initialPicks[paneKey({ sport: "softball", discipline: "position" })] = existingV2.softball.position;
          }
          if (existingV2.softball?.pitcher) {
            initialPanes.push({ sport: "softball", discipline: "pitcher" });
            initialPicks[paneKey({ sport: "softball", discipline: "pitcher" })] = existingV2.softball.pitcher;
          }
        } else {
          const p = profile as { sport_primary?: string; sport_secondary?: string[]; position_primary?: string } | null;
          const sport: Sport = (p?.sport_primary ?? "baseball").toLowerCase() === "softball" ? "softball" : "baseball";
          initialPanes.push({ sport, discipline: "position" });
          if ((p?.position_primary ?? "").toUpperCase() === "P") {
            initialPanes.push({ sport, discipline: "pitcher" });
          }
        }

        setPanes(initialPanes);
        setPicksByPane(initialPicks);
        setActivePane(initialPanes[0] ? paneKey(initialPanes[0]) : null);
      } catch (e) {
        console.warn("[onboarding] category_goals hydrate failed", e);
      } finally {
        setLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Debounced draft autosave whenever picks / panes change ───────────────
  useEffect(() => {
    if (!user?.id || !loaded) return;
    writeDraftSlot<DraftShape>(user.id, "category-goals-wizard", { panes, picks: picksByPane });
  }, [user?.id, loaded, panes, picksByPane]);

  // ── Pane management ──────────────────────────────────────────────────────
  const addPane = (p: PaneId) => {
    const key = paneKey(p);
    if (panes.some((x) => paneKey(x) === key)) return;
    setPanes((s) => [...s, p]);
    setActivePane(key);
  };

  const removePane = (p: PaneId) => {
    const key = paneKey(p);
    setPanes((s) => s.filter((x) => paneKey(x) !== key));
    setPicksByPane((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
    setActivePane((cur) => (cur === key ? (panes.find((x) => paneKey(x) !== key) ? paneKey(panes.find((x) => paneKey(x) !== key)!) : null) : cur));
  };

  // ── Pick toggling (primary → secondary → off) ────────────────────────────
  const togglePick = useCallback(
    (paneId: PaneId, category: CategoryKey, subGoalId: string) => {
      const key = paneKey(paneId);
      setPicksByPane((s) => {
        const pane: DisciplineGoals = s[key] ?? {};
        const slot = (pane[category as keyof DisciplineGoals] as ReadonlyArray<SubGoalPick> | undefined) ?? [];
        const existing = slot.find((p) => p.id === subGoalId);
        let nextSlot: SubGoalPick[];
        if (!existing) {
          // Add as primary if none, else secondary.
          const hasPrimary = slot.some((p) => p.rank === "primary");
          if (slot.length >= 2) return s; // cap reached
          nextSlot = [...slot, { id: subGoalId, rank: hasPrimary ? "secondary" : "primary" }];
        } else if (existing.rank === "primary") {
          // Demote: primary → secondary (and promote any existing secondary to primary if alone).
          nextSlot = slot.map((p) =>
            p.id === subGoalId ? { ...p, rank: "secondary" as const } : { ...p, rank: "primary" as const },
          );
        } else {
          // Remove.
          nextSlot = slot.filter((p) => p.id !== subGoalId);
          // Ensure remaining pick is primary.
          nextSlot = nextSlot.map((p, i) => ({ ...p, rank: i === 0 ? "primary" : "secondary" }));
        }
        return { ...s, [key]: { ...pane, [category]: nextSlot } };
      });
    },
    [],
  );

  // ── Build V2 payload from current state ──────────────────────────────────
  const payload: CategoryGoalsPayloadV2 = useMemo(() => {
    const buckets: { baseball?: { position?: DisciplineGoals; pitcher?: DisciplineGoals }; softball?: { position?: DisciplineGoals; pitcher?: DisciplineGoals } } = {};
    for (const p of panes) {
      const dg = picksByPane[paneKey(p)] ?? {};
      const sportBucket = buckets[p.sport] ?? {};
      sportBucket[p.discipline] = dg;
      buckets[p.sport] = sportBucket;
    }
    return { version: 2, updatedAt: new Date().toISOString(), ...buckets };
  }, [panes, picksByPane]);

  const totalPicks = useMemo(
    () =>
      Object.values(picksByPane).reduce((acc, dg) => {
        for (const arr of Object.values(dg)) if (Array.isArray(arr)) acc += arr.length;
        return acc;
      }, 0),
    [picksByPane],
  );

  const handleSave = async () => {
    if (!user?.id) return;
    if (totalPicks === 0) {
      toast.error("Pick at least one sub-goal before saving.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("athlete_context")
        .upsert(
          { user_id: user.id, category_goals: payload as unknown as never },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      clearDraftSlot(user.id, "category-goals-wizard");
      toast.success("Goals saved. Hammer will plan around them.");
      onContinue();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Couldn't save goals — ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user?.id) return;
    writeDraftSlot<DraftShape>(user.id, "category-goals-wizard", { panes, picks: picksByPane });
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const active = panes.find((p) => paneKey(p) === activePane) ?? panes[0] ?? null;

  const addOptions: PaneId[] = ([
    { sport: "baseball", discipline: "position" },
    { sport: "baseball", discipline: "pitcher" },
    { sport: "softball", discipline: "position" },
    { sport: "softball", discipline: "pitcher" },
  ] as PaneId[]).filter((opt) => !panes.some((p) => paneKey(p) === paneKey(opt)));

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Pick the goals that matter most</h2>
        <p className="text-sm text-muted-foreground">
          Choose <span className="font-medium">1 or 2 sub-goals per category</span>.
          First tap = <span className="font-medium">primary (70%)</span>, second tap
          = <span className="font-medium">secondary (30%)</span>, third = remove.
          Hammer weights every plan by these.
        </p>
      </div>

      {/* Pane tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {panes.map((p) => {
          const key = paneKey(p);
          const isActive = key === activePane;
          return (
            <div key={key} className="flex items-center">
              <button
                type="button"
                onClick={() => setActivePane(key)}
                className={`rounded-l-md border px-2.5 py-1 text-xs font-medium transition ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/40"
                }`}
              >
                {PANE_LABELS[p.sport]} · {DISCIPLINE_LABELS[p.discipline]}
              </button>
              {panes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePane(p)}
                  className="rounded-r-md border border-l-0 border-border px-1.5 py-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove pane"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        {addOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {addOptions.map((opt) => (
              <button
                key={paneKey(opt)}
                type="button"
                onClick={() => addPane(opt)}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="h-3 w-3" />
                {PANE_LABELS[opt.sport]} · {DISCIPLINE_LABELS[opt.discipline]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active pane content */}
      {active && (
        <div className="space-y-3">
          {CATEGORIES_FOR[active.discipline].map((cat) => {
            const sgs = subGoalsFor(active.sport, active.discipline, cat);
            if (!sgs.length) return null;
            const pane = picksByPane[paneKey(active)] ?? {};
            const picks = (pane[cat as keyof DisciplineGoals] as ReadonlyArray<SubGoalPick> | undefined) ?? [];
            return (
              <div key={cat} className="rounded-md border border-border bg-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    {cat === "pitching" ? "Pitching" : CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
                  </div>
                  <div className="flex gap-1">
                    {picks.map((p) => (
                      <Badge key={p.id} className={`text-[10px] ${RANK_BADGE[p.rank].tone}`}>
                        {RANK_BADGE[p.rank].label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sgs.map((sg) => {
                    const pick = picks.find((p) => p.id === sg.id);
                    const active = !!pick;
                    return (
                      <button
                        key={sg.id}
                        type="button"
                        onClick={() => togglePick(panes.find((x) => paneKey(x) === activePane)!, cat, sg.id)}
                        title={sg.helpText}
                        className={`group inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                          active
                            ? pick.rank === "primary"
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-secondary bg-secondary/40 text-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/40"
                        }`}
                      >
                        <span className="truncate">{sg.label}</span>
                        <Info className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
                {picks.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Tap any chip to make it your <span className="font-medium">primary</span>. Tap a second chip for a <span className="font-medium">secondary</span> focus.
                  </p>
                )}
                {picks.length > 0 && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Hover or long-press a chip to see what it means.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!embedded && (
        <SaveAndExitBar
          onContinue={handleSave}
          onBack={onBack}
          onSaveAndExit={handleSaveDraft}
          continueLabel="Save & continue"
          continueDisabled={totalPicks === 0}
          saving={saving}
        />
      )}
      {embedded && (
        <div className="flex justify-between pt-2">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>Back</Button>
          )}
          <Button onClick={handleSave} disabled={saving || totalPicks === 0}>
            {saving ? "Saving…" : "Save"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </section>
  );
}
