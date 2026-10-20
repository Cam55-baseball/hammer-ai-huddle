/**
 * Stage 5 — ask athletes to rank their five training areas. The ranking tilts
 * which drills fill each slot inside what the plan already allows; it never
 * adds work or unlocks anything. Shown until the athlete ranks (or hides it
 * for today).
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListOrdered, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORY_KEYS, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, normalizeCategoryOrder, type CategoryKey } from "@/lib/hammer/goals/categoryGoals";
import { confirmCategoryOrder } from '@/lib/hammer/goals/confirmCategoryOrder';
import { goalReaskDue, goalCalendarDate, GOAL_REASK_TEXT } from "@/lib/hammer/goalReask";

const HIDE = "hm.rankGoalsHidden.";

export function RankGoalsPromptCard({ forceOpen = false }: { forceOpen?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [order, setOrder] = useState<CategoryKey[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const today = goalCalendarDate(new Date());
  const hideKey = `${HIDE}${user?.id}.${today}`;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(hideKey) === "1"; } catch { return false; } });

  const q = useQuery({
    queryKey: ["goal-ranking", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('Sign in first');
      const { data, error } = await supabase.from("athlete_context").select("category_goals").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      const raw = (data as { category_goals?: Record<string, unknown> | null } | null)?.category_goals ?? null;
      return { raw, ranked: normalizeCategoryOrder(raw?.categoryOrder) };
    },
  });

  const updatedAt = typeof q.data?.raw?.updatedAt === "string" ? (q.data.raw.updatedAt as string) : null;
  const reask = !!q.data?.ranked && goalReaskDue({ today, lastConfirmedAt: updatedAt, hasGoals: true });
  if (q.error) return <p role="alert" className="text-sm text-destructive">Couldn't load your saved goal order. Try again later.</p>;
  if (!q.data || (q.data.ranked && !reask && !forceOpen) || (hidden && !forceOpen)) return null;

  const tap = (k: CategoryKey) => setOrder((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));
  const save = async (picked: CategoryKey[] = order) => {
    if (!user || !q.data || saving || picked.length !== CATEGORY_KEYS.length) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.from("athlete_context").upsert(
        { user_id: user.id, category_goals: confirmCategoryOrder(q.data.raw, picked, new Date().toISOString()) as never },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["goal-ranking", user.id] }),
        qc.invalidateQueries({ queryKey: ["hammer-context-envelope", user.id] }),
      ]);
      setOrder([]);
      toast.success("Saved. Your plan will lean toward what you ranked first.");
    } catch {
      setSaveError("Couldn't save your goal order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/30" data-testid="rank-goals-prompt">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start gap-2">
          <ListOrdered className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">What matters most to you?</p>
            {reask && <p className="text-xs font-medium" data-testid="goal-reask-text">{GOAL_REASK_TEXT}</p>}
            <p className="text-xs text-muted-foreground">Tap these in order, most important first. Your plan leans toward the top ones. You still train all of them.</p>
          </div>
        </div>
        {reask && q.data.ranked && <p className="break-words text-xs text-muted-foreground">Current order: {q.data.ranked.map(key => CATEGORY_LABELS[key]).join(' → ')}</p>}
        <div className="space-y-1.5">
          {CATEGORY_KEYS.map((k) => {
            const pos = order.indexOf(k);
            return (
              <Button key={k} type="button" variant="outline" disabled={saving} onClick={() => tap(k)}
                className={`h-auto min-h-11 w-full justify-start gap-3 whitespace-normal px-3 py-2 text-left ${pos >= 0 ? "border-primary bg-primary/10" : "border-border"}`}
                aria-label={`${CATEGORY_LABELS[k]}${pos >= 0 ? `, ranked ${pos + 1}` : ""}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${pos >= 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{pos >= 0 ? pos + 1 : ""}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{CATEGORY_LABELS[k]}</span>
                  <span className="block break-words text-[11px] text-muted-foreground">{CATEGORY_DESCRIPTIONS[k]}</span>
                </span>
              </Button>
            );
          })}
        </div>
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="flex-1" disabled={order.length !== CATEGORY_KEYS.length || saving} onClick={() => save()}>
            {order.length === CATEGORY_KEYS.length ? "Save my order" : "Tap all five"}
          </Button>
          {reask && q.data.ranked && order.length === 0 && <Button size="sm" variant="outline" disabled={saving} onClick={() => { const ranked = q.data?.ranked; if (ranked) void save([...ranked]); }}>Keep my order</Button>}
          {order.length > 0 && <Button size="sm" variant="outline" disabled={saving} onClick={() => setOrder([])} aria-label="Start over"><RotateCcw className="h-4 w-4" /></Button>}
          {!forceOpen && <Button size="sm" variant="ghost" disabled={saving} onClick={() => { try { localStorage.setItem(hideKey, "1"); } catch { /* ignore */ } setHidden(true); }}>Later</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
