/**
 * CategoryGoalsStep — Onboarding step where the athlete ranks Speed, Power,
 * Throwing, Hitting, and Fielding in order of importance, and (optionally)
 * picks a preset intent per category.
 *
 * Writes to `athlete_context.category_goals` as a normalized
 * `CategoryGoalsPayload v1`. Used downstream by Hammer's daily-plan ordering
 * + drill intent. No fabrication: partial rankings cannot be saved.
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowRight, ArrowUp, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  CATEGORY_INTENTS,
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  type CategoryGoal,
  type CategoryGoalsPayload,
  type CategoryKey,
  normalizeCategoryGoals,
} from "@/lib/hammer/goals/categoryGoals";

interface Props {
  readonly onContinue: () => void;
  readonly onBack: () => void;
}

export function CategoryGoalsStep({ onContinue, onBack }: Props) {
  const { user } = useAuth();
  const [order, setOrder] = useState<CategoryKey[]>([...CATEGORY_KEYS]);
  const [intents, setIntents] = useState<Record<CategoryKey, string | null>>({
    speed: null,
    power: null,
    throwing: null,
    hitting: null,
    fielding: null,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate from existing context if any (resume support).
  useEffect(() => {
    if (!user?.id || loaded) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("athlete_context")
          .select("category_goals")
          .eq("user_id", user.id)
          .maybeSingle();
        const raw = (data as { category_goals?: unknown } | null)?.category_goals;
        const normalized = normalizeCategoryGoals(raw);
        if (normalized) {
          setOrder(normalized.goals.slice().sort((a, b) => a.rank - b.rank).map((g) => g.category));
          const next: Record<CategoryKey, string | null> = { ...intents };
          for (const g of normalized.goals) next[g.category] = g.intent;
          setIntents(next);
        }
      } catch (e) {
        console.warn("[onboarding] category_goals hydrate failed", e);
      } finally {
        setLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= order.length) return;
    const copy = order.slice();
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    setOrder(copy);
  };

  const setIntent = (cat: CategoryKey, intent: string | null) =>
    setIntents((s) => ({ ...s, [cat]: intent }));

  const payload: CategoryGoalsPayload = useMemo(() => {
    const goals: CategoryGoal[] = order.map((cat, i) => ({
      category: cat,
      rank: i + 1,
      intent: intents[cat] ?? null,
    }));
    return { version: 1, goals, updatedAt: new Date().toISOString() };
  }, [order, intents]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("athlete_context")
        .upsert(
          { user_id: user.id, category_goals: payload as unknown as never },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      toast.success("Goals ranked. Hammer will plan around them.");
      onContinue();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Couldn't save goals — ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Rank your goals</h2>
        <p className="text-sm text-muted-foreground">
          Drag-rank by importance: <span className="font-medium">#1</span> is what you most
          want to improve. Hammer uses this every day to order your plan.
        </p>
      </div>

      <ol className="space-y-2">
        {order.map((cat, idx) => {
          const intentList = CATEGORY_INTENTS[cat];
          return (
            <li
              key={cat}
              className="rounded-md border border-border bg-card p-3 transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <Badge variant="secondary" className="font-mono">#{idx + 1}</Badge>
                  <div className="flex flex-col">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      disabled={idx === 0}
                      onClick={() => move(idx, -1)}
                      aria-label={`Move ${CATEGORY_LABELS[cat]} up`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      disabled={idx === order.length - 1}
                      onClick={() => move(idx, 1)}
                      aria-label={`Move ${CATEGORY_LABELS[cat]} down`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    {CATEGORY_LABELS[cat]}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {CATEGORY_DESCRIPTIONS[cat]}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {intentList.map((p) => {
                      const active = intents[cat] === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setIntent(cat, active ? null : p.id)}
                          className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-foreground/40"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-muted-foreground">
        You can change this any time in <span className="font-medium">Profile → Ranked goals</span>.
      </p>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save & continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
